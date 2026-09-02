import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { readJSON, updateJSON } from './lib/json-store.mjs'
import { requirePermission } from './auth.mjs'
import { requireModuleAccess } from './site-access.mjs'
import { recordAudit } from './audit.mjs'

export const glossaryRoutes = Router()
glossaryRoutes.use(requireModuleAccess('glossary'))

function normalizeTermText(value, label, maxLength, required = false) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${label}无效`)
    return ''
  }
  const text = value.trim()
  if (required && !text) throw new Error(`${label}不能为空`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  return text
}

function getTerms(data) {
  return Array.isArray(data?.terms) ? data.terms : []
}

// GET /api/glossary — 返回术语列表（公开，支持 ?search= 查询）
glossaryRoutes.get('/', async (req, res) => {
  try {
    const terms = getTerms(await readJSON('glossary.json', { terms: [] }))
    const search = String(req.query.search || '').trim().slice(0, 120)
    if (search) {
      const q = search.toLowerCase()
      const filtered = terms.filter(
        t =>
          String(t.ja || '').toLowerCase().includes(q) ||
          String(t.zh || '').toLowerCase().includes(q) ||
          String(t.romaji || '').toLowerCase().includes(q) ||
          String(t.category || '').toLowerCase().includes(q)
      )
      return res.json(filtered)
    }
    res.json(terms)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/glossary/admin — 新增术语（管理操作）
glossaryRoutes.post('/admin', requirePermission('glossary'), async (req, res) => {
  try {
    const { ja, zh, romaji, category, note } = req.body || {}
    const term = {
      id: 'g-' + randomUUID(),
      ja: normalizeTermText(ja, '日文', 240, true),
      zh: normalizeTermText(zh, '中文', 240, true),
      romaji: normalizeTermText(romaji, '罗马音', 240),
      category: normalizeTermText(category, '分类', 80),
      note: normalizeTermText(note, '备注', 2_000),
      createdAt: new Date().toISOString()
    }
    await updateJSON('glossary.json', data => {
      const terms = getTerms(data)
      terms.push(term)
      return { terms }
    }, { terms: [] })
    await recordAudit({ actor: req.admin, action: 'glossary.create', target: term.id })
    res.status(201).json({ success: true, term })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '术语创建失败' })
  }
})

// PUT /api/glossary/admin/:id — 编辑术语
glossaryRoutes.put('/admin/:id', requirePermission('glossary'), async (req, res) => {
  try {
    let updatedTerm
    await updateJSON('glossary.json', data => {
      const terms = getTerms(data)
      const idx = terms.findIndex(t => t.id === req.params.id)
      if (idx === -1) {
        const error = new Error('not found')
        error.status = 404
        throw error
      }
      const { ja, zh, romaji, category, note } = req.body || {}
      if (ja !== undefined) terms[idx].ja = normalizeTermText(ja, '日文', 240, true)
      if (zh !== undefined) terms[idx].zh = normalizeTermText(zh, '中文', 240, true)
      if (romaji !== undefined) terms[idx].romaji = normalizeTermText(romaji, '罗马音', 240)
      if (category !== undefined) terms[idx].category = normalizeTermText(category, '分类', 80)
      if (note !== undefined) terms[idx].note = normalizeTermText(note, '备注', 2_000)
      updatedTerm = terms[idx]
      return { terms }
    }, { terms: [] })
    await recordAudit({ actor: req.admin, action: 'glossary.update', target: updatedTerm.id })
    res.json({ success: true, term: updatedTerm })
  } catch (error) {
    res.status(error?.status || 400).json({ error: error instanceof Error ? error.message : '术语更新失败' })
  }
})

// DELETE /api/glossary/admin/:id — 删除术语
glossaryRoutes.delete('/admin/:id', requirePermission('glossary'), async (req, res) => {
  try {
    let deletedId = ''
    await updateJSON('glossary.json', data => {
      const terms = getTerms(data)
      const idx = terms.findIndex(t => t.id === req.params.id)
      if (idx === -1) {
        const error = new Error('not found')
        error.status = 404
        throw error
      }
      const [term] = terms.splice(idx, 1)
      deletedId = term.id
      return { terms }
    }, { terms: [] })
    await recordAudit({ actor: req.admin, action: 'glossary.delete', target: deletedId })
    res.json({ success: true })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : '术语删除失败' })
  }
})
