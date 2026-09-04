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
  icon: React.ComponentType<{ size?: number }>
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
  const { settings } = useContent()
  const admin = useAdminAccess()

  // 按权限过滤，空城区自动隐藏
  const visibleDistricts = districts
    .map(district => ({
      ...district,
      items: district.items.filter(entry => canAccessModule(settings, entry.module, admin)),
    }))
    .filter(district => district.items.length > 0)

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={closeMenu}>
          <BrandMark />
          <span><strong>蔚蓝档案</strong><small>本地化计划 / 2026</small></span>
        </Link>

        {/* Desktop nav */}
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

        {/* Mobile nav */}
        <nav className={open ? 'nav-links mobile-nav is-open' : 'nav-links mobile-nav'}>
          {visibleDistricts.map(district => (
            <NavDropdown
              key={district.en}
              en={district.en}
              label={district.label}
              icon={district.icon}
              items={district.items}
              mobile
              onClose={closeMenu}
            />
          ))}
        </nav>

        <div className="nav-meta">
          <span className="live-dot" /> 自动校验 <span className="nav-version">v1.0.0</span>
        </div>
        <ThemeToggle />
        <button
          className="menu-button"
          aria-label="打开菜单"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  )
}
