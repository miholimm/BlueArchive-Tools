import { useEffect, useRef, useState } from 'react'

export default function GameCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const mousePos = useRef({ x: -100, y: -100 })
  const ringPos = useRef({ x: -100, y: -100 })
  const hasMoved = useRef(false)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    // Only enable on desktop pointer devices
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!isDesktop || reducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }

      if (!hasMoved.current) {
        hasMoved.current = true
        ringPos.current = { x: e.clientX, y: e.clientY }
        setVisible(true)
      } else if (!visible) {
        setVisible(true)
      }

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      }

      // Check if hovering over interactive element
      const target = e.target as HTMLElement | null
      if (target) {
        const isInteractive = target.closest(
          'a, button, input, select, textarea, [role="button"], [role="tab"], .button, .ripple-btn, .district-card, .news-card, .download-card, .hero-character-stage, .hero-student-switcher, .theme-toggle, .menu-button'
        )
        setHovered(Boolean(isInteractive))
      }
    }

    const handleMouseDown = () => {
      setClicked(true)
    }

    const handleMouseUp = () => {
      setClicked(false)
    }

    const handleMouseLeave = () => {
      setVisible(false)
      setHovered(false)
      setClicked(false)
    }

    const handleMouseEnter = () => {
      setVisible(true)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mousedown', handleMouseDown, { passive: true })
    window.addEventListener('mouseup', handleMouseUp, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    // Smooth trailing ring animation with spring ease
    const animate = () => {
      const ease = 0.22
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * ease
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * ease

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`
      }

      rafId.current = requestAnimationFrame(animate)
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, []) // Empty dependency array ensures listeners and RAF run once

  return (
    <div
      className={`ba-game-cursor-wrapper ${visible ? 'is-visible' : ''}`}
      aria-hidden="true"
    >
      <div
        ref={ringRef}
        className={`ba-cursor-ring ${hovered ? 'ba-cursor-ring-hover' : ''} ${clicked ? 'ba-cursor-ring-active' : ''}`}
      />
      <div
        ref={cursorRef}
        className={`ba-cursor-dot ${hovered ? 'ba-cursor-dot-hover' : ''}`}
      />
    </div>
  )
}
