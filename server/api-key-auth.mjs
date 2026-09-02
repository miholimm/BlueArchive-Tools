import crypto from 'node:crypto'
import { readJSON } from './lib/json-store.mjs'

const usage = new Map()

export function getApiKeySecret() {
  return process.env.API_KEY_SECRET || process.env.API_SECRET || ''
}

export function hashApiKey(value, secret = getApiKeySecret()) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export function normalizeRateLimit(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), maximum)
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8')
  const b = Buffer.from(String(right || ''), 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function consumeQuota(key) {
  const now = Date.now()
  const minuteLimit = normalizeRateLimit(key.rateLimitPerMin, 100, 2_000)
  const hourLimit = normalizeRateLimit(key.rateLimitPerHour, 1_000, 50_000)
  const entry = usage.get(key.id) || {
    minuteStartedAt: now,
    minuteCount: 0,
    hourStartedAt: now,
    hourCount: 0,
  }

  if (now - entry.minuteStartedAt >= 60_000) {
    entry.minuteStartedAt = now
    entry.minuteCount = 0
  }
  if (now - entry.hourStartedAt >= 3_600_000) {
    entry.hourStartedAt = now
    entry.hourCount = 0
  }

  if (entry.minuteCount >= minuteLimit || entry.hourCount >= hourLimit) {
    usage.set(key.id, entry)
    return {
      allowed: false,
      retryAfter: Math.max(
        1,
        Math.ceil((entry.minuteCount >= minuteLimit ? 60_000 - (now - entry.minuteStartedAt) : 3_600_000 - (now - entry.hourStartedAt)) / 1_000),
      ),
    }
  }

  entry.minuteCount += 1
  entry.hourCount += 1
  usage.set(key.id, entry)
  return { allowed: true, retryAfter: 0 }
}

export async function requireApiKey(req, res, next) {
  const secret = getApiKeySecret()
  if (!secret) return res.status(503).json({ error: 'API_KEY_SECRET 未配置，开发者接口暂不可用' })

  const apiKey = String(req.headers['x-api-key'] || '').trim()
  if (!/^bak_[A-Za-z0-9]{32,128}$/.test(apiKey)) {
    return res.status(401).json({ error: '缺少或无效的 X-API-Key' })
  }

  try {
    const data = await readJSON('api_keys.json', { keys: [] })
    const hash = hashApiKey(apiKey, secret)
    const key = Array.isArray(data.keys)
      ? data.keys.find(entry => !entry.revoked && safeEqual(entry.keyHash, hash))
      : undefined
    if (!key) return res.status(401).json({ error: 'API Key 无效或已吊销' })

    const quota = consumeQuota(key)
    if (!quota.allowed) {
      res.set('Retry-After', String(quota.retryAfter))
      return res.status(429).json({ error: 'API Key 请求频率超限，请稍后再试' })
    }

    req.apiKey = { id: key.id, name: key.name }
    return next()
  } catch {
    return res.status(500).json({ error: 'API Key 校验失败' })
  }
}
