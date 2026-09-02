import { Router } from 'express'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { requireModuleAccess } from './site-access.mjs'
import { requirePermission } from './auth.mjs'
import { config, siteDataNames } from './config.mjs'
import { getSiteData } from './repository.mjs'
import { readJSON, writeJSON } from './lib/json-store.mjs'
import { recordAudit } from './audit.mjs'

export const staticDataRoutes = Router()

const dataFiles = {
  changelog: 'changelog.json',
  contributors: 'contributors.json',
}

async function readSourceJson(fileName) {
  const filePath = path.join(config.root, 'src', 'data', fileName)
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function validStoryCoordinate(value) {
  return /^[1-9][0-9]{0,2}$/.test(String(value || ''))
}

function storyFileName(volume, chapter) {
  return `story-v${volume}-c${chapter}.json`
}

async function readStoryIndex() {
  const stored = await readJSON('story-index.json', false)
  return Array.isArray(stored) ? stored : readSourceJson('story/index.json')
}

async function readStoryChapter(volume, chapter) {
  const stored = await readJSON(storyFileName(volume, chapter), false)
  return stored && typeof stored === 'object' && !Array.isArray(stored)
    ? stored
    : readSourceJson(`story/vol${volume}/ch${chapter}.json`)
}

function normalizeText(value, label, maxLength, required = true) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${label}无效`)
    return ''
  }
  const text = value.trim()
  if (required && !text) throw new Error(`${label}不能为空`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  return text
}

function normalizeStoryIndex(value) {
  if (!Array.isArray(value) || value.length > 80) throw new Error('剧情索引格式无效')
  const volumes = new Set()
  return value
    .map((entry) => {
      const volume = Number(entry?.volume)
      if (!Number.isInteger(volume) || volume < 1 || volume > 999 || volumes.has(volume)) {
        throw new Error('剧情卷编号无效或重复')
      }
      volumes.add(volume)
      if (!Array.isArray(entry?.chapters) || !entry.chapters.length || entry.chapters.length > 300) {
        throw new Error('每卷至少需要一个章节')
      }
      const chapters = [...new Set(entry.chapters.map((chapter) => Number(chapter)))]
      if (chapters.some((chapter) => !Number.isInteger(chapter) || chapter < 1 || chapter > 999)) {
        throw new Error('章节编号无效')
      }
      return { volume, chapters: chapters.sort((left, right) => left - right) }
    })
    .sort((left, right) => left.volume - right.volume)
}

function normalizeStoryChapter(value, volume, chapter) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('章节格式无效')
  const characters = Array.isArray(value.characters)
    ? [...new Set(value.characters.map((character) => normalizeText(character, '角色名称', 80)))].slice(0, 30)
    : []
  if (!characters.length) throw new Error('章节至少需要一名角色')
  if (!Array.isArray(value.segments) || !value.segments.length || value.segments.length > 2_000) {
    throw new Error('章节至少需要一段对白')
  }
  const ids = new Set()
  const segments = value.segments.map((segment) => {
    const id = normalizeText(segment?.id, '对白编号', 160)
    if (!/^[A-Za-z0-9_-]+$/.test(id) || ids.has(id)) throw new Error('对白编号无效或重复')
    ids.add(id)
    const portrait = normalizeText(segment?.portrait, '立绘地址', 2_048, false)
    if (portrait && !/^(https?:\/\/|\/)/.test(portrait)) throw new Error('立绘地址必须是 HTTPS 或站内绝对路径')
    const portraitSide = segment?.portraitSide === 'right' ? 'right' : 'left'
    return {
      id,
      speaker: normalizeText(segment?.speaker, '说话人', 80),
      speakerJa: normalizeText(segment?.speakerJa, '日文说话人', 80, false),
      ja: normalizeText(segment?.ja, '日文对白', 8_000),
      zh: normalizeText(segment?.zh, '中文对白', 8_000),
      context: normalizeText(segment?.context, '场景说明', 500, false),
      ...(portrait ? { portrait } : {}),
      portraitSide,
    }
  })
  return {
    volume: Number(volume),
    chapter: Number(chapter),
    title: normalizeText(value.title, '章节标题', 160),
    titleJa: normalizeText(value.titleJa, '日文标题', 160, false),
    characters,
    segments,
  }
}

async function readModuleData(module) {
  if (siteDataNames.includes(module)) return getSiteData(module)
  return readSourceJson(dataFiles[module])
}

staticDataRoutes.get('/:module', async (req, res) => {
  const module = String(req.params.module || '')
  const fileName = dataFiles[module]
  if (!fileName && !siteDataNames.includes(module)) return res.status(404).json({ message: '数据模块不存在' })
  return requireModuleAccess(module)(req, res, async () => {
    try {
      res.json(await readModuleData(module))
    } catch (error) {
      if (error?.code === 'ENOENT') return res.status(404).json({ message: '数据暂未发布' })
      return res.status(500).json({ message: '模块数据读取失败' })
    }
  })
})

export const storyDataRoutes = Router()

storyDataRoutes.get('/index', requireModuleAccess('story'), async (req, res) => {
  try {
    res.json(await readStoryIndex())
  } catch (error) {
    if (error?.code === 'ENOENT') return res.status(404).json({ message: '剧情索引暂未发布' })
    res.status(500).json({ message: '剧情索引读取失败' })
  }
})

storyDataRoutes.get('/admin/index', requirePermission('story'), async (req, res) => {
  try {
    res.json(await readStoryIndex())
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '剧情索引读取失败' })
  }
})

storyDataRoutes.put('/admin/index', requirePermission('story'), async (req, res) => {
  try {
    const value = normalizeStoryIndex(req.body)
    await writeJSON('story-index.json', value)
    await recordAudit({ actor: req.admin, action: 'story.index.save', target: 'story-index' })
    res.json({ ok: true, value })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '剧情索引保存失败' })
  }
})

storyDataRoutes.get('/admin/:volume/:chapter', requirePermission('story'), async (req, res) => {
  const volume = String(req.params.volume || '')
  const chapter = String(req.params.chapter || '')
  if (!validStoryCoordinate(volume) || !validStoryCoordinate(chapter)) {
    return res.status(400).json({ message: '章节编号无效' })
  }
  try {
    res.json(await readStoryChapter(volume, chapter))
  } catch (error) {
    if (error?.code === 'ENOENT') return res.status(404).json({ message: '该章节数据尚未收录' })
    return res.status(500).json({ message: '章节数据读取失败' })
  }
})

storyDataRoutes.put('/admin/:volume/:chapter', requirePermission('story'), async (req, res) => {
  const volume = String(req.params.volume || '')
  const chapter = String(req.params.chapter || '')
  if (!validStoryCoordinate(volume) || !validStoryCoordinate(chapter)) {
    return res.status(400).json({ message: '章节编号无效' })
  }
  try {
    const value = normalizeStoryChapter(req.body, volume, chapter)
    await writeJSON(storyFileName(volume, chapter), value)
    await recordAudit({ actor: req.admin, action: 'story.chapter.save', target: `vol${volume}-ch${chapter}` })
    res.json({ ok: true, value })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '剧情章节保存失败' })
  }
})

storyDataRoutes.get('/:volume/:chapter', requireModuleAccess('story'), async (req, res) => {
  const volume = String(req.params.volume || '')
  const chapter = String(req.params.chapter || '')
  if (!validStoryCoordinate(volume) || !validStoryCoordinate(chapter)) {
    return res.status(400).json({ message: '章节编号无效' })
  }
  try {
    res.json(await readStoryChapter(volume, chapter))
  } catch (error) {
    if (error?.code === 'ENOENT') return res.status(404).json({ message: '该章节数据尚未收录' })
    res.status(500).json({ message: '章节数据读取失败' })
  }
})
