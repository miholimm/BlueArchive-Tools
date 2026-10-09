import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export default function RouteViewport({ children }: { children: ReactNode }) {
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    // Scroll restoration on route change
    if (prevPathRef.current !== location.pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      prevPathRef.current = location.pathname
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    setIsTransitioning(true)
    const timer = window.setTimeout(() => {
      setIsTransitioning(false)
    }, 380)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search])

  return (
    <div
      key={location.pathname}
      className={`route-viewport ${isTransitioning ? 'route-transition-enter' : 'route-transition-idle'}`}
    >
      {children}
    </div>
  )
}
