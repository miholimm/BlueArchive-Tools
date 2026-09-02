import { Router } from 'express'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { requireModuleAccess } from './site-access.mjs'
import { config, siteDataNames } from './config.mjs'
import { getSiteData } from './repository.mjs'

export const staticDataRoutes = Router()

const dataFiles = {
  changelog: 'changelog.json',
  contributors: 'contributors.json',
}

async function readSourceJson(fileName) {
  const filePath = path.join(config.root, 'src', 'data', fileName)
  return JSON.parse(await readFile(filePath, 'utf8'))
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
    res.json(await readSourceJson('story/index.json'))
  } catch (error) {
    if (error?.code === 'ENOENT') return res.status(404).json({ message: '剧情索引暂未发布' })
    res.status(500).json({ message: '剧情索引读取失败' })
  }
})

storyDataRoutes.get('/:volume/:chapter', requireModuleAccess('story'), async (req, res) => {
  const volume = String(req.params.volume || '')
  const chapter = String(req.params.chapter || '')
  if (!/^[1-9][0-9]{0,2}$/.test(volume) || !/^[1-9][0-9]{0,2}$/.test(chapter)) {
    return res.status(400).json({ message: '章节编号无效' })
  }
  try {
    res.json(await readSourceJson(`story/vol${volume}/ch${chapter}.json`))
  } catch (error) {
    if (error?.code === 'ENOENT') return res.status(404).json({ message: '该章节数据尚未收录' })
    res.status(500).json({ message: '章节数据读取失败' })
  }
})
