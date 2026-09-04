import { Router } from 'express'
import dns from 'node:dns'

// 剧情 JSON 代理：让浏览器端 ba-story-player 能加载社区剧情数据，
// 绕开 CORS 限制（同源走本站 Express）。
// 安全层：域名白名单 + 协议限制 + DNS 解析防 SSRF（禁止内网/回环地址）+ 体积/超时限制。
export const storyProxyRoutes = Router()

const ALLOWED_HOSTS = new Set([
  'preview.blue-archive.io',
  'yuuka.cdn.diyigemt.com',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
  'api.github.com',
])
const ALLOWED_SUFFIXES = ['.blue-archive.io', '.githubusercontent.com']
const MAX_BYTES = 8 * 1024 * 1024
const TIMEOUT_MS = 12000

function isAllowed(hostname) {
  if (ALLOWED_HOSTS.has(hostname)) return true
  return ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}

// 解析主机名并拒绝任何指向私有/保留网段的地址（防 SSRF / DNS 重绑定）
async function assertPublicHost(hostname) {
  let addresses
  try {
    addresses = await dns.promises.lookup(hostname, { all: true })
  } catch {
    throw new Error('域名解析失败')
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error('目标解析到内网/保留地址，已拒绝')
    }
  }
}

function isPrivateIp(ip) {
  if (ip.includes(':')) {
    // IPv6：回环 / 唯一本地地址 (fc00::/7) / 链路本地 (fe80::/10)
    if (ip === '::1' || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fe8') || ip.toLowerCase().startsWith('fe9') || ip.toLowerCase().startsWith('fea') || ip.toLowerCase().startsWith('feb')) {
      return true
    }
    return false
  }
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true
  if (p[0] === 0) return true // 0.0.0.0/8
  if (p[0] === 10) return true // 10.0.0.0/8
  if (p[0] === 127) return true // 127.0.0.0/8
  if (p[0] === 169 && p[1] === 254) return true // 169.254.0.0/16
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true // 172.16.0.0/12
  if (p[0] === 192 && p[1] === 168) return true // 192.168.0.0/16
  return false
}

export async function handleStoryProxy(req, res) {
  const raw = req.query.url
  if (typeof raw !== 'string' || !raw) {
    return res.status(400).json({ error: '缺少 url 参数' })
  }

  let target
  try {
    target = new URL(raw)
  } catch {
    return res.status(400).json({ error: 'url 格式无效' })
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return res.status(400).json({ error: '仅支持 http / https' })
  }
  if (!isAllowed(target.hostname)) {
    return res.status(403).json({ error: '该域名不在允许代理的范围内' })
  }
  try {
    await assertPublicHost(target.hostname)
  } catch (e) {
    return res.status(403).json({ error: e instanceof Error ? e.message : '目标地址被拒绝' })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        referer: 'https://blue-archive.io/',
        accept: 'application/json, text/plain, */*',
      },
    })
    clearTimeout(timer)

    if (!upstream.ok) {
      return res.status(502).json({ error: `上游返回 ${upstream.status}` })
    }
    const text = await upstream.text()
    if (text.length > MAX_BYTES) {
      return res.status(502).json({ error: '剧情数据过大' })
    }

    res.set('cache-control', 'public, max-age=300')
    res.type('application/json').send(text)
  } catch {
    clearTimeout(timer)
    res.status(502).json({ error: '代理拉取失败（可能网络不可达或上游拒绝）' })
  }
}

storyProxyRoutes.get('/', handleStoryProxy)
storyProxyRoutes.get('', handleStoryProxy)
