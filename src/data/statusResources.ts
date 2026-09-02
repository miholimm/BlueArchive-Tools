import type { StatusResource, StatusResourceDefinition } from '../types'

export const statusResourceDefinitions = [
  { id: 'androidClient', label: 'Android 客户端状态' },
  { id: 'windowsClient', label: 'Windows 客户端状态' },
  { id: 'iosClient', label: 'iOS 客户端状态' },
  { id: 'macosClient', label: 'MacOS 客户端状态' },
  { id: 'textTranslation', label: '文本汉化状态' },
  { id: 'cnVoice', label: 'CN 语音资源状态' },
  { id: 'krVoice', label: 'KR 语音资源状态' },
  { id: 'illustration', label: '图文资源状态' },
  { id: 'announcement', label: '公告状态' },
] as const satisfies readonly StatusResourceDefinition[]

export function createDefaultStatusResources(): StatusResource[] {
  return statusResourceDefinitions.map(({ id }) => ({
    id,
    resourceVersion: '',
    resourceUpdatedAt: '',
    officialVersion: '',
    officialUpdatedAt: '',
    forcedStatus: 'none',
  }))
}
