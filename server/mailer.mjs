/**
 * 蔚蓝档案汉化站 - 原生零依赖 SMTP 邮件系统与数据备份外发服务
 */
import net from "node:net";
import tls from "node:tls";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import util from "node:util";
import { config } from "./config.mjs";
import { getDiskSpace } from "./diskProtection.mjs";
import { getVisitors } from "./repository.mjs";
import { aggregateGeoStats } from "./ipGeo.mjs";

const execAsync = util.promisify(exec);

const mailConfigFile = () => path.join(config.dataDirectory, "mail_config.json");

// 默认配置
export const defaultMailConfig = {
  enabled: false,
  host: "smtp.qq.com",
  port: 465,
  secure: true,
  user: "",
  pass: "",
  fromName: "蔚蓝档案汉化站系统",
  defaultTo: "",
  scheduleEnabled: true,
  scheduleTime: "08:00",
  scheduleFrequency: "daily",
  includeBackup: true,
  lastSentAt: null,
  lastStatus: null,
};

/**
 * 读取邮件配置（密码掩码返回）
 */
export async function getMailConfig(maskPassword = true) {
  try {
    const raw = await fs.readFile(mailConfigFile(), "utf8");
    const data = JSON.parse(raw);
    const merged = { ...defaultMailConfig, ...data };
    if (maskPassword && merged.pass) {
      merged.pass = merged.pass.length > 4 ? merged.pass.slice(0, 2) + "******" + merged.pass.slice(-2) : "******";
    }
    return merged;
  } catch {
    return { ...defaultMailConfig };
  }
}

/**
 * 保存邮件配置
 */
export async function saveMailConfig(newConfig) {
  const current = await getMailConfig(false);
  // 如果前端传过来的 pass 是掩码且包含 ***，保留原密码
  let passToSave = newConfig.pass;
  if (!passToSave || passToSave.includes("******")) {
    passToSave = current.pass;
  }

  const merged = {
    ...current,
    ...newConfig,
    port: parseInt(newConfig.port, 10) || 465,
    secure: newConfig.port === 465 || newConfig.secure === true,
    pass: passToSave,
  };

  await fs.mkdir(path.dirname(mailConfigFile()), { recursive: true });
  await fs.writeFile(mailConfigFile(), JSON.stringify(merged, null, 2), "utf8");
  return getMailConfig(true);
}

/**
 * 原生零依赖 SMTP 客户端
 */
export async function sendSmtpMail({ to, subject, html, attachments = [], customConfig = null }) {
  const mailConf = customConfig || (await getMailConfig(false));

  if (!mailConf.user || !mailConf.pass || !mailConf.host) {
    throw new Error("SMTP 邮件尚未配置或信息不完整（请先在后台填写 SMTP 主机、账号与授权码）");
  }

  const targetHost = mailConf.host.trim();
  const targetPort = parseInt(mailConf.port, 10) || 465;
  const isSecure = targetPort === 465 || mailConf.secure === true;
  const username = mailConf.user.trim();
  const password = mailConf.pass.trim();
  const recipient = (to || mailConf.defaultTo || "").trim();

  if (!recipient) {
    throw new Error("请指定收件人邮箱地址");
  }

  return new Promise((resolve, reject) => {
    let socket;
    let step = 0;
    let buffer = "";

    const cleanup = () => {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP 邮件发送超时 (30秒)"));
    }, 30000);

    const onConnect = () => {
      // 等待服务器问候 220
    };

    if (isSecure) {
      socket = tls.connect(targetPort, targetHost, { rejectUnauthorized: false }, onConnect);
    } else {
      socket = net.connect(targetPort, targetHost, onConnect);
    }

    socket.on("error", (err) => {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(new Error(`SMTP 网络连接失败: ${err.message}`));
    });

    const sendLine = (line) => {
      socket.write(line + "\r\n");
    };

    // 辅助转码 UTF-8 主题
    const encodeSubject = (text) => `=?UTF-8?B?${Buffer.from(text).toString("base64")}?=`;

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      // 按行处理 SMTP 应答
      const lines = buffer.split("\r\n");
      // 检查是否有完整应答行
      const lastLine = lines[lines.length - 2];
      if (!lastLine) return;

      const code = parseInt(lastLine.slice(0, 3), 10);
      const isIntermediate = lastLine[3] === "-";
      if (isIntermediate) return; // 继续等待主行

      buffer = ""; // 清空缓冲区

      try {
        if (code >= 400) {
          clearTimeout(timeoutTimer);
          cleanup();
          return reject(new Error(`SMTP 错误 [${code}]: ${lastLine}`));
        }

        switch (step) {
          case 0: // 接收 220 欢迎语
            if (code === 220) {
              step = 1;
              sendLine(`EHLO localhost`);
            }
            break;

          case 1: // EHLO 应答 250
            if (code === 250) {
              step = 2;
              sendLine("AUTH LOGIN");
            }
            break;

          case 2: // 收到 334，请求输入 Username
            if (code === 334) {
              step = 3;
              sendLine(Buffer.from(username).toString("base64"));
            }
            break;

          case 3: // 收到 334，请求输入 Password
            if (code === 334) {
              step = 4;
              sendLine(Buffer.from(password).toString("base64"));
            }
            break;

          case 4: // 收到 235 认证成功
            if (code === 235) {
              step = 5;
              sendLine(`MAIL FROM:<${username}>`);
            }
            break;

          case 5: // 收到 250 MAIL FROM OK
            if (code === 250) {
              step = 6;
              sendLine(`RCPT TO:<${recipient}>`);
            }
            break;

          case 6: // 收到 250 RCPT TO OK
            if (code === 250) {
              step = 7;
              sendLine("DATA");
            }
            break;

          case 7: // 收到 354 开始传输邮件正文
            if (code === 354) {
              step = 8;

              // 构建标准 MIME 邮件
              const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const fromDisplay = encodeSubject(mailConf.fromName || "蔚蓝档案系统");

              let emailBody = [
                `From: ${fromDisplay} <${username}>`,
                `To: <${recipient}>`,
                `Subject: ${encodeSubject(subject)}`,
                `MIME-Version: 1.0`,
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                "",
                `--${boundary}`,
                `Content-Type: text/html; charset=UTF-8`,
                `Content-Transfer-Encoding: base64`,
                "",
                Buffer.from(html || "").toString("base64"),
                "",
              ];

              // 附加大文件/附件
              for (const att of attachments) {
                if (att && att.filename && att.content) {
                  const safeFilename = encodeSubject(att.filename);
                  emailBody.push(`--${boundary}`);
                  emailBody.push(`Content-Type: application/octet-stream; name="${safeFilename}"`);
                  emailBody.push(`Content-Transfer-Encoding: base64`);
                  emailBody.push(`Content-Disposition: attachment; filename="${safeFilename}"`);
                  emailBody.push("");
                  const b64Data = Buffer.isBuffer(att.content)
                    ? att.content.toString("base64")
                    : Buffer.from(att.content).toString("base64");
                  emailBody.push(b64Data);
                  emailBody.push("");
                }
              }

              emailBody.push(`--${boundary}--`);
              emailBody.push("."); // 结束标志

              socket.write(emailBody.join("\r\n") + "\r\n");
            }
            break;

          case 8: // 收到 250 邮件发送完成
            if (code === 250) {
              step = 9;
              sendLine("QUIT");
              clearTimeout(timeoutTimer);
              cleanup();
              resolve({ success: true, message: "邮件发送成功" });
            }
            break;
        }
      } catch (err) {
        clearTimeout(timeoutTimer);
        cleanup();
        reject(err);
      }
    });
  });
}

/**
 * 打包网站所有核心数据（server/data 目录的 json）生成备份 tar.gz Buffer
 */
export async function createDataBackupArchive() {
  const dataDir = config.dataDirectory;
  const tempArchive = path.join("/tmp", `site-backup-${Date.now()}.tar.gz`);

  try {
    // 检查目录是否存在
    await fs.mkdir(dataDir, { recursive: true });
    // 使用系统 tar 打包整个数据目录
    if (process.platform === "win32") {
      // Windows 模拟测试，将所有 json 合并或压缩
      const files = await fs.readdir(dataDir);
      const backupObj = {};
      for (const f of files) {
        if (f.endsWith(".json")) {
          const content = await fs.readFile(path.join(dataDir, f), "utf8");
          try { backupObj[f] = JSON.parse(content); } catch { backupObj[f] = content; }
        }
      }
      return {
        filename: `bluearchive_data_backup_${new Date().toISOString().slice(0, 10)}.json`,
        buffer: Buffer.from(JSON.stringify(backupObj, null, 2)),
      };
    } else {
      await execAsync(`tar -czf "${tempArchive}" -C "${path.dirname(dataDir)}" "${path.basename(dataDir)}"`);
      const buffer = await fs.readFile(tempArchive);
      await fs.unlink(tempArchive).catch(() => {});
      return {
        filename: `bluearchive_backup_${new Date().toISOString().slice(0, 10)}.tar.gz`,
        buffer,
      };
    }
  } catch (err) {
    console.error("Backup archive error:", err);
    throw new Error(`数据打包备份失败: ${err.message}`);
  }
}

/**
 * 生成蔚蓝档案专属样式的 HTML 邮件模板
 */
export function renderEmailTemplate({ title, subtitle, contentHtml, stats = null }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans SC', 'Segoe UI', Roboto, sans-serif; background-color: #f0f6fc; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 137, 224, 0.08); border: 1px solid #dbeafe;">
    <!-- 头部 SCHALE 渐变横幅 -->
    <div style="background: linear-gradient(135deg, #0089e0, #2ea9ff); padding: 28px 24px; color: #ffffff; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em;">${title}</h1>
      <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.9;">${subtitle || "蔚蓝档案民间汉化站 · 系统自动化通知"}</p>
    </div>

    <!-- 主体内容 -->
    <div style="padding: 24px;">
      ${contentHtml}

      ${
        stats
          ? `
      <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #0089e0;">📊 核心运行指标</h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          ${stats.map((s) => `<tr><td style="padding: 6px 0; color: #64748b;">${s.label}:</td><td style="padding: 6px 0; font-weight: 700; text-align: right; color: #0f172a;">${s.value}</td></tr>`).join("")}
        </table>
      </div>
      `
          : ""
      }

      <div style="margin-top: 24px; text-align: center;">
        <a href="https://bluearchive-tools.local" style="display: inline-block; padding: 10px 24px; background: #0089e0; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 13px; font-weight: 700;">访问汉化管理后台</a>
      </div>
    </div>

    <!-- 页脚 -->
    <div style="background: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      此邮件由 蔚蓝档案民间汉化站 自动化系统发出 · 发送时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 立即备份并通过邮件发送
 */
export async function sendBackupViaEmail(targetEmail) {
  const mailConf = await getMailConfig(false);
  const to = targetEmail || mailConf.defaultTo;
  if (!to) {
    throw new Error("请指定接收备份的邮箱地址");
  }

  const backup = await createDataBackupArchive();
  const disk = await getDiskSpace();

  const title = "【网站备份】蔚蓝档案民间汉化站 完整数据存档";
  const contentHtml = `
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
      管理员您好，网站最新核心业务数据与配置文件已成功打包，请查收随信附件 <strong>${backup.filename}</strong>。
    </p>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 16px;">
      该存档包含了公告、下载版本、团队数据、FAQ教程、术语库及访客记录，可用于站点灾备恢复。
    </p>
  `;

  const stats = [
    { label: "备份包大小", value: `${(backup.buffer.length / 1024).toFixed(1)} KB` },
    { label: "服务器硬盘状态", value: `${disk.usedGb}GB / ${disk.totalGb}GB (${disk.usagePercent}%)` },
    { label: "服务器状态等级", value: disk.status === "normal" ? "健康 (正常)" : "注意 (需关注容量)" },
  ];

  const html = renderEmailTemplate({
    title,
    subtitle: "网站数据定时/手动安全灾备归档",
    contentHtml,
    stats,
  });

  const res = await sendSmtpMail({
    to,
    subject: title,
    html,
    attachments: [
      {
        filename: backup.filename,
        content: backup.buffer,
      },
    ],
  });

  // 更新发送状态记录
  await saveMailConfig({
    lastSentAt: new Date().toISOString(),
    lastStatus: "备份外发成功",
  });

  return res;
}

/**
 * 发送每日/定时运维报告（包含 IP 地区统计、访问量、磁盘状态，可选带备份）
 */
export async function sendDailyReportEmail(targetEmail = null) {
  const mailConf = await getMailConfig(false);
  const to = targetEmail || mailConf.defaultTo;
  if (!to) {
    throw new Error("请指定接收报告的邮箱地址");
  }

  const disk = await getDiskSpace();
  const visitors = await getVisitors(500);
  const geo = await aggregateGeoStats(visitors);

  const topProvincesText = geo.topProvinces.slice(0, 5).map((p) => `${p.name} (${p.count}次)`).join("、") || "暂无";
  const topCitiesText = geo.topCities.slice(0, 5).map((c) => `${c.name} (${c.count}次)`).join("、") || "暂无";

  let attachments = [];
  if (mailConf.includeBackup) {
    try {
      const backup = await createDataBackupArchive();
      attachments.push({
        filename: backup.filename,
        content: backup.buffer,
      });
    } catch (e) {
      console.warn("Report backup attachment failed:", e);
    }
  }

  const title = `【运行报告】蔚蓝档案汉化站 每日统计与健康日报`;
  const contentHtml = `
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
      管理员您好，以下是蔚蓝档案汉化站最新系统的自动化巡检报告与访问统计数据：
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px; color: #16a34a; font-size: 13px;">🌐 访客地区分布 (Top 5)</h4>
      <p style="margin: 0; font-size: 12px; color: #334155;">省份排行: ${topProvincesText}</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #334155;">城市排行: ${topCitiesText}</p>
    </div>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px; color: #2563eb; font-size: 13px;">💾 服务器磁盘与容量防护</h4>
      <p style="margin: 0; font-size: 12px; color: #334155;">
        总容量: ${disk.totalGb} GB | 已用: ${disk.usedGb} GB | 剩余: ${disk.freeGb} GB (已用率 ${disk.usagePercent}%)
      </p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
        自动清理机制: 已启用 (超过 85% 自动修剪过期 releases 与临时文件)
      </p>
    </div>
  `;

  const stats = [
    { label: "最近样本访问量", value: `${geo.sampleSize} 次` },
    { label: "独立访客 IP", value: `${geo.uniqueIps} 个` },
    { label: "磁盘使用百分比", value: `${disk.usagePercent}%` },
    { label: "附件附带备份", value: attachments.length > 0 ? "已附带 (完整备份包)" : "未附带" },
  ];

  const html = renderEmailTemplate({
    title,
    subtitle: "每日访问地区统计、服务器磁盘容量巡检报告",
    contentHtml,
    stats,
  });

  const res = await sendSmtpMail({
    to,
    subject: title,
    html,
    attachments,
  });

  await saveMailConfig({
    lastSentAt: new Date().toISOString(),
    lastStatus: "报告发送成功",
  });

  return res;
}
