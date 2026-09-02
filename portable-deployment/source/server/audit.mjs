import { readJSON, updateJSON } from './lib/json-store.mjs'

const fileName = 'audit_log.json'
const maxEntries = 500

export async function recordAudit({ actor, action, target = '', details = '' }) {
  try {
    await updateJSON(fileName, data => {
      const items = Array.isArray(data.items) ? data.items : []
      items.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: new Date().toISOString(),
        actor: actor?.displayName || actor?.username || 'system',
        actorId: actor?.userId || 'system',
        action: String(action).slice(0, 80),
        target: String(target).slice(0, 160),
        details: String(details).slice(0, 500),
      })
      return { items: items.slice(-maxEntries) }
    }, { items: [] })
  } catch {
  }
}

export async function listAudit(limit = 100) {
  const data = await readJSON(fileName, { items: [] })
  const items = Array.isArray(data.items) ? data.items : []
  return items.slice(-Math.min(Math.max(limit, 1), 200)).reverse()
}
