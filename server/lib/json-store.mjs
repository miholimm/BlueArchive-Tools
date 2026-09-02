import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises'
import { config } from '../config.mjs'

const dataDir = config.dataDirectory
const fileQueues = new Map()

async function ensureDir() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true })
  }
}

function getFilePath(filename) {
  if (typeof filename !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]*\.json$/.test(filename)) {
    throw new Error('无效的数据文件名')
  }
  return join(dataDir, filename)
}

function cloneValue(value) {
  if (value === null || typeof value !== 'object') return value
  return structuredClone(value)
}

/**
 * Read a JSON file from server/data/ directory.
 * Returns the parsed JSON, or a default value if the file doesn't exist.
 */
export async function readJSON(filename, defaultVal = null) {
  await ensureDir()
  const filePath = getFilePath(filename)
  if (!existsSync(filePath)) {
    return defaultVal !== null ? cloneValue(defaultVal) : { items: [] }
  }
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw)
}

function enqueue(filename, operation) {
  const previous = fileQueues.get(filename) || Promise.resolve()
  const next = previous.catch(() => {}).then(operation)
  fileQueues.set(filename, next)
  return next.finally(() => {
    if (fileQueues.get(filename) === next) fileQueues.delete(filename)
  })
}

async function writeJSONUnlocked(filename, data) {
  await ensureDir()
  const filePath = getFilePath(filename)
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    await rename(tempPath, filePath)
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {})
    throw error
  }
}

/**
 * Write data to a JSON file in server/data/ directory.
 */
export async function writeJSON(filename, data) {
  return enqueue(filename, () => writeJSONUnlocked(filename, data))
}

export async function updateJSON(filename, updater, defaultVal = null) {
  return enqueue(filename, async () => {
    const current = await readJSON(filename, defaultVal)
    const next = await updater(current)
    await writeJSONUnlocked(filename, next)
    return next
  })
}

/**
 * Simple sensitive word check. Returns true if text contains any flagged words.
 */
export function checkSensitiveWords(text) {
  const words = ['敏感词1', '敏感词2', '广告', '推广']
  return words.some(w => String(text || '').includes(w))
}
