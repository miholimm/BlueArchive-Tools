import {
  BellRing,
  BookOpen,
  FileImage,
  Laptop,
  Megaphone,
  Monitor,
  Smartphone,
  Tablet,
  Volume2,
} from 'lucide-react'
import { getStatusDefinition, getStatusLabel, getStatusReason, getResourceStatus } from '../lib/status'
import StatusValue from './StatusValue'
import type { StatusResource, StatusResourceId } from '../types'

const icons = {
  androidClient: Smartphone,
  windowsClient: Monitor,
  iosClient: Tablet,
  macosClient: Laptop,
  textTranslation: BookOpen,
  cnVoice: Volume2,
  krVoice: Volume2,
  illustration: FileImage,
  announcement: Megaphone,
} satisfies Record<StatusResourceId, typeof BellRing>

function versionValue(value: string) {
  return value || '未填写'
}

export default function StatusCard({ resource }: { resource: StatusResource }) {
  const definition = getStatusDefinition(resource.id)
  const status = getResourceStatus(resource)
  const Icon = icons[resource.id] || BellRing

  return (
    <article className={`status-card status-resource-card ${status}`}>
      <header className="status-resource-card-header">
        <div className="status-icon">
          <Icon size={20} />
        </div>
        <div>
          <span>{definition?.label || resource.id}</span>
          <strong>{getStatusLabel(status)}</strong>
        </div>
        <i className={`status-light ${status}`} aria-label={getStatusLabel(status)} />
      </header>
      <p className="status-resource-reason">{getStatusReason(resource)}</p>
      <dl className="status-resource-meta">
        <div>
          <dt>资源版本</dt>
          <dd><StatusValue label="RESOURCE" value={resource.resourceVersion} updatedAt={resource.resourceUpdatedAt} /></dd>
        </div>
        <div>
          <dt>资源更新时间</dt>
          <dd>{versionValue(resource.resourceUpdatedAt)}</dd>
        </div>
        <div>
          <dt>官方版本</dt>
          <dd><StatusValue label="OFFICIAL" value={resource.officialVersion} updatedAt={resource.officialUpdatedAt} /></dd>
        </div>
        <div>
          <dt>官方更新时间</dt>
          <dd>{versionValue(resource.officialUpdatedAt)}</dd>
        </div>
      </dl>
    </article>
  )
}
