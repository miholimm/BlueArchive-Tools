import { AlertTriangle, ArrowDownToLine, CalendarDays, ExternalLink, FileArchive } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Reveal from '../components/Reveal'
import { trackEvent } from '../lib/tracking'
import type { ArchiveItem } from '../types'
import { authFetch } from '../lib/api'

function isDownloadUrl(url: string) {
  return /^https?:\/\//i.test(url)
}

function isInternalPath(value: string) {
  return /^\/(?!\/)/.test(value)
}

export default function Archive() {
  const [data, setData] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    authFetch('/api/archive')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '历史归档读取失败')
        if (active) setData(Array.isArray(value) ? value as ArchiveItem[] : [])
      })
      .catch(value => {
        if (active) setError(value instanceof Error ? value.message : '历史归档读取失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">ARCHIVE / 05</span>
          <h1>历史归档</h1>
          <p>过往版本存档，可按需下载旧版汉化包。</p>
        </div>
      </Reveal>

      <section className="section archive-section">
        <Reveal delay={60}>
          <div className="archive-notice">
            <AlertTriangle size={16} />
            <span>以下为历史版本归档。旧版本可能存在已知问题，建议优先使用<Link to="/download" style={{ color: 'var(--cyan-strong)', fontWeight: 600 }}>最新版本</Link>。</span>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="archive-table-wrap">
            {loading ? (
              <div className="empty-state">正在读取历史归档…</div>
            ) : error ? (
              <div className="empty-state">{error}</div>
            ) : data.length === 0 ? (
              <div className="empty-state">暂无历史归档</div>
            ) : <table className="archive-table">
              <thead>
                <tr>
                  <th>版本号</th>
                  <th>发布日期</th>
                  <th>适用游戏版本</th>
                  <th>文件大小</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: ArchiveItem, i: number) => (
                  <tr key={item.version} className={i === 0 ? 'archive-row-latest' : 'archive-row-old'}>
                    <td className="archive-version">
                      <FileArchive size={14} />
                      <strong>{item.version}</strong>
                      {i > 0 && <span className="archive-old-tag">旧版本</span>}
                    </td>
                    <td>
                      <CalendarDays size={13} style={{ marginRight: 4, verticalAlign: -1 }} />
                      {item.date}
                    </td>
                    <td>{item.gameVersion}</td>
                    <td>{item.size}</td>
                    <td>
                      <div className="archive-actions">
                        {isDownloadUrl(item.downloadUrl) ? (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button button-ghost button-sm"
                            onClick={() => trackEvent('archive_download', { version: item.version })}
                          >
                            <ArrowDownToLine size={14} /> 下载
                          </a>
                        ) : (
                          <span className="button button-ghost button-sm is-disabled">
                            <ArrowDownToLine size={14} /> 链接待补充
                          </span>
                        )}
                        {item.changelogRef && isInternalPath(item.changelogRef) && (
                          <Link
                            to={item.changelogRef}
                            className="button button-ghost button-sm"
                          >
                            <ExternalLink size={14} /> 更新日志
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        </Reveal>
      </section>
    </main>
  )
}
