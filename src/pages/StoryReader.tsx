import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, MessageSquarePlus, Minimize2, Search, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlossaryText from '../components/GlossaryText'
import Reveal from '../components/Reveal'
import StoryPortrait from '../components/StoryPortrait'
import { trackEvent } from '../lib/tracking'
import type { GlossaryTerm, StoryChapter, StorySegment } from '../types'
import { authFetch } from '../lib/api'

export default function StoryReader() {
  const { volume, chapter } = useParams()
  const [data, setData] = useState<StoryChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [theater, setTheater] = useState(false)
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [termQuery, setTermQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(false)
    setActiveIndex(0)
    setTheater(false)
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
    authFetch('/api/glossary')
      .then(response => response.ok ? response.json() : [])
      .then(value => setTerms(Array.isArray(value) ? value as GlossaryTerm[] : []))
      .catch(() => setTerms([]))
  }, [volume, chapter])

  useEffect(() => {
    if (!theater) return
    const previousOverflow = document.body.style.overflow
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTheater(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', close)
    }
  }, [theater])

  const matchedTerms = useMemo(() => {
    const query = termQuery.trim().toLowerCase()
    if (!query) return []
    return terms.filter((term) => `${term.zh} ${term.ja} ${term.romaji} ${term.category}`.toLowerCase().includes(query)).slice(0, 5)
  }, [termQuery, terms])

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
  const portraitSide = current?.portraitSide || (activeIndex % 2 === 0 ? 'left' : 'right')

  return (
    <main className={theater ? "story-reader-shell is-theater" : "story-reader-shell"}>
      {/* Breadcrumb */}
      <Reveal>
        <div className="story-reader-top">
          <Link to="/story" className="back-link"><ArrowLeft size={16} /> 返回剧情库</Link>
          <span className="story-reader-breadcrumb">
            Vol.{volume} Ch.{chapter} — {data.title}
          </span>
          <button type="button" className="button button-ghost button-sm story-theater-toggle" onClick={() => setTheater((value) => !value)} aria-pressed={theater}>
            {theater ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {theater ? '退出剧场' : '全屏剧场'}
          </button>
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
          <div className="story-term-search">
            <Search size={15} />
            <input value={termQuery} onChange={(event) => setTermQuery(event.target.value)} placeholder="搜索本章术语…" aria-label="搜索本章术语" />
            {matchedTerms.length > 0 && (
              <div className="story-term-results">
                {matchedTerms.map((term) => <Link key={term.id} to={`/glossary?search=${encodeURIComponent(term.zh)}`}><strong>{term.zh}</strong><small>{term.ja} / {term.romaji}</small></Link>)}
              </div>
            )}
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
          <section className="story-dialogue-stage" aria-label="剧情剧场">
            <StoryPortrait speaker={current.speaker} source={current.portrait} side={portraitSide} />
            <div className={portraitSide === 'right' ? "story-dialogue-box is-right" : "story-dialogue-box"}>
              <div className="story-theater-meta"><span>TRANSCRIPT / {current.id}</span><span>{current.context || 'KIVOTOS ARCHIVE'}</span></div>
              <div className="story-dialogue-speaker">{current.speaker}</div>
              <p className="story-dialogue-text"><GlossaryText text={current.zh} terms={terms} /></p>
            </div>
          </section>
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
                <p className="story-text-ja"><GlossaryText text={current.ja} terms={terms} /></p>
              </div>
              <div className="story-column story-zh">
                <div className="story-column-label">中文</div>
                <div className="story-speaker">
                  <span className="story-speaker-zh">{current.speaker}</span>
                </div>
                <p className="story-text-zh"><GlossaryText text={current.zh} terms={terms} /></p>
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
