import { useState, type ReactNode } from 'react'

type Ripple = { x: number; y: number; id: number }

export default function Ripple({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now()
    }
    setRipples(prev => [...prev, ripple])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 700)
    onClick?.(e)
  }

  return (
    <button className={`ripple-btn ${className}`} onClick={handleClick}>
      {children}
      {ripples.map(r => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
    </button>
  )
}