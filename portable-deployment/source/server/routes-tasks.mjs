import { Router } from 'express'
import { readJSON, updateJSON } from './lib/json-store.mjs'
import { requirePermission, requireRoot } from './auth.mjs'
import { recordAudit } from './audit.mjs'
import { requireModuleAccess } from './site-access.mjs'

export const taskRoutes = Router()
taskRoutes.use(requireModuleAccess('workspace'))

const CLAIM_TIMEOUT_MS = 72 * 60 * 60 * 1000 // 72 小时
const taskStatuses = new Set(['open', 'claimed', 'submitted', 'approved', 'rejected'])

function taskCollection(data) {
  return Array.isArray(data?.tasks) ? data.tasks : []
}

function normalizeTaskText(value, label, maxLength, required = true) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${label}无效`)
    return ''
  }
  const text = value.trim()
  if (required && !text) throw new Error(`${label}不能为空`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  return text
}

function publicTask(task) {
  const { contact: _contact, ...safeTask } = task
  return safeTask
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function releaseExpiredInPlace(tasks) {
  const now = Date.now()
  for (const task of tasks) {
    if (task.status === 'claimed' && task.claimedAt && now - new Date(task.claimedAt).getTime() > CLAIM_TIMEOUT_MS) {
      task.status = 'open'
      task.claimant = ''
      delete task.claimantId
      task.contact = ''
      delete task.claimedAt
      delete task.submittedAt
    }
  }
  return tasks
}

async function updateTasks(updater) {
  let result
  await updateJSON('tasks.json', async data => {
    const tasks = releaseExpiredInPlace(taskCollection(data))
    result = await updater(tasks)
    return { tasks }
  }, { tasks: [] })
  return result
}

/**
 * 懒检查：释放超时未提交的已认领任务。
 */
async function releaseExpiredTasks() {
  return updateTasks(tasks => tasks)
}

taskRoutes.get('/', requirePermission('tasks'), async (req, res) => {
  try {
    const tasks = await releaseExpiredTasks()
    const displayName = req.admin.displayName || req.admin.username
    const visible = tasks.filter(task => {
      if (task.status === 'open') return true
      if (task.status !== 'claimed' && task.status !== 'submitted') return false
      return req.admin.isRoot || (task.claimantId
        ? task.claimantId === req.admin.userId
        : task.claimant === displayName)
    })
    res.json(visible.map(publicTask))
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : '任务读取失败' })
  }
})

taskRoutes.post('/:id/claim', requirePermission('tasks'), async (req, res) => {
  try {
    const claimant = req.admin.displayName || req.admin.username
    const task = await updateTasks(tasks => {
      const task = tasks.find(t => t.id === req.params.id)
      if (!task) throw httpError(404, '任务不存在')
      if (task.status !== 'open') throw httpError(409, `任务已被认领（状态：${task.status}）`)
      task.status = 'claimed'
      task.claimant = claimant
      task.claimantId = req.admin.userId
      task.contact = ''
      task.claimedAt = new Date().toISOString()
      return task
    })
    await recordAudit({ actor: req.admin, action: 'task.claim', target: task.id })
    res.json({ success: true, task: publicTask(task) })
  } catch (e) {
    res.status(e?.status || 500).json({ error: e instanceof Error ? e.message : '任务认领失败' })
  }
})

taskRoutes.post('/:id/submit', requirePermission('tasks'), async (req, res) => {
  try {
    const claimant = req.admin.displayName || req.admin.username
    const task = await updateTasks(tasks => {
      const task = tasks.find(t => t.id === req.params.id)
      if (!task) throw httpError(404, '任务不存在')
      if (task.status !== 'claimed') throw httpError(409, '任务状态不是进行中')
      const ownsTask = task.claimantId ? task.claimantId === req.admin.userId : task.claimant === claimant
      if (!ownsTask) throw httpError(403, '认领人不匹配')
      task.claimantId = req.admin.userId
      task.status = 'submitted'
      task.submittedAt = new Date().toISOString()
      return task
    })
    await recordAudit({ actor: req.admin, action: 'task.submit', target: task.id })
    res.json({ success: true, task: publicTask(task) })
  } catch (e) {
    res.status(e?.status || 500).json({ error: e instanceof Error ? e.message : '任务提交失败' })
  }
})

taskRoutes.get('/admin', requirePermission('tasks'), async (req, res) => {
  try {
    res.json(await releaseExpiredTasks())
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : '任务读取失败' })
  }
})

taskRoutes.put('/admin/:id', requirePermission('tasks'), async (req, res) => {
  try {
    const { status } = req.body
    if (!taskStatuses.has(status)) {
      return res.status(400).json({ error: '无效的任务状态' })
    }
    const task = await updateTasks(tasks => {
      const task = tasks.find(t => t.id === req.params.id)
      if (!task) throw httpError(404, '任务不存在')
      task.status = status
      if (status === 'open') {
        task.claimant = ''
        delete task.claimantId
        task.contact = ''
        delete task.claimedAt
        delete task.submittedAt
      }
      if (status === 'approved' || status === 'rejected') task.reviewedAt = new Date().toISOString()
      return task
    })
    await recordAudit({ actor: req.admin, action: `task.${status}`, target: task.id })
    res.json({ success: true, task })
  } catch (e) {
    res.status(e?.status || 500).json({ error: e instanceof Error ? e.message : '任务更新失败' })
  }
})

taskRoutes.post('/admin', requireRoot, async (req, res) => {
  try {
    const task = {
      id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      chapter: normalizeTaskText(req.body?.chapter, '章节', 160),
      title: normalizeTaskText(req.body?.title, '标题', 160),
      description: normalizeTaskText(req.body?.description, '描述', 4_000),
      status: 'open',
      claimant: '',
      claimantId: undefined,
      contact: '',
      createdAt: new Date().toISOString(),
    }
    await updateTasks(tasks => {
      tasks.unshift(task)
    })
    await recordAudit({ actor: req.admin, action: 'task.create', target: task.id })
    res.status(201).json({ success: true, task })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '任务创建失败' })
  }
})

taskRoutes.delete('/admin/:id', requireRoot, async (req, res) => {
  try {
    let deletedId = ''
    await updateTasks(tasks => {
      const index = tasks.findIndex(task => task.id === req.params.id)
      if (index === -1) throw httpError(404, '任务不存在')
      const [task] = tasks.splice(index, 1)
      deletedId = task.id
    })
    await recordAudit({ actor: req.admin, action: 'task.delete', target: deletedId })
    res.json({ success: true })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : '任务删除失败' })
  }
})
