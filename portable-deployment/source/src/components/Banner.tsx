import { Bell, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useContent } from '../lib/ContentContext'
import { trackEvent } from '../lib/tracking'

/** 标签分类配置：根据标题关键词推断公告类型 */
interface TagConfig {
  label: string
  className: string
}

/** 标签匹配规则：按优先级排列，匹配到第一个即返回 */
const TAG_RULES: { keywords: string[]; config: TagConfig }[] = [
  { keywords: ['维护', '修复', '故障', '异常', '停机'], config: { label: '维护', className: 'banner-tag-maintenance' } },
  { keywords: ['社区', '反馈', '活动', '征集', '招募'], config: { label: '社区', className: 'banner-tag-community' } },
]

const DEFAULT_TAG: TagConfig = { label: '更新', className: 'banner-tag-update' }

/** 从标题推断标签类型 */
function inferTag(title: string): TagConfig {
  for (const rule of TAG_RULES) {
    if (rule.keywords.some(kw => title.includes(kw))) {
      return rule.config
    }
  }
  return DEFAULT_TAG
}

const STORAGE_KEY = 'banner-dismissed-id'

interface BannerProps {
  className?: string
}

export default function Banner({ className }: BannerProps) {
  const { news } = useContent()
  const [dismissed, setDismissed] = useState<boolean>(true)

  useEffect(() => {
    if (news.length === 0) return
    const dismissedId = localStorage.getItem(STORAGE_KEY)
    // 仅当最新公告未被关闭时展示
    if (dismissedId !== news[0].id) {
      setDismissed(false)
    }
  }, [news])

  // 无公告或已关闭则不渲染
  if (dismissed || news.length === 0) return null

  const latest = news[0]
  const tag = inferTag(latest.title)

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, latest.id)
    setDismissed(true)
    trackEvent('banner_dismiss', { news_id: latest.id })
  }

  return (
    <div
      className={`banner ${className ?? ''}`}
      role="alert"
      aria-label={`公告：${latest.title}`}
    >
      <div className="banner-inner">
        <div className="banner-left">
          <span className={`banner-tag ${tag.className}`}>{tag.label}</span>
          <Bell size={15} className="banner-icon" />
          <span className="banner-text">{latest.title}</span>
        </div>
        <button
          className="banner-close"
          onClick={handleClose}
          aria-label="关闭公告"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
