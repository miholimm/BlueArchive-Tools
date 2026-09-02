import { defaultModuleVisibility } from '../data/siteModules'
import { getAdminMe, isAdmin } from './api'
import { useEffect, useState } from 'react'
import type { ModuleVisibility, SiteModuleId, SiteSettings, VisibilityMode } from '../types'

export function getModuleMode(settings: SiteSettings, module: SiteModuleId): VisibilityMode {
  if (module === 'home') return 'public'
  if (module === 'workspace' || module === 'archive') return 'admin'
  return settings.moduleVisibility?.[module] || defaultModuleVisibility[module] || 'public'
}

export function canAccessModule(settings: SiteSettings, module: SiteModuleId, admin = isAdmin()): boolean {
  const mode = getModuleMode(settings, module)
  return mode !== 'disabled' && (mode !== 'admin' || admin)
}

export function getModuleVisibility(settings: SiteSettings): ModuleVisibility {
  return {
    ...defaultModuleVisibility,
    ...(settings.moduleVisibility || {}),
    workspace: 'admin',
    archive: 'admin',
  }
}

export function useAdminAccess() {
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    let active = true
    const sync = () => {
      if (!isAdmin()) {
        if (active) setAdmin(false)
        return
      }
      getAdminMe()
        .then(() => { if (active) setAdmin(true) })
        .catch(() => { if (active) setAdmin(false) })
    }
    sync()
    window.addEventListener('ba_admin_auth_changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      active = false
      window.removeEventListener('ba_admin_auth_changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return admin
}
