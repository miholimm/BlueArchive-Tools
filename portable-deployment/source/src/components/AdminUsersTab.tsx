import { KeyRound, Pencil, Plus, Power, RefreshCw, ShieldCheck, Trash2, UserRoundPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { adminPermissionDefinitions, type AdminPermission, type AdminUser } from '../data/adminPermissions'
import { authFetch } from '../lib/api'

type Toast = (message: string, type?: 'success' | 'error') => void
type FormState = {
  username: string
  displayName: string
  password: string
  permissions: AdminPermission[]
  active: boolean
}

const emptyForm: FormState = {
  username: '',
  displayName: '',
  password: '',
  permissions: ['news'],
  active: true,
}

function formatTime(value?: string) {
  if (!value) return '尚未登录'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

export default function AdminUsersTab({ notify }: { notify: Toast }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await authFetch('/api/admin/users')
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || `读取失败（${response.status}）`)
      setUsers(Array.isArray(value.users) ? value.users : [])
    } catch (error) {
      notify(error instanceof Error ? error.message : '账号读取失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const togglePermission = (permission: AdminPermission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  const startEdit = (user: AdminUser) => {
    setEditingId(user.id)
    setForm({
      username: user.username,
      displayName: user.displayName,
      password: '',
      permissions: user.permissions,
      active: user.active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveUser = async () => {
    if (!editingId && !form.username.trim()) {
      notify('请输入登录账号', 'error')
      return
    }
    if (!editingId && form.password.length < 8) {
      notify('初始密码至少需要 8 位', 'error')
      return
    }
    if (!form.permissions.length) {
      notify('至少选择一项权限', 'error')
      return
    }
    setSaving(true)
    try {
      const response = await authFetch(editingId ? `/api/admin/users/${editingId}` : '/api/admin/users', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...(editingId ? {} : { username: form.username.trim() }),
          displayName: form.displayName.trim(),
          ...(form.password ? { password: form.password } : {}),
          permissions: form.permissions,
          active: form.active,
        }),
      })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || `保存失败（${response.status}）`)
      notify(editingId ? '组员账号已更新' : '组员账号已创建')
      resetForm()
      await fetchUsers()
    } catch (error) {
      notify(error instanceof Error ? error.message : '账号保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: AdminUser) => {
    try {
      const response = await authFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !user.active }),
      })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || '状态更新失败')
      notify(user.active ? '账号已停用' : '账号已启用')
      await fetchUsers()
    } catch (error) {
      notify(error instanceof Error ? error.message : '状态更新失败', 'error')
    }
  }

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`确认删除组员账号「${user.username}」？`)) return
    try {
      const response = await authFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.message || value.error || '删除失败')
      notify('组员账号已删除')
      if (editingId === user.id) resetForm()
      await fetchUsers()
    } catch (error) {
      notify(error instanceof Error ? error.message : '账号删除失败', 'error')
    }
  }

  return (
    <section className="admin-panel admin-users-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><ShieldCheck size={14} /> ACCESS CONTROL</span>
          <h2>组员账号</h2>
          <p>为汉化组成员创建独立账号，按工作范围分配后台权限。</p>
        </div>
        <button className="button button-ghost" onClick={fetchUsers} disabled={loading}>
          <RefreshCw size={15} /> 刷新列表
        </button>
      </div>

      <div className="admin-user-editor">
        <div className="admin-user-editor-heading">
          <div>
            <span className="admin-section-kicker">{editingId ? 'EDIT MEMBER' : 'NEW MEMBER'}</span>
            <h3>{editingId ? '编辑组员账号' : '创建组员账号'}</h3>
          </div>
          {editingId && (
            <button className="button button-ghost button-sm" onClick={resetForm}>
              <X size={14} /> 取消编辑
            </button>
          )}
        </div>
        <div className="admin-user-form-grid">
          <label>
            登录账号
            <input value={form.username} disabled={Boolean(editingId)} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="例如 translator01" />
          </label>
          <label>
            显示名称
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="例如 星野翻译" />
          </label>
          <label>
            {editingId ? '重置密码' : '初始密码'}
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editingId ? '留空表示不修改' : '至少 8 位'} autoComplete="new-password" />
          </label>
          <label className="admin-user-active-field">
            账号状态
            <button type="button" className={`admin-toggle ${form.active ? 'is-on' : ''}`} onClick={() => setForm({ ...form, active: !form.active })}>
              <span /> {form.active ? '启用中' : '已停用'}
            </button>
          </label>
        </div>
        <div className="admin-permission-picker">
          <div className="admin-permission-picker-title">
            <div>
              <strong>分配权限</strong>
              <span>选中的权限会同时限制后台菜单和服务端接口。</span>
            </div>
            <span className="admin-permission-count">{form.permissions.length} / {adminPermissionDefinitions.filter((item) => !('rootOnly' in item && item.rootOnly)).length}</span>
          </div>
          <div className="admin-permission-grid">
            {adminPermissionDefinitions.filter((item) => !('rootOnly' in item && item.rootOnly)).map((permission) => {
              const checked = form.permissions.includes(permission.id)
              return (
                <button key={permission.id} type="button" className={`admin-permission-option ${checked ? 'is-checked' : ''}`} onClick={() => togglePermission(permission.id)}>
                  <span className="admin-permission-check">{checked ? '✓' : ''}</span>
                  <span>
                    <strong>{permission.label}</strong>
                    <small>{permission.description}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <button className="button button-primary admin-user-save" onClick={saveUser} disabled={saving}>
          {editingId ? <Pencil size={15} /> : <UserRoundPlus size={15} />}
          {saving ? '保存中…' : editingId ? '保存账号设置' : '创建组员账号'}
        </button>
      </div>

      <div className="admin-user-list-heading">
        <div>
          <span className="admin-section-kicker">TEAM DIRECTORY</span>
          <h3>账号列表</h3>
        </div>
        <span>{users.length} 个账号</span>
      </div>
      {loading ? (
        <div className="admin-users-empty">正在读取账号列表…</div>
      ) : users.length === 0 ? (
        <div className="admin-users-empty">还没有组员账号，先创建一个吧。</div>
      ) : (
        <div className="admin-users-list">
          {users.map((user) => (
            <article className={`admin-user-card ${user.active ? '' : 'is-disabled'}`} key={user.id}>
              <div className="admin-user-card-main">
                <div className={`admin-user-avatar ${user.root ? 'is-root' : ''}`}>
                  {user.root ? <ShieldCheck size={20} /> : user.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="admin-user-copy">
                  <div className="admin-user-name-row">
                    <h4>{user.displayName}</h4>
                    <span className={`admin-user-status ${user.active ? 'is-active' : 'is-disabled'}`}>{user.active ? '启用中' : '已停用'}</span>
                    {user.root && <span className="admin-root-badge">ROOT</span>}
                  </div>
                  <p>@{user.username} · 最近登录：{formatTime(user.lastLoginAt)}</p>
                  <div className="admin-user-permissions">
                    {user.permissions.map((permission) => <span key={permission}>{adminPermissionDefinitions.find((item) => item.id === permission)?.label || permission}</span>)}
                  </div>
                </div>
              </div>
              <div className="admin-user-actions">
                {user.root ? <span className="admin-root-note">环境变量主账号</span> : (
                  <>
                    <button className="button button-ghost button-sm" onClick={() => startEdit(user)}><Pencil size={14} /> 编辑</button>
                    <button className="button button-ghost button-sm" onClick={() => toggleActive(user)}><Power size={14} /> {user.active ? '停用' : '启用'}</button>
                    <button className="button button-danger button-sm" onClick={() => removeUser(user)}><Trash2 size={14} /> 删除</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="admin-users-security-note"><KeyRound size={15} /><span>密码使用服务端随机盐和 scrypt 哈希保存，后台列表不会显示明文密码。</span></div>
    </section>
  )
}
