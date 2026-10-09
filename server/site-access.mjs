import { get } from './repository.mjs'
import { getRequestIdentity } from './auth.mjs'

const defaultVisibility = {
  home: 'public',
  team: 'public',
  news: 'public',
  downloads: 'public',
  status: 'public',
  changelog: 'public',
  tutorial: 'public',
  faq: 'public',
  story: 'public',
  feedback: 'public',
  contributors: 'public',
  antiCheat: 'public',
  glossary: 'public',
  qa: 'public',
  apiDocs: 'public',
  workspace: 'admin',
  archive: 'admin',
}

const moduleIds = new Set(Object.keys(defaultVisibility))
const visibilityModes = new Set(['public', 'admin', 'disabled'])
const themeModes = new Set(['light', 'dark', 'system'])

function normalizeBackgroundDim(value) {
  const numericValue = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : Number.NaN
  return Number.isFinite(numericValue)
    ? Math.min(80, Math.max(0, Math.round(numericValue)))
    : 0
}

export function getModuleVisibility(settings = {}) {
  const configured = settings.moduleVisibility && typeof settings.moduleVisibility === 'object'
    ? settings.moduleVisibility
    : {}
  const sanitized = Object.fromEntries(
    Object.entries(configured).filter(([module, mode]) => moduleIds.has(module) && visibilityModes.has(mode)),
  )
  return {
    ...defaultVisibility,
    ...sanitized,
    home: 'public',
    workspace: 'admin',
    archive: 'admin',
  }
}

export function getModuleMode(settings, module) {
  return getModuleVisibility(settings)[module] || 'public'
}

export async function getModuleAccess(req, module) {
  const settings = await get('settings')
  const mode = getModuleMode(settings, module)
  const identity = await getRequestIdentity(req)
  return { mode, identity }
}

export function requireModuleAccess(module) {
  return async (req, res, next) => {
    try {
      const { mode, identity } = await getModuleAccess(req, module)
      if (mode === 'disabled' && !identity) return res.status(404).json({ message: '模块未开放' })
      if (mode === 'admin' && !identity) return res.status(401).json({ message: '请先登录管理员账号' })
      if (identity) req.admin = { ...identity, token: req.admin?.token }
      return next()
    } catch {
      return res.status(500).json({ message: '模块访问策略读取失败' })
    }
  }
}

export function normalizeAdsConfig(ads = {}) {
  const isObj = ads && typeof ads === 'object'
  const rawSlots = isObj && typeof ads.slots === 'object' && ads.slots !== null ? ads.slots : {}
  return {
    enabled: Boolean(isObj && ads.enabled),
    clientId: String((isObj && ads.clientId) || '').trim().slice(0, 80),
    autoAds: Boolean(isObj && ads.autoAds),
    testMode: isObj && ads.testMode !== undefined ? Boolean(ads.testMode) : true,
    showPlaceholder: isObj && ads.showPlaceholder !== undefined ? Boolean(ads.showPlaceholder) : true,
    adsTxt: String((isObj && ads.adsTxt) || '').trim().slice(0, 2048),
    slots: {
      homeBanner: String(rawSlots.homeBanner || '').trim().slice(0, 80),
      downloadBanner: String(rawSlots.downloadBanner || '').trim().slice(0, 80),
      storyReaderBottom: String(rawSlots.storyReaderBottom || '').trim().slice(0, 80),
      qaBanner: String(rawSlots.qaBanner || '').trim().slice(0, 80),
      footerBanner: String(rawSlots.footerBanner || '').trim().slice(0, 80),
    },
  }
}

export function filterPublicContent(content, identity) {
  const visibility = getModuleVisibility(content.settings)
  const { discordWebhook: _discordWebhook, ...publicSettings } = content.settings || {}
  publicSettings.backgroundDim = normalizeBackgroundDim(publicSettings.backgroundDim)
  publicSettings.ads = normalizeAdsConfig(publicSettings.ads)
  const publicDownload = Object.fromEntries(
    Object.entries(content.download || {}).map(([platform, items]) => [
      platform,
      Array.isArray(items) ? items.map(({ checksum: _checksum, ...item }) => item) : [],
    ]),
  )
  if (identity) return { ...content, settings: publicSettings }
  return {
    ...content,
    settings: publicSettings,
    news: visibility.news === 'public' ? content.news : [],
    download: visibility.downloads === 'public' ? publicDownload : { android: [], windows: [], ios: [], macos: [] },
    team: visibility.team === 'public' ? content.team : [],
    status: visibility.status === 'public' ? content.status : { resources: [] },
  }
}

export function normalizeSettings(settings = {}) {
  return {
    siteTitle: String(settings.siteTitle || '').trim().slice(0, 100),
    siteSubtitle: String(settings.siteSubtitle || '').trim().slice(0, 240),
    wallpaper: String(settings.wallpaper || '').trim().slice(0, 2048),
    backgroundDim: normalizeBackgroundDim(settings.backgroundDim),
    accent: String(settings.accent || 'cyan').trim().slice(0, 40),
    theme: themeModes.has(settings.theme) ? settings.theme : 'system',
    moduleVisibility: getModuleVisibility(settings),
    ads: normalizeAdsConfig(settings.ads),
  }
}
