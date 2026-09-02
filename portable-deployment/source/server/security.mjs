import { config } from "./config.mjs";

function getClientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function createRateLimit(limit, windowMs) {
  const entries = new Map();
  const maxEntries = 10_000;
  let lastPruneAt = 0;

  function pruneExpired(now) {
    if (now - lastPruneAt < windowMs) return;
    lastPruneAt = now;
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }

  return (req, res, next) => {
    const key = getClientIp(req);
    const now = Date.now();
    pruneExpired(now);
    const entry = entries.get(key);

    if (!entry || now >= entry.resetAt) {
      if (!entry && entries.size >= maxEntries) {
        entries.delete(entries.keys().next().value);
      }
      entries.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > limit) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: "请求过于频繁，请稍后再试" });
    }

    return next();
  };
}

export const rateLimit = createRateLimit(process.env.NODE_ENV === "test" ? 10_000 : 120, 60_000);
export const loginRateLimit = createRateLimit(8, 15 * 60_000);

export function securityHeaders(req, res, next) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
  if (req.secure) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  res.set(headers);
  next();
}

export function getRequestIp(req) {
  return getClientIp(req);
}

export function isProxyTrusted() {
  return config.trustProxy;
}
