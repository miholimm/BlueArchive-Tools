import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquarePlus, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { trackEvent } from '../lib/tracking'
import type { StoryChapter, StorySegment } from '../types'
import { authFetch } from '../lib/api'

export default function StoryReader() {
  const { volume, chapter } = useParams()
  const [data, setData] = useState<StoryChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(false)
    setActiveIndex(0)
    setData(null)
    authFetch(`/api/story/${volume}/${chapter}`)
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '章节数据读取失败')
        setData(value as StoryChapter)
        trackEvent('story_read', { volume: volume || '', chapter: chapter || '' })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [volume, chapter])

  if (loading) {
    return (
      <main className="page-shell">
        <div className="empty-state">章节数据加载中…</div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="page-shell">
        <Reveal>
          <div className="empty-state">
            <AlertTriangle size={40} style={{ color: 'var(--ink-muted)', marginBottom: 12 }} />
            <p>该章节数据尚未收录</p>
            <span>翻译组的老师正在加紧制作中，请稍后再来。</span>
            <br />
            <Link to="/story" style={{ color: 'var(--cyan-strong)', textDecoration: 'underline' }}>返回剧情库</Link>
          </div>
        </Reveal>
      </main>
    )
  }

  const segments: StorySegment[] = data.segments || []
  const current = segments[activeIndex]
  const prevSegment = activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : null
  const nextSegment = activeIndex < segments.length - 1 ? () => setActiveIndex(activeIndex + 1) : null

  const feedbackUrl = `/feedback?chapter=Vol.${volume} Ch.${chapter}&original=${encodeURIComponent(current?.ja || '')}&translation=${encodeURIComponent(current?.zh || '')}`

  return (
    <main className="story-reader-shell">
      {/* Breadcrumb */}
      <Reveal>
        <div className="story-reader-top">
          <Link to="/story" className="back-link"><ArrowLeft size={16} /> 返回剧情库</Link>
          <span className="story-reader-breadcrumb">
            Vol.{volume} Ch.{chapter} — {data.title}
          </span>
        </div>
      </Reveal>

      {/* Chapter info */}
      <Reveal delay={60}>
        <div className="story-reader-heading">
          <span className="eyebrow">VOL.{volume} CHAPTER {chapter}</span>
          <h1>{data.title} <small>{data.titleJa}</small></h1>
          <div className="story-reader-chars">
            {data.characters.map(c => <span key={c} className="story-char-tag">{c}</span>)}
          </div>
        </div>
      </Reveal>

      {/* Segment navigation */}
      <Reveal delay={100}>
        <div className="story-reader-nav">
          <button
            className="story-nav-btn"
            disabled={!prevSegment}
            onClick={prevSegment || undefined}
          >
            <ChevronLeft size={18} /> 上一条
          </button>
          <span className="story-reader-progress">
            {activeIndex + 1} / {segments.length}
          </span>
          <button
            className="story-nav-btn"
            disabled={!nextSegment}
            onClick={nextSegment || undefined}
          >
            下一条 <ChevronRight size={18} />
          </button>
        </div>
      </Reveal>

      {/* Bilingual content */}
      {current && (
        <Reveal delay={140} key={current.id}>
          <div className="story-reader-content">
            {current.context && (
              <div className="story-context-badge">📍 {current.context}</div>
            )}
            <div className="story-bilingual">
              <div className="story-column story-ja">
                <div className="story-column-label">日本語</div>
                <div className="story-speaker">
                  {current.speakerJa && <span className="story-speaker-ja">{current.speakerJa}</span>}
                </div>
                <p className="story-text-ja">{current.ja}</p>
              </div>
              <div className="story-column story-zh">
                <div className="story-column-label">中文</div>
                <div className="story-speaker">
                  <span className="story-speaker-zh">{current.speaker}</span>
                </div>
                <p className="story-text-zh">{current.zh}</p>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Segment selector dots */}
      <Reveal delay={180}>
        <div className="story-dots">
          {segments.map((_, i) => (
            <button
              key={i}
              className={`story-dot ${i === activeIndex ? 'is-active' : ''}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`跳转到第 ${i + 1} 段`}
            />
          ))}
        </div>
      </Reveal>

      {/* Feedback floating button */}
      <Link to={feedbackUrl} className="story-feedback-fab" title="反馈翻译">
        <MessageSquarePlus size={20} />
        <span>反馈翻译</span>
      </Link>
    </main>
  )
}
