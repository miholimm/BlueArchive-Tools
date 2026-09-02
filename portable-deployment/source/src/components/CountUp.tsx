import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, duration = 1200, decimals = 0, suffix = '' }: { value: number; duration?: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || startedRef.current) return

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          io.disconnect()
          const startTime = performance.now()
          const animate = (now: number) => {
            const elapsed = now - startTime
            const t = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setDisplay(value * eased)
            if (t < 1) requestAnimationFrame(animate)
            else setDisplay(value)
          }
          requestAnimationFrame(animate)
        }
      })
    }, { threshold: 0.3 })

    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  const formatted = decimals === 0 ? Math.round(display).toString() : display.toFixed(decimals)
  return <span ref={ref} style={{ display: 'inline-block' }}>{formatted}{suffix}</span>
}