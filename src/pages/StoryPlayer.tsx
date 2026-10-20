import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronDown,
  FileJson,
  ListTree,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCw,
  Sparkles,
  UploadCloud,
  ScrollText,
  Music,
  LayoutGrid,
} from 'lucide-react'
import BaStoryPlayerBridge, { type StoryLanguage } from '../components/story/BaStoryPlayerBridge'
import StoryBacklogDrawer from '../components/story/StoryBacklogDrawer'
import StorySoundTrack from '../components/story/StorySoundTrack'
import StoryChapterGrid from '../components/story/StoryChapterGrid'
import { extractStoryAnalysis, type BgmTrackInfo } from '../lib/storyAudio'
import { trackEvent } from '../lib/tracking'
import ModuleGate from '../components/ModuleGate'
import '../styles/story-enhancements.css'

const SAMPLES: Record<string, string> = {
  yuuka: '/ba-stories/yuuka.json',
  prologue: '/ba-stories/prologue.json',
}

const CDN_PRESETS = [
  { label: '官方资源源 (推荐)', value: 'https://res.bluearchive.help/image/ba-all-data' },
  { label: '自定义 CDN', value: 'custom' },
]

// 这些源已开放 CORS（Access-Control-Allow-Origin: *），浏览器可直接拉取，无需经本站代理
const CORS_OPEN_HOSTS = new Set([
  'res.bluearchive.help',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net',
  'api.github.com',
])
const CORS_OPEN_SUFFIXES = ['.githubusercontent.com', '.bluearchive.help']
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
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialStoryParam = searchParams.get('story') || ''
  const initialIdParam = searchParams.get('id') || ''
  const initialLangParam = (searchParams.get('lang') as StoryLanguage) || 'Cn'
  const initialCdnParam = searchParams.get('cdn') || 'https://res.bluearchive.help/image/ba-all-data'
  const initialNameParam = searchParams.get('name') || '老师'

  const [story, setStory] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<StoryLanguage>(initialLangParam)
  const [storyId, setStoryId] = useState(initialIdParam)
  const [storyUrl, setStoryUrl] = useState(initialStoryParam)
  const [mountWidth, setMountWidth] = useState(1000)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // BA-Story 核心控制参数
  const [useSuperSampling, setUseSuperSampling] = useState(searchParams.get('super') === 'true')
  const [useMp3, setUseMp3] = useState(searchParams.get('mp3') !== 'false')
  const [userName, setUserName] = useState(initialNameParam)
  const [cdnPreset, setCdnPreset] = useState(() => {
    return CDN_PRESETS.some((p) => p.value === initialCdnParam) ? initialCdnParam : 'custom'
  })
  const [customCdn, setCustomCdn] = useState(initialCdnParam)
  const [playStatus, setPlayStatus] = useState<'待开始' | '播放中' | '已播放完毕' | '发生错误'>('待开始')

  // 剧情分析结果：对话回溯、BGM 播放清单、登场声优
  const storyAnalysis = useMemo(() => {
    return extractStoryAnalysis(story, userName)
  }, [story, userName])

  // 回溯抽屉与原声带面板开关
  const [isBacklogOpen, setIsBacklogOpen] = useState(false)
  const [isSoundtrackOpen, setIsSoundtrackOpen] = useState(false)
  const [showChapterShowcase, setShowChapterShowcase] = useState(true)
  const [activeBgm, setActiveBgm] = useState<BgmTrackInfo | undefined>(undefined)

  const activeCdn = useMemo(() => {
    return cdnPreset === 'custom' ? (customCdn.trim() || 'https://res.bluearchive.help/image/ba-all-data') : cdnPreset
  }, [cdnPreset, customCdn])

  const storySummary = useMemo(() => {
    const s = story as { chapterName?: string; summary?: string } | null
    return {
      chapterName: s?.chapterName || '蔚蓝档案',
      summary: s?.summary || '蔚蓝档案剧情播放中',
    }
  }, [story])

  // 本地文件上传
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [dragActive, setDragActive] = useState(false)

  // 全屏状态
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!wrapRef.current) return
    if (!document.fullscreenElement) {
      wrapRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // 快捷键支持：L 键打开回溯，M 键打开原声与声优
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (e.key === 'l' || e.key === 'L') {
        setIsBacklogOpen((o) => !o)
      } else if (e.key === 'm' || e.key === 'M') {
        setIsSoundtrackOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

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

  // 最近播放（localStorage 持久化，最多 8 条）
  type RecentItem = { url: string; title: string }
  const RECENT_KEY = 'ba-story-player:recent'
  const [recent, setRecent] = useState<RecentItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    } catch {
      return []
    }
  })

  const recordRecent = (url: string, title?: string) => {
    setRecent((prev) => {
      const next = [{ url, title: title || url }, ...prev.filter((r) => r.url !== url)].slice(0, 8)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* storage full — 忽略 */
      }
      return next
    })
  }

  const loadFromUrl = async (url: string) => {
    if (!url) return
    setLoading(true)
    setError('')
    setPlayStatus('待开始')
    try {
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
      setStoryUrl(url)
      const catalogTitle = catalog?.items.find((i) => `${catalog.cdn}${i.path}` === url)?.title
      recordRecent(url, catalogTitle ?? (data.chapterName as string | undefined))
      trackEvent('story_player_load', { source: url.startsWith('http') ? 'remote' : 'sample', url })
    } catch (e) {
      setError(e instanceof Error ? `加载失败：${e.message}` : '加载失败')
      setStory(null)
      setPlayStatus('发生错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialStoryParam) {
      loadFromUrl(initialStoryParam)
    } else if (initialIdParam) {
      loadFromUrl(`${STORY_REPO_CDN}favor/${initialIdParam.slice(0, 5)}/${initialIdParam}.json`)
    } else {
      loadFromUrl(SAMPLES.yuuka)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadById = () => {
    const id = storyId.trim()
    if (!id) return
    loadFromUrl(`${STORY_REPO_CDN}favor/${id.slice(0, 5)}/${id}.json`)
  }

  // 本地 JSON 上传
  const handleFile = async (file: File) => {
    if (!file) return
    setUploadName(file.name)
    setLoading(true)
    setError('')
    setPlayStatus('待开始')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      setStory(data)
      trackEvent('story_player_load', { source: 'upload', name: file.name })
    } catch (err) {
      setError(err instanceof Error ? `文件解析失败：${err.message}` : '文件解析失败')
      setStory(null)
      setPlayStatus('发生错误')
    } finally {
      setLoading(false)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handlePlayFromShowcase = (url: string, title?: string) => {
    loadFromUrl(url)
    if (title) recordRecent(url, title)
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  return (
    <main className="page-shell ba-story-player-page">
      <div className="page-hero">
        <span className="eyebrow">STORY / PLAYER</span>
        <h1>剧情播放器</h1>
        <p>
          基于 <code>ba-story-player</code> 独立核心引擎（Vue 3 + PixiJS 7 + Spine 4.2），还原游戏内立绘、语音、特效与分支选择的原版剧情体验。
        </p>
      </div>

      <section className="section">
        {/* BA-Story 核心设置与播放控制条 */}
        <div className="ba-sp-controls-strip">
          <div className="ba-sp-control-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--ink-muted)', fontSize: '12px', fontWeight: 600 }}>语言</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as StoryLanguage)}
              style={{ minHeight: '34px', padding: '0 10px', fontSize: '13px' }}
            >
              <option value="Cn">简体中文</option>
              <option value="Jp">日本語</option>
              <option value="En">English</option>
              <option value="Tw">繁體中文</option>
            </select>
          </div>

          <label className="ba-sp-toggle-pill" title="开启 2 倍画质超分（需设备性能支持）">
            <input
              type="checkbox"
              checked={useSuperSampling}
              onChange={(e) => setUseSuperSampling(e.target.checked)}
            />
            <span>2倍超分</span>
          </label>

          <label className="ba-sp-toggle-pill" title="启用 MP3 音频转码格式，解决 iOS / Safari 浏览器音频解码无声问题">
            <input
              type="checkbox"
              checked={useMp3}
              onChange={(e) => setUseMp3(e.target.checked)}
            />
            <span>MP3兼容 (Safari)</span>
          </label>

          <div className="ba-sp-control-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--ink-muted)', fontSize: '12px', fontWeight: 600 }}>老师称谓</span>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="老师"
              style={{ minHeight: '34px', width: '80px', padding: '0 8px', fontSize: '13px' }}
            />
          </div>

          <div className="ba-sp-control-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
            <span style={{ color: 'var(--ink-muted)', fontSize: '12px', fontWeight: 600 }}>资源服务器</span>
            <select
              value={cdnPreset}
              onChange={(e) => setCdnPreset(e.target.value)}
              style={{ minHeight: '34px', padding: '0 10px', fontSize: '13px', flex: '1 1 auto' }}
            >
              {CDN_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {cdnPreset === 'custom' && (
              <input
                type="text"
                value={customCdn}
                onChange={(e) => setCustomCdn(e.target.value)}
                placeholder="https://.../ba-all-data"
                style={{ minHeight: '34px', width: '220px', padding: '0 10px', fontSize: '13px' }}
              />
            )}
          </div>

          <button
            type="button"
            className="button button-ghost"
            style={{ padding: '4px 12px', minHeight: '34px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            onClick={() => loadFromUrl(storyUrl || SAMPLES.yuuka)}
            title="重新加载当前剧情"
          >
            <RotateCw size={13} /> 刷新
          </button>

          <div className={`ba-sp-status-badge status-${playStatus === '播放中' ? 'playing' : playStatus === '已播放完毕' ? 'done' : playStatus === '发生错误' ? 'error' : 'ready'}`}>
            <span className="ba-sp-status-dot" />
            <span>状态：{playStatus}</span>
          </div>
        </div>

        {/* 载入源控制栏 */}
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
          <div className="ba-sp-field ba-sp-upload-field">
            <label>或上传本地剧情 JSON</label>
            <div
              className={`ba-sp-drop${dragActive ? ' is-drag' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={onFileInput}
                className="ba-sp-file-input"
              />
              {uploadName ? <FileJson size={22} /> : <UploadCloud size={22} />}
              <span className="ba-sp-drop-main">
                {uploadName || '拖拽 JSON 到此处，或点击选择文件'}
              </span>
              <span className="ba-sp-drop-sub">支持 .json · 本地解析，不上传服务器</span>
            </div>
          </div>
        </div>

        {/* 快速预设与跳转 */}
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

        {/* 最近播放记录 */}
        {recent.length > 0 && (
          <div className="ba-recent">
            <span className="ba-recent-label">最近播放</span>
            <div className="ba-recent-chips">
              {recent.map((r) => (
                <button key={r.url} className="ba-recent-chip" onClick={() => loadFromUrl(r.url)}>
                  {r.title}
                </button>
              ))}
              <button
                className="ba-recent-clear"
                onClick={() => {
                  setRecent([])
                  localStorage.removeItem(RECENT_KEY)
                }}
              >
                清空
              </button>
            </div>
          </div>
        )}

        {/* 剧情增强快捷操作条 (Backlog / Soundtrack & Cast) */}
        <div className="ba-sp-action-strip">
          <div className="ba-sp-action-left">
            <button
              type="button"
              className={`ba-sp-action-btn ${isBacklogOpen ? 'is-active' : ''}`}
              onClick={() => setIsBacklogOpen(true)}
              title="查看剧情文本回溯、中日对照与单句语音试听（快捷键 L）"
            >
              <ScrollText size={15} />
              <span>对话回溯 (LOG)</span>
              {storyAnalysis.totalLines > 0 && (
                <span className="ba-sp-badge-count">{storyAnalysis.totalLines}</span>
              )}
            </button>

            <button
              type="button"
              className={`ba-sp-action-btn ${isSoundtrackOpen ? 'is-active' : ''}`}
              onClick={() => setIsSoundtrackOpen(!isSoundtrackOpen)}
              title="查看当前章节背景音乐试听与登场声优列表（快捷键 M）"
            >
              <Music size={15} />
              <span>原声与声优 (BGM/CV)</span>
              {storyAnalysis.playlist.length > 0 && (
                <span className="ba-sp-badge-count">
                  {storyAnalysis.playlist.length}首 / {storyAnalysis.cast.length}位
                </span>
              )}
            </button>

            <button
              type="button"
              className={`ba-sp-action-btn ${showChapterShowcase ? 'is-active' : ''}`}
              onClick={() => setShowChapterShowcase(!showChapterShowcase)}
              title="展开/收起精选章节展柜卡片"
            >
              <LayoutGrid size={15} />
              <span>精选名章节展柜</span>
            </button>
          </div>

          <div className="ba-sp-action-right">
            <button
              type="button"
              className="ba-catalog-toggle"
              style={{ margin: 0, padding: '7px 14px' }}
              onClick={() => setCatalogOpen((o) => !o)}
            >
              <ListTree size={14} />
              全量剧情目录
              <ChevronDown size={14} className={catalogOpen ? 'is-open' : ''} />
            </button>
          </div>
        </div>

        {/* 全量剧情目录抽屉 */}
        {catalogOpen && (
          <div className="ba-catalog" style={{ marginBottom: '16px' }}>
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
                            window.scrollTo({ top: 120, behavior: 'smooth' })
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
          </div>
        )}

        {error && (
          <div className="ba-sp-error">
            <AlertTriangle size={16} />
            {error}（推荐：直接用「示例」、上传本地 JSON，或粘贴已开放 CORS 的地址，如 GitHub raw / jsdelivr）
          </div>
        )}

        {/* 播放器终端舞台 */}
        <div className="ba-sp-stage-header">
          <span className="ba-sp-stage-title">剧情播放终端 · {storySummary.chapterName}</span>
          <button
            type="button"
            className="ba-sp-fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏播放'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? '退出全屏' : '全屏'}</span>
          </button>
        </div>

        <div className={`ba-sp-stage${isFullscreen ? ' is-fullscreen' : ''}`} ref={wrapRef}>
          {loading && (
            <div className="ba-sp-loading">
              <Loader2 className="spin" size={26} /> 正在载入剧情引擎…
            </div>
          )}
          {!loading && !!story && (
            <BaStoryPlayerBridge
              story={story}
              dataUrl={activeCdn}
              language={language}
              width={mountWidth}
              height={Math.round((mountWidth * 9) / 16)}
              useMp3={useMp3}
              useSuperSampling={useSuperSampling ? '2' : false}
              userName={userName}
              storySummary={storySummary}
              onInitiated={() => setPlayStatus('播放中')}
              onEnd={() => setPlayStatus('已播放完毕')}
              onError={() => setPlayStatus('发生错误')}
            />
          )}
          {!loading && !story && !error && <div className="empty-state">暂无剧情数据</div>}
        </div>

        <div className="ba-sp-guide">
          操作指南：点击画面或按空格键推进剧情 · 按 <b>L</b> 打开对话回溯 · 按 <b>M</b> 打开原声与声优 · ESC 退出全屏或弹窗
        </div>

        {/* 原声带与声优 (BGM / Cast) 可折叠面板 */}
        {isSoundtrackOpen && (
          <StorySoundTrack
            playlist={storyAnalysis.playlist}
            cast={storyAnalysis.cast}
            chapterTitle={storySummary.chapterName}
            activeBgmId={activeBgm?.id}
            onSelectBgm={(bgm) => setActiveBgm(bgm)}
          />
        )}

        {/* 精选名篇卡片展柜 */}
        {showChapterShowcase && (
          <StoryChapterGrid
            onPlayChapter={handlePlayFromShowcase}
            currentPlayingUrl={storyUrl}
          />
        )}

        {/* 对话回溯抽屉组件 */}
        <StoryBacklogDrawer
          isOpen={isBacklogOpen}
          onClose={() => setIsBacklogOpen(false)}
          backlog={storyAnalysis.backlog}
          chapterTitle={storySummary.chapterName}
          activeBgmId={activeBgm?.id}
          onPlayBgm={(bgm) => {
            setActiveBgm(bgm)
            setIsSoundtrackOpen(true)
          }}
        />
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
