import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import type { Member } from '../types'

const palettes = [
  ['#06b6d4', '#0d9488'],
  ['#a855f7', '#ec4899'],
  ['#3b82f6', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#8b5cf6', '#3b82f6'],
]

function hashPalette(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return palettes[Math.abs(h) % palettes.length]
}

export default function MemberCard({ member, index }: { member: Member; index: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [a, b] = hashPalette(member.name)
  return (
    <article className="member-card" style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}>
      <div className="member-image">
        {!imgFailed && member.avatar ? (
          <img src={member.avatar} alt={member.name} onError={() => setImgFailed(true)} />
        ) : (
          <div className="member-avatar-fallback" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
            <span>{member.name.slice(0, 1)}</span>
          </div>
        )}
        <span>0{index + 1}</span>
      </div>
      <div className="member-info">
        <div><h3>{member.name}</h3><span className="role-pill">{member.role}</span></div>
        <p>{member.description}</p>
        <small>加入时间 / {member.joinTime}</small>
        <ArrowUpRight className="member-arrow" size={19} />
      </div>
    </article>
  )
}