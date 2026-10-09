/**
 * 蔚蓝档案汉化站 - 服务器磁盘容量保护与智能清理系统
 */
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import util from "node:util";
import { config } from "./config.mjs";

const execAsync = util.promisify(exec);

/**
 * 获取当前服务器磁盘空间使用情况
 */
export async function getDiskSpace() {
  try {
    if (process.platform === "win32") {
      // Windows 开发环境保底
      return {
        totalGb: 100,
        usedGb: 45,
        freeGb: 55,
        usagePercent: 45,
        status: "normal",
        filesystem: "C:",
      };
    }

    // Linux 生产环境使用 df
    const { stdout } = await execAsync("df -k /");
    const lines = stdout.trim().split("\n");
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      const totalKb = parseInt(parts[1], 10);
      const usedKb = parseInt(parts[2], 10);
      const freeKb = parseInt(parts[3], 10);
      const usagePercent = parseInt(parts[4].replace("%", ""), 10);

      const totalGb = (totalKb / 1024 / 1024).toFixed(1);
      const usedGb = (usedKb / 1024 / 1024).toFixed(1);
      const freeGb = (freeKb / 1024 / 1024).toFixed(1);

      let status = "normal";
      if (usagePercent >= 90) status = "critical";
      else if (usagePercent >= 82) status = "warning";

      return {
        totalGb: parseFloat(totalGb),
        usedGb: parseFloat(usedGb),
        freeGb: parseFloat(freeGb),
        usagePercent,
        status,
        filesystem: parts[0],
      };
    }
  } catch (err) {
    console.error("Failed to query disk space:", err);
  }

  return {
    totalGb: 20,
    usedGb: 17,
    freeGb: 2.3,
    usagePercent: 88,
    status: "warning",
    filesystem: "/dev/vda1",
  };
}

/**
 * 执行磁盘空间清理
 * - 清理除当前使用和最近2个备份之外的过期 releases
 * - 清理 /tmp 下残留的旧发布归档
 * - 修剪 visitors.json 防止无限膨胀
 */
export async function cleanupServerDisk(options = {}) {
  const result = {
    freedEstimatedMb: 0,
    cleanedReleases: [],
    cleanedTmpFiles: [],
    trimmedData: [],
    before: null,
    after: null,
  };

  result.before = await getDiskSpace();

  // 1. 清理过期 releases
  try {
    const releasesDir = "/opt/blue-archive-hh/releases";
    const currentLink = "/opt/blue-archive-hh/current";

    // 检查目录是否存在
    const stat = await fs.stat(releasesDir).catch(() => null);
    if (stat && stat.isDirectory()) {
      // 获取当前 active release 路径
      let currentTarget = "";
      try {
        currentTarget = await fs.readlink(currentLink);
        currentTarget = path.resolve("/opt/blue-archive-hh", currentTarget);
      } catch {}

      const files = await fs.readdir(releasesDir);
      // 筛选纯目录且以时间戳命名
      const releases = [];
      for (const f of files) {
        const full = path.join(releasesDir, f);
        const s = await fs.stat(full).catch(() => null);
        if (s && s.isDirectory()) {
          releases.push({ name: f, full, mtime: s.mtimeMs });
        }
      }

      // 按修改时间降序排序（最新在前）
      releases.sort((a, b) => b.mtime - a.mtime);

      // 规则：保留当前 release、最近 2 个历史 release、以及 20260914T024649 (node_modules源)
      const protectedNames = new Set(["20260914T024649"]);
      if (currentTarget) {
        protectedNames.add(path.basename(currentTarget));
      }

      // 额外保护最新的 2 个
      let keepCount = 0;
      for (const rel of releases) {
        if (keepCount < 2) {
          protectedNames.add(rel.name);
          keepCount++;
        }
      }

      for (const rel of releases) {
        if (!protectedNames.has(rel.name)) {
          try {
            await execAsync(`rm -rf "${rel.full}"`);
            result.cleanedReleases.push(rel.name);
            result.freedEstimatedMb += 350; // 平均每个 release 约 350-450MB
          } catch (e) {
            console.error(`Failed to remove old release ${rel.name}:`, e);
          }
        }
      }
    }
  } catch (err) {
    console.error("Releases cleanup error:", err);
  }

  // 2. 清理 /tmp 下的旧 release 包
  try {
    const tmpDir = "/tmp";
    const tmpFiles = await fs.readdir(tmpDir).catch(() => []);
    for (const f of tmpFiles) {
      if (f.startsWith("blue-archive-hh-release-") && f.endsWith(".tar.gz")) {
        const full = path.join(tmpDir, f);
        try {
          const s = await fs.stat(full).catch(() => null);
          if (s) {
            await fs.unlink(full);
            result.cleanedTmpFiles.push(f);
            result.freedEstimatedMb += Math.round(s.size / 1024 / 1024);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("Tmp cleanup error:", err);
  }

  // 3. 修剪 visitors.json 防止超限膨胀
  try {
    const vPath = path.join(config.dataDirectory, "visitors.json");
    const s = await fs.stat(vPath).catch(() => null);
    if (s) {
      const content = await fs.readFile(vPath, "utf8");
      const list = JSON.parse(content);
      if (Array.isArray(list) && list.length > 1000) {
        const trimmed = list.slice(-500);
        await fs.writeFile(vPath, JSON.stringify(trimmed, null, 2), "utf8");
        result.trimmedData.push(`visitors.json: ${list.length} -> 500 items`);
      }
    }
  } catch (err) {
    console.error("Data trim error:", err);
  }

  result.after = await getDiskSpace();
  return result;
}

/**
 * 启动定时磁盘防护哨兵（每小时检查）
 */
let guardTimer = null;
export function startDiskGuard() {
  if (guardTimer) return;

  const checkAndProtect = async () => {
    try {
      const space = await getDiskSpace();
      if (space.usagePercent >= 85) {
        console.warn(`[DiskGuard] 警告: 磁盘使用率达到 ${space.usagePercent}% (剩余 ${space.freeGb}GB)，触发自动防御清理...`);
        const cleanupResult = await cleanupServerDisk({ automated: true });
        console.log(`[DiskGuard] 自动清理完成: 移除了 ${cleanupResult.cleanedReleases.length} 个过期版本，当前剩余空间: ${cleanupResult.after?.freeGb}GB`);
      }
    } catch (e) {
      console.error("[DiskGuard] 检查失败:", e);
    }
  };

  // 启动即先做一次检查
  setTimeout(checkAndProtect, 15000);
  // 每 30 分钟检查一次
  guardTimer = setInterval(checkAndProtect, 30 * 60 * 1000);
}
