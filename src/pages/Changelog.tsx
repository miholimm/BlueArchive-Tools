import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Calendar, GitBranch, Info, PlusCircle, Search, X } from 'lucide-react'
import Reveal from '../components/Reveal'
import { authFetch } from '../lib/api'

/** 更新日志条目类型 */
interface ChangelogEntry {
  version: string
  date: string
  compatibility: string
  changes: string[]
  knownIssues: string[]
}

export default function Changelog() {
  const [data, setData] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    authFetch('/api/site-data/changelog')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '更新日志读取失败')
        if (active) setData(Array.isArray(value) ? value as ChangelogEntry[] : [])
      })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : '更新日志读取失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return data
    const q = query.toLowerCase()
    return data.filter(
      (entry) =>
        entry.version.toLowerCase().includes(q) ||
        entry.changes.some((c) => c.toLowerCase().includes(q)) ||
        entry.knownIssues.some((i) => i.toLowerCase().includes(q)) ||
        entry.compatibility.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero changelog-page-hero">
          <span className="eyebrow">RESOURCES / CHANGELOG</span>
          <h1>更新日志</h1>
          <p>追踪汉化补丁的每一次迭代与改进。</p>
          <div className="page-hero-number">
            <GitBranch size={20} />
            <small>CHANGELOG</small>
          </div>
        </div>
      </Reveal>

      <section className="section changelog-section">
        {/* 搜索框 */}
        <Reveal>
          <div className="changelog-search">
            <Search size={18} className="changelog-search-icon" />
            <input
              type="text"
              className="changelog-search-input"
              placeholder="搜索版本号或更新内容…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="changelog-search-clear"
                onClick={() => setQuery('')}
                aria-label="清除搜索"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </Reveal>

        {loading ? (
          <Reveal><div className="changelog-empty"><p>正在读取更新日志…</p></div></Reveal>
        ) : error ? (
          <Reveal><div className="changelog-empty"><p>{error}</p></div></Reveal>
        ) : filtered.length === 0 ? (
          <Reveal>
            <div className="changelog-empty">
              <Info size={40} />
              <p>没有找到匹配的更新记录</p>
              <span>尝试使用其他关键词搜索</span>
            </div>
          </Reveal>
        ) : (
          <div className="changelog-list">
            {filtered.map((entry, i) => (
              <Reveal key={entry.version} delay={i * 80} spring="up">
                <article className="changelog-card">
                  {/* 头部：版本号 + 日期 */}
                  <header className="changelog-card-header">
                    <div className="changelog-version-row">
                      <GitBranch size={20} className="changelog-icon-version" />
                      <h2 className="changelog-version">{entry.version}</h2>
                      <span className="changelog-date-badge">
                        <Calendar size={13} />
                        {entry.date}
                      </span>
                    </div>
                  </header>

                  {/* 兼容性说明 */}
                  <div className="changelog-compat">
                    <Info size={15} className="changelog-icon-compat" />
                    <span>{entry.compatibility}</span>
                  </div>

                  {/* 新增内容 */}
                  <div className="changelog-section-block">
                    <h3 className="changelog-section-title">
                      <PlusCircle size={16} className="changelog-icon-add" />
                      新增 / 修复
                    </h3>
                    <ul className="changelog-change-list">
                      {entry.changes.map((change, ci) => (
                        <li key={ci}>{change}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 已知问题 */}
                  {entry.knownIssues.length > 0 && (
                    <div className="changelog-section-block changelog-issues">
                      <h3 className="changelog-section-title">
                        <AlertTriangle size={16} className="changelog-icon-warn" />
                        已知问题
                      </h3>
                      <ul className="changelog-issue-list">
                        {entry.knownIssues.map((issue, ii) => (
                          <li key={ii}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
