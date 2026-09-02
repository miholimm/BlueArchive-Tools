import { HelpCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authFetch, saveAdmin } from "../lib/api";
import type { FaqItem } from "../types";

type Toast = (message: string, type?: "success" | "error") => void;

function createFaq(): FaqItem {
  return { category: "安装", q: "", a: "" };
}

export default function AdminFaqEditor({ notify }: { notify: Toast }) {
  const [draft, setDraft] = useState<FaqItem[]>([]);
  const [savedData, setSavedData] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/site-data/faq");
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "常见问题读取失败");
      const next = Array.isArray(value) ? (value as FaqItem[]) : [];
      setDraft(structuredClone(next));
      setSavedData(structuredClone(next));
    } catch (error) {
      notify(error instanceof Error ? error.message : "常见问题读取失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (index: number, value: Partial<FaqItem>) => {
    setDraft((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...value } : item,
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAdmin("site-data/faq", draft);
      const value = Array.isArray(result.value) ? (result.value as FaqItem[]) : draft;
      setDraft(structuredClone(value));
      setSavedData(structuredClone(value));
      notify("常见问题已保存并发布");
    } catch (error) {
      notify(error instanceof Error ? error.message : "常见问题保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <section className="admin-panel admin-data-loading">正在读取常见问题...</section>;
  }

  return (
    <section className="admin-panel admin-data-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><HelpCircle size={14} /> HELP CENTER</span>
          <h2>常见问题</h2>
          <p>维护游客端 FAQ 的分类、问题和回答内容，支持在回答中保留完整链接。</p>
        </div>
        <div className="panel-actions">
          <button className="button button-ghost" onClick={() => { setDraft(structuredClone(savedData)); notify("已恢复到上次保存的常见问题"); }} disabled={saving}>
            <RefreshCw size={15} /> 恢复已保存内容
          </button>
          <button className="button button-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? "保存中..." : "保存并发布"}
          </button>
        </div>
      </div>

      <div className="admin-content-list">
        {draft.map((item, index) => (
          <article className="admin-content-card admin-faq-card" key={`${item.q}-${index}`}>
            <div className="admin-content-card-heading">
              <div className="admin-content-card-title">
                <span className="admin-inline-index">{index + 1}</span>
                <span>问题条目</span>
              </div>
              <button
                className="button button-danger button-sm"
                onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 size={14} /> 删除
              </button>
            </div>
            <div className="admin-form-grid">
              <label>
                分类
                <input
                  value={item.category}
                  onChange={(event) => update(index, { category: event.target.value })}
                  placeholder="例如 安装、更新、报错"
                />
              </label>
              <label>
                问题
                <input
                  value={item.q}
                  onChange={(event) => update(index, { q: event.target.value })}
                  placeholder="输入常见问题"
                />
              </label>
            </div>
            <label>
              回答
              <textarea
                value={item.a}
                onChange={(event) => update(index, { a: event.target.value })}
                placeholder="输入解决方案、限制说明或支持链接。"
              />
            </label>
          </article>
        ))}
      </div>

      <button
        className="button button-ghost admin-add-content"
        onClick={() => setDraft((current) => [...current, createFaq()])}
      >
        <Plus size={15} /> 添加常见问题
      </button>
    </section>
  );
}
