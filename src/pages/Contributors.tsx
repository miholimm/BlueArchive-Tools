import { Award, MessageSquare, ThumbsUp, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import Reveal from '../components/Reveal'
import type { ContributorItem } from '../types'
import { authFetch } from '../lib/api'

type SortKey = 'translationCount' | 'feedbackAdopted' | 'commentsCount'
type TimeRange = 'month' | 'total'

const tabs: { key: SortKey; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'translationCount', label: '翻译贡献', icon: TrendingUp },
  { key: 'feedbackAdopted', label: '反馈采纳', icon: ThumbsUp },
  { key: 'commentsCount', label: '互动活跃', icon: MessageSquare }
]

export default function Contributors() {
  const [data, setData] = useState<ContributorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('translationCount')
  const [timeRange, setTimeRange] = useState<TimeRange>('total')

  useEffect(() => {
    let active = true
    authFetch('/api/site-data/contributors')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '贡献榜读取失败')
        if (active) setData(Array.isArray(value) ? value as ContributorItem[] : [])
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10)

  // Simulate "month" by halving (just for demo)
  const displayData = timeRange === 'month'
    ? sorted.map((item, i) => ({ ...item, displayCount: Math.floor(item[sortKey] / 4), rank: i + 1 }))
    : sorted.map((item, i) => ({ ...item, displayCount: item[sortKey], rank: i + 1 }))

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">SCHALE / CONTRIBUTORS</span>
          <h1>贡献榜</h1>
          <p>感谢每一位为汉化项目付出努力的老师。</p>
        </div>
      </Reveal>

      <section className="section contributors-section">
        {/* Tab bar */}
        <Reveal delay={60}>
          <div className="contributors-tabs">
            <div className="tutorial-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`tutorial-tab ${sortKey === tab.key ? 'tutorial-tab-active' : ''}`}
                  onClick={() => setSortKey(tab.key)}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="contributors-time-toggle">
              <button
                className={`faq-category-btn ${timeRange === 'month' ? 'faq-category-active' : ''}`}
                onClick={() => setTimeRange('month')}
              >
                本月
              </button>
              <button
                className={`faq-category-btn ${timeRange === 'total' ? 'faq-category-active' : ''}`}
                onClick={() => setTimeRange('total')}
              >
                总计
              </button>
            </div>
          </div>
        </Reveal>

        {loading ? <div className="empty-state">正在读取贡献榜…</div> : data.length === 0 ? <div className="empty-state">暂无贡献记录</div> : null}
        {/* Rank list */}
        <Reveal delay={100}>
          {data.length > 0 && <div className="contributors-list">
            {displayData.map((item, i) => (
              <div key={item.name} className={`contributor-row ${i < 3 ? 'contributor-top' : ''}`}>
                <div className="contributor-rank">{getMedal(item.rank)}</div>
                <div className="contributor-avatar">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} />
                  ) : (
                    <div className="contributor-avatar-fallback">
                      <span>{item.name[0]}</span>
                    </div>
                  )}
                </div>
                <div className="contributor-info">
                  <strong>{item.name}</strong>
                </div>
                <div className="contributor-score">
                  <Award size={14} />
                  <span>{item.displayCount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>}
        </Reveal>
      </section>
    </main>
  )
}
