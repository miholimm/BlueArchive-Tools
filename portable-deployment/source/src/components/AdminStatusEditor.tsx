import { FileCheck2, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { getResourceStatus, getStatusDefinition, getStatusLabel, getStatusReason, normalizeStatusData } from "../lib/status";
import { saveAdmin } from "../lib/api";
import type { StatusData, StatusOverride, StatusResource, StatusResourceId } from "../types";

type Toast = (message: string, type?: "success" | "error") => void;

const overrideOptions: Array<{ value: StatusOverride; label: string }> = [
  { value: "none", label: "自动判定（默认）" },
  { value: "normal", label: "强制正常" },
  { value: "error", label: "强制异常" },
];

function toDraft(value: StatusData) {
  return normalizeStatusData(value);
}

export default function AdminStatusEditor({
  value,
  notify,
  onSaved,
}: {
  value: StatusData;
  notify: Toast;
  onSaved: (value: StatusData) => Promise<void>;
}) {
  const [draft, setDraft] = useState<StatusData>(() => toDraft(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(toDraft(value));
  }, [value]);

  const updateResource = (id: StatusResourceId, update: Partial<StatusResource>) => {
    setDraft((current) => ({
      resources: current.resources.map((resource) =>
        resource.id === id ? { ...resource, ...update } : resource,
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAdmin("content/status", draft);
      const saved = normalizeStatusData(result.value);
      setDraft(saved);
      await onSaved(saved);
      notify("九项资源状态已保存");
    } catch (error) {
      notify(error instanceof Error ? error.message : "维护状态保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(toDraft(value));
    notify("已恢复到上次保存的资源状态");
  };

  return (
    <section className="admin-panel admin-status-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><FileCheck2 size={14} /> VERSION COMPARISON</span>
          <h2>维护状态</h2>
          <p>维护九项资源的版本信息和状态设置。</p>
        </div>
        <div className="panel-actions">
          <button className="button button-ghost" onClick={reset} disabled={saving}>
            <RefreshCw size={15} /> 恢复已保存内容
          </button>
          <button className="button button-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? "保存中..." : "保存资源状态"}
          </button>
        </div>
      </div>

      <div className="admin-status-resources">
        {draft.resources.map((resource) => {
          const definition = getStatusDefinition(resource.id);
          const currentStatus = getResourceStatus(resource);
          return (
            <article className="admin-status-resource" key={resource.id}>
              <div className="admin-status-resource-header">
                <div>
                  <span>{definition?.label || resource.id}</span>
                  <strong>{getStatusLabel(currentStatus)}</strong>
                </div>
                <small className={`admin-status-preview ${currentStatus}`}>{getStatusReason(resource)}</small>
              </div>
              <div className="admin-status-form">
                <label>
                  资源版本
                  <input
                    value={resource.resourceVersion}
                    onChange={(event) => updateResource(resource.id, { resourceVersion: event.target.value })}
                    placeholder="例如 1.0.0"
                  />
                </label>
                <label>
                  资源更新时间
                  <input
                    value={resource.resourceUpdatedAt}
                    onChange={(event) => updateResource(resource.id, { resourceUpdatedAt: event.target.value })}
                    placeholder="例如 2026-08-13 18:00"
                  />
                </label>
                <label>
                  官方版本
                  <input
                    value={resource.officialVersion}
                    onChange={(event) => updateResource(resource.id, { officialVersion: event.target.value })}
                    placeholder="例如 1.0.0"
                  />
                </label>
                <label>
                  官方更新时间
                  <input
                    value={resource.officialUpdatedAt}
                    onChange={(event) => updateResource(resource.id, { officialUpdatedAt: event.target.value })}
                    placeholder="例如 2026-08-13 16:00"
                  />
                </label>
                <label>
                  状态模式
                  <select
                    value={resource.forcedStatus}
                    onChange={(event) => updateResource(resource.id, { forcedStatus: event.target.value as StatusOverride })}
                  >
                    {overrideOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
