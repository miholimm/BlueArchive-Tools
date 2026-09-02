import { Clock, Send, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TaskEntry } from '../types'
import { authFetch, getAdminMe } from '../lib/api'

const statusLabels: Record<string, string> = {
  open: '待认领',
  claimed: '进行中',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已退回'
}

const statusColors: Record<string, string> = {
  open: '#6b7280',
  claimed: '#3b82f6',
  submitted: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444'
}

function getRemaining(claimedAt?: string): string {
  if (!claimedAt) return ''
  const elapsed = Date.now() - new Date(claimedAt).getTime()
  const remaining = 72 * 60 * 60 * 1000 - elapsed
  if (remaining <= 0) return '已超时'
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  return `${hours}h ${minutes}m`
}

export default function Workspace() {
  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [canManageTasks, setCanManageTasks] = useState(false)
  const [identity, setIdentity] = useState<{ userId: string; displayName: string; username: string }>()
  const [msg, setMsg] = useState('')

  const fetchTasks = async () => {
    try {
      const response = await authFetch('/api/tasks')
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || '任务读取失败')
      setTasks(Array.isArray(value) ? value : [])
    } catch (error) {
      setMsg(error instanceof Error ? error.message : '任务读取失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getAdminMe()
      .then(value => {
        if (!active) return
        setIdentity(value)
        setCanManageTasks(value.isRoot || value.permissions.includes('tasks'))
      })
      .catch(() => {
        if (active) setMsg('请先使用具有任务管理权限的账号登录。')
      })
      .finally(() => {
        if (active) fetchTasks()
      })
    return () => { active = false }
  }, [])

  const handleClaim = async (taskId: string) => {
    try {
      const response = await authFetch(`/api/tasks/${taskId}/claim`, { method: 'POST' })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || '认领失败')
      setMsg('任务已认领，归属已绑定到当前账号。')
      await fetchTasks()
    } catch (error) {
      setMsg(error instanceof Error ? error.message : '认领失败')
    }
  }

  const handleSubmit = async (taskId: string) => {
    try {
      const response = await authFetch(`/api/tasks/${taskId}/submit`, { method: 'POST' })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || '提交失败')
      setMsg('任务已提交，等待审核。')
      await fetchTasks()
    } catch (error) {
      setMsg(error instanceof Error ? error.message : '提交失败')
    }
  }

  return (
    <main className="page workspace-page">
      <div className="page-hero">
        <span className="eyebrow">COLLABORATION</span>
        <h1>协作工作台</h1>
        <p>仅限已登录且拥有任务权限的组员认领、提交与审核翻译任务。</p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
        {msg && (
          <div className="glass-card" style={{
            padding: '12px 20px',
            marginBottom: 16,
            borderRadius: 12,
            background: msg.includes('已') || msg.includes('等待') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.includes('已') || msg.includes('等待') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: 13,
            color: msg.includes('已') || msg.includes('等待') ? '#22c55e' : '#ef4444'
          }}>
            {msg}
          </div>
        )}

        {identity && <p style={{ margin: '0 0 16px', color: 'var(--ink-dim)', fontSize: 12 }}>当前账号：{identity.displayName || identity.username}</p>}

        {loading ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
            <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>加载中…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
            <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>暂无开放任务</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {tasks.map(task => {
              const ownsTask = Boolean(identity && (task.claimantId ? task.claimantId === identity.userId : task.claimant === (identity.displayName || identity.username)))
              return (
                <div key={task.id} className="glass-card" style={{ padding: 24, borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: statusColors[task.status] + '20',
                        color: statusColors[task.status],
                        border: `1px solid ${statusColors[task.status]}40`
                      }}>
                        {statusLabels[task.status] || task.status}
                      </span>
                      <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>{task.title}</h3>
                      <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{task.chapter}</span>
                    </div>
                    {task.status === 'claimed' && task.claimedAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-dim)' }}>
                        <Clock size={14} />
                        <span>剩余 {getRemaining(task.claimedAt)}</span>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 16px' }}>
                    {task.description}
                  </p>

                  {task.status === 'claimed' && (
                    <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 12 }}>
                      认领人：{task.claimant || '未命名组员'}
                    </div>
                  )}

                  {canManageTasks && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {task.status === 'open' && (
                        <button className="button button-primary" onClick={() => handleClaim(task.id)}>
                          <UserCheck size={15} /> 认领任务
                        </button>
                      )}
                      {task.status === 'claimed' && ownsTask && (
                        <button className="button button-primary" onClick={() => handleSubmit(task.id)}>
                          <Send size={15} /> 提交翻译
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
