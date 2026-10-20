import { BookOpen, Play, Search, X, Sparkles, ScrollText, Music, LayoutGrid } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Reveal from '../components/Reveal'
import StoryChapterGrid from '../components/story/StoryChapterGrid'
import { trackEvent } from '../lib/tracking'
import type { ChapterIndexEntry } from '../types'
import { authFetch } from '../lib/api'
import '../styles/story-enhancements.css'

const volumeTitles: Record<number, { zh: string; ja: string }> = {
  1: { zh: '对策委员会篇', ja: '対策委員会編' },
  2: { zh: '发条花的帕凡舞曲篇', ja: '時計じかけの花のパヴァーヌ編' },
  3: { zh: '乐园化计画篇', ja: 'エデン条約編' },
  4: { zh: '卡班诺的兔子篇', ja: 'カルバノグの兎編' },
  5: { zh: '百花缭乱篇', ja: '百花繚乱編' }
}

// Simple fuzzy match — checks if query words appear in target in order
function fuzzyMatch(target: string, query: string): number {
  const t = target.toLowerCase()
  const q = query.toLowerCase()
  let ti = 0
  let score = 0
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti)
    if (idx === -1) return -1
    score += idx - ti
    ti = idx + 1
  }
  return score
}

type SearchResult = { volume: number; chapter: number; segmentId: string; text: string; speaker: string }

export default function Story() {
  const navigate = useNavigate()
  const [chapterIndex, setChapterIndex] = useState<ChapterIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'showcase' | 'volumes'>('showcase')

  // Preload all segments for search
  const [allSegments, setAllSegments] = useState<SearchResult[] | null>(null)

  useEffect(() => {
    let active = true
    authFetch('/api/story/index')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '剧情索引读取失败')
        if (active) setChapterIndex(Array.isArray(value) ? value as ChapterIndexEntry[] : [])
      })
      .catch(value => {
        if (active) setError(value instanceof Error ? value.message : '剧情索引读取失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const loadAllSegments = async () => {
    if (allSegments) return allSegments
    const segments: SearchResult[] = []
    for (const entry of chapterIndex) {
      for (const ch of entry.chapters) {
        try {
          const response = await authFetch(`/api/story/${entry.volume}/${ch}`)
          if (!response.ok) continue
          const data = await response.json()
          for (const seg of data.segments || []) {
            segments.push({
              volume: entry.volume,
              chapter: ch,
              segmentId: seg.id,
              text: `${seg.speaker} ${seg.zh} ${seg.ja}`,
              speaker: seg.speaker
            })
          }
        } catch { /* chapter data not yet created */ }
      }
    }
    setAllSegments(segments)
    return segments
  }

  const handleSearch = async (value: string) => {
    setSearch(value)
    if (!value.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const segments = await loadAllSegments()
      const scored = segments
        .map(s => ({ item: s, score: fuzzyMatch(s.text, value) }))
        .filter(x => x.score >= 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, 15)
        .map(x => x.item)
      setResults(scored)
      trackEvent('story_search', { query: value, results: scored.length })
    } catch { setResults([]) }
    setSearching(false)
  }

  const clearSearch = () => { setSearch(''); setResults([]) }

  const handlePlayFromGrid = (url: string) => {
    navigate(`/story-player?story=${encodeURIComponent(url)}`)
  }

  if (loading) return <main className="page-shell"><div className="empty-state">正在读取剧情索引…</div></main>
  if (error) return <main className="page-shell"><div className="empty-state">{error}</div></main>

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">STORY / LIBRARY</span>
          <h1>剧情库</h1>
          <p>中日对照阅读，沉浸体验主线故事与各学园学生羁绊。</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <Link to="/story-player" className="button button-primary">
              打开原版剧情播放器 <Play size={16} />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* 增强功能特性横幅 */}
      <Reveal delay={40}>
        <div
          style={{
            margin: '0 0 28px',
            padding: '16px 20px',
            borderRadius: 'var(--r-md, 16px)',
            background: 'linear-gradient(135deg, rgba(0, 163, 255, 0.12), rgba(14, 165, 233, 0.05))',
            border: '1px solid rgba(46, 169, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0, 163, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                全新剧情影院增强已上线
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted, #94a3b8)', marginTop: '2px' }}>
                包含完整的对话回溯 (Backlog) · 原版 BGM 试听清单 · 登场学生与日文 CV 声优名单
              </div>
            </div>
          </div>
          <Link
            to="/story-player"
            className="button button-ghost"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            立即前往试用
          </Link>
        </div>
      </Reveal>

      <section className="section story-section">
        {/* 搜索栏与模式切换 */}
        <Reveal delay={60}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div className="changelog-search" style={{ maxWidth: '420px', margin: 0 }}>
              <Search size={16} className="changelog-search-icon" />
              <input
                className="changelog-search-input"
                placeholder="搜索剧情内容、角色名…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {search && (
                <button className="changelog-search-clear" onClick={clearSearch}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="ba-soundtrack-tabs" style={{ margin: 0 }}>
              <button
                type="button"
                className={`ba-soundtrack-tab ${viewMode === 'showcase' ? 'is-active' : ''}`}
                onClick={() => setViewMode('showcase')}
              >
                <LayoutGrid size={14} />
                <span>精选名篇索引</span>
              </button>
              <button
                type="button"
                className={`ba-soundtrack-tab ${viewMode === 'volumes' ? 'is-active' : ''}`}
                onClick={() => setViewMode('volumes')}
              >
                <BookOpen size={14} />
                <span>全卷主线 ({chapterIndex.length})</span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* 搜索结果 */}
        {results.length > 0 && (
          <Reveal delay={80}>
            <div className="story-search-results">
              <span className="eyebrow">搜索结果 ({results.length})</span>
              <div className="story-results-grid">
                {results.map((r, i) => (
                  <Link
                    key={`${r.volume}-${r.chapter}-${i}`}
                    to={`/story/${r.volume}/${r.chapter}`}
                    className="story-result-card"
                  >
                    <span className="story-result-vol">Vol.{r.volume} Ch.{r.chapter}</span>
                    <span className="story-result-speaker">{r.speaker}</span>
                    <p className="story-result-text">{r.text.slice(0, 80)}…</p>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {results.length === 0 && !searching && search && (
          <Reveal delay={80}>
            <div className="empty-state">未找到匹配的剧情内容</div>
          </Reveal>
        )}

        {/* 精选名篇卡片展柜模式 */}
        {results.length === 0 && !search && viewMode === 'showcase' && (
          <Reveal delay={80}>
            <StoryChapterGrid onPlayChapter={handlePlayFromGrid} />
          </Reveal>
        )}

        {/* 传统主线卷册模式 */}
        {results.length === 0 && !search && viewMode === 'volumes' && (
          <div className="story-volumes-grid">
            {chapterIndex.map((entry: ChapterIndexEntry, vi: number) => {
              const info = volumeTitles[entry.volume]
              return (
                <Reveal key={entry.volume} delay={vi * 80}>
                  <div className="story-volume-card">
                    <div className="story-volume-cover">
                      <span className="story-volume-number">Vol.{entry.volume}</span>
                      <div className="story-volume-placeholder">
                        <BookOpen size={32} />
                      </div>
                    </div>
                    <div className="story-volume-body">
                      <h3>{info?.zh || `Volume ${entry.volume}`}</h3>
                      <small>{info?.ja || ''}</small>
                      <div className="story-chapter-links">
                        {entry.chapters.map(ch => (
                          <Link
                            key={ch}
                            to={`/story/${entry.volume}/${ch}`}
                            className="story-chapter-link"
                            onClick={() => trackEvent('story_chapter_click', { volume: entry.volume, chapter: ch })}
                          >
                            Ch.{ch}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
