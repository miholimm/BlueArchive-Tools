import { Router } from 'express'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { config } from './config.mjs'
import { requireApiKey } from './api-key-auth.mjs'
import { requireModuleAccess } from './site-access.mjs'

export const apiV1 = Router()
apiV1.use(requireModuleAccess('status'))

apiV1.get('/status', requireApiKey, async (req, res) => {
  try {
    const file = join(config.dataDirectory, 'translation_progress.json')
    const data = JSON.parse(await readFile(file, 'utf8'))
    const chapter = String(req.query.chapter || '').trim().toLowerCase()
    const entries = Array.isArray(data) ? data : []
    const result = chapter
      ? entries.filter(entry => String(entry.chapter || '').toLowerCase().includes(chapter))
      : entries
    res.json({ code: 0, data: result, key: req.apiKey?.name })
  } catch (error) {
    if (error?.code === 'ENOENT') return res.json({ code: 0, data: [] })
    res.status(500).json({ code: -1, error: error instanceof Error ? error.message : '进度读取失败' })
  }
})
