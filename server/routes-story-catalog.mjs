import { Router } from 'express'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// 剧情目录：从 ba-archive/blue-archive（碧蓝档案剧情站）仓库枚举全部剧情 JSON。
// 仓库即线上剧情站 blue-archive.io 的源，public/story/{类型}/{学生}/{剧情}.json。
// GitHub trees 结果内存缓存 1 小时，避免触发未认证限流（60 次/时）。

const REPO = 'ba-archive/blue-archive'
const STORY_PREFIX = 'apps/blue-archive-story-viewer/public/story/'
const CACHE_TTL = 60 * 60 * 1000

// 学生 Id → 中文名（来自剧情站 students.yaml，构建期转换的静态映射）
const HERE = dirname(fileURLToPath(import.meta.url))
let studentNames = {}
try {
  studentNames = JSON.parse(readFileSync(join(HERE, 'data', 'student-names.json'), 'utf8'))
} catch {
  studentNames = {}
}

const studentName = (id) => studentNames[id] || ''

// 依据路径生成可读标题：favor/event/ai 带学生名与话数，main/other 保留编号
function makeTitle(type, seg, file) {
  let studentId = ''
  let ep = ''
  if (type === 'favor') {
    studentId = seg[1] ?? ''
    ep = file.slice(5)
  } else if (type === 'ai') {
    // ai/favor/{学生}/{GroupId}
    studentId = seg[2] ?? ''
    ep = file.slice(5)
  } else if (type === 'event') {
    studentId = seg[1] ?? ''
    ep = file.slice(5)
  }
  const name = studentName(studentId)
  const epNum = parseInt(ep, 10)
  if (name && Number.isFinite(epNum) && epNum > 0) {
    return type === 'ai' ? `${name} 第${epNum}话（AI翻译）` : `${name} 第${epNum}话`
  }
  if (name) return name
  return ''
}

let cache = null

async function fetchCatalog() {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.data

  const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'blue-archive-localization-web',
    },
    // GitHub trees 可能较大，给足超时
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`GitHub trees ${res.status}`)

  const json = await res.json()
  const items = (json.tree ?? [])
    .filter((t) => t.path.startsWith(STORY_PREFIX) && t.path.endsWith('.json'))
    .map((t) => {
      // 相对路径：{类型}/{学生}/{剧情}.json（部分类型可能无学生层级）
      const rel = t.path.slice(STORY_PREFIX.length)
      const seg = rel.split('/')
      const type = seg[0]
      const file = seg[seg.length - 1].replace(/\.json$/, '')
      return { type, file, path: rel, title: makeTitle(type, seg, file) }
    })

  const data = {
    total: items.length,
    // 供前端按 jsDelivr 直连拼 URL（CORS 开放，已在代理白名单）
    cdn: `https://cdn.jsdelivr.net/gh/${REPO}@main/${STORY_PREFIX}`,
    repo: REPO,
    items,
  }
  cache = { at: Date.now(), data }
  return data
}

export const storyCatalogRoutes = Router()

storyCatalogRoutes.get('/', async (_req, res) => {
  try {
    const data = await fetchCatalog()
    res.set('cache-control', 'public, max-age=600')
    res.json(data)
  } catch (e) {
    res.status(502).json({
      error: e instanceof Error ? e.message : '剧情目录拉取失败',
      hint: 'GitHub trees 接口暂时不可用，可稍后重试',
    })
  }
})
