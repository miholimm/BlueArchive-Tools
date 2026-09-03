import { BookOpen, Play, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { trackEvent } from '../lib/tracking'
import type { ChapterIndexEntry } from '../types'
import { authFetch } from '../lib/api'

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
  const [chapterIndex, setChapterIndex] = useState<ChapterIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

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

  if (loading) return <main className="page-shell"><div className="empty-state">正在读取剧情索引…</div></main>
  if (error) return <main className="page-shell"><div className="empty-state">{error}</div></main>

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">STORY / 04</span>
          <h1>剧情库</h1>
          <p>中日对照阅读，沉浸体验主线故事。</p>
          <Link to="/story-player" className="button button-primary" style={{ marginTop: '18px' }}>
            打开原版剧情播放器 <Play size={16} />
          </Link>
        </div>
      </Reveal>

      <section className="section story-section">
        {/* Search bar */}
        <Reveal delay={60}>
          <div className="changelog-search" style={{ maxWidth: '520px', marginBottom: '36px' }}>
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
        </Reveal>

        {/* Search results */}
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

        {/* Volume cards */}
        {results.length === 0 && !search && (
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
