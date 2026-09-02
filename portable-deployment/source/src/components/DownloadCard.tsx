import { Apple, ArrowDownToLine, Bot, Monitor, Smartphone } from 'lucide-react'
import { useState } from 'react'
import type { DownloadItem } from '../types'
import { trackEvent } from '../lib/tracking'
import { ChecksumBadge } from './ChecksumBadge'

const icons = { android: Bot, windows: Monitor, ios: Smartphone, macos: Apple }

export default function DownloadCard({ item, platform, onDownload, showChecksum = false }: { item: DownloadItem; platform: keyof typeof icons; onDownload: (item: DownloadItem) => void; showChecksum?: boolean }) {
  const Icon = icons[platform]
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const r = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() }
    setRipples(prev => [...prev, r])
    setTimeout(() => setRipples(prev => prev.filter(x => x.id !== r.id)), 700)
    trackEvent('download_click', { source: 'download_page', platform })
    onDownload(item)
  }

  return (
    <article className="download-card">
      <div className={`platform-icon ${platform}`}><Icon size={25} /></div>
      <div className="download-content">
        <div className="download-title"><h3>{item.name}</h3><span>v{item.version}</span></div>
        <p>{item.description}</p>
        <small>更新于 {item.updated}</small>
        {showChecksum && <ChecksumBadge checksum={item.checksum} />}
      </div>
      <button className="download-action ripple-btn" onClick={handleClick}>
        <ArrowDownToLine size={17} /><span>获取资源</span>
        {ripples.map(r => <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />)}
      </button>
    </article>
  )
}
