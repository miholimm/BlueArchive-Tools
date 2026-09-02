import fs from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import { config, contentNames, siteDataFiles, siteDataNames } from './config.mjs'
import { readJSON, updateJSON } from './lib/json-store.mjs'
import { createDefaultStatus, normalizeStoredStatus } from './status.mjs'

const defaults = {
  news: [],
  download: { android: [], windows: [], ios: [], macos: [] },
  team: [],
  archive: [],
  status: createDefaultStatus(),
  tutorial: [],
  faq: [],
  antiCheat: [],
  settings: {
    siteTitle: 'Blue Archive Localization',
    siteSubtitle: '为玩家提供高质量本地化体验',
    wallpaper: '',
    backgroundDim: 0,
    accent: 'cyan',
    theme: 'system',
    moduleVisibility: { workspace: 'admin', archive: 'admin' },
  }
}
const fileFor = name => path.join(config.dataDirectory, `${name}.json`)
const storedNames = new Set([...contentNames, ...siteDataNames, 'settings'])
let pool
async function fileRead(name) {
  const value = await readJSON(`${name}.json`, defaults[name])
  return name === 'status' ? normalizeStoredStatus(value) : value
}
export async function initRepository(sourceRoot) {
  await fs.mkdir(config.dataDirectory, { recursive: true })
  const progressTarget = path.join(config.dataDirectory, 'translation_progress.json')
  try {
    await fs.access(progressTarget)
  } catch {
    await fs.copyFile(path.join(sourceRoot, 'src', 'data', 'translation_progress.json'), progressTarget).catch(() => {})
  }
  const sourceFor = name => {
    if (name === 'settings') return path.join(sourceRoot, 'server', 'settings.json')
    return path.join(sourceRoot, 'src', 'data', siteDataFiles[name] || `${name}.json`)
  }
  if (!process.env.DATABASE_URL) {
    for (const name of [...contentNames, ...siteDataNames, 'settings', 'archive']) {
      try { await fs.access(fileFor(name)) } catch { try { await fs.copyFile(sourceFor(name), fileFor(name)) } catch {} }
    }
    return
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined })
  await pool.query('CREATE TABLE IF NOT EXISTS site_content (name TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  for (const name of [...contentNames, ...siteDataNames, 'settings', 'archive']) {
    const existing = await pool.query('SELECT name FROM site_content WHERE name=$1', [name])
    if (!existing.rowCount) {
      const source = sourceFor(name)
      let value = defaults[name]
      try { value = JSON.parse(await fs.readFile(source, 'utf8')) } catch {}
      await pool.query('INSERT INTO site_content(name,value) VALUES($1,$2::jsonb)', [name, JSON.stringify(value)])
    }
  }
}
export async function get(name) {
  if (!pool) return fileRead(name)
  const result = await pool.query('SELECT value FROM site_content WHERE name=$1', [name])
  const value = result.rows[0]?.value ?? defaults[name]
  return name === 'status' ? normalizeStoredStatus(value) : value
}
export async function getAll() { const entries = await Promise.all([...contentNames, 'settings'].map(async name => [name, await get(name)])); return Object.fromEntries(entries) }
export async function set(name, value) {
  if (!storedNames.has(name)) throw new Error('Unsupported resource')
  if (!pool) await updateJSON(`${name}.json`, () => value, defaults[name])
  else await pool.query('INSERT INTO site_content(name,value) VALUES($1,$2::jsonb) ON CONFLICT(name) DO UPDATE SET value=$2::jsonb, updated_at=NOW()', [name, JSON.stringify(value)])
  return value
}
export async function getSiteData(name) {
  if (!siteDataNames.includes(name)) throw new Error('Unsupported site data')
  return get(name)
}
export async function setSiteData(name, value) {
  if (!siteDataNames.includes(name)) throw new Error('Unsupported site data')
  return set(name, value)
}

// === Visitor Tracking ===
const visitorsFile = () => path.join(config.dataDirectory, 'visitors.json')
const MAX_VISITORS = 500

export async function logVisitor(entry) {
  if (pool) {
    await pool.query('CREATE TABLE IF NOT EXISTS visitors (id SERIAL PRIMARY KEY, ip TEXT, path TEXT, user_agent TEXT, referer TEXT, time TIMESTAMPTZ NOT NULL DEFAULT NOW())')
    await pool.query('INSERT INTO visitors(ip,path,user_agent,referer) VALUES($1,$2,$3,$4)', [entry.ip, entry.path, entry.ua || '', entry.ref || ''])
    // Keep only last 1000
    await pool.query('DELETE FROM visitors WHERE id NOT IN (SELECT id FROM visitors ORDER BY id DESC LIMIT 1000)')
    return
  }
  await updateJSON('visitors.json', data => {
    const visitors = Array.isArray(data) ? data : []
    visitors.push(entry)
    return visitors.slice(-MAX_VISITORS)
  }, [])
}

export async function getVisitors(limit = 50) {
  if (pool) {
    await pool.query('CREATE TABLE IF NOT EXISTS visitors (id SERIAL PRIMARY KEY, ip TEXT, path TEXT, user_agent TEXT, referer TEXT, time TIMESTAMPTZ NOT NULL DEFAULT NOW())')
    const result = await pool.query('SELECT ip, path, user_agent, referer, time FROM visitors ORDER BY id DESC LIMIT $1', [limit])
    return result.rows.map(r => ({ ip: r.ip, path: r.path, ua: r.user_agent, ref: r.referer, time: r.time }))
  }
  try {
    const visitors = JSON.parse(await fs.readFile(visitorsFile(), 'utf8'))
    return visitors.slice(-limit).reverse()
  } catch { return [] }
}
