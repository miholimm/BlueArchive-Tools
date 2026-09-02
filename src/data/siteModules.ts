import type { ModuleVisibility, SiteModuleId, VisibilityMode } from '../types'

export type SiteModuleDefinition = {
  id: SiteModuleId
  label: string
  description: string
  defaultVisibility: VisibilityMode
  lockedVisibility?: VisibilityMode
}

export const siteModuleDefinitions: SiteModuleDefinition[] = [
  { id: 'home', label: '首页', description: '站点首页与项目介绍', defaultVisibility: 'public', lockedVisibility: 'public' },
  { id: 'team', label: '汉化组', description: '汉化组成员与分工', defaultVisibility: 'public' },
  { id: 'news', label: '更新公告', description: '项目公告与新闻详情', defaultVisibility: 'public' },
  { id: 'downloads', label: '资源下载', description: '各平台客户端与补丁资源', defaultVisibility: 'public' },
  { id: 'status', label: '维护状态', description: '九项资源版本自动比对', defaultVisibility: 'public' },
  { id: 'changelog', label: '更新日志', description: '版本更新记录', defaultVisibility: 'public' },
  { id: 'tutorial', label: '安装教程', description: '汉化包安装与故障排查教程', defaultVisibility: 'public' },
  { id: 'faq', label: '常见问题', description: '常见问题与解决方案', defaultVisibility: 'public' },
  { id: 'story', label: '剧情库', description: '双语剧情阅读与检索', defaultVisibility: 'public' },
  { id: 'feedback', label: '翻译反馈', description: '提交和查看翻译反馈', defaultVisibility: 'public' },
  { id: 'contributors', label: '贡献榜', description: '社区贡献者排行', defaultVisibility: 'public' },
  { id: 'antiCheat', label: '反作弊追踪', description: '各服务器安全动态', defaultVisibility: 'public' },
  { id: 'glossary', label: '术语库', description: '中日译名与术语对照', defaultVisibility: 'public' },
  { id: 'qa', label: '问答', description: '社区问答与经验交流', defaultVisibility: 'public' },
  { id: 'apiDocs', label: 'API 文档', description: '开放接口与开发者说明', defaultVisibility: 'public' },
  { id: 'workspace', label: '协作工作台', description: '翻译任务认领与提交', defaultVisibility: 'admin', lockedVisibility: 'admin' },
  { id: 'archive', label: '历史归档', description: '历史版本下载与归档记录', defaultVisibility: 'admin', lockedVisibility: 'admin' },
]

export const defaultModuleVisibility = siteModuleDefinitions.reduce<ModuleVisibility>(
  (result, module) => {
    result[module.id] = module.lockedVisibility || module.defaultVisibility
    return result
  },
  {} as ModuleVisibility,
)
