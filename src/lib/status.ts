import { createDefaultStatusResources, statusResourceDefinitions } from '../data/statusResources'
import type { StatusData, StatusKey, StatusOverride, StatusResource, StatusResourceId } from '../types'

const statusLabels: Record<StatusKey, string> = {
  normal: '正常',
  error: '异常',
  pending: '待配置',
}

const forceLabels: Record<Exclude<StatusOverride, 'none'>, string> = {
  normal: '管理员强制设为正常',
  error: '管理员强制设为异常',
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readForcedStatus(value: unknown): StatusOverride {
  return value === 'normal' || value === 'error' ? value : 'none'
}

export function normalizeStatusData(value: unknown): StatusData {
  const rawResources: unknown[] = Array.isArray((value as { resources?: unknown } | undefined)?.resources)
    ? ((value as { resources: unknown[] }).resources)
    : []
  const resourcesById = new Map(
    rawResources
      .filter((resource): resource is Partial<StatusResource> & { id: StatusResourceId } =>
        Boolean(
          resource
          && typeof resource === 'object'
          && typeof (resource as { id?: unknown }).id === 'string',
        ),
      )
      .map((resource) => [resource.id, resource]),
  )

  return {
    resources: createDefaultStatusResources().map((fallback) => {
      const resource = resourcesById.get(fallback.id)
      return {
        ...fallback,
        resourceVersion: readText(resource?.resourceVersion),
        resourceUpdatedAt: readText(resource?.resourceUpdatedAt),
        officialVersion: readText(resource?.officialVersion),
        officialUpdatedAt: readText(resource?.officialUpdatedAt),
        forcedStatus: readForcedStatus(resource?.forcedStatus),
      }
    }),
  }
}

export function getResourceStatus(resource: StatusResource): StatusKey {
  if (resource.forcedStatus !== 'none') return resource.forcedStatus
  if (!resource.resourceVersion.trim() || !resource.officialVersion.trim()) return 'pending'
  return resource.resourceVersion.trim().toLowerCase() === resource.officialVersion.trim().toLowerCase()
    ? 'normal'
    : 'error'
}

export function getStatusLabel(status: StatusKey) {
  return statusLabels[status]
}

export function getStatusReason(resource: StatusResource) {
  if (resource.forcedStatus !== 'none') return forceLabels[resource.forcedStatus]
  if (!resource.resourceVersion.trim() || !resource.officialVersion.trim()) return '版本信息待补充'
  return getResourceStatus(resource) === 'normal' ? '当前版本已同步' : '当前版本存在差异'
}

export function getStatusResource(id: StatusResourceId, status: StatusData) {
  return status.resources.find((resource) => resource.id === id)
}

export function getStatusDefinition(id: StatusResourceId) {
  return statusResourceDefinitions.find((definition) => definition.id === id)
}
