import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { hashApiKey, getApiKeySecret, normalizeRateLimit } from './api-key-auth.mjs'
import { readJSON, updateJSON } from './lib/json-store.mjs'
import { requireRoot } from './auth.mjs'
import { recordAudit } from './audit.mjs'

export const apiKeyRoutes = Router()
apiKeyRoutes.use(requireRoot)

function normalizeName(value) {
  const name = String(value || '默认').trim().slice(0, 80)
  return name || '默认'
}

function requireApiKeySecret(res) {
  const secret = getApiKeySecret()
  if (!secret) {
    res.status(503).json({ error: 'API_KEY_SECRET 未配置，暂时无法创建 API Key' })
    return ''
  }
  return secret
}

apiKeyRoutes.get('/', async (req, res) => {
  try {
    const data = await readJSON('api_keys.json', { keys: [] })
    const safeKeys = Array.isArray(data.keys)
      ? data.keys.map(({ keyHash, ...key }) => key)
      : []
    res.json(safeKeys)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'API Key 读取失败' })
  }
})

apiKeyRoutes.post('/', async (req, res) => {
  try {
    const secret = requireApiKeySecret(res)
    if (!secret) return

    const plainKey = `bak_${randomBytes(24).toString('hex')}`
    const entry = {
      id: `key-${Date.now()}-${randomBytes(4).toString('hex')}`,
      name: normalizeName(req.body?.name),
      keyHash: hashApiKey(plainKey, secret),
      keyPreview: `${plainKey.slice(0, 16)}...`,
      rateLimitPerMin: normalizeRateLimit(req.body?.rateLimitPerMin, 100, 2_000),
      rateLimitPerHour: normalizeRateLimit(req.body?.rateLimitPerHour, 1_000, 50_000),
      createdAt: new Date().toISOString(),
      revoked: false,
    }
    await updateJSON('api_keys.json', data => {
      const keys = Array.isArray(data.keys) ? data.keys : []
      keys.push(entry)
      return { keys }
    }, { keys: [] })
    await recordAudit({ actor: req.admin, action: 'api-key.create', target: entry.name })
    res.status(201).json({ success: true, apiKey: plainKey, preview: entry.keyPreview })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'API Key 创建失败' })
  }
})

apiKeyRoutes.delete('/:id', async (req, res) => {
  try {
    let revokedName = ''
    let changed = false
    await updateJSON('api_keys.json', data => {
      const keys = Array.isArray(data.keys) ? data.keys : []
      const key = keys.find(entry => entry.id === req.params.id)
      if (!key) {
        const error = new Error('API Key 不存在')
        error.status = 404
        throw error
      }
      revokedName = key.name
      if (!key.revoked) {
        key.revoked = true
        key.revokedAt = new Date().toISOString()
        changed = true
      }
      return { keys }
    }, { keys: [] })
    if (changed) await recordAudit({ actor: req.admin, action: 'api-key.revoke', target: revokedName })
    res.json({ success: true })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : 'API Key 吊销失败' })
  }
})
