import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type SpringType = 'up' | 'down' | 'scale' | 'right' | 'left' | 'fade' | 'pop' | 'none'

interface RevealGroupContextType {
  getNextDelay: () => number
}

const RevealGroupContext = createContext<RevealGroupContextType | null>(null)

export function RevealGroup({
  children,
  stagger = 80,
  baseDelay = 0,
  className = '',
}: {
  children: ReactNode
  stagger?: number
  baseDelay?: number
  className?: string
}) {
  const counterRef = useRef(0)
  counterRef.current = 0

  const getNextDelay = () => {
    const current = counterRef.current
    counterRef.current += 1
    return baseDelay + current * stagger
  }

  return (
    <RevealGroupContext.Provider value={{ getNextDelay }}>
      <div className={`reveal-group ${className}`}>{children}</div>
    </RevealGroupContext.Provider>
  )
}

export default function Reveal({
  children,
  delay,
  spring = 'up',
  className = '',
}: {
  children: ReactNode
  delay?: number
  spring?: SpringType
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const groupContext = useContext(RevealGroupContext)

  // Compute delay once: explicit delay prop > group stagger > 0
  const computedDelay = useRef<number | null>(null)
  if (computedDelay.current === null) {
    if (delay !== undefined) {
      computedDelay.current = delay
    } else if (groupContext) {
      computedDelay.current = groupContext.getNextDelay()
    } else {
      computedDelay.current = 0
    }
  }

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
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const typeClass = `reveal-${spring}`

  return (
    <div
      ref={ref}
      className={`reveal ${typeClass} ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${computedDelay.current}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}