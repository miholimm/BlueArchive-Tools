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
]

export const statusResourceIds = new Set(statusResourceDefinitions.map((resource) => resource.id))

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function forcedStatus(value) {
  return value === 'normal' || value === 'error' ? value : 'none'
}

export function createDefaultStatus() {
  return {
    resources: statusResourceDefinitions.map((resource) => ({
      id: resource.id,
      resourceVersion: '',
      resourceUpdatedAt: '',
      officialVersion: '',
      officialUpdatedAt: '',
      forcedStatus: 'none',
    })),
  }
}

export function normalizeStoredStatus(value) {
  const rawResources = Array.isArray(value?.resources) ? value.resources : []
  const byId = new Map()

  for (const resource of rawResources) {
    if (resource && typeof resource === 'object' && statusResourceIds.has(resource.id)) {
      byId.set(resource.id, resource)
    }
  }

  return {
    resources: statusResourceDefinitions.map((definition) => {
      const resource = byId.get(definition.id)
      return {
        id: definition.id,
        resourceVersion: text(resource?.resourceVersion),
        resourceUpdatedAt: text(resource?.resourceUpdatedAt),
        officialVersion: text(resource?.officialVersion),
        officialUpdatedAt: text(resource?.officialUpdatedAt),
        forcedStatus: forcedStatus(resource?.forcedStatus),
      }
    }),
  }
}
