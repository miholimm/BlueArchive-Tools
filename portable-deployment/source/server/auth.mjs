import crypto from 'node:crypto'
import { config } from './config.mjs'
import { readJSON, updateJSON } from './lib/json-store.mjs'

const sessions = new Map()

export const ADMIN_PERMISSIONS = [
  'news',
  'downloads',
  'status',
  'tutorial',
  'faq',
  'antiCheat',
  'settings',
  'visitors',
  'comments',
  'feedback',
  'apiKeys',
  'tasks',
  'glossary',
  'qa',
  'security',
]

function allPermissions() {
  return [...ADMIN_PERMISSIONS]
}

function normalizeUsers(data) {
  return Array.isArray(data?.users) ? data.users : []
}

async function readUsers() {
  return normalizeUsers(await readJSON('admin_users.json', { users: [] }))
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left ?? ''))
  const b = Buffer.from(String(right ?? ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(String(password), salt, 64)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export function verifyPassword(password, stored) {
  try {
    const [algorithm, saltValue, hashValue] = String(stored).split('$')
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false
    const salt = Buffer.from(saltValue, 'base64url')
    const expected = Buffer.from(hashValue, 'base64url')
    const actual = crypto.scryptSync(String(password), salt, expected.length)
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function createSession(userId, sessionVersion = 0) {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, { userId, sessionVersion, expiresAt: Date.now() + config.sessionTtlMs })
  return token
}

function rootIdentity() {
  return {
    userId: 'root',
    username: config.adminUser,
    displayName: '主管理员',
    isRoot: true,
    active: true,
    permissions: allPermissions(),
  }
}

function memberIdentity(user) {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    isRoot: false,
    active: user.active !== false,
    permissions: Array.isArray(user.permissions)
      ? user.permissions.filter(permission => ADMIN_PERMISSIONS.includes(permission) && permission !== 'apiKeys')
      : [],
  }
}

async function resolveToken(token) {
  const session = token && sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token)
    return null
  }
  if (session.userId === 'root') return rootIdentity()
  const users = await readUsers()
  const user = users.find(entry => entry.id === session.userId)
  if (!user || user.active === false || (user.sessionVersion || 0) !== session.sessionVersion) {
    sessions.delete(token)
    return null
  }
  return memberIdentity(user)
}

function bearerToken(req) {
  const value = req.headers.authorization
  return value?.startsWith('Bearer ') ? value.slice(7).trim() : null
}

export async function login(username, password) {
  const candidate = String(username ?? '').trim()
  const secret = String(password ?? '')
  if (candidate.toLowerCase() === config.adminUser.toLowerCase() && secureEqual(secret, config.adminPassword)) {
    return { token: createSession('root'), identity: rootIdentity() }
  }
  let authenticatedUser
  await updateJSON('admin_users.json', data => {
    const users = normalizeUsers(data)
    const user = users.find(
      entry => entry.active !== false && String(entry.username).toLowerCase() === candidate.toLowerCase(),
    )
    if (!user || !verifyPassword(secret, user.passwordHash)) return { users }
    user.lastLoginAt = new Date().toISOString()
    authenticatedUser = { ...user }
    return { users }
  }, { users: [] })
  if (!authenticatedUser) return null
  return { token: createSession(authenticatedUser.id, authenticatedUser.sessionVersion || 0), identity: memberIdentity(authenticatedUser) }
}

export async function requireAuth(req, res, next) {
  try {
    const token = bearerToken(req)
    const identity = await resolveToken(token)
    if (!identity) return res.status(401).json({ message: '未授权访问' })
    req.admin = { ...identity, token }
    return next()
  } catch {
    return res.status(500).json({ message: '鉴权服务暂时不可用' })
  }
}

export async function requireRoot(req, res, next) {
  try {
    const token = bearerToken(req)
    const identity = await resolveToken(token)
    if (!identity) return res.status(401).json({ message: '未授权访问' })
    if (!identity.isRoot) return res.status(403).json({ message: '仅主管理员可以执行此操作' })
    req.admin = { ...identity, token }
    return next()
  } catch {
    return res.status(500).json({ message: '鉴权服务暂时不可用' })
  }
}

export async function getRequestIdentity(req) {
  try {
    return await resolveToken(bearerToken(req))
  } catch {
    return null
  }
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const token = bearerToken(req)
      const identity = await resolveToken(token)
      if (!identity) return res.status(401).json({ message: '未授权访问' })
      req.admin = { ...identity, token }
      if (!identity.isRoot && !identity.permissions.includes(permission)) {
        return res.status(403).json({ message: '没有执行此操作的权限' })
      }
      return next()
    } catch {
      return res.status(500).json({ message: '鉴权服务暂时不可用' })
    }
  }
}

export function hasPermission(identity, permission) {
  return Boolean(identity?.isRoot || identity?.permissions?.includes(permission))
}

function validatePermissions(permissions) {
  if (!Array.isArray(permissions)) throw new Error('权限格式无效')
  const unique = [...new Set(permissions)]
  if (unique.some(permission => !ADMIN_PERMISSIONS.includes(permission))) {
    throw new Error('包含无效权限')
  }
  if (unique.includes('apiKeys')) throw new Error('API 管理仅限主管理员')
  return unique
}

function validateUsername(username) {
  const value = String(username ?? '').trim()
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(value)) {
    throw new Error('账号需为 3-32 位字母、数字、下划线、点号或短横线')
  }
  return value
}

function validatePassword(password) {
  const value = String(password ?? '')
  if (value.length < 8 || value.length > 128) throw new Error('密码长度需为 8-128 位')
  return value
}

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    permissions: Array.isArray(user.permissions) ? user.permissions.filter(permission => permission !== 'apiKeys') : [],
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    root: false,
  }
}

export async function listAdminUsers() {
  const users = await readUsers()
  return [
    {
      id: 'root',
      username: config.adminUser,
      displayName: '主管理员',
      permissions: allPermissions(),
      active: true,
      root: true,
    },
    ...users.map(safeUser),
  ]
}

export async function createAdminUser(input) {
  const username = validateUsername(input?.username)
  if (username.toLowerCase() === config.adminUser.toLowerCase()) throw new Error('账号已存在')
  const password = validatePassword(input?.password)
  const permissions = validatePermissions(input?.permissions || [])
  const now = new Date().toISOString()
  const user = {
    id: `member-${crypto.randomBytes(8).toString('hex')}`,
    username,
    displayName: String(input?.displayName || username).trim().slice(0, 80),
    passwordHash: hashPassword(password),
    permissions,
    active: input?.active !== false,
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
  }
  await updateJSON('admin_users.json', data => {
    const users = normalizeUsers(data)
    if (users.some(entry => entry.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('账号已存在')
    }
    users.push(user)
    return { users }
  }, { users: [] })
  return safeUser(user)
}

export async function updateAdminUser(id, input) {
  let updatedUser
  await updateJSON('admin_users.json', data => {
    const users = normalizeUsers(data)
    const index = users.findIndex(user => user.id === id)
    if (index === -1) throw new Error('账号不存在')
    const user = users[index]
    if (input?.displayName !== undefined) {
      user.displayName = String(input.displayName || user.username).trim().slice(0, 80)
    }
    if (input?.permissions !== undefined) user.permissions = validatePermissions(input.permissions)
    if (input?.password !== undefined) user.passwordHash = hashPassword(validatePassword(input.password))
    if (input?.active !== undefined) user.active = Boolean(input.active)
    if (input?.password !== undefined || input?.active !== undefined) {
      user.sessionVersion = (user.sessionVersion || 0) + 1
    }
    user.updatedAt = new Date().toISOString()
    users[index] = user
    updatedUser = { ...user }
    return { users }
  }, { users: [] })
  return safeUser(updatedUser)
}

export async function deleteAdminUser(id) {
  await updateJSON('admin_users.json', data => {
    const users = normalizeUsers(data)
    const index = users.findIndex(user => user.id === id)
    if (index === -1) throw new Error('账号不存在')
    users.splice(index, 1)
    return { users }
  }, { users: [] })
}

export function logout(token) {
  sessions.delete(token)
}

export function revokeMemberSessions() {
  for (const [token, session] of sessions) {
    if (session.userId !== 'root') sessions.delete(token)
  }
}
