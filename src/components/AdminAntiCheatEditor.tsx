import { AlertTriangle, Plus, RefreshCw, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authFetch, saveAdmin } from "../lib/api";
import type { AntiCheatEvent, AntiCheatServer } from "../types";

type Toast = (message: string, type?: "success" | "error") => void;

const riskOptions: Array<{ value: AntiCheatServer["status"]; label: string }> = [
  { value: "safe", label: "安全" },
  { value: "warning", label: "注意" },
  { value: "danger", label: "高风险" },
];

function createEvent(): AntiCheatEvent {
  return { date: "", title: "", description: "" };
}

function createServer(): AntiCheatServer {
  return { server: "", status: "warning", lastUpdate: "", events: [] };
}

export default function AdminAntiCheatEditor({ notify }: { notify: Toast }) {
  const [draft, setDraft] = useState<AntiCheatServer[]>([]);
  const [savedData, setSavedData] = useState<AntiCheatServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/site-data/antiCheat");
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "反作弊追踪读取失败");
      const next = Array.isArray(value) ? (value as AntiCheatServer[]) : [];
      setDraft(structuredClone(next));
      setSavedData(structuredClone(next));
    } catch (error) {
      notify(error instanceof Error ? error.message : "反作弊追踪读取失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateServer = (index: number, value: Partial<AntiCheatServer>) => {
    setDraft((current) => current.map((server, serverIndex) =>
      serverIndex === index ? { ...server, ...value } : server,
    ));
  };

  const updateEvent = (serverIndex: number, eventIndex: number, value: Partial<AntiCheatEvent>) => {
    setDraft((current) => current.map((server, currentServerIndex) =>
      currentServerIndex !== serverIndex
        ? server
        : {
            ...server,
            events: server.events.map((event, currentEventIndex) =>
              currentEventIndex === eventIndex ? { ...event, ...value } : event,
            ),
          },
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAdmin("site-data/antiCheat", draft);
      const value = Array.isArray(result.value) ? (result.value as AntiCheatServer[]) : draft;
      setDraft(structuredClone(value));
      setSavedData(structuredClone(value));
      notify("反作弊追踪已保存并发布");
    } catch (error) {
      notify(error instanceof Error ? error.message : "反作弊追踪保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <section className="admin-panel admin-data-loading">正在读取反作弊追踪...</section>;
  }

  return (
    <section className="admin-panel admin-data-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><ShieldAlert size={14} /> SECURITY TRACKING</span>
          <h2>反作弊追踪</h2>
          <p>请只发布可确认的官方公告、已复测兼容结果或风险提示；不确定时应选择“注意”并说明依据。</p>
        </div>
        <div className="panel-actions">
          <button className="button button-ghost" onClick={() => { setDraft(structuredClone(savedData)); notify("已恢复到上次保存的反作弊追踪"); }} disabled={saving}>
            <RefreshCw size={15} /> 恢复已保存内容
          </button>
          <button className="button button-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? "保存中..." : "保存并发布"}
          </button>
        </div>
      </div>

      <div className="admin-status-notice">
        风险等级不是自动检测结果。每次更新请注明事件时间、来源或复测说明，避免将推测作为结论对外发布。
      </div>

      <div className="admin-content-list">
        {draft.map((server, serverIndex) => (
          <article className="admin-content-card" key={`${server.server}-${serverIndex}`}>
            <div className="admin-content-card-heading">
              <div className="admin-content-card-title">
                <AlertTriangle size={18} />
                <span>服务器追踪 {serverIndex + 1}</span>
              </div>
              <button
                className="button button-danger button-sm"
                onClick={() => setDraft((current) => current.filter((_, index) => index !== serverIndex))}
              >
                <Trash2 size={14} /> 删除服务器
              </button>
            </div>

            <div className="admin-form-grid admin-form-grid-three">
              <label>
                服务器名称
                <input
                  value={server.server}
                  onChange={(event) => updateServer(serverIndex, { server: event.target.value })}
                  placeholder="例如 国际服"
                />
              </label>
              <label>
                风险等级
                <select
                  value={server.status}
                  onChange={(event) => updateServer(serverIndex, { status: event.target.value as AntiCheatServer["status"] })}
                >
                  {riskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                最后更新时间
                <input
                  value={server.lastUpdate}
                  onChange={(event) => updateServer(serverIndex, { lastUpdate: event.target.value })}
                  placeholder="例如 2026-08-13"
                />
              </label>
            </div>

            <section className="admin-editor-section">
              <div className="admin-editor-section-heading">
                <div>
                  <span>EVENT TIMELINE</span>
                  <h3>风险事件与依据</h3>
                </div>
                <button
                  className="button button-ghost button-sm"
                  onClick={() => updateServer(serverIndex, { events: [...server.events, createEvent()] })}
                >
                  <Plus size={14} /> 添加事件
                </button>
              </div>
              {server.events.length === 0 ? (
                <div className="admin-content-empty">暂未添加事件记录。</div>
              ) : (
                <div className="admin-inline-list">
                  {server.events.map((event, eventIndex) => (
                    <div className="admin-event-editor" key={eventIndex}>
                      <div className="admin-form-grid">
                        <label>
                          事件日期
                          <input
                            value={event.date}
                            onChange={(input) => updateEvent(serverIndex, eventIndex, { date: input.target.value })}
                            placeholder="例如 2026-08-13"
                          />
                        </label>
                        <label>
                          事件标题
                          <input
                            value={event.title}
                            onChange={(input) => updateEvent(serverIndex, eventIndex, { title: input.target.value })}
                            placeholder="例如 官方公告或复测结论"
                          />
                        </label>
                      </div>
                      <label>
                        事件说明与依据
                        <textarea
                          value={event.description}
                          onChange={(input) => updateEvent(serverIndex, eventIndex, { description: input.target.value })}
                          placeholder="填写公告链接、测试范围、观察到的现象或后续建议。"
                        />
                      </label>
                      <button
                        className="button button-danger button-sm"
                        onClick={() => updateServer(serverIndex, {
                          events: server.events.filter((_, index) => index !== eventIndex),
                        })}
                      >
                        <Trash2 size={14} /> 删除事件
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </article>
        ))}
      </div>

      <button
        className="button button-ghost admin-add-content"
        onClick={() => setDraft((current) => [...current, createServer()])}
      >
        <Plus size={15} /> 添加服务器追踪
      </button>
    </section>
  );
}
