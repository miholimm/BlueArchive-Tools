import { ArrowUp, Check, LogIn, LogOut, MessageCircle, Plus, Search, Tag, ThumbsUp, UserCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { QAAnswer, QAQuestion } from '../types'
import { authFetch, getAdminMe, getQqAuthStatus, logoutQq, startQqLogin, type QqIdentity } from '../lib/api'
import MomoTalkThread from '../components/MomoTalkThread'
import GoogleAd from '../components/GoogleAd'

export default function QA() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [questions, setQuestions] = useState<QAQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'new' | 'votes'>('new')
  const [tagFilter, setTagFilter] = useState('')
  const [showAsk, setShowAsk] = useState(false)
  const [askForm, setAskForm] = useState({ title: '', content: '', tags: '', author: '' })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [answerForm, setAnswerForm] = useState({ content: '', author: '' })
  const [msg, setMsg] = useState('')
  const [canModerate, setCanModerate] = useState(false)
  const [qqConfigured, setQqConfigured] = useState(false)
  const [qqIdentity, setQqIdentity] = useState<QqIdentity | null>(null)
  const [qqLoading, setQqLoading] = useState(true)
  const [qqError, setQqError] = useState('')

  const fetchQuestions = async () => {
    try {
      const params = new URLSearchParams()
      if (sort) params.set('sort', sort)
      if (tagFilter) params.set('tag', tagFilter)
      const r = await authFetch(`/api/qa?${params}`)
      if (r.ok) setQuestions(await r.json())
    } catch { /* server may not be running */ }
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [sort, tagFilter])
  useEffect(() => {
    let active = true
    getAdminMe()
      .then(identity => {
        if (active) setCanModerate(identity.isRoot || identity.permissions.includes('qa'))
      })
      .catch(() => {
        if (active) setCanModerate(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getQqAuthStatus()
      .then(value => {
        if (!active) return
        setQqConfigured(value.configured)
        setQqIdentity(value.identity)
        setQqError('')
      })
      .catch(() => {
        if (active) setQqError('QQ 登录状态暂时无法读取')
      })
      .finally(() => {
        if (active) setQqLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const result = searchParams.get('qq')
    if (!result) return
    const messages: Record<string, string> = {
      connected: 'QQ 登录成功，提问和回答将使用 QQ 昵称。',
      failed: 'QQ 登录失败，请稍后重试。',
      invalid: 'QQ 登录验证已失效，请重新登录。',
      unavailable: 'QQ 登录当前未配置，请使用临时昵称。',
    }
    setMsg(messages[result] || 'QQ 登录状态已更新。')
    const next = new URLSearchParams(searchParams)
    next.delete('qq')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const nickname = qqIdentity?.nickname || ''
    setAskForm(previous => ({ ...previous, author: nickname || previous.author }))
    setAnswerForm(previous => ({ ...previous, author: nickname || previous.author }))
  }, [qqIdentity])

  const handleQqLogout = async () => {
    try {
      await logoutQq()
      setQqIdentity(null)
      setAskForm(previous => ({ ...previous, author: '' }))
      setAnswerForm(previous => ({ ...previous, author: '' }))
      setMsg('QQ 已退出，当前可以使用临时昵称。')
    } catch {
      setMsg('QQ 退出登录失败，请稍后重试。')
    }
  }

  const handleAsk = async () => {
    if (!askForm.title || !askForm.content || !(qqIdentity?.nickname || askForm.author)) {
      setMsg('请填写完整信息')
      return
    }
    try {
      const r = await authFetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: askForm.title,
          content: askForm.content,
          tags: askForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          author: qqIdentity?.nickname || askForm.author
        })
      })
      if (r.ok) {
        setShowAsk(false)
        setAskForm({ title: '', content: '', tags: '', author: '' })
        setMsg('')
        fetchQuestions()
      } else {
        const err = await r.json()
        setMsg(err.error || '提交失败')
      }
    } catch {
      setMsg('网络错误')
    }
  }

  const handleAnswer = async (questionId: string) => {
    if (!answerForm.content || !(qqIdentity?.nickname || answerForm.author)) {
      setMsg('请填写完整信息')
      return
    }
    try {
      const r = await authFetch(`/api/qa/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answerForm, author: qqIdentity?.nickname || answerForm.author })
      })
      if (r.ok) {
        setAnswerForm({ content: '', author: '' })
        setMsg('')
        fetchQuestions()
      } else {
        const err = await r.json()
        setMsg(err.error || '提交失败')
      }
    } catch {
      setMsg('网络错误')
    }
  }

  const handleVote = async (questionId: string, answerId?: string) => {
    try {
      const url = answerId
        ? `/api/qa/${questionId}/vote/${answerId}`
        : `/api/qa/${questionId}/vote`
      await authFetch(url, { method: 'POST' })
      fetchQuestions()
    } catch { /* ignore */ }
  }

  const handleAccept = async (questionId: string, answerId: string) => {
    try {
      const r = await authFetch(`/api/qa/${questionId}/accept/${answerId}`, { method: 'PUT' })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        setMsg(err.message || err.error || '采纳失败')
        return
      }
      fetchQuestions()
    } catch {
      setMsg('网络错误')
    }
  }

  // Collect all unique tags
  const allTags = Array.from(new Set(questions.flatMap(q => q.tags || [])))

  const detailQuestion = detailId ? questions.find(q => q.id === detailId) : null

  return (
    <main className="page qa-page">
      <div className="page-hero">
        <span className="eyebrow">COMMUNITY / QA</span>
        <h1>问答</h1>
        <p>汉化相关问题讨论，翻译疑难解答</p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
        {msg && (
          <div className="glass-card" style={{
            padding: '12px 20px', marginBottom: 16, borderRadius: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: 13, color: '#ef4444'
          }}>{msg}</div>
        )}

        <div className="glass-card" style={{ padding: 16, borderRadius: 16, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {qqIdentity?.avatar ? <img src={qqIdentity.avatar} alt="QQ 头像" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : <UserCircle size={30} style={{ color: 'var(--accent)' }} />}
            <div>
              <strong style={{ display: 'block', fontSize: 13 }}>{qqIdentity ? `已使用 QQ：${qqIdentity.nickname}` : '社区身份'}</strong>
              <span style={{ color: 'var(--ink-dim)', fontSize: 12 }}>{qqError || (qqConfigured ? '登录后自动使用 QQ 昵称参与问答。' : 'QQ 登录未启用，可直接使用临时昵称。')}</span>
            </div>
          </div>
          {qqLoading ? <span style={{ color: 'var(--ink-dim)', fontSize: 12 }}>读取中…</span> : qqIdentity ? (
            <button type="button" className="button button-ghost button-sm" onClick={handleQqLogout}><LogOut size={14} /> 退出 QQ</button>
          ) : qqConfigured ? (
            <button type="button" className="button button-primary button-sm" onClick={startQqLogin}><LogIn size={14} /> QQ 登录</button>
          ) : null}
        </div>

        {/* Controls */}
        <div className="glass-card" style={{ padding: 16, borderRadius: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="button button-primary"
            onClick={() => { setShowAsk(true); setDetailId(null) }}
          >
            <Plus size={15} /> 提问
          </button>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as 'new' | 'votes')}
            style={{
              border: '1px solid var(--border-subtle)', background: 'var(--glass-input)',
              color: 'var(--ink)', padding: '8px 12px', borderRadius: 8, fontSize: 12
            }}
          >
            <option value="new">最新</option>
            <option value="votes">最多投票</option>
          </select>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`button ${!tagFilter ? 'button-primary' : 'button-ghost'} button-sm`}
              onClick={() => setTagFilter('')}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`button ${tagFilter === tag ? 'button-primary' : 'button-ghost'} button-sm`}
                onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
            <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>加载中…</p>
          </div>
        ) : detailQuestion ? (
          /* Question Detail */
          <div>
            <button className="button button-ghost" onClick={() => setDetailId(null)} style={{ marginBottom: 16 }}>
              ← 返回列表
            </button>
            <MomoTalkThread
              question={detailQuestion}
              canModerate={canModerate}
              onVote={(answerId) => handleVote(detailQuestion.id, answerId)}
              onAccept={(answerId) => handleAccept(detailQuestion.id, answerId)}
            />

            {/* Answer Form */}
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, marginBottom: 40 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>提交回答</h4>
              <input
                value={qqIdentity?.nickname || answerForm.author}
                onChange={e => setAnswerForm(p => ({ ...p, author: e.target.value }))}
                placeholder="您的昵称"
                disabled={Boolean(qqIdentity)}
                style={{
                  width: '100%', border: '1px solid var(--border-subtle)',
                  background: 'var(--glass-input)', color: 'var(--ink)',
                  padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box'
                }}
              />
              <textarea
                value={answerForm.content}
                onChange={e => setAnswerForm(p => ({ ...p, content: e.target.value }))}
                placeholder="写下您的回答…"
                rows={4}
                style={{
                  width: '100%', border: '1px solid var(--border-subtle)',
                  background: 'var(--glass-input)', color: 'var(--ink)',
                  padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12,
                  resize: 'vertical', boxSizing: 'border-box'
                }}
              />
              <button className="button button-primary" onClick={() => handleAnswer(detailQuestion.id)}>
                <Send2Icon /> 提交回答
              </button>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
            <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>暂无问答</p>
          </div>
        ) : (
          /* Question List */
          <div style={{ display: 'grid', gap: 12 }}>
            {questions.map(q => (
              <div
                key={q.id}
                className="glass-card"
                style={{ padding: 20, borderRadius: 16, cursor: 'pointer' }}
                onClick={() => setDetailId(q.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>{q.title}</h3>
                    <div style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span>{q.author}</span>
                      <span>{new Date(q.createdAt).toLocaleDateString('zh-CN')}</span>
                      {q.tags?.map(t => (
                        <span key={t} style={{
                          background: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--accent)',
                          padding: '1px 6px', borderRadius: 6, fontSize: 11
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-dim)', fontSize: 12 }}>
                      <ThumbsUp size={14} /> {q.votes}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-dim)', fontSize: 12 }}>
                      <MessageCircle size={14} /> {q.answerCount ?? (q.answers?.length || 0)}
                    </div>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: q.status === 'closed' ? '#22c55e20' : q.status === 'answered' ? '#3b82f620' : '#6b728020',
                      color: q.status === 'closed' ? '#22c55e' : q.status === 'answered' ? '#3b82f6' : '#6b7280',
                    }}>
                      {q.status === 'closed' ? '已解决' : q.status === 'answered' ? '已回答' : '开放'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <GoogleAd slotKey="qaBanner" />
      </div>

      {/* Ask Modal */}
      {showAsk && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAsk(false)}>
          <div className="glass-card" style={{
            padding: 28, borderRadius: 16, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>提问</h3>
              <button className="button button-ghost button-sm" onClick={() => setShowAsk(false)}>
                <X size={16} />
              </button>
            </div>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>标题 *</span>
              <input
                value={askForm.title}
                onChange={e => setAskForm(p => ({ ...p, title: e.target.value }))}
                placeholder="简明扼要地描述问题"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>详细描述 *</span>
              <textarea
                value={askForm.content}
                onChange={e => setAskForm(p => ({ ...p, content: e.target.value }))}
                placeholder="详细描述您的问题…"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>标签（逗号分隔）</span>
              <input
                value={askForm.tags}
                onChange={e => setAskForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="翻译, 角色, 剧情"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>昵称 *</span>
              <input
                value={qqIdentity?.nickname || askForm.author}
                onChange={e => setAskForm(p => ({ ...p, author: e.target.value }))}
                placeholder="您的昵称"
                disabled={Boolean(qqIdentity)}
                style={inputStyle}
              />
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="button button-ghost" onClick={() => setShowAsk(false)}>取消</button>
              <button className="button button-primary" onClick={handleAsk}>提交问题</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border-subtle)',
  background: 'var(--glass-input)', color: 'var(--ink)',
  padding: '10px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
  fontFamily: 'inherit'
}

// Simple send icon as inline component
function Send2Icon() { return <span style={{ marginRight: 4 }}>→</span> }
