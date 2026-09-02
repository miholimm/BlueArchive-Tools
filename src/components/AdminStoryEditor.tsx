import { BookOpen, ChevronDown, ChevronUp, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/api";
import type { ChapterIndexEntry, StoryChapter, StorySegment } from "../types";

type Toast = (message: string, type?: "success" | "error") => void;

function createSegment(index: number): StorySegment {
  return {
    id: `segment-${Date.now()}-${index + 1}`,
    speaker: "",
    speakerJa: "",
    ja: "",
    zh: "",
    context: "",
    portrait: "",
    portraitSide: "left",
  };
}

function createChapter(volume: number, chapter: number): StoryChapter {
  return {
    volume,
    chapter,
    title: "新章节",
    titleJa: "",
    characters: ["老师"],
    segments: [createSegment(0)],
  };
}

function chapterKey(volume: number, chapter: number) {
  return `${volume}-${chapter}`;
}

export default function AdminStoryEditor({ notify }: { notify: Toast }) {
  const [index, setIndex] = useState<ChapterIndexEntry[]>([]);
  const [active, setActive] = useState<{ volume: number; chapter: number } | null>(null);
  const [draft, setDraft] = useState<StoryChapter | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVolume, setNewVolume] = useState("");
  const [newChapter, setNewChapter] = useState("");

  const chapterEntries = useMemo(
    () => index.flatMap((entry) => entry.chapters.map((chapter) => ({ volume: entry.volume, chapter }))),
    [index],
  );

  const loadIndex = async () => {
    setLoadingIndex(true);
    try {
      const response = await authFetch("/api/story/admin/index");
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "剧情索引读取失败");
      const next = Array.isArray(value) ? value as ChapterIndexEntry[] : [];
      setIndex(next);
      setActive((current) => current && next.some((entry) => entry.volume === current.volume && entry.chapters.includes(current.chapter)) ? current : null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "剧情索引读取失败", "error");
    } finally {
      setLoadingIndex(false);
    }
  };

  useEffect(() => {
    void loadIndex();
  }, []);

  const loadChapter = async (volume: number, chapter: number) => {
    setActive({ volume, chapter });
    setLoadingChapter(true);
    try {
      const response = await authFetch(`/api/story/admin/${volume}/${chapter}`);
      if (response.status === 404) {
        setDraft(createChapter(volume, chapter));
        return;
      }
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "章节读取失败");
      setDraft(value as StoryChapter);
    } catch (error) {
      setDraft(null);
      notify(error instanceof Error ? error.message : "章节读取失败", "error");
    } finally {
      setLoadingChapter(false);
    }
  };

  const saveIndex = async (next: ChapterIndexEntry[]) => {
    const response = await authFetch("/api/story/admin/index", {
      method: "PUT",
      body: JSON.stringify(next),
    });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(value.message || value.error || "剧情索引保存失败");
    const saved = Array.isArray(value.value) ? value.value as ChapterIndexEntry[] : next;
    setIndex(saved);
    return saved;
  };

  const addChapter = async () => {
    const volume = Number(newVolume);
    const chapter = Number(newChapter);
    if (!Number.isInteger(volume) || volume < 1 || !Number.isInteger(chapter) || chapter < 1) {
      notify("请输入有效的卷号和章节号", "error");
      return;
    }
    if (chapterEntries.some((entry) => entry.volume === volume && entry.chapter === chapter)) {
      await loadChapter(volume, chapter);
      notify("该章节已存在，已打开现有草稿");
      return;
    }
    const next = structuredClone(index);
    const volumeEntry = next.find((entry) => entry.volume === volume);
    if (volumeEntry) volumeEntry.chapters.push(chapter);
    else next.push({ volume, chapters: [chapter] });
    try {
      await saveIndex(next);
      setNewVolume("");
      setNewChapter("");
      setDraft(createChapter(volume, chapter));
      setActive({ volume, chapter });
      notify("章节入口已建立，请填写内容后保存章节");
    } catch (error) {
      notify(error instanceof Error ? error.message : "章节入口建立失败", "error");
    }
  };

  const removeChapter = async (volume: number, chapter: number) => {
    const next = index
      .map((entry) => entry.volume === volume ? { ...entry, chapters: entry.chapters.filter((value) => value !== chapter) } : entry)
      .filter((entry) => entry.chapters.length > 0);
    try {
      await saveIndex(next);
      if (active && active.volume === volume && active.chapter === chapter) {
        setActive(null);
        setDraft(null);
      }
      notify("章节已从公开索引移除，运行期草稿保留以便日后重新发布");
    } catch (error) {
      notify(error instanceof Error ? error.message : "章节移除失败", "error");
    }
  };

  const updateDraft = (update: Partial<StoryChapter>) => {
    setDraft((current) => current ? { ...current, ...update } : current);
  };

  const updateSegment = (segmentIndex: number, update: Partial<StorySegment>) => {
    setDraft((current) => current ? {
      ...current,
      segments: current.segments.map((segment, index) => index === segmentIndex ? { ...segment, ...update } : segment),
    } : current);
  };

  const saveChapter = async () => {
    if (!draft || !active) return;
    setSaving(true);
    try {
      const response = await authFetch(`/api/story/admin/${active.volume}/${active.chapter}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      const value = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(value.message || value.error || "剧情章节保存失败");
      setDraft(value.value as StoryChapter);
      notify("剧情章节、立绘链接与剧场站位已保存");
    } catch (error) {
      notify(error instanceof Error ? error.message : "剧情章节保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingIndex) return <section className="admin-panel admin-data-loading">正在读取剧情剧场...</section>;

  return (
    <section className="admin-panel admin-data-panel">
      <div className="panel-heading">
        <div>
          <span className="admin-section-kicker"><BookOpen size={14} /> STORY THEATER</span>
          <h2>剧情剧场</h2>
          <p>维护章节剧情、角色名单、立绘 URL 和左右站位。游客端会立即读取已保存内容。</p>
        </div>
        <button className="button button-ghost" onClick={() => void loadIndex()} disabled={loadingIndex}>
          <RefreshCw size={15} /> 刷新索引
        </button>
      </div>

      <div className="story-admin-layout">
        <aside className="story-admin-index">
          <div className="story-admin-add">
            <input value={newVolume} onChange={(event) => setNewVolume(event.target.value)} inputMode="numeric" placeholder="卷号" />
            <input value={newChapter} onChange={(event) => setNewChapter(event.target.value)} inputMode="numeric" placeholder="章节" />
            <button className="button button-primary button-sm" onClick={() => void addChapter()}><Plus size={14} /> 新建</button>
          </div>
          <div className="story-admin-chapter-list">
            {chapterEntries.map((entry) => {
              const selected = active?.volume === entry.volume && active.chapter === entry.chapter;
              return (
                <div className={selected ? "story-admin-chapter is-active" : "story-admin-chapter"} key={chapterKey(entry.volume, entry.chapter)}>
                  <button type="button" onClick={() => void loadChapter(entry.volume, entry.chapter)}>
                    <span>VOL.{entry.volume}</span>
                    <strong>CH.{entry.chapter}</strong>
                  </button>
                  <button type="button" className="story-admin-delete" onClick={() => void removeChapter(entry.volume, entry.chapter)} aria-label={`移除 Vol.${entry.volume} Ch.${entry.chapter}`}><Trash2 size={13} /></button>
                </div>
              );
            })}
            {chapterEntries.length === 0 && <div className="admin-content-empty">尚未发布任何章节。</div>}
          </div>
        </aside>

        <div className="story-admin-editor">
          {!active && <div className="admin-content-empty">从左侧选择或新建一个章节开始编辑。</div>}
          {loadingChapter && <div className="admin-content-empty">正在读取章节草稿...</div>}
          {draft && !loadingChapter && (
            <>
              <div className="panel-heading story-admin-editor-heading">
                <div><span className="admin-section-kicker">VOL.{draft.volume} / CH.{draft.chapter}</span><h3>{draft.title || "未命名章节"}</h3></div>
                <button className="button button-primary" onClick={() => void saveChapter()} disabled={saving}><Save size={15} /> {saving ? "保存中..." : "保存章节"}</button>
              </div>
              <div className="admin-form-grid">
                <label>中文标题<input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} /></label>
                <label>日文标题<input value={draft.titleJa} onChange={(event) => updateDraft({ titleJa: event.target.value })} /></label>
              </div>
              <label className="story-admin-characters">角色名单（用中文逗号或英文逗号分隔）<input value={draft.characters.join(", " )} onChange={(event) => updateDraft({ characters: event.target.value.split(/[，,]/).map((value) => value.trim()).filter(Boolean) })} /></label>
              <div className="story-admin-segments">
                {draft.segments.map((segment, segmentIndex) => (
                  <article className="story-admin-segment" key={segment.id}>
                    <div className="story-admin-segment-heading">
                      <span className="admin-inline-index">{segmentIndex + 1}</span>
                      <strong>对话段</strong>
                      <button className="button button-danger button-sm" onClick={() => updateDraft({ segments: draft.segments.filter((_, index) => index !== segmentIndex) })} disabled={draft.segments.length <= 1}><Trash2 size={14} /></button>
                    </div>
                    <div className="admin-form-grid admin-form-grid-three">
                      <label>对白编号<input value={segment.id} onChange={(event) => updateSegment(segmentIndex, { id: event.target.value })} /></label>
                      <label>中文说话人<input value={segment.speaker} onChange={(event) => updateSegment(segmentIndex, { speaker: event.target.value })} /></label>
                      <label>日文说话人<input value={segment.speakerJa || ""} onChange={(event) => updateSegment(segmentIndex, { speakerJa: event.target.value })} /></label>
                    </div>
                    <div className="admin-form-grid">
                      <label>中文对白<textarea value={segment.zh} onChange={(event) => updateSegment(segmentIndex, { zh: event.target.value })} /></label>
                      <label>日文对白<textarea value={segment.ja} onChange={(event) => updateSegment(segmentIndex, { ja: event.target.value })} /></label>
                    </div>
                    <div className="admin-form-grid admin-form-grid-three">
                      <label>场景说明<input value={segment.context || ""} onChange={(event) => updateSegment(segmentIndex, { context: event.target.value })} /></label>
                      <label>立绘 URL<input value={segment.portrait || ""} onChange={(event) => updateSegment(segmentIndex, { portrait: event.target.value })} placeholder="https://... 或 /assets/..." /></label>
                      <label>立绘站位<select value={segment.portraitSide || "left"} onChange={(event) => updateSegment(segmentIndex, { portraitSide: event.target.value as StorySegment["portraitSide"] })}><option value="left">左侧</option><option value="right">右侧</option></select></label>
                    </div>
                  </article>
                ))}
              </div>
              <button className="button button-ghost admin-add-content" onClick={() => updateDraft({ segments: [...draft.segments, createSegment(draft.segments.length)] })}><Plus size={15} /> 添加对白段</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
