import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { GlossaryTerm } from '../types'
import { authFetch } from '../lib/api'

export default function Glossary() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchTerms = async () => {
    try {
      const url = search
        ? `/api/glossary?search=${encodeURIComponent(search)}`
        : '/api/glossary'
      const r = await authFetch(url)
      if (r.ok) setTerms(await r.json())
    } catch { /* server may not be running */ }
    setLoading(false)
  }

  useEffect(() => { fetchTerms() }, [search])

  return (
    <main className="page glossary-page">
      <div className="page-hero">
        <span className="eyebrow">REFERENCE</span>
        <h1>术语库</h1>
        <p>蔚蓝档案中日译名对照表，确保翻译一致性</p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
        {/* Search Bar */}
        <div className="glass-card" style={{ padding: 16, borderRadius: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search size={18} style={{ color: 'var(--ink-dim)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索术语（日文 / 中文 / 罗马音 / 分类）…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: 'var(--ink)', fontSize: 14, outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Terms Table */}
        <div className="glass-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>加载中…</p>
            </div>
          ) : terms.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
                {search ? '未找到匹配的术语' : '术语库为空'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--glass-input)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--ink-dim)', fontWeight: 600 }}>日文</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--ink-dim)', fontWeight: 600 }}>中文</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--ink-dim)', fontWeight: 600 }}>罗马音</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--ink-dim)', fontWeight: 600 }}>分类</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--ink-dim)', fontWeight: 600 }}>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map(term => (
                    <tr key={term.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{term.ja}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--accent)' }}>{term.zh}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic' }}>{term.romaji}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <span style={{
                          background: 'var(--accent)' + '20',
                          color: 'var(--accent)',
                          padding: '2px 8px',
                          borderRadius: 8,
                          fontSize: 11
                        }}>{term.category}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-soft)' }}>{term.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
