import { useEffect, useState } from 'react'
import { AlertCircle, Apple, BookOpen, ChevronDown, ChevronUp, Monitor, Smartphone } from 'lucide-react'
import Reveal from '../components/Reveal'
import { authFetch } from '../lib/api'

/** 教程步骤类型 */
interface TutorialStep {
  title: string
  desc: string
}

/** 常见错误类型 */
interface CommonError {
  error: string
  fix: string
}

/** 平台教程类型 */
interface PlatformTutorial {
  platform: string
  label: string
  icon: string
  steps: TutorialStep[]
  commonErrors: CommonError[]
}

/** 图标映射表 */
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Monitor,
  Smartphone,
  Apple,
}

export default function Tutorial() {
  const [data, setData] = useState<PlatformTutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePlatform, setActivePlatform] = useState('')
  const [openErrors, setOpenErrors] = useState<Set<number>>(new Set())

  useEffect(() => {
    let active = true
    authFetch('/api/site-data/tutorial')
      .then(async response => {
        const value = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(value.message || value.error || '安装教程读取失败')
        if (active) {
          const next = Array.isArray(value) ? value as PlatformTutorial[] : []
          setData(next)
          setActivePlatform(next[0]?.platform || '')
        }
      })
      .catch(value => {
        if (active) setError(value instanceof Error ? value.message : '安装教程读取失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const platform = data.find((p) => p.platform === activePlatform) ?? data[0]

  const toggleError = (index: number) => {
    setOpenErrors((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (loading) return <main className="page-shell"><div className="empty-state">正在读取安装教程…</div></main>
  if (error || !platform) return <main className="page-shell"><div className="empty-state">{error || '暂无安装教程'}</div></main>

  const IconComp = iconMap[platform.icon] ?? Monitor

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero tutorial-page-hero">
          <span className="eyebrow">RESOURCES / TUTORIAL</span>
          <h1>安装教程</h1>
          <p>选择你的平台，跟随步骤完成汉化补丁安装。</p>
          <div className="page-hero-number">
            <BookOpen size={20} />
            <small>TUTORIAL</small>
          </div>
        </div>
      </Reveal>

      <section className="section tutorial-section">
        {/* 平台选择 Tab */}
        <Reveal>
          <div className="tutorial-tabs" role="tablist" aria-label="选择平台">
            {data.map((p) => {
              const TabIcon = iconMap[p.icon] ?? Monitor
              const isActive = p.platform === activePlatform
              return (
                <button
                  key={p.platform}
                  role="tab"
                  aria-selected={isActive}
                  className={`tutorial-tab ${isActive ? 'tutorial-tab-active' : ''}`}
                  onClick={() => setActivePlatform(p.platform)}
                >
                  <TabIcon size={20} />
                  <span>{p.label}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* 步骤列表 */}
        <div className="tutorial-steps">
          {platform.steps.map((step, i) => (
            <Reveal key={i} delay={i * 100} spring="up">
              <div className="tutorial-step-card">
                <div className="tutorial-step-number">{i + 1}</div>
                <div className="tutorial-step-body">
                  <h3 className="tutorial-step-title">{step.title}</h3>
                  <p className="tutorial-step-desc">{step.desc}</p>
                  <div className="tutorial-img-placeholder">
                    <span>📸 截图示意</span>
                    <small>步骤 {i + 1}：{step.title}</small>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* 常见错误折叠面板 */}
        <Reveal>
          <div className="tutorial-errors">
            <h2 className="tutorial-errors-heading">
              <AlertCircle size={20} />
              常见错误
            </h2>
            <div className="tutorial-errors-list">
              {platform.commonErrors.map((err, i) => {
                const isOpen = openErrors.has(i)
                return (
                  <div key={i} className="tutorial-error-item">
                    <button
                      className="tutorial-error-trigger"
                      onClick={() => toggleError(i)}
                      aria-expanded={isOpen}
                    >
                      <span className="tutorial-error-label">{err.error}</span>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {isOpen && (
                      <div className="tutorial-error-content">
                        <p>{err.fix}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
