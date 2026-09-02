export const adminPermissionDefinitions = [
  { id: 'news', label: '公告管理', description: '编辑和发布站点公告' },
  { id: 'downloads', label: '下载资源', description: '维护各平台下载链接' },
  { id: 'status', label: '维护状态', description: '维护九项资源版本、更新时间与状态覆盖' },
  { id: 'tutorial', label: '安装教程', description: '编辑各平台安装步骤和故障排查' },
  { id: 'faq', label: '常见问题', description: '维护用户常见问题与解答' },
  { id: 'antiCheat', label: '反作弊追踪', description: '维护安全动态与风险提示' },
  { id: 'settings', label: '站点视觉', description: '修改标题、壁纸和站点设置' },
  { id: 'visitors', label: '访客记录', description: '查看站点访问记录' },
  { id: 'comments', label: '评论审核', description: '审核用户评论' },
  { id: 'feedback', label: '反馈管理', description: '处理翻译反馈和回复' },
  { id: 'apiKeys', label: 'API 管理', description: '仅主管理员可创建和吊销 API Key', rootOnly: true },
  { id: 'tasks', label: '任务管理', description: '管理翻译任务池' },
  { id: 'glossary', label: '术语管理', description: '维护术语库' },
  { id: 'qa', label: '问答审核', description: '管理社区问答' },
  { id: 'security', label: '安全中心', description: '查看审计日志' },
] as const

export type AdminPermission = (typeof adminPermissionDefinitions)[number]['id']

export type AdminIdentity = {
  userId: string
  username: string
  displayName: string
  isRoot: boolean
  active: boolean
  permissions: AdminPermission[]
}

export type AdminUser = {
  id: string
  username: string
  displayName: string
  permissions: AdminPermission[]
  active: boolean
  root: boolean
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
}
