import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { NewsItem } from '../types'

const palettes = [
  ['rgba(6,182,212,0.85)', 'rgba(13,148,136,0.7)'],
  ['rgba(168,85,247,0.8)', 'rgba(236,72,153,0.6)'],
  ['rgba(59,130,246,0.8)', 'rgba(14,165,233,0.6)'],
  ['rgba(245,158,11,0.8)', 'rgba(239,68,68,0.6)'],
]

function hashPalette(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return palettes[Math.abs(h) % palettes.length]
}

export default function NewsCard({ news, featured = false }: { news: NewsItem; featured?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [a, b] = hashPalette(news.id + news.title)
  const description = news.content.replace(/[#>*_]/g, '').split('\n').filter(Boolean)[1]?.slice(0, 58) || '查看本次更新的详细内容与项目进展。'
  return (
    <article className={featured ? 'news-card featured' : 'news-card'}>
      <div className="news-cover" style={{
        backgroundImage: imgFailed || !news.cover ? `linear-gradient(135deg, ${a}, ${b})` : `url(${news.cover})`
      }}>
        {imgFailed || !news.cover ? (
          <div className="news-cover-pattern">
            <span className="news-cover-letter">{news.title.slice(0, 1)}</span>
          </div>
        ) : (
          <img src={news.cover} alt="" onError={() => setImgFailed(true)} style={{ display: 'none' }} />
        )}
        <span className="news-index">0{news.id}</span>
        <span className="news-tag">NEWS</span>
      </div>
      <div className="news-card-body">
        <div className="news-meta">
          <span><CalendarDays size={13} /> {news.date}</span>
          <span>{news.author}</span>
        </div>
        <h3>{news.title}</h3>
        <p>{description}...</p>
        <Link to={`/news/${news.id}`} className="text-link">查看详情 <ArrowUpRight size={16} /></Link>
      </div>
    </article>
  )
}