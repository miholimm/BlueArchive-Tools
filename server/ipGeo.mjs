/**
 * 蔚蓝档案汉化站 - IP 地区归属地解析与聚合统计服务
 */

// 常见私网 IP 判定
function isPrivateIp(ip) {
  if (!ip || typeof ip !== "string") return true;
  const clean = ip.trim().replace(/^::ffff:/, "");
  if (
    clean === "127.0.0.1" ||
    clean === "localhost" ||
    clean === "::1" ||
    clean.startsWith("10.") ||
    clean.startsWith("192.168.") ||
    clean.startsWith("fc00:") ||
    clean.startsWith("fe80:")
  ) {
    return true;
  }
  // 172.16.0.0 - 172.31.255.255
  if (clean.startsWith("172.")) {
    const second = parseInt(clean.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  // 100.64.0.0/10 运营商级 NAT
  if (clean.startsWith("100.")) {
    const second = parseInt(clean.split(".")[1], 10);
    if (second >= 64 && second <= 127) return true;
  }
  return false;
}

// 内存 LRU 缓存
const geoCache = new Map();
const MAX_CACHE = 3000;

function setCache(ip, info) {
  if (geoCache.size >= MAX_CACHE) {
    const firstKey = geoCache.keys().next().value;
    geoCache.delete(firstKey);
  }
  geoCache.set(ip, info);
}

// 国内主流 A/B 段快速静态估算规则（保证纯离线断网时依然能输出省份）
const KNOWN_PREFIXES = [
  { prefix: "116.23", province: "广东", city: "广州" },
  { prefix: "116.24", province: "广东", city: "深圳" },
  { prefix: "116.25", province: "广西", city: "南宁" },
  { prefix: "14.15", province: "广东", city: "广州" },
  { prefix: "14.116", province: "北京", city: "北京" },
  { prefix: "14.120", province: "湖北", city: "武汉" },
  { prefix: "113.6", province: "广东", city: "广州" },
  { prefix: "113.10", province: "广东", city: "东莞" },
  { prefix: "113.8", province: "广东", city: "深圳" },
  { prefix: "114.8", province: "上海", city: "上海" },
  { prefix: "114.9", province: "上海", city: "上海" },
  { prefix: "114.24", province: "北京", city: "北京" },
  { prefix: "114.25", province: "北京", city: "北京" },
  { prefix: "115.23", province: "浙江", city: "杭州" },
  { prefix: "121.32", province: "广东", city: "广州" },
  { prefix: "121.33", province: "广东", city: "广州" },
  { prefix: "121.40", province: "浙江", city: "杭州" },
  { prefix: "122.22", province: "浙江", city: "宁波" },
  { prefix: "123.12", province: "北京", city: "北京" },
  { prefix: "123.15", province: "天津", city: "天津" },
  { prefix: "124.16", province: "北京", city: "北京" },
  { prefix: "180.97", province: "江苏", city: "南京" },
  { prefix: "180.15", province: "上海", city: "上海" },
  { prefix: "182.14", province: "四川", city: "成都" },
  { prefix: "183.12", province: "浙江", city: "杭州" },
  { prefix: "183.6", province: "广东", city: "深圳" },
  { prefix: "218.11", province: "河北", city: "石家庄" },
  { prefix: "218.17", province: "广东", city: "深圳" },
  { prefix: "218.18", province: "广东", city: "深圳" },
  { prefix: "220.18", province: "浙江", city: "杭州" },
  { prefix: "221.22", province: "江苏", city: "苏州" },
  { prefix: "222.18", province: "四川", city: "成都" },
  { prefix: "223.10", province: "中国", city: "移动骨干网" },
];

/**
 * 查询单 IP 地区信息
 */
export async function lookupIp(rawIp) {
  if (!rawIp) return { region: "未知地区", province: "未知", city: "未知", isp: "" };
  const ip = String(rawIp).trim().replace(/^::ffff:/, "");

  if (isPrivateIp(ip)) {
    return { region: "局域网/内网", province: "内网", city: "本地", isp: "私有网络" };
  }

  if (geoCache.has(ip)) {
    return geoCache.get(ip);
  }

  // 1. 静态前缀匹配
  for (const item of KNOWN_PREFIXES) {
    if (ip.startsWith(item.prefix)) {
      const res = {
        region: `${item.province} ${item.city}`,
        province: item.province,
        city: item.city,
        isp: "电信/联通/移动",
      };
      setCache(ip, res);
      return res;
    }
  }

  // 2. 外部轻量免密查询 API (带超时保底，不阻塞主流程)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const resp = await fetch(`https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data && (data.pro || data.city || data.addr)) {
        const province = data.pro ? data.pro.replace(/省|市|自治区/g, "") : "其他";
        const city = data.city || data.pro || "未知";
        const res = {
          region: data.addr || `${province} ${city}`,
          province: province || "其他",
          city: city || "其他",
          isp: data.region || "",
        };
        setCache(ip, res);
        return res;
      }
    }
  } catch {
    // 超时或离线保底
  }

  // 3. 保底
  const fallback = { region: "中国大陆/公网", province: "国内其他", city: "其他", isp: "" };
  setCache(ip, fallback);
  return fallback;
}

/**
 * 针对访问记录进行聚合地区统计
 */
export async function aggregateGeoStats(visitors) {
  if (!Array.isArray(visitors) || visitors.length === 0) {
    return {
      total: 0,
      uniqueIps: 0,
      topProvinces: [],
      topCities: [],
      topIsps: [],
      recentList: [],
    };
  }

  const uniqueIpSet = new Set();
  const provinceCounts = new Map();
  const cityCounts = new Map();
  const ispCounts = new Map();
  const recentList = [];

  // 取样或解析（最近 300 条做详细统计，保证性能高速响应）
  const samples = visitors.slice(0, 300);

  for (const v of samples) {
    const ip = v.ip || "127.0.0.1";
    uniqueIpSet.add(ip);

    let geo = geoCache.get(ip);
    if (!geo) {
      geo = await lookupIp(ip);
    }

    const p = geo.province || "未知";
    const c = geo.city || "未知";
    const isp = geo.isp ? geo.isp.slice(0, 8) : "其他";

    provinceCounts.set(p, (provinceCounts.get(p) || 0) + 1);
    cityCounts.set(c, (cityCounts.get(c) || 0) + 1);
    ispCounts.set(isp, (ispCounts.get(isp) || 0) + 1);

    if (recentList.length < 15) {
      recentList.push({
        ip,
        region: geo.region,
        province: p,
        city: c,
        path: v.path || "/",
        time: v.time,
      });
    }
  }

  const total = samples.length;

  const toSortedArray = (map, limit = 8) =>
    Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    total: visitors.length,
    sampleSize: total,
    uniqueIps: uniqueIpSet.size,
    topProvinces: toSortedArray(provinceCounts, 8),
    topCities: toSortedArray(cityCounts, 8),
    topIsps: toSortedArray(ispCounts, 5),
    recentList,
  };
}
