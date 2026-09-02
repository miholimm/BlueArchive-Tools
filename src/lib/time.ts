export function relativeTime(value: string, fallback = "等待下一次同步") {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return fallback;
  const delta = Date.now() - timestamp;
  if (delta < 0) return "计划同步中";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "刚刚自动比对";
  if (minutes < 60) return `${minutes} 分钟前自动比对`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前自动比对`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前自动比对`;
  return value;
}
