import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export default function RouteViewport({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [bouncing, setBouncing] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px) and (prefers-reduced-motion: no-preference)')
    if (!mediaQuery.matches) return
    setBouncing(false)
    const frame = window.requestAnimationFrame(() => setBouncing(true))
    const timeout = window.setTimeout(() => setBouncing(false), 520)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [location.pathname, location.search])

  return <div className={bouncing ? 'route-viewport route-viewport-bounce' : 'route-viewport'}>{children}</div>
}
