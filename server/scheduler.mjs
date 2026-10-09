/**
 * 蔚蓝档案汉化站 - 自动化定时任务与系统守护调度器
 */
import { getMailConfig, sendDailyReportEmail } from "./mailer.mjs";
import { startDiskGuard } from "./diskProtection.mjs";

let reportTimer = null;
let nextScheduledDate = null;

export function getNextReportSchedule() {
  return nextScheduledDate;
}

/**
 * 计算距离下一个目标时间的毫秒数
 * @param {string} targetTimeStr "HH:mm"，例如 "08:00"
 */
function msUntilTargetTime(targetTimeStr) {
  const [hourStr, minStr] = (targetTimeStr || "08:00").split(":");
  const targetHour = parseInt(hourStr, 10) || 8;
  const targetMin = parseInt(minStr, 10) || 0;

  const now = new Date();
  const next = new Date(now);
  next.setHours(targetHour, targetMin, 0, 0);

  // 如果今天设定的时间已经过去了，顺延到明天
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  nextScheduledDate = next;
  return next.getTime() - now.getTime();
}

/**
 * 调度下一次每日报告任务
 */
export async function scheduleNextDailyReport() {
  if (reportTimer) {
    clearTimeout(reportTimer);
    reportTimer = null;
  }

  try {
    const config = await getMailConfig(false);
    if (!config.enabled || !config.scheduleEnabled || !config.defaultTo) {
      console.log("[Scheduler] 邮件报告未启用或缺少默认收件人，挂起定时器");
      nextScheduledDate = null;
      return;
    }

    const delayMs = msUntilTargetTime(config.scheduleTime);
    const delayMinutes = Math.round(delayMs / 60000);
    console.log(`[Scheduler] 下次每日报告已调度: 将在约 ${delayMinutes} 分钟后 (${nextScheduledDate.toLocaleString("zh-CN")}) 发送至 ${config.defaultTo}`);

    reportTimer = setTimeout(async () => {
      try {
        console.log(`[Scheduler] 触发自动化每日邮件报告发送...`);
        await sendDailyReportEmail();
        console.log(`[Scheduler] 每日邮件报告已成功发送`);
      } catch (err) {
        console.error(`[Scheduler] 每日邮件报告发送失败:`, err);
      } finally {
        // 执行完毕后循环调度下一次
        scheduleNextDailyReport();
      }
    }, delayMs);
  } catch (err) {
    console.error("[Scheduler] 调度初始化失败:", err);
  }
}

/**
 * 初始化系统后台全部调度器
 */
export function initScheduler() {
  // 1. 启动磁盘保护哨兵
  startDiskGuard();

  // 2. 启动邮件报告定时器
  scheduleNextDailyReport();
}
