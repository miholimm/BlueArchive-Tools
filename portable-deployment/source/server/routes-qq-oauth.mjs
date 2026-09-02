import crypto from 'node:crypto'
import { Router } from 'express'
import { config } from './config.mjs'

const stateStore = new Map()
const sessionStore = new Map()
const stateTtlMs = 10 * 60 * 1000
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000

export const qqOAuthRoutes = Router()

function isConfigured() {
  return Boolean(config.qqOAuthAppId && config.qqOAuthAppSecret && config.qqOAuthRedirectUri)
}

function purgeExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of stateStore) {
    if (value.expiresAt <= now) stateStore.delete(key)
  }
  for (const [key, value] of sessionStore) {
    if (value.expiresAt <= now) sessionStore.delete(key)
  }
}

function readCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';')
  for (const entry of cookies) {
    const [key, ...value] = entry.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='))
      } catch {
        return ''
      }
    }
  }
  return ''
}

function cookieAttributes(req, maxAge = sessionTtlMs) {
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    req.secure ? 'Secure' : '',
    `Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}`,
  ].filter(Boolean).join('; ')
}

function writeSessionCookie(req, res, token) {
  res.append('Set-Cookie', `ba_qa_session=${encodeURIComponent(token)}; ${cookieAttributes(req)}`)
}

function clearSessionCookie(req, res) {
  res.append('Set-Cookie', `ba_qa_session=; ${cookieAttributes(req, 0)}`)
}

function parseProviderPayload(input) {
  const value = String(input || '').trim()
  const callback = value.match(/^callback\s*\(\s*([\s\S]*)\s*\)\s*;?$/)
  const payload = callback ? callback[1] : value
  try {
    return JSON.parse(payload)
  } catch {
    return Object.fromEntries(new URLSearchParams(payload))
  }
}

function fallbackNickname(openid) {
  return `QQ 用户 ${String(openid).slice(-4)}`
}

function publicIdentity(session) {
  if (!session) return null
  return {
    provider: 'qq',
    nickname: session.nickname,
    avatar: session.avatar || '',
  }
}

function redirectToQa(res, result) {
  res.redirect(`/qa?qq=${result}`)
}

export function getQqIdentity(req) {
  purgeExpiredEntries()
  const token = readCookie(req, 'ba_qa_session')
  const session = token && sessionStore.get(token)
  return publicIdentity(session)
}

qqOAuthRoutes.get('/status', (req, res) => {
  res.json({ configured: isConfigured(), identity: getQqIdentity(req) })
})

qqOAuthRoutes.get('/start', (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'QQ 登录尚未配置' })
  purgeExpiredEntries()
  const state = crypto.randomBytes(32).toString('base64url')
  stateStore.set(state, { expiresAt: Date.now() + stateTtlMs })
  const authorizeUrl = new URL('https://graph.qq.com/oauth2.0/authorize')
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', config.qqOAuthAppId)
  authorizeUrl.searchParams.set('redirect_uri', config.qqOAuthRedirectUri)
  authorizeUrl.searchParams.set('state', state)
  res.redirect(authorizeUrl.toString())
})

qqOAuthRoutes.get('/callback', async (req, res) => {
  if (!isConfigured()) return redirectToQa(res, 'unavailable')
  purgeExpiredEntries()
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')
  const stateEntry = stateStore.get(state)
  stateStore.delete(state)
  if (!code || !stateEntry || stateEntry.expiresAt <= Date.now()) return redirectToQa(res, 'invalid')

  try {
    const tokenUrl = new URL('https://graph.qq.com/oauth2.0/token')
    tokenUrl.searchParams.set('grant_type', 'authorization_code')
    tokenUrl.searchParams.set('client_id', config.qqOAuthAppId)
    tokenUrl.searchParams.set('client_secret', config.qqOAuthAppSecret)
    tokenUrl.searchParams.set('code', code)
    tokenUrl.searchParams.set('redirect_uri', config.qqOAuthRedirectUri)
    const tokenResponse = await fetch(tokenUrl, { headers: { Accept: 'application/json' } })
    const tokenPayload = parseProviderPayload(await tokenResponse.text())
    const accessToken = String(tokenPayload.access_token || '')
    if (!tokenResponse.ok || !accessToken) return redirectToQa(res, 'failed')

    const openIdUrl = new URL('https://graph.qq.com/oauth2.0/me')
    openIdUrl.searchParams.set('access_token', accessToken)
    openIdUrl.searchParams.set('unionid', '1')
    const openIdResponse = await fetch(openIdUrl, { headers: { Accept: 'application/json' } })
    const openIdPayload = parseProviderPayload(await openIdResponse.text())
    const openid = String(openIdPayload.openid || '')
    if (!openIdResponse.ok || !openid) return redirectToQa(res, 'failed')

    let nickname = fallbackNickname(openid)
    let avatar = ''
    const profileUrl = new URL('https://graph.qq.com/user/get_user_info')
    profileUrl.searchParams.set('access_token', accessToken)
    profileUrl.searchParams.set('oauth_consumer_key', config.qqOAuthAppId)
    profileUrl.searchParams.set('openid', openid)
    try {
      const profileResponse = await fetch(profileUrl, { headers: { Accept: 'application/json' } })
      const profile = await profileResponse.json()
      if (profileResponse.ok && Number(profile.ret) === 0) {
        nickname = String(profile.nickname || nickname).trim().slice(0, 80) || nickname
        avatar = String(profile.figureurl_qq_2 || profile.figureurl_qq_1 || '').slice(0, 2048)
      }
    } catch {
    }

    const sessionToken = crypto.randomBytes(32).toString('base64url')
    sessionStore.set(sessionToken, {
      nickname,
      avatar,
      expiresAt: Date.now() + sessionTtlMs,
    })
    writeSessionCookie(req, res, sessionToken)
    return redirectToQa(res, 'connected')
  } catch {
    return redirectToQa(res, 'failed')
  }
})

qqOAuthRoutes.post('/logout', (req, res) => {
  const token = readCookie(req, 'ba_qa_session')
  if (token) sessionStore.delete(token)
  clearSessionCookie(req, res)
  res.json({ ok: true })
})
