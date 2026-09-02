import { LockKeyhole, Settings2 } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../lib/ContentContext'
import { getModuleMode, useAdminAccess } from '../lib/moduleAccess'
import type { SiteModuleId } from '../types'

export default function ModuleGate({ module, children }: { module: SiteModuleId; children: ReactNode }) {
  const { settings } = useContent()
  const mode = getModuleMode(settings, module)
  const admin = useAdminAccess()

  if (mode === 'disabled' && !admin) return <ModuleUnavailable />
  if (mode === 'admin' && !admin) return <ModuleRestricted />
  return <>{children}</>
}

function ModuleRestricted() {
  return (
    <main className="page-shell access-page">
      <div className="access-card glass-card">
        <LockKeyhole size={28} />
        <span className="eyebrow">ADMIN ACCESS</span>
        <h1>此模块仅限管理员访问</h1>
        <p>登录管理后台后即可访问协作与归档内容。</p>
        <Link to="/admin" className="button button-primary"><Settings2 size={15} /> 前往管理后台</Link>
      </div>
    </main>
  )
}

function ModuleUnavailable() {
  return (
    <main className="page-shell access-page">
      <div className="access-card glass-card">
        <Settings2 size={28} />
        <span className="eyebrow">MODULE OFFLINE</span>
        <h1>该模块暂未开放</h1>
        <p>管理员已暂时关闭此模块，请稍后再来查看。</p>
        <Link to="/" className="button button-primary">返回首页</Link>
      </div>
    </main>
  )
}
