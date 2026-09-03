import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, Play } from 'lucide-react'
import BaStoryPlayerBridge, { type StoryLanguage } from '../components/story/BaStoryPlayerBridge'
import { trackEvent } from '../lib/tracking'
import ModuleGate from '../components/ModuleGate'

const SAMPLES: Record<string, string> = {
  yuuka: '/ba-stories/yuuka.json',
  prologue: '/ba-stories/prologue.json',
}
const CDN = 'https://yuuka.cdn.diyigemt.com/image/ba-all-data'

function StoryPlayerInner() {
  const [story, setStory] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<StoryLanguage>('Cn')
  const [storyId, setStoryId] = useState('')
  const [storyUrl, setStoryUrl] = useState('')
  const [mountWidth, setMountWidth] = useState(1000)
  const wrapRef = useRef<HTMLDivElement | null>(null)

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
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
    const padded = id
    loadFromUrl(`https://preview.blue-archive.io/story/favor/${padded.slice(0, 5)}/${padded}.json`)
  }

  return (
    <main className="page-shell ba-story-player-page">
      <div className="page-hero">
        <span className="eyebrow">STORY PLAYER / BA-ARCHIVE</span>
        <h1>原版剧情播放器</h1>
        <p>
          基于社区 <code>ba-story-player</code> 引擎，还原游戏内立绘、语音与特效的沉浸式剧情体验。
        </p>
      </div>

      <section className="section">
        <div className="ba-sp-toolbar">
          <div className="ba-sp-field">
            <label>剧情 ID（favor）</label>
            <div className="ba-sp-row">
              <input
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                placeholder="例如 200362"
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

        {error && (
          <div className="ba-sp-error">
            <AlertTriangle size={16} />
            {error}（远程剧情可能受跨域限制，请改用「示例」或同源 JSON 地址）
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
