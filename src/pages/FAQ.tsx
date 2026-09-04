import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { authFetch } from '../lib/api'

/** FAQ 条目类型 */
interface FaqItem {
  category: string
  q: string
  a: string
}

/** 将纯文本中的 URL 转为可点击链接 */
function renderAnswer(text: string): React.ReactNode {
  // 匹配 http/https 链接
  const urlRegex = /(https?:\/\/[^\s，。；！？、]+)/g
  const parts = text.split(urlRegex)
  const matches = text.match(urlRegex) ?? []

  if (matches.length === 0) {
    return <p className="faq-answer-text">{text}</p>
  }

  const result: React.ReactNode[] = []
  let matchIdx = 0

  parts.forEach((part, i) => {
    if (!part) return

    // odd indices (1,3,5...) are captured URL groups → render as link only
    if (i % 2 === 1 && matchIdx < matches.length) {
      result.push(
        <a key={`link-${i}`} href={matches[matchIdx]} target="_blank" rel="noreferrer" className="faq-inline-link">
          {matches[matchIdx]}
        </a>,
      )
      matchIdx++
    } else {
      // even indices (0,2,4...) are plain text → render as span
      result.push(<span key={`text-${i}`}>{part}</span>)
    }
  })

  return <p className="faq-answer-text">{result}</p>
}

export default function FAQ() {
  const [data, setData] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    let active = true
    authFetch('/api/site-data/faq')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '常见问题读取失败')
        if (active) setData(Array.isArray(value) ? value as FaqItem[] : [])
      })
      .catch(value => {
        if (active) setError(value instanceof Error ? value.message : '常见问题读取失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(data.map((item) => item.category)))],
    [data],
  )

  const filtered = useMemo(() => {
    let items = data
    if (activeCategory !== '全部') {
      items = items.filter((item) => item.category === activeCategory)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      )
    }
    return items
  }, [data, query, activeCategory])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero faq-page-hero">
          <span className="eyebrow">COMMUNITY / HELP</span>
          <h1>常见问题</h1>
          <p>快速查找安装、启动、更新和报错的解决方案。</p>
          <div className="page-hero-number">
            <HelpCircle size={20} />
            <small>FAQ</small>
          </div>
        </div>
      </Reveal>

      <section className="section faq-section">
        {/* 搜索框 */}
        <Reveal>
          <div className="faq-search">
            <Search size={18} className="faq-search-icon" />
            <input
              type="text"
              className="faq-search-input"
              placeholder="搜索问题或答案…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="faq-search-clear"
                onClick={() => setQuery('')}
                aria-label="清除搜索"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </Reveal>

        {/* 分类筛选按钮组 */}
        <Reveal delay={50}>
          <div className="faq-categories" role="tablist" aria-label="问题分类">
            {categories.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={cat === activeCategory}
                className={`faq-category-btn ${cat === activeCategory ? 'faq-category-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </Reveal>

        {/* FAQ 列表 */}
        {loading ? (
          <Reveal>
            <div className="faq-empty"><p>正在读取常见问题…</p></div>
          </Reveal>
        ) : error ? (
          <Reveal>
            <div className="faq-empty"><p>{error}</p></div>
          </Reveal>
        ) : filtered.length === 0 ? (
          <Reveal>
            <div className="faq-empty">
              <HelpCircle size={40} />
              <p>没有找到匹配的问题</p>
              <span>尝试其他关键词或分类筛选</span>
            </div>
          </Reveal>
        ) : (
          <div className="faq-list">
            {filtered.map((item, i) => {
              const isOpen = openItems.has(i)
              return (
                <Reveal key={i} delay={i * 40} spring="up">
                  <div className="faq-item">
                    <button
                      className="faq-trigger"
                      onClick={() => toggleItem(i)}
                      aria-expanded={isOpen}
                    >
                      <div className="faq-trigger-left">
                        <span className="faq-category-tag">{item.category}</span>
                        <span className="faq-question">{item.q}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp size={20} className="faq-chevron" />
                      ) : (
                        <ChevronDown size={20} className="faq-chevron" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="faq-answer">
                        <div className="faq-answer-divider" />
                        {renderAnswer(item.a)}
                      </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}

        {/* 底部：没解决？提示 */}
        <Reveal delay={200}>
          <div className="faq-footer-cta">
            <MessageCircle size={24} />
            <div>
              <strong>没解决你的问题？</strong>
              <span>加入社区频道，向汉化组和其他玩家求助。</span>
            </div>
            <Link to="/" className="faq-contact-link">
              联系社区
              <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
