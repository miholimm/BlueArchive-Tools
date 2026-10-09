import { BookOpen, Building2, ChevronDown, Download, Menu, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useContent } from '../lib/ContentContext'
import { canAccessModule, useAdminAccess } from '../lib/moduleAccess'
import BrandMark from './BrandMark'
import ThemeToggle from './ThemeToggle'
import type { SiteModuleId } from '../types'

type DropdownItem = { to: string; label: string; module: SiteModuleId }
type District = {
  en: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  items: DropdownItem[]
}

// 基沃托斯导航：18 条路由收敘为 4 个「城区」，替代原先 13 项平级入口
// 标签采用官方式双行：英文大写主标签 + 中文副标签
const districts: District[] = [
  {
    en: 'SCHALE',
    label: '夏莱总部',
    icon: Building2,
    items: [
      { to: '/', label: '首页', module: 'home' },
      { to: '/team', label: '汉化组', module: 'team' },
      { to: '/news', label: '公告', module: 'news' },
      { to: '/contributors', label: '贡献榜', module: 'contributors' },
    ],
  },
  {
    en: 'STORY',
    label: '剧情',
    icon: BookOpen,
    items: [
      { to: '/story', label: '剧情库', module: 'story' },
      { to: '/story-player', label: '原版播放器', module: 'story' },
      { to: '/glossary', label: '术语库', module: 'glossary' },
      { to: '/archive', label: '档案库', module: 'archive' },
    ],
  },
  {
    en: 'RESOURCES',
    label: '资源',
    icon: Download,
    items: [
      { to: '/download', label: '资源下载', module: 'downloads' },
      { to: '/tutorial', label: '安装教程', module: 'tutorial' },
      { to: '/changelog', label: '更新日志', module: 'changelog' },
      { to: '/status', label: '维护状态', module: 'status' },
    ],
  },
  {
    en: 'COMMUNITY',
    label: '社区',
    icon: Users,
    items: [
      { to: '/faq', label: '常见问题', module: 'faq' },
      { to: '/qa', label: '问答', module: 'qa' },
      { to: '/feedback', label: '翻译反馈', module: 'feedback' },
      { to: '/anti-cheat', label: '反作弊追踪', module: 'antiCheat' },
      { to: '/workspace', label: '协作工作台', module: 'workspace' },
      { to: '/api-docs', label: 'API 文档', module: 'apiDocs' },
    ],
  },
]

function NavDropdown({ en, label, icon: Icon, items, mobile, onClose }: {
  en: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  items: DropdownItem[]
  mobile?: boolean
  onClose?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click (desktop)
  useEffect(() => {
    if (mobile) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobile])

  const toggle = () => setOpen(prev => !prev)

  return (
    <div
      ref={ref}
      className={mobile ? 'nav-dropdown-mobile' : 'nav-dropdown'}
      onMouseEnter={() => !mobile && setOpen(true)}
      onMouseLeave={() => !mobile && setOpen(false)}
    >
      <button
        className={`nav-dropdown-trigger ${open ? 'is-open' : ''}`}
        onClick={mobile ? toggle : undefined}
        aria-expanded={open}
      >
        <span className="nav-district-en">{Icon && <Icon size={15} />}{en}</span>
        <span className="nav-district-zh">{label}</span>
        <ChevronDown size={13} className="nav-caret" />
      </button>
      <div className={`nav-dropdown-menu ${open ? 'is-visible' : ''}`}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => { setOpen(false); onClose?.() }}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const closeMenu = () => setOpen(false)
  const navRef = useRef<HTMLElement>(null)
  const { settings, download } = useContent()
  const admin = useAdminAccess()
  const currentVersion = download.android[0]?.version || download.windows[0]?.version || '1.0.0'

  // 点击外部收起移动端菜单 & 监听 ESC 键
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // 按权限过滤，空城区自动隐藏
  const visibleDistricts = districts
    .map(district => ({
      ...district,
      items: district.items.filter(entry => canAccessModule(settings, entry.module, admin)),
    }))
    .filter(district => district.items.length > 0)

  return (
    <>
      {open && (
        <div
          className="mobile-nav-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
      <header className="site-nav" ref={navRef}>
        <div className="nav-inner">
          <Link to="/" className="brand" onClick={closeMenu}>
            <BrandMark />
            <span className="brand-text"><strong>蔚蓝档案</strong><small>本地化计划 / 2026</small></span>
          </Link>

          {/* 桌面端导航 */}
          <nav className="nav-links desktop-nav">
            {visibleDistricts.map(district => (
              <NavDropdown
                key={district.en}
                en={district.en}
                label={district.label}
                icon={district.icon}
                items={district.items}
              />
            ))}
          </nav>

          {/* 移动端全量垂直抽屉导航 (杜绝单框与横向滑动) */}
          <nav className={open ? 'mobile-nav-drawer is-open' : 'mobile-nav-drawer'}>
            <div className="mobile-nav-container">
              {visibleDistricts.map(district => (
                <div key={district.en} className="mobile-district-card">
                  <div className="mobile-district-header">
                    {district.icon && <district.icon size={16} className="district-icon" />}
                    <span className="mobile-district-title">{district.label}</span>
                    <span className="mobile-district-en">{district.en}</span>
                  </div>
                  <div className="mobile-district-grid">
                    {district.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={closeMenu}
                        className="mobile-district-link"
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="nav-meta">
            <span className="live-dot" /> 自动校验 <span className="nav-version">v{currentVersion}</span>
          </div>
          <ThemeToggle />
          <button
            className="menu-button"
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
    </>
  )
}
