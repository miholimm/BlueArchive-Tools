import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { set, get, getAll, getSiteData, getVisitors, setSiteData } from './repository.mjs'
import {
  ADMIN_PERMISSIONS,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  login,
  logout,
  hasPermission,
  requireAuth,
  requirePermission,
  requireRoot,
  updateAdminUser,
  revokeMemberSessions,
} from './auth.mjs'
import { readJSON, updateJSON, checkSensitiveWords } from './lib/json-store.mjs'
import { filterPublicContent, getModuleAccess, normalizeSettings, normalizeAdsConfig, requireModuleAccess } from './site-access.mjs'
import { listAudit, recordAudit } from './audit.mjs'
import { loginRateLimit } from './security.mjs'
import { statusResourceDefinitions, statusResourceIds } from './status.mjs'
import { aggregateGeoStats } from './ipGeo.mjs'
import { getDiskSpace, cleanupServerDisk } from './diskProtection.mjs'
import { getMailConfig, saveMailConfig, sendSmtpMail, sendBackupViaEmail, sendDailyReportEmail } from './mailer.mjs'
import { scheduleNextDailyReport, getNextReportSchedule } from './scheduler.mjs'

export const api = Router()

const feedbackStatuses = new Set(['pending', 'replied', 'adopted', 'rejected'])
const commentStatuses = new Set(['approved', 'rejected'])
const contentPermissions = { news: 'news', download: 'downloads', team: 'news', status: 'status' }
const siteDataPermissions = { tutorial: 'tutorial', faq: 'faq', antiCheat: 'antiCheat' }
const antiCheatStatuses = new Set(['safe', 'warning', 'danger'])
const statusOverrides = new Set(['none', 'normal', 'error'])

function collectionItems(data) {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.items) ? data.items : []
}

async function readItems(filename) {
  return collectionItems(await readJSON(filename, { items: [] }))
}

async function updateItems(filename, updater) {
  return updateJSON(filename, async data => {
    const items = collectionItems(data)
    const next = await updater(items)
    return { items: Array.isArray(next) ? next : items }
  }, { items: [] })
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function responseError(error, fallback = 400) {
  return { status: Number(error?.status) || fallback, message: error instanceof Error ? error.message : '请求失败' }
}

function publicFeedback(item) {
  return {
    id: item.id,
    chapter: item.chapter,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...(item.reply ? { reply: item.reply } : {}),
  }
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

function normalizeId(value, label) {
  const id = String(value || '').trim()
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error(`${label}无效`)
  return id
}

function normalizeArray(value, label, maxLength) {
  if (!Array.isArray(value)) throw new Error(`${label}格式无效`)
  if (value.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 项`)
  return value
}

function normalizeStatusText(value, label) {
  if (value === undefined) return ''
  if (typeof value !== 'string') throw new Error(`${label}无效`)
  return normalizeText(value, label, 120, false)
}

function normalizeStatus(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('维护状态格式无效')
  const resources = normalizeArray(value.resources, '状态资源', statusResourceDefinitions.length)
  if (resources.length !== statusResourceDefinitions.length) throw new Error('必须完整填写九项资源状态')

  const byId = new Map()
  for (const resource of resources) {
    if (!resource || typeof resource !== 'object' || Array.isArray(resource)) throw new Error('状态资源格式无效')
    const id = String(resource.id || '').trim()
    if (!statusResourceIds.has(id)) throw new Error('状态资源包含无效项目')
    if (byId.has(id)) throw new Error('状态资源不能重复')
    const forcedStatus = String(resource.forcedStatus ?? 'none').trim()
    if (!statusOverrides.has(forcedStatus)) throw new Error('强制状态无效')
    byId.set(id, {
      id,
      resourceVersion: normalizeStatusText(resource.resourceVersion, '资源版本'),
      resourceUpdatedAt: normalizeStatusText(resource.resourceUpdatedAt, '资源更新时间'),
      officialVersion: normalizeStatusText(resource.officialVersion, '官方版本'),
      officialUpdatedAt: normalizeStatusText(resource.officialUpdatedAt, '官方更新时间'),
      forcedStatus,
    })
  }

  return {
    resources: statusResourceDefinitions.map(({ id }) => byId.get(id)),
  }
}

function normalizeTutorial(value) {
  return normalizeArray(value, '安装教程', 20).map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`第 ${index + 1} 个教程格式无效`)
    const steps = normalizeArray(item.steps, '教程步骤', 40).map((step, stepIndex) => {
      if (!step || typeof step !== 'object' || Array.isArray(step)) throw new Error(`第 ${index + 1} 个教程的第 ${stepIndex + 1} 步格式无效`)
      return { title: normalizeText(step.title, '步骤标题', 160), desc: normalizeText(step.desc, '步骤说明', 4_000) }
    })
    const commonErrors = normalizeArray(item.commonErrors, '常见错误', 40).map((error, errorIndex) => {
      if (!error || typeof error !== 'object' || Array.isArray(error)) throw new Error(`第 ${index + 1} 个教程的第 ${errorIndex + 1} 项错误格式无效`)
      return { error: normalizeText(error.error, '错误描述', 500), fix: normalizeText(error.fix, '解决方式', 4_000) }
    })
    if (!steps.length) throw new Error('每个平台至少需要一个安装步骤')
    return {
      platform: normalizeText(item.platform, '平台标识', 40),
      label: normalizeText(item.label, '平台名称', 80),
      icon: normalizeText(item.icon, '平台图标', 80),
      steps,
      commonErrors,
    }
  })
}

function normalizeFaq(value) {
  return normalizeArray(value, '常见问题', 200).map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`第 ${index + 1} 个问题格式无效`)
    return {
      category: normalizeText(item.category, '问题分类', 80),
      q: normalizeText(item.q, '问题', 500),
      a: normalizeText(item.a, '回答', 8_000),
    }
  })
}

function normalizeAntiCheat(value) {
  return normalizeArray(value, '反作弊追踪', 20).map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`第 ${index + 1} 个服务器格式无效`)
    const status = String(item.status || '')
    if (!antiCheatStatuses.has(status)) throw new Error('风险等级无效')
    const events = normalizeArray(item.events, '安全事件', 100).map((event, eventIndex) => {
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error(`第 ${index + 1} 个服务器的第 ${eventIndex + 1} 个事件格式无效`)
      return {
        date: normalizeText(event.date, '事件日期', 80),
        title: normalizeText(event.title, '事件标题', 300),
        description: normalizeText(event.description, '事件说明', 4_000),
      }
    })
    return {
      server: normalizeText(item.server, '服务器名称', 80),
      status,
      lastUpdate: normalizeText(item.lastUpdate, '最后更新时间', 80),
      events,
    }
  })
}

function normalizeSiteData(name, value) {
  if (name === 'tutorial') return normalizeTutorial(value)
  if (name === 'faq') return normalizeFaq(value)
  if (name === 'antiCheat') return normalizeAntiCheat(value)
  throw new Error('数据模块不存在')
}

// ── 原有内容 API ──
api.get('/content', async (req, res) => {
  try {
    const content = await getAll()
    const { identity } = await getModuleAccess(req, 'home')
    res.json(filterPublicContent(content, identity))
  } catch { res.status(500).json({ message: '内容读取失败' }) }
})
api.post('/admin/login', loginRateLimit, async (req, res) => {
  try {
    const result = await login(req.body?.username, req.body?.password)
    if (!result) return res.status(401).json({ message: '账号或密码错误' })
    await recordAudit({ actor: result.identity, action: 'admin.login', target: result.identity.username })
    res.json({ token: result.token, ...result.identity })
  } catch {
    res.status(500).json({ message: '登录服务暂时不可用' })
  }
})
api.post('/admin/logout', requireAuth, (req, res) => {
  logout(req.admin.token)
  recordAudit({ actor: req.admin, action: 'admin.logout', target: req.admin.username })
  res.json({ ok: true })
})
api.get('/admin/me', requireAuth, (req, res) => res.json({ ...req.admin, token: undefined }))
api.get('/admin/users', requireRoot, async (req, res) => {
  try {
    res.json({ users: await listAdminUsers(), permissions: ADMIN_PERMISSIONS })
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '账号读取失败' })
  }
})
api.post('/admin/users', requireRoot, async (req, res) => {
  try {
    const user = await createAdminUser(req.body)
    await recordAudit({ actor: req.admin, action: 'admin.user.create', target: user.username })
    res.status(201).json({ user })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '账号创建失败' })
  }
})
api.patch('/admin/users/:id', requireRoot, async (req, res) => {
  try {
    const user = await updateAdminUser(req.params.id, req.body)
    await recordAudit({ actor: req.admin, action: 'admin.user.update', target: user.username })
    res.json({ user })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '账号更新失败' })
  }
})
api.delete('/admin/users/:id', requireRoot, async (req, res) => {
  try {
    await deleteAdminUser(req.params.id)
    await recordAudit({ actor: req.admin, action: 'admin.user.delete', target: req.params.id })
    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '账号删除失败' })
  }
})
api.put('/admin/content/:name', requireAuth, async (req, res) => {
  const permission = contentPermissions[req.params.name]
  if (!permission || !hasPermission(req.admin, permission)) {
    return res.status(403).json({ message: '没有执行此操作的权限' })
  }
  try {
    const value = req.params.name === 'status' ? normalizeStatus(req.body) : req.body
    await set(req.params.name, value)
    await recordAudit({ actor: req.admin, action: 'content.save', target: req.params.name })
    res.json({ ok: true, value })
  } catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : '内容类型不支持或保存失败' }) }
})
api.get('/admin/site-data/:module', requireAuth, async (req, res) => {
  const module = String(req.params.module || '')
  const permission = siteDataPermissions[module]
  if (!permission || !hasPermission(req.admin, permission)) return res.status(403).json({ message: '没有执行此操作的权限' })
  try {
    res.json(await getSiteData(module))
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '站点数据读取失败' })
  }
})
api.put('/admin/site-data/:module', requireAuth, async (req, res) => {
  const module = String(req.params.module || '')
  const permission = siteDataPermissions[module]
  if (!permission || !hasPermission(req.admin, permission)) return res.status(403).json({ message: '没有执行此操作的权限' })
  try {
    const value = normalizeSiteData(module, req.body)
    await setSiteData(module, value)
    await recordAudit({ actor: req.admin, action: 'site-data.save', target: module })
    res.json({ ok: true, value })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '站点数据保存失败' })
  }
})
api.put('/admin/settings', requirePermission('settings'), async (req, res) => {
  try {
    const current = (await getAll()).settings || {}
    const value = await set('settings', {
      ...normalizeSettings(req.body),
      ...(typeof current.discordWebhook === 'string' ? { discordWebhook: current.discordWebhook } : {}),
    })
    await recordAudit({ actor: req.admin, action: 'settings.save', target: 'site-settings' })
    res.json({ ok: true, value })
  } catch { res.status(400).json({ message: '站点设置保存失败' }) }
})
api.get('/admin/audit', requirePermission('security'), async (req, res) => {
  try { res.json(await listAudit(Number(req.query.limit) || 100)) } catch { res.status(500).json({ message: '审计日志读取失败' }) }
})
api.post('/admin/sessions/revoke-members', requireRoot, async (req, res) => {
  revokeMemberSessions()
  await recordAudit({ actor: req.admin, action: 'security.revoke-member-sessions', target: 'all-member-sessions' })
  res.json({ ok: true })
})
api.get('/admin/visitors', requirePermission('visitors'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 1000)
    const visitors = await getVisitors(limit)
    res.json(visitors)
  } catch { res.status(500).json({ message: '访问记录读取失败' }) }
})

api.get('/admin/visitors/export', requirePermission('visitors'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 5000)
    const visitors = await getVisitors(limit)

    const headers = ['IP地址', '访问路径', '设备标识/客户端User-Agent', '来源Referer', '访问时间']
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return ''
      let str = String(val)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str
      }
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = visitors.map(v => [
      escapeCsv(v.ip),
      escapeCsv(v.path),
      escapeCsv(v.ua),
      escapeCsv(v.ref),
      escapeCsv(v.time ? new Date(v.time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '')
    ].join(','))

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const filename = `visitors_${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csvContent)
  } catch (err) {
    console.error('Export visitors CSV failed:', err)
    res.status(500).json({ message: '导出CSV失败' })
  }
})

// ── 数据概览与统计（含 IP 地区统计与磁盘空间） ──
api.get('/admin/overview-stats', requireAuth, async (req, res) => {
  try {
    const allContent = await getAll()
    const visitors = await getVisitors(300)
    const geo = await aggregateGeoStats(visitors)
    const disk = await getDiskSpace()

    res.json({
      contentCounts: {
        news: Array.isArray(allContent.news) ? allContent.news.length : 0,
        download: allContent.download ? Object.values(allContent.download).flat().length : 0,
        team: Array.isArray(allContent.team) ? allContent.team.length : 0,
      },
      geo,
      disk,
    })
  } catch (err) {
    console.error('Failed to get overview stats:', err)
    res.status(500).json({ error: '获取概览统计数据失败' })
  }
})

// ── 磁盘状态与清理 ──
api.get('/admin/system/disk-status', requireAuth, async (req, res) => {
  try {
    const disk = await getDiskSpace()
    res.json(disk)
  } catch (err) {
    res.status(500).json({ error: '获取磁盘状态失败' })
  }
})

api.post('/admin/system/disk-cleanup', requireAuth, async (req, res) => {
  try {
    const result = await cleanupServerDisk({ manual: true })
    await recordAudit({ actor: req.admin, action: 'system.disk-cleanup', target: 'releases-and-tmp' })
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('Disk cleanup error:', err)
    res.status(500).json({ error: '磁盘清理执行失败' })
  }
})

// ── 邮件服务与报告外发 ──
api.get('/admin/mail/config', requireAuth, async (req, res) => {
  try {
    const conf = await getMailConfig(true)
    const nextSchedule = getNextReportSchedule()
    res.json({ ...conf, nextSchedule })
  } catch (err) {
    res.status(500).json({ error: '读取邮件配置失败' })
  }
})

api.post('/admin/mail/config', requireAuth, async (req, res) => {
  try {
    const updated = await saveMailConfig(req.body || {})
    await scheduleNextDailyReport()
    await recordAudit({ actor: req.admin, action: 'mail.update-config', target: 'smtp-settings' })
    const nextSchedule = getNextReportSchedule()
    res.json({ success: true, config: { ...updated, nextSchedule } })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '保存邮件配置失败' })
  }
})

api.post('/admin/mail/test', requireAuth, async (req, res) => {
  try {
    const to = (req.body?.to || '').trim()
    const customConfig = req.body?.config || null
    await sendSmtpMail({
      to,
      subject: '【测试邮件】蔚蓝档案民间汉化站 SMTP 联通测试',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border-radius: 12px; background: #f0f9ff; border: 1px solid #bae6fd;">
          <h2 style="color: #0284c7; margin-top: 0;">🎉 SMTP 邮件服务配置成功</h2>
          <p style="color: #334155; font-size: 14px;">这是一封由蔚蓝档案汉化站系统发出的测试邮件，证明您的 SMTP 账号及授权码配置完全正常。</p>
          <p style="color: #64748b; font-size: 12px;">发送时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `,
      customConfig,
    })
    res.json({ success: true, message: '测试邮件已成功发送' })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '测试邮件发送失败' })
  }
})

api.post('/admin/mail/send-backup', requireAuth, async (req, res) => {
  try {
    const targetEmail = req.body?.targetEmail
    const sendRes = await sendBackupViaEmail(targetEmail)
    await recordAudit({ actor: req.admin, action: 'mail.send-backup', target: targetEmail || 'defaultTo' })
    res.json({ success: true, ...sendRes })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '备份发送失败' })
  }
})

api.post('/admin/mail/send-report', requireAuth, async (req, res) => {
  try {
    const targetEmail = req.body?.targetEmail
    const sendRes = await sendDailyReportEmail(targetEmail)
    await recordAudit({ actor: req.admin, action: 'mail.send-report', target: targetEmail || 'defaultTo' })
    res.json({ success: true, ...sendRes })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '报告发送失败' })
  }
})

// ── Google Ads 广告管理与预留配置 API ──
api.get('/ads', async (req, res) => {
  try {
    const settings = (await get('settings')) || {}
    res.json(normalizeAdsConfig(settings.ads))
  } catch (err) {
    res.status(500).json({ error: '读取广告配置失败' })
  }
})

api.get('/admin/ads', requirePermission('settings'), async (req, res) => {
  try {
    const settings = (await get('settings')) || {}
    res.json(normalizeAdsConfig(settings.ads))
  } catch (err) {
    res.status(500).json({ error: '读取广告配置失败' })
  }
})

api.post('/admin/ads', requirePermission('settings'), async (req, res) => {
  try {
    const current = (await getAll()).settings || {}
    const adsConfig = normalizeAdsConfig(req.body)
    await set('settings', {
      ...current,
      ads: adsConfig,
    })
    await recordAudit({ actor: req.admin, action: 'ads.save', target: 'google-ads-config' })
    res.json({ success: true, ads: adsConfig })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '保存广告配置失败' })
  }
})

export async function handleAdsTxt(req, res) {
  try {
    const settings = (await get('settings')) || {}
    const ads = normalizeAdsConfig(settings.ads)
    if (ads.adsTxt && ads.adsTxt.trim()) {
      res.type('text/plain; charset=utf-8').send(ads.adsTxt.trim() + '\n')
      return
    }
    if (ads.clientId) {
      const cleanPub = ads.clientId.replace(/^ca-/, '').trim()
      const autoContent = `# Google AdSense ads.txt - Blue Archive Localization\ngoogle.com, ${cleanPub}, DIRECT, f08c47fec0942fa0\n`
      res.type('text/plain; charset=utf-8').send(autoContent)
      return
    }
    res.type('text/plain; charset=utf-8').send('# Google AdSense ads.txt placeholder\n# Configure Publisher ID in Admin panel to activate.\n')
  } catch {
    res.status(500).type('text/plain; charset=utf-8').send('# Error reading ads.txt\n')
  }
}

api.get('/ads.txt', handleAdsTxt)

api.get('/archive', requireModuleAccess('archive'), async (req, res) => {
  try {
    const value = await get('archive')
    res.json(Array.isArray(value) ? value : [])
  } catch {
    res.status(500).json({ message: '历史归档读取失败' })
  }
})

// ── 评论 API ──
api.post('/comments', requireModuleAccess('news'), async (req, res) => {
  try {
    const announcementId = normalizeId(req.body?.announcementId, '公告编号')
    const author = normalizeText(req.body?.author, '昵称', 80)
    const content = normalizeText(req.body?.content, '评论内容', 2_000)
    const parentId = req.body?.parentId ? normalizeId(req.body.parentId, '父评论编号') : null
    if (checkSensitiveWords(`${author} ${content}`)) {
      return res.status(400).json({ error: '评论包含敏感内容，请修改后重试' })
    }
    const siteContent = await getAll()
    if (!Array.isArray(siteContent.news) || !siteContent.news.some(item => String(item.id) === announcementId)) {
      return res.status(404).json({ error: '公告不存在' })
    }
    const comment = {
      id: `comment-${randomUUID()}`,
      announcementId,
      parentId,
      author,
      content,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }
    await updateItems('comments.json', items => {
      if (parentId && !items.some(item => item.id === parentId && item.announcementId === announcementId)) {
        throw httpError(400, '父评论不存在')
      }
      items.push(comment)
      return items
    })
    res.status(201).json({ success: true, id: comment.id, status: comment.status })
  } catch (error) {
    const result = responseError(error)
    res.status(result.status).json({ error: result.message || '评论提交失败' })
  }
})

api.get('/comments/:announcementId', requireModuleAccess('news'), async (req, res) => {
  try {
    const announcementId = normalizeId(req.params.announcementId, '公告编号')
    const comments = (await readItems('comments.json')).filter(
      comment => comment.announcementId === announcementId && comment.status === 'approved'
    )
    res.json(comments)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '评论读取失败' })
  }
})

api.get('/admin/comments/pending', requirePermission('comments'), async (req, res) => {
  try {
    res.json((await readItems('comments.json')).filter(comment => comment.status === 'pending'))
  } catch {
    res.status(500).json({ error: '评论读取失败' })
  }
})

api.put('/admin/comments/:id', requirePermission('comments'), async (req, res) => {
  try {
    const id = normalizeId(req.params.id, '评论编号')
    const status = String(req.body?.status || '')
    if (!commentStatuses.has(status)) return res.status(400).json({ error: '评论状态无效' })
    let updatedComment
    await updateItems('comments.json', items => {
      const index = items.findIndex(comment => comment.id === id)
      if (index === -1) throw httpError(404, '评论不存在')
      items[index] = { ...items[index], status, reviewedAt: new Date().toISOString() }
      updatedComment = items[index]
      return items
    })
    await recordAudit({ actor: req.admin, action: `comment.${status}`, target: id })
    res.json({ success: true, item: updatedComment })
  } catch (error) {
    const result = responseError(error)
    res.status(result.status).json({ error: result.message || '评论更新失败' })
  }
})

// ── 反馈 API ──
api.post('/feedback', requireModuleAccess('feedback'), async (req, res) => {
  try {
    const { chapter, original, translation, suggestion } = req.body || {}
    const item = {
      id: `feedback-${randomUUID()}`,
      chapter: normalizeText(chapter, '章节定位', 160),
      original: normalizeText(original, '原文', 8_000),
      translation: normalizeText(translation, '当前译文', 8_000, false),
      suggestion: normalizeText(suggestion, '反馈建议', 8_000),
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    if (checkSensitiveWords(`${item.chapter} ${item.original} ${item.translation} ${item.suggestion}`)) {
      return res.status(400).json({ error: '反馈包含敏感内容，请修改后重试' })
    }
    await updateItems('feedback.json', items => {
      items.push(item)
      return items
    })
    res.status(201).json({ success: true, id: item.id })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '反馈提交失败' })
  }
})

api.get('/feedback', requireModuleAccess('feedback'), async (req, res) => {
  try {
    const items = await readItems('feedback.json')
    res.json(items.map(publicFeedback))
  } catch (error) {
    console.error('feedback read failed', error)
    res.status(500).json({ error: '反馈读取失败' })
  }
})

api.get('/admin/feedback', requirePermission('feedback'), async (req, res) => {
  try {
    res.json(await readItems('feedback.json'))
  } catch {
    res.status(500).json({ error: '反馈读取失败' })
  }
})

api.put('/admin/feedback/:id', requirePermission('feedback'), async (req, res) => {
  try {
    const { status, reply } = req.body || {}
    if (!feedbackStatuses.has(status)) {
      return res.status(400).json({ error: '反馈状态无效' })
    }
    const normalizedReply = reply === undefined ? undefined : normalizeText(reply, '回复内容', 4_000, false)
    if (status === 'replied' && !normalizedReply) return res.status(400).json({ error: '回复状态需要填写回复内容' })
    const id = normalizeId(req.params.id, '反馈编号')
    let updatedFeedback
    await updateItems('feedback.json', items => {
      const index = items.findIndex(f => String(f.id) === id)
      if (index === -1) throw httpError(404, '反馈不存在')
      const current = items[index]
      items[index] = {
        ...current,
        status,
        ...(normalizedReply !== undefined ? { reply: normalizedReply } : {}),
        updatedAt: new Date().toISOString(),
        reviewedBy: req.admin.username
      }
      updatedFeedback = items[index]
      return items
    })
    await recordAudit({ actor: req.admin, action: `feedback.${status}`, target: id })
    res.json({ success: true, item: updatedFeedback })
  } catch (error) {
    const result = responseError(error)
    res.status(result.status).json({ error: result.message || '反馈更新失败' })
  }
})
