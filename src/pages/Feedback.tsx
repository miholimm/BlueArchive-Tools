import { CheckCircle2, Clock, MessageSquare, Send, ThumbsUp, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { trackEvent } from '../lib/tracking'
import type { FeedbackSummary } from '../types'
import { authFetch } from '../lib/api'

const statusConfig: Record<FeedbackSummary['status'], { label: string; icon: React.ComponentType<{ size?: number }>; className: string }> = {
  pending: { label: '待处理', icon: Clock, className: 'feedback-status-pending' },
  replied: { label: '已回复', icon: MessageSquare, className: 'feedback-status-replied' },
  adopted: { label: '已采纳', icon: CheckCircle2, className: 'feedback-status-adopted' },
  rejected: { label: '已拒绝', icon: XCircle, className: 'feedback-status-rejected' }
}

export default function Feedback() {
  const [searchParams] = useSearchParams()
  const [chapter, setChapter] = useState(searchParams.get('chapter') || '')
  const [original, setOriginal] = useState(searchParams.get('original') || '')
  const [translation, setTranslation] = useState(searchParams.get('translation') || '')
  const [suggestion, setSuggestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<FeedbackSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    try {
      const r = await authFetch('/api/feedback')
      if (r.ok) setItems(await r.json())
    } catch { /* server may not be running */ }
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapter.trim() || !original.trim() || !suggestion.trim()) {
      setError('请填写章节、原文和反馈建议')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const r = await authFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter: chapter.trim(), original: original.trim(), translation: translation.trim(), suggestion: suggestion.trim() })
      })
      if (!r.ok) throw new Error()
      const result = await r.json()
      setSubmitted(true)
      trackEvent('feedback_submit', { chapter: chapter.trim(), id: result.id })
      setChapter('')
      setOriginal('')
      setTranslation('')
      setSuggestion('')
      fetchItems()
    } catch {
      setError('提交失败，请稍后重试')
    }
    setSubmitting(false)
  }

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">COMMUNITY / FEEDBACK</span>
          <h1>翻译反馈</h1>
          <p>提交翻译建议，帮助我们改进汉化质量。</p>
        </div>
      </Reveal>

      <section className="section feedback-section">
        {/* Submit form */}
        <Reveal delay={60}>
          <div className="feedback-form-card">
            <h2><ThumbsUp size={20} /> 提交反馈</h2>
            <p>发现翻译问题或有更好的表达建议？请告诉我们。</p>
            {submitted ? (
              <div className="feedback-success">
                <CheckCircle2 size={24} />
                <span>反馈已提交！感谢你的贡献，我们会尽快处理。</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                <label>
                  章节定位
                  <input
                    value={chapter}
                    onChange={e => setChapter(e.target.value)}
                    placeholder="例如：Vol.1 Ch.1"
                  />
                </label>
                <label>
                  日文原文
                  <textarea
                    value={original}
                    onChange={e => setOriginal(e.target.value)}
                    placeholder="复制游戏中的日文原文"
                    rows={3}
                  />
                </label>
                <label>
                  当前译文（选填）
                  <textarea
                    value={translation}
                    onChange={e => setTranslation(e.target.value)}
                    placeholder="当前汉化文本，如无可留空"
                    rows={2}
                  />
                </label>
                <label>
                  你的建议 <span className="required">*</span>
                  <textarea
                    value={suggestion}
                    onChange={e => setSuggestion(e.target.value)}
                    placeholder="写出你认为更好的翻译，或描述发现的问题"
                    rows={3}
                  />
                </label>
                {error && <div className="admin-error">{error}</div>}
                <button type="submit" className="button button-primary" disabled={submitting}>
                  <Send size={15} /> {submitting ? '提交中…' : '提交反馈'}
                </button>
              </form>
            )}
          </div>
        </Reveal>

        {/* Feedback list */}
        <Reveal delay={120}>
          <div className="feedback-list-section">
            <h2>已提交的反馈</h2>
            {loading ? (
              <p className="text-muted" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>加载中…</p>
            ) : items.length === 0 ? (
              <div className="empty-state">暂无反馈记录</div>
            ) : (
              <div className="feedback-list">
                {items.map((item) => {
                  const status = statusConfig[item.status]
                  const StatusIcon = status.icon
                  return (
                    <div key={item.id} className="feedback-item">
                      <div className="feedback-item-header">
                        <span className="feedback-chapter">{item.chapter}</span>
                        <span className={`feedback-status ${status.className}`}>
                          <StatusIcon size={13} /> {status.label}
                        </span>
                      </div>
                      <div className="feedback-item-body">
                        <div className="feedback-field">
                          <span>公开摘要</span>
                          <p>反馈原文、译文和具体建议仅对管理员可见。</p>
                        </div>
                      </div>
                      <div className="feedback-item-footer">
                        <span>{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                        {item.reply && (
                          <div className="feedback-reply">
                            <span>管理员回复：</span>
                            <p>{item.reply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Reveal>
      </section>
    </main>
  )
}
