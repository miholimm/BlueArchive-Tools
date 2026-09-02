import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useContent } from '../lib/ContentContext'
import { canAccessModule, useAdminAccess } from '../lib/moduleAccess'
import type { SiteModuleId } from '../types'

type DropdownItem = { to: string; label: string; module: SiteModuleId }
type NavItem =
  | { kind: 'link'; to: string; label: string; module: SiteModuleId; icon?: React.ComponentType<{ size?: number }> }
  | { kind: 'dropdown'; label: string; icon: React.ComponentType<{ size?: number }>; items: DropdownItem[] }

const navItems: NavItem[] = [
  { kind: 'link', to: '/', label: '首页', module: 'home' },
  { kind: 'link', to: '/team', label: '汉化组', module: 'team' },
  { kind: 'link', to: '/news', label: '公告', module: 'news' },
  { kind: 'link', to: '/story', label: '剧情库', module: 'story' },
  { kind: 'link', to: '/changelog', label: '更新日志', module: 'changelog' },
  { kind: 'link', to: '/tutorial', label: '安装教程', module: 'tutorial' },
  { kind: 'link', to: '/download', label: '资源下载', module: 'downloads' },
  { kind: 'link', to: '/faq', label: '常见问题', module: 'faq' },
  { kind: 'link', to: '/status', label: '维护状态', module: 'status' },
  {
    kind: 'dropdown',
    label: '社区',
    icon: ChevronDown,
    items: [
      { to: '/feedback', label: '翻译反馈', module: 'feedback' },
      { to: '/contributors', label: '贡献榜', module: 'contributors' },
      { to: '/anti-cheat', label: '反作弊追踪', module: 'antiCheat' },
      { to: '/workspace', label: '协作工作台', module: 'workspace' },
      { to: '/glossary', label: '术语库', module: 'glossary' },
    ],
  },
  { kind: 'link', to: '/qa', label: '问答', module: 'qa' },
  { kind: 'link', to: '/api-docs', label: 'API 文档', module: 'apiDocs' },
]

function NavDropdown({ label, icon: Icon, items, mobile, onClose }: {
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
        {Icon && <Icon size={16} />}
        <span>{label}</span>
      </button>
      <div className={`nav-dropdown-menu ${open ? 'is-visible' : ''}`}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
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
  const visibleItems = navItems.reduce<NavItem[]>((items, item) => {
    if (item.kind === 'link') {
      if (canAccessModule(settings, item.module, admin)) items.push(item)
      return items
    }
    const visibleDropdownItems = item.items.filter(entry => canAccessModule(settings, entry.module, admin))
    if (visibleDropdownItems.length) items.push({ ...item, items: visibleDropdownItems })
    return items
  }, [])

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark">BA</span>
          <span><strong>蔚蓝档案</strong><small>本地化计划 / 2026</small></span>
        </Link>

        {/* Desktop nav */}
        <nav className="nav-links desktop-nav">
          {visibleItems.map(item =>
            item.kind === 'link' ? (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ) : (
              <NavDropdown
                key={item.label}
                label={item.label}
                icon={item.icon}
                items={item.items}
              />
            )
          )}
        </nav>

        {/* Mobile nav */}
        <nav className={open ? 'nav-links mobile-nav is-open' : 'nav-links mobile-nav'}>
          {visibleItems.map(item =>
            item.kind === 'link' ? (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ) : (
              <NavDropdown
                key={item.label}
                label={item.label}
                icon={item.icon}
                items={item.items}
                mobile
                onClose={closeMenu}
              />
            )
          )}
        </nav>

        <div className="nav-meta">
          <span className="live-dot" /> AUTO CHECK <span className="nav-version">v1.0.0</span>
        </div>
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
