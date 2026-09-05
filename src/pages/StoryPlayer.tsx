import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ListTree, Loader2, Play } from 'lucide-react'
import BaStoryPlayerBridge, { type StoryLanguage } from '../components/story/BaStoryPlayerBridge'
import { trackEvent } from '../lib/tracking'
import ModuleGate from '../components/ModuleGate'

const SAMPLES: Record<string, string> = {
  yuuka: '/ba-stories/yuuka.json',
  prologue: '/ba-stories/prologue.json',
}
const CDN = 'https://yuuka.cdn.diyigemt.com/image/ba-all-data'

// 这些源已开放 CORS（Access-Control-Allow-Origin: *），浏览器可直接拉取，无需经本站代理
const CORS_OPEN_HOSTS = new Set([
  'yuuka.cdn.diyigemt.com',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
  'api.github.com',
])
const CORS_OPEN_SUFFIXES = ['.githubusercontent.com']
function isCorsOpen(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const h = u.hostname
    return CORS_OPEN_HOSTS.has(h) || CORS_OPEN_SUFFIXES.some((s) => h.endsWith(s))
  } catch {
    return false
  }
}

// ── 剧情目录：碧蓝档案剧情站（ba-archive/blue-archive）全量剧情 ──
type CatalogItem = { type: string; file: string; path: string; title?: string }
type Catalog = { total: number; cdn: string; repo: string; items: CatalogItem[] }

const STORY_TYPES: Array<{ key: string; label: string }> = [
  { key: 'favor', label: '好感剧情' },
  { key: 'main', label: '主线' },
  { key: 'event', label: '活动' },
  { key: 'other', label: '其他' },
  { key: 'ai', label: 'AI翻译' },
]
const typeLabel = (key: string) => STORY_TYPES.find((t) => t.key === key)?.label ?? key

// 剧情站仓库内的剧情 JSON 也可经 jsDelivr 直连（CORS 开放）
const STORY_REPO_CDN = 'https://cdn.jsdelivr.net/gh/ba-archive/blue-archive@main/apps/blue-archive-story-viewer/public/story/'

function StoryPlayerInner() {
  const [story, setStory] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<StoryLanguage>('Cn')
  const [storyId, setStoryId] = useState('')
  const [storyUrl, setStoryUrl] = useState('')
  const [mountWidth, setMountWidth] = useState(1000)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // 剧情目录
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catType, setCatType] = useState('favor')
  const [catSearch, setCatSearch] = useState('')
  const [catLimit, setCatLimit] = useState(60)

  const loadCatalog = async () => {
    setCatalogError('')
    try {
      const res = await fetch('/api/story-catalog')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setCatalog(await res.json())
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : '目录拉取失败')
    }
  }

  useEffect(() => {
    if (catalogOpen && !catalog && !catalogError) loadCatalog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogOpen])

  const catalogFiltered = useMemo(() => {
    if (!catalog) return []
    const q = catSearch.trim()
    return catalog.items.filter(
      (i) =>
        (catType ? i.type === catType : true) &&
        (!q || i.title?.includes(q) || i.file.includes(q) || i.path.includes(q)),
    )
  }, [catalog, catType, catSearch])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setMountWidth(Math.max(320, Math.min(el.clientWidth || 1000, 1280)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const loadFromUrl = async (url: string) => {
    if (!url) return
    setLoading(true)
    setError('')
    try {
      // 同源静态示例（/ba-stories/*）直接拉取；已开放 CORS 的源（CDN / GitHub raw / jsdelivr）也直连；
      // 其余跨域源经本站代理绕过 CORS（SSRF 白名单保护）。
      const target = !url.startsWith('http')
        ? url
        : isCorsOpen(url)
          ? url
          : `/api/story-proxy?url=${encodeURIComponent(url)}`
      const res = await fetch(target)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setStory(data)
      trackEvent('story_player_load', { source: url.startsWith('http') ? 'remote' : 'sample', url })
    } catch (e) {
      setError(e instanceof Error ? `加载失败：${e.message}` : '加载失败')
      setStory(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFromUrl(SAMPLES.yuuka)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadById = () => {
    const id = storyId.trim()
    if (!id) return
    // 剧情站仓库静态目录：story/favor/{学生前5位}/{剧情编号}.json（jsDelivr 直连，CORS 开放）
    loadFromUrl(`${STORY_REPO_CDN}favor/${id.slice(0, 5)}/${id}.json`)
  }

  // 本地 JSON 上传：完全离线、无 CORS / 代理依赖，最适合汉化组直接载入提取好的剧情单元
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      setStory(data)
      trackEvent('story_player_load', { source: 'upload', name: file.name })
    } catch (err) {
      setError(err instanceof Error ? `文件解析失败：${err.message}` : '文件解析失败')
      setStory(null)
    } finally {
      setLoading(false)
      e.target.value = '' // 允许重复选择同一文件
    }
  }

  return (
    <main className="page-shell ba-story-player-page">
      <div className="page-hero">
        <span className="eyebrow">STORY / PLAYER</span>
        <h1>原版剧情播放器</h1>
        <p>
          基于社区 <code>ba-story-player</code> 引擎，还原游戏内立绘、语音与特效的沉浸式剧情体验。
        </p>
      </div>

      <section className="section">
        <div className="ba-sp-toolbar">
          <div className="ba-sp-field">
            <label>剧情 ID（favor，实验性）</label>
            <div className="ba-sp-row">
              <input
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                placeholder="如 100533（优香 第3话）"
                onKeyDown={(e) => e.key === 'Enter' && loadById()}
              />
              <button className="button button-primary" onClick={loadById}>
                <Play size={15} /> 加载
              </button>
            </div>
          </div>
          <div className="ba-sp-field">
            <label>或粘贴剧情 JSON 地址</label>
            <div className="ba-sp-row">
              <input
                value={storyUrl}
                onChange={(e) => setStoryUrl(e.target.value)}
                placeholder="https://…/story.json"
                onKeyDown={(e) => e.key === 'Enter' && storyUrl.trim() && loadFromUrl(storyUrl.trim())}
              />
              <button
                className="button button-ghost"
                onClick={() => storyUrl.trim() && loadFromUrl(storyUrl.trim())}
              >
                加载
              </button>
            </div>
          </div>
          <div className="ba-sp-field ba-sp-lang">
            <label>语言</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as StoryLanguage)}>
              <option value="Cn">简体中文</option>
              <option value="Jp">日本語</option>
              <option value="En">English</option>
              <option value="Tw">繁體中文</option>
            </select>
          </div>
          <div className="ba-sp-field">
            <label>或上传本地剧情 JSON</label>
            <div className="ba-sp-row">
              <input
                type="file"
                accept=".json,application/json"
                onChange={onFile}
                className="ba-sp-file"
              />
            </div>
          </div>
        </div>

        <div className="ba-sp-presets">
          <button className="button button-ghost" onClick={() => loadFromUrl(SAMPLES.yuuka)}>
            示例：优香
          </button>
          <button className="button button-ghost" onClick={() => loadFromUrl(SAMPLES.prologue)}>
            示例：序章
          </button>
          <Link className="button button-ghost" to="/story">
            返回剧情库
          </Link>
        </div>

        {/* 全量剧情目录：来自碧蓝档案剧情站仓库，按需从 jsDelivr 拉取播放 */}
        <div className="ba-catalog">
          <button className="ba-catalog-toggle" onClick={() => setCatalogOpen((o) => !o)}>
            <ListTree size={15} />
            剧情目录{catalog ? `（${catalog.total} 个剧情）` : '（全站 1300+）'}
            <ChevronDown size={14} className={catalogOpen ? 'is-open' : ''} />
          </button>
          {catalogOpen && (
            <div className="ba-catalog-panel">
              {catalogError && (
                <div className="ba-catalog-error">
                  <AlertTriangle size={14} /> 目录拉取失败：{catalogError}
                </div>
              )}
              {!catalog && !catalogError && (
                <div className="ba-catalog-loading">
                  <Loader2 className="spin" size={18} /> 正在拉取全量剧情目录…
                </div>
              )}
              {catalog && (
                <>
                  <div className="ba-catalog-filters">
                    <button className={catType === '' ? 'is-active' : ''} onClick={() => setCatType('')}>
                      全部 {catalog.total}
                    </button>
                    {STORY_TYPES.map((t) => {
                      const n = catalog.items.filter((i) => i.type === t.key).length
                      return (
                        <button
                          key={t.key}
                          className={catType === t.key ? 'is-active' : ''}
                          onClick={() => setCatType(t.key)}
                        >
                          {t.label} {n}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    className="ba-catalog-search"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="按角色名或编号搜索，如 优香 / 白子 / 100533"
                  />
                  <ul className="ba-catalog-list">
                    {catalogFiltered.slice(0, catLimit).map((item) => (
                      <li key={item.path}>
                        <span className={`ba-catalog-type t-${item.type}`}>{typeLabel(item.type)}</span>
                        <span className="ba-catalog-body">
                          <span className="ba-catalog-title">
                            {item.title || item.path.replace(/\.json$/, '')}
                          </span>
                          <span className="ba-catalog-file">{item.path.replace(/\.json$/, '')}</span>
                        </span>
                        <button
                          className="ba-catalog-play"
                          onClick={() => {
                            loadFromUrl(`${STORY_REPO_CDN}${item.path}`)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          <Play size={13} /> 播放
                        </button>
                      </li>
                    ))}
                    {catalogFiltered.length === 0 && (
                      <li className="ba-catalog-empty">没有匹配的剧情</li>
                    )}
                  </ul>
                  {catalogFiltered.length > catLimit && (
                    <button className="ba-catalog-more" onClick={() => setCatLimit((l) => l + 100)}>
                      显示更多（剩余 {catalogFiltered.length - catLimit}）
                    </button>
                  )}
                  <p className="ba-catalog-note">
                    数据来源：碧蓝档案剧情站（ba-archive/blue-archive），点击播放时从 jsDelivr 实时拉取。
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="ba-sp-error">
            <AlertTriangle size={16} />
            {error}（推荐：直接用「示例」、上传本地 JSON，或粘贴已开放 CORS 的地址，如 GitHub raw / jsdelivr）
          </div>
        )}

        <div className="ba-sp-stage" ref={wrapRef}>
          {loading && (
            <div className="ba-sp-loading">
              <Loader2 className="spin" size={26} /> 正在载入剧情引擎…
            </div>
          )}
          {!loading && !!story && (
            <BaStoryPlayerBridge
              story={story}
              dataUrl={CDN}
              language={language}
              width={mountWidth}
              height={Math.round((mountWidth * 9) / 16)}
              useMp3
            />
          )}
          {!loading && !story && !error && <div className="empty-state">暂无剧情数据</div>}
        </div>
      </section>
    </main>
  )
}

export default function StoryPlayer() {
  return (
    <ModuleGate module="story">
      <StoryPlayerInner />
    </ModuleGate>
  )
}
