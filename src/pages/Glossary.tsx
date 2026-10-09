import { BookMarked, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { GlossaryTerm } from '../types'
import { authFetch } from '../lib/api'
import defaultGlossaryData from '../data/glossary.json'

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  角色名: { bg: 'rgba(255, 92, 138, 0.12)', text: '#ff5c8a', border: 'rgba(255, 92, 138, 0.3)' },
  学园名: { bg: 'rgba(0, 137, 224, 0.12)', text: '#0089e0', border: 'rgba(0, 137, 224, 0.3)' },
  组织名: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' },
  世界观: { bg: 'rgba(217, 119, 6, 0.12)', text: '#d97706', border: 'rgba(217, 119, 6, 0.3)' },
  总力战BOSS: { bg: 'rgba(220, 38, 38, 0.12)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.3)' },
  系统机制: { bg: 'rgba(5, 150, 105, 0.12)', text: '#059669', border: 'rgba(5, 150, 105, 0.3)' },
  社区用语: { bg: 'rgba(147, 51, 234, 0.12)', text: '#9333ea', border: 'rgba(147, 51, 234, 0.3)' },
}

export default function Glossary() {
  const [allTerms, setAllTerms] = useState<GlossaryTerm[]>(() => defaultGlossaryData.terms || [])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const fetchTerms = async () => {
    try {
      setLoading(true)
      const r = await authFetch('/api/glossary')
      if (r.ok) {
        const data = await r.json()
        if (Array.isArray(data) && data.length > 0) {
          setAllTerms(data)
        }
      }
    } catch {
      // Fallback to static bundled glossary
      setAllTerms(defaultGlossaryData.terms || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTerms()
  }, [])

  const updateSearch = (value: string) => {
    setSearch(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('search', value)
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }

  // Extract unique categories and counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of allTerms) {
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    const order = ['角色名', '学园名', '组织名', '世界观', '总力战BOSS', '系统机制', '社区用语']
    const result = [{ key: 'all', label: '全部', count: allTerms.length }]
    for (const cat of order) {
      if (counts[cat]) {
        result.push({ key: cat, label: cat, count: counts[cat] })
      }
    }
    return result
  }, [allTerms])

  // Filtered terms based on search & category
  const filteredTerms = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allTerms.filter(t => {
      const matchCat = activeCategory === 'all' || t.category === activeCategory
      if (!matchCat) return false
      if (!q) return true
      return (
        t.ja.toLowerCase().includes(q) ||
        t.zh.toLowerCase().includes(q) ||
        t.romaji.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q))
      )
    })
  }, [allTerms, search, activeCategory])

  return (
    <main className="page glossary-page">
      <div className="page-hero">
        <span className="eyebrow">
          <BookMarked size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          STORY / GLOSSARY
        </span>
        <h1>术语库</h1>
        <p>蔚蓝档案官方与汉化组规范中日译名对照库，全方位统一专有名词与翻译标准</p>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px 48px' }}>
        {/* Controls Panel */}
        <div className="glass-card" style={{ padding: 20, borderRadius: 18, marginBottom: 20 }}>
          {/* Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--glass-input, rgba(255, 255, 255, 0.6))',
              border: '1px solid var(--border-subtle, rgba(0, 163, 255, 0.18))',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <Search size={18} style={{ color: 'var(--ink-dim)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => updateSearch(e.target.value)}
              placeholder="搜索术语（支持日文原名、中文译名、罗马音、分类、人物社团备注）…"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--ink)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => updateSearch('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}
                title="清空搜索"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
            }}
          >
            {categories.map(cat => {
              const isActive = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    border: isActive
                      ? '1px solid var(--accent, #0089e0)'
                      : '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
                    background: isActive ? 'var(--accent, #0089e0)' : 'var(--card-alt, rgba(0, 0, 0, 0.03))',
                    color: isActive ? '#ffffff' : 'var(--ink-soft)',
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{cat.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      opacity: isActive ? 0.9 : 0.65,
                      background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                      padding: '1px 6px',
                      borderRadius: 999,
                    }}
                  >
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Counter Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            padding: '0 4px',
            fontSize: 12,
            color: 'var(--ink-muted)',
          }}
        >
          <span>
            显示 <strong>{filteredTerms.length}</strong> / {allTerms.length} 条术语
          </span>
          {search && (
            <span>
              关键词匹配：“<em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>{search}</em>”
            </span>
          )}
        </div>

        {/* Terms Table */}
        <div className="glass-card" style={{ borderRadius: 18, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>加载术语库中…</p>
            </div>
          ) : filteredTerms.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
                {search ? '未找到匹配的术语，请尝试其他关键词' : '术语库为空'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle, rgba(0, 163, 255, 0.12))',
                      background: 'var(--glass-input, rgba(0, 48, 100, 0.04))',
                    }}
                  >
                    <th style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, width: '16%' }}>日文原名</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, width: '16%' }}>中文译名</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, width: '16%' }}>罗马音</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, width: '13%' }}>分类</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, width: '39%' }}>备注说明 / 角色背景</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTerms.map((term, index) => {
                    const tagStyle = CATEGORY_COLORS[term.category] || {
                      bg: 'rgba(0, 163, 255, 0.12)',
                      text: 'var(--accent)',
                      border: 'rgba(0, 163, 255, 0.25)',
                    }
                    const isEven = index % 2 === 1
                    return (
                      <tr
                        key={term.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.06))',
                          background: isEven ? 'rgba(0, 137, 224, 0.015)' : 'transparent',
                          transition: 'background 0.16s ease',
                        }}
                      >
                        <td style={{ padding: '13px 18px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                          {term.ja}
                        </td>
                        <td style={{ padding: '13px 18px', fontSize: 14, fontWeight: 700, color: 'var(--cyan-strong, #0089e0)' }}>
                          {term.zh}
                        </td>
                        <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic', fontFamily: 'var(--font-mono, monospace)' }}>
                          {term.romaji}
                        </td>
                        <td style={{ padding: '13px 18px', fontSize: 12 }}>
                          <span
                            style={{
                              background: tagStyle.bg,
                              color: tagStyle.text,
                              border: `1px solid ${tagStyle.border}`,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            {term.category}
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                          {term.note || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
