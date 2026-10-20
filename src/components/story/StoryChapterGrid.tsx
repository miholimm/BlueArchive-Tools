import React, { useState, useMemo } from 'react'
import {
  Play,
  BookOpen,
  Search,
  Sparkles,
  Heart,
  Compass,
  CheckCircle2,
} from 'lucide-react'
import {
  FEATURED_STUDENTS,
  FEATURED_MAIN_STORIES,
  ACADEMIES,
  type FeaturedStudent,
  type FeaturedMainStory,
} from '../../data/student-metadata'

export interface StoryChapterItem {
  id: string
  title: string
  subtitle: string
  category: 'main' | 'favor' | 'special'
  categoryLabel: string
  coverImage?: string
  academyThemeColor?: string
  academyName?: string
  path: string
  remoteUrl?: string
  localSampleUrl?: string
  episodesCount?: number
  quote?: string
}

export interface StoryChapterGridProps {
  onPlayChapter: (url: string, title: string) => void
  currentPlayingUrl?: string
}

const STORY_REPO_CDN =
  'https://cdn.jsdelivr.net/gh/ba-archive/blue-archive@main/apps/blue-archive-story-viewer/public/story/'

export default function StoryChapterGrid({
  onPlayChapter,
  currentPlayingUrl,
}: StoryChapterGridProps) {
  const [filterType, setFilterType] = useState<'all' | 'main' | 'favor' | 'special'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 构建展示的精选章节列表
  const chapterCards: StoryChapterItem[] = useMemo(() => {
    const list: StoryChapterItem[] = []

    // 1. 主线与序章
    FEATURED_MAIN_STORIES.forEach((m: FeaturedMainStory) => {
      const acad = ACADEMIES.find((a) => a.id === m.academy) || ACADEMIES[0]
      const url = m.sampleLocalUrl || `${STORY_REPO_CDN}${m.path}.json`
      list.push({
        id: `main-${m.id}`,
        title: m.title,
        subtitle: m.chapter,
        category: m.id === 'prologue' ? 'special' : 'main',
        categoryLabel: m.id === 'prologue' ? '特别序章' : '主线章节',
        coverImage: m.id === 'prologue' ? '/images/portraits/10003.webp' : undefined,
        academyThemeColor: acad.themeColor,
        academyName: acad.name,
        path: m.path,
        localSampleUrl: m.sampleLocalUrl,
        remoteUrl: url,
        quote: m.desc,
      })
    })

    // 2. 精选学生羁绊剧情
    FEATURED_STUDENTS.forEach((s: FeaturedStudent) => {
      const acad = ACADEMIES.find((a) => a.id === s.academy) || ACADEMIES[0]
      s.episodes.forEach((ep) => {
        const url = s.sampleLocalUrl && ep.ep === 1 ? s.sampleLocalUrl : `${STORY_REPO_CDN}${ep.path}.json`
        list.push({
          id: `favor-${s.id}-${ep.ep}`,
          title: `${s.name} · ${ep.title}`,
          subtitle: s.role,
          category: 'favor',
          categoryLabel: '好感羁绊',
          coverImage: s.portrait,
          academyThemeColor: acad.themeColor,
          academyName: acad.name,
          path: ep.path,
          localSampleUrl: s.sampleLocalUrl && ep.ep === 1 ? s.sampleLocalUrl : undefined,
          remoteUrl: url,
          quote: s.quote,
        })
      })
    })

    return list
  }, [])

  // 过滤结果
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return chapterCards.filter((card) => {
      if (filterType !== 'all' && card.category !== filterType) return false
      if (!q) return true
      return (
        card.title.toLowerCase().includes(q) ||
        card.subtitle.toLowerCase().includes(q) ||
        (card.quote && card.quote.toLowerCase().includes(q)) ||
        (card.academyName && card.academyName.toLowerCase().includes(q))
      )
    })
  }, [chapterCards, filterType, searchQuery])

  return (
    <div className="ba-chapter-grid-section">
      <div className="ba-chapter-grid-header">
        <div className="ba-chapter-grid-title-box">
          <span className="ba-chapter-grid-eyebrow">
            <Compass size={13} />
            FEATURED CHAPTERS · 精选章节索引
          </span>
          <h3 className="ba-chapter-grid-title">名场面与核心剧情展柜</h3>
        </div>

        {/* 筛选与搜索 */}
        <div className="ba-chapter-grid-actions">
          <div className="ba-chapter-filter-pills">
            <button
              type="button"
              className={`ba-chapter-pill ${filterType === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              全部 ({chapterCards.length})
            </button>
            <button
              type="button"
              className={`ba-chapter-pill ${filterType === 'main' ? 'is-active' : ''}`}
              onClick={() => setFilterType('main')}
            >
              <BookOpen size={12} />
              主线篇章
            </button>
            <button
              type="button"
              className={`ba-chapter-pill ${filterType === 'favor' ? 'is-active' : ''}`}
              onClick={() => setFilterType('favor')}
            >
              <Heart size={12} />
              学生羁绊
            </button>
            <button
              type="button"
              className={`ba-chapter-pill ${filterType === 'special' ? 'is-active' : ''}`}
              onClick={() => setFilterType('special')}
            >
              <Sparkles size={12} />
              特别序章
            </button>
          </div>

          <div className="ba-chapter-search-box">
            <Search size={14} className="ba-chapter-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索角色名、话数或学园…"
              className="ba-chapter-search-input"
            />
          </div>
        </div>
      </div>

      {/* 卡片网格 */}
      <div className="ba-chapter-cards-grid">
        {filteredChapters.map((card) => {
          const cardUrl = card.remoteUrl || card.localSampleUrl || ''
          const isCurrentlyPlaying = currentPlayingUrl && (cardUrl === currentPlayingUrl || (card.localSampleUrl && currentPlayingUrl === card.localSampleUrl))

          return (
            <div
              key={card.id}
              className={`ba-chapter-card ${isCurrentlyPlaying ? 'is-active' : ''}`}
              style={{
                borderTopColor: card.academyThemeColor || '#0089e0',
              }}
            >
              <div className="ba-chapter-card-top">
                {card.coverImage ? (
                  <img
                    src={card.coverImage}
                    alt={card.title}
                    className="ba-chapter-card-thumb"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div
                    className="ba-chapter-card-thumb-placeholder"
                    style={{ background: card.academyThemeColor || '#0089e0' }}
                  >
                    <BookOpen size={24} />
                  </div>
                )}

                <div className="ba-chapter-card-meta">
                  <div className="ba-chapter-badge-strip">
                    <span
                      className={`ba-chapter-type-badge cat-${card.category}`}
                    >
                      {card.categoryLabel}
                    </span>
                    {card.academyName && (
                      <span className="ba-chapter-academy-badge">
                        {card.academyName}
                      </span>
                    )}
                  </div>
                  <h4 className="ba-chapter-card-name" title={card.title}>
                    {card.title}
                  </h4>
                  <span className="ba-chapter-card-sub">{card.subtitle}</span>
                </div>
              </div>

              {card.quote && (
                <p className="ba-chapter-card-quote" title={card.quote}>
                  “{card.quote}”
                </p>
              )}

              <div className="ba-chapter-card-footer">
                <button
                  type="button"
                  className={`ba-chapter-play-btn ${isCurrentlyPlaying ? 'is-playing' : ''}`}
                  onClick={() => onPlayChapter(cardUrl, card.title)}
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>播放中</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span>立即播放</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
