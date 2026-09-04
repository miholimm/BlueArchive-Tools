import { AlertTriangle, CheckCircle2, Clock, Server, Shield, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import Reveal from '../components/Reveal'
import type { AntiCheatEvent, AntiCheatServer } from '../types'
import { authFetch } from '../lib/api'

const statusConfig: Record<AntiCheatServer['status'], { label: string; icon: React.ComponentType<{ size?: number }>; className: string; color: string }> = {
  safe: { label: '安全', icon: CheckCircle2, className: 'ac-status-safe', color: 'var(--teal)' },
  warning: { label: '注意', icon: AlertTriangle, className: 'ac-status-warning', color: '#f59e0b' },
  danger: { label: '危险', icon: XCircle, className: 'ac-status-danger', color: '#ef4444' }
}

export default function AntiCheat() {
  const [data, setData] = useState<AntiCheatServer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authFetch('/api/site-data/antiCheat')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '安全动态读取失败')
        if (active) setData(Array.isArray(value) ? value as AntiCheatServer[] : [])
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">COMMUNITY / ANTI-CHEAT</span>
          <h1>反作弊追踪</h1>
          <p>各服务器反作弊动态与安全状态，帮助汉化用户了解风险。</p>
        </div>
      </Reveal>

      <section className="section anti-cheat-section">
        {loading && <div className="empty-state">正在读取安全动态…</div>}
        <div className="ac-server-grid">
          {data.map((server: AntiCheatServer, si: number) => {
            const status = statusConfig[server.status]
            const StatusIcon = status.icon
            return (
              <Reveal key={server.server} delay={si * 80}>
                <div className={`ac-server-card ${status.className}`}>
                  <div className="ac-server-header">
                    <div className="ac-server-title">
                      <Server size={18} />
                      <h3>{server.server}</h3>
                    </div>
                    <span className={`ac-status-badge ${status.className}`}>
                      <StatusIcon size={14} />
                      <span style={{ color: status.color }}>{status.label}</span>
                    </span>
                  </div>
                  <div className="ac-server-updated">
                    <Clock size={12} /> 最后更新：{server.lastUpdate}
                  </div>
                  <div className="ac-event-timeline">
                    {server.events.map((event: AntiCheatEvent, ei: number) => (
                      <div key={ei} className="ac-event-item">
                        <div className="ac-event-dot" style={{ background: status.color }} />
                        <div className="ac-event-content">
                          <div className="ac-event-date">{event.date}</div>
                          <strong>{event.title}</strong>
                          <p>{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={300}>
          <div className="ac-safety-tip">
            <Shield size={18} />
            <div>
              <strong>安全提示</strong>
              <p>汉化补丁仅修改游戏文本资源，不涉及客户端核心逻辑。建议从官方渠道下载游戏本体，汉化补丁从本站获取。如遇反作弊误报，请及时通过反馈渠道告知我们。</p>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
