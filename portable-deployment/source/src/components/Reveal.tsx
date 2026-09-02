import { useEffect, useRef, useState, type ReactNode } from 'react'

type SpringType = 'up' | 'scale' | 'right' | 'left' | 'none'

export default function Reveal({ children, delay = 0, spring = 'up', className = '' }: { children: ReactNode; delay?: number; spring?: SpringType; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const typeClass = `reveal-${spring}`

  return (
    <div
      ref={ref}
      className={`reveal ${typeClass} ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}