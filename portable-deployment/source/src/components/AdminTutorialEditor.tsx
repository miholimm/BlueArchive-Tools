import { Apple, Monitor, Plus, RefreshCw, Save, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authFetch, saveAdmin } from "../lib/api";
import type { PlatformTutorial, TutorialError, TutorialStep } from "../types";

type Toast = (message: string, type?: "success" | "error") => void;

const iconOptions = [
  { value: "Monitor", label: "桌面端", Icon: Monitor },
  { value: "Smartphone", label: "移动端", Icon: Smartphone },
  { value: "Apple", label: "Apple", Icon: Apple },
];

function createStep(): TutorialStep {
  return { title: "", desc: "" };
}

function createError(): TutorialError {
  return { error: "", fix: "" };
}

function createTutorial(index: number): PlatformTutorial {
  return {
    platform: `platform-${Date.now()}-${index}`,
    label: "新平台",
    icon: "Monitor",
    steps: [createStep()],
    commonErrors: [],
  };
}

export default function AdminTutorialEditor({ notify }: { notify: Toast }) {
  const [draft, setDraft] = useState<PlatformTutorial[]>([]);
  const [savedData, setSavedData] = useState<PlatformTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/site-data/tutorial");
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "安装教程读取失败");
      const next = Array.isArray(value) ? (value as PlatformTutorial[]) : [];
      setDraft(structuredClone(next));
      setSavedData(structuredClone(next));
    } catch (error) {
      notify(error instanceof Error ? error.message : "安装教程读取失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateTutorial = (index: number, update: Partial<PlatformTutorial>) => {
    setDraft((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...update } : item,
    ));
  };

  const updateStep = (tutorialIndex: number, stepIndex: number, update: Partial<TutorialStep>) => {
    setDraft((current) => current.map((tutorial, currentTutorialIndex) =>
      currentTutorialIndex !== tutorialIndex
        ? tutorial
        : {
            ...tutorial,
            steps: tutorial.steps.map((step, currentStepIndex) =>
              currentStepIndex === stepIndex ? { ...step, ...update } : step,
            ),
          },
    ));
  };

  const updateError = (tutorialIndex: number, errorIndex: number, update: Partial<TutorialError>) => {
    setDraft((current) => current.map((tutorial, currentTutorialIndex) =>
      currentTutorialIndex !== tutorialIndex
        ? tutorial
        : {
            ...tutorial,
            commonErrors: tutorial.commonErrors.map((item, currentErrorIndex) =>
              currentErrorIndex === errorIndex ? { ...item, ...update } : item,
            ),
          },
    ));
  };

  const addStep = (tutorialIndex: number) => {
    setDraft((current) => current.map((tutorial, index) =>
      index === tutorialIndex ? { ...tutorial, steps: [...tutorial.steps, createStep()] } : tutorial,
    ));
  };

  const removeStep = (tutorialIndex: number, stepIndex: number) => {
    setDraft((current) => current.map((tutorial, index) =>
      index === tutorialIndex
        ? { ...tutorial, steps: tutorial.steps.filter((_, currentIndex) => currentIndex !== stepIndex) }
        : tutorial,
    ));
  };

  const addError = (tutorialIndex: number) => {
    setDraft((current) => current.map((tutorial, index) =>
      index === tutorialIndex
        ? { ...tutorial, commonErrors: [...tutorial.commonErrors, createError()] }
        : tutorial,
    ));
  };

  const removeError = (tutorialIndex: number, errorIndex: number) => {
    setDraft((current) => current.map((tutorial, index) =>
      index === tutorialIndex
        ? {
            ...tutorial,
            commonErrors: tutorial.commonErrors.filter((_, currentIndex) => currentIndex !== errorIndex),
          }
        : tutorial,
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAdmin("site-data/tutorial", draft);
      const value = Array.isArray(result.value) ? (result.value as PlatformTutorial[]) : draft;
      setDraft(structuredClone(value));
      setSavedData(structuredClone(value));
      notify("安装教程已保存并发布");
    } catch (error) {
      notify(error instanceof Error ? error.message : "安装教程保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <section className="admin-panel admin-data-loading">正在读取安装教程...</section>;
  }

  return (
    <section className="admin-panel admin-data-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><Monitor size={14} /> INSTALLATION GUIDE</span>
          <h2>安装教程</h2>
          <p>维护各平台安装步骤和常见错误，保存后会同步到游客端的安装教程页面。</p>
        </div>
        <div className="panel-actions">
          <button className="button button-ghost" onClick={() => { setDraft(structuredClone(savedData)); notify("已恢复到上次保存的教程内容"); }} disabled={saving}>
            <RefreshCw size={15} /> 恢复已保存内容
          </button>
          <button className="button button-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? "保存中..." : "保存并发布"}
          </button>
        </div>
      </div>

      <div className="admin-content-list">
        {draft.map((tutorial, tutorialIndex) => {
          const selectedIcon = iconOptions.find((item) => item.value === tutorial.icon)?.Icon || Monitor;
          const PlatformIcon = selectedIcon;
          return (
            <article className="admin-content-card" key={`${tutorial.platform}-${tutorialIndex}`}>
              <div className="admin-content-card-heading">
                <div className="admin-content-card-title">
                  <PlatformIcon size={18} />
                  <span>平台 {tutorialIndex + 1}</span>
                </div>
                <button
                  className="button button-danger button-sm"
                  onClick={() => setDraft((current) => current.filter((_, index) => index !== tutorialIndex))}
                >
                  <Trash2 size={14} /> 删除平台
                </button>
              </div>

              <div className="admin-form-grid admin-form-grid-three">
                <label>
                  平台标识
                  <input
                    value={tutorial.platform}
                    onChange={(event) => updateTutorial(tutorialIndex, { platform: event.target.value })}
                    placeholder="例如 windows"
                  />
                </label>
                <label>
                  显示名称
                  <input
                    value={tutorial.label}
                    onChange={(event) => updateTutorial(tutorialIndex, { label: event.target.value })}
                    placeholder="例如 Windows"
                  />
                </label>
                <label>
                  平台图标
                  <select
                    value={tutorial.icon}
                    onChange={(event) => updateTutorial(tutorialIndex, { icon: event.target.value })}
                  >
                    {iconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>

              <section className="admin-editor-section">
                <div className="admin-editor-section-heading">
                  <div>
                    <span>INSTALL STEPS</span>
                    <h3>安装步骤</h3>
                  </div>
                  <button className="button button-ghost button-sm" onClick={() => addStep(tutorialIndex)}>
                    <Plus size={14} /> 添加步骤
                  </button>
                </div>
                <div className="admin-inline-list">
                  {tutorial.steps.map((step, stepIndex) => (
                    <div className="admin-inline-editor" key={stepIndex}>
                      <span className="admin-inline-index">{stepIndex + 1}</span>
                      <div>
                        <input
                          value={step.title}
                          onChange={(event) => updateStep(tutorialIndex, stepIndex, { title: event.target.value })}
                          placeholder="步骤标题"
                        />
                        <textarea
                          value={step.desc}
                          onChange={(event) => updateStep(tutorialIndex, stepIndex, { desc: event.target.value })}
                          placeholder="步骤说明"
                        />
                      </div>
                      <button
                        className="button button-danger button-sm"
                        onClick={() => removeStep(tutorialIndex, stepIndex)}
                        disabled={tutorial.steps.length <= 1}
                        aria-label={`删除第 ${stepIndex + 1} 步`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-editor-section">
                <div className="admin-editor-section-heading">
                  <div>
                    <span>COMMON ERRORS</span>
                    <h3>常见错误</h3>
                  </div>
                  <button className="button button-ghost button-sm" onClick={() => addError(tutorialIndex)}>
                    <Plus size={14} /> 添加错误
                  </button>
                </div>
                {tutorial.commonErrors.length === 0 ? (
                  <div className="admin-content-empty">暂未添加常见错误。</div>
                ) : (
                  <div className="admin-inline-list">
                    {tutorial.commonErrors.map((item, errorIndex) => (
                      <div className="admin-inline-editor" key={errorIndex}>
                        <span className="admin-inline-index">!</span>
                        <div>
                          <input
                            value={item.error}
                            onChange={(event) => updateError(tutorialIndex, errorIndex, { error: event.target.value })}
                            placeholder="错误现象"
                          />
                          <textarea
                            value={item.fix}
                            onChange={(event) => updateError(tutorialIndex, errorIndex, { fix: event.target.value })}
                            placeholder="解决方式"
                          />
                        </div>
                        <button
                          className="button button-danger button-sm"
                          onClick={() => removeError(tutorialIndex, errorIndex)}
                          aria-label={`删除错误 ${errorIndex + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </article>
          );
        })}
      </div>

      <button
        className="button button-ghost admin-add-content"
        onClick={() => setDraft((current) => [...current, createTutorial(current.length)])}
      >
        <Plus size={15} /> 添加平台教程
      </button>
    </section>
  );
}
