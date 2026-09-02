import { useEffect, useRef, useState } from "react";
import { getChangeCount, createUpdatePayload } from "../lib/resource-model";
import { getResourceSnapshot, ResourceApiError, setResourceConfig } from "../lib/resource-api";
import { normalizeUserId, resolveInitialUserId, setUserIdInUrl } from "../lib/user-id";
import type {
  ConsoleNotice,
  ConsolePhase,
  ResourceApiData,
  ResourceConfig,
  TextLocale,
  UserIdResolution,
  UserIdSource,
  VoiceLocale,
} from "../types";

const initialResolution = resolveInitialUserId();

function emptyNotice(detail: string): ConsoleNotice {
  return {
    tone: "info",
    title: "等待读取资源配置",
    detail,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ResourceApiError) return error.message;
  return "发生了未预期的问题，请稍后重试。";
}

export interface ResourceConsoleController {
  userId: string | null;
  identity: UserIdResolution;
  phase: ConsolePhase;
  isSaving: boolean;
  saved: ResourceConfig | null;
  draft: ResourceConfig | null;
  raw: ResourceApiData | null;
  notice: ConsoleNotice;
  changeCount: number;
  load: () => void;
  selectUser: (value: string, source?: UserIdSource) => boolean;
  resetUser: () => void;
  setText: (value: TextLocale) => void;
  setVoice: (value: VoiceLocale) => void;
  setMedia: (value: TextLocale) => void;
  discardChanges: () => void;
  save: () => Promise<void>;
}

export function useResourceConsole(): ResourceConsoleController {
  const [userId, setUserId] = useState<string | null>(initialResolution.userId);
  const [identity, setIdentity] = useState<UserIdResolution>(initialResolution);
  const [phase, setPhase] = useState<ConsolePhase>(
    initialResolution.userId ? "loading" : "awaiting-user",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<ResourceConfig | null>(null);
  const [draft, setDraft] = useState<ResourceConfig | null>(null);
  const [raw, setRaw] = useState<ResourceApiData | null>(null);
  const [notice, setNotice] = useState<ConsoleNotice>(() => emptyNotice(initialResolution.detail));
  const requestVersion = useRef(0);
  const autoLoadedUser = useRef<string | null>(null);

  async function loadSnapshot(targetUserId: string): Promise<void> {
    const currentRequest = ++requestVersion.current;
    setPhase("loading");
    setNotice({
      tone: "info",
      title: "正在读取资源配置",
      detail: "正在与资源服务同步当前选择。",
    });

    try {
      const snapshot = await getResourceSnapshot(targetUserId);
      if (currentRequest !== requestVersion.current) return;

      const nextConfig = { ...snapshot.config };
      setSaved(nextConfig);
      setDraft(nextConfig);
      setRaw(snapshot.raw);
      setPhase("ready");
      setNotice({
        tone: "success",
        title: "资源配置已同步",
        detail: "你可以调整三个资源选项，保存时只会提交已改动的字段。",
      });
    } catch (error) {
      if (currentRequest !== requestVersion.current) return;
      setSaved(null);
      setDraft(null);
      setRaw(null);
      setPhase("error");
      setNotice({
        tone: "error",
        title: "无法读取资源配置",
        detail: errorMessage(error),
      });
    }
  }

  useEffect(() => {
    if (!userId) {
      autoLoadedUser.current = null;
      return;
    }
    if (autoLoadedUser.current === userId) return;
    autoLoadedUser.current = userId;
    void loadSnapshot(userId);
  }, [userId]);

  function selectUser(value: string, source: UserIdSource = "manual"): boolean {
    const normalized = normalizeUserId(value);
    if (!normalized) {
      setUserId(null);
      setPhase("awaiting-user");
      setNotice({
        tone: "error",
        title: "用户 ID 无效",
        detail: "请输入非空且不包含换行的用户 ID。",
      });
      return false;
    }

    if (normalized === userId) {
      setIdentity({
        userId: normalized,
        source,
        detail: source === "manual" ? "已使用手动输入的用户 ID。" : "已更新当前用户 ID。",
      });
      setUserIdInUrl(normalized);
      void loadSnapshot(normalized);
      return true;
    }

    requestVersion.current += 1;
    setSaved(null);
    setDraft(null);
    setRaw(null);
    setIsSaving(false);
    autoLoadedUser.current = null;
    setIdentity({
      userId: normalized,
      source,
      detail: source === "manual" ? "已使用手动输入的用户 ID。" : "已更新当前用户 ID。",
    });
    setUserId(normalized);
    setUserIdInUrl(normalized);
    return true;
  }

  function resetUser(): void {
    requestVersion.current += 1;
    setUserId(null);
    setSaved(null);
    setDraft(null);
    setRaw(null);
    setIsSaving(false);
    setPhase("awaiting-user");
    setIdentity({
      userId: null,
      source: "unavailable",
      detail: "请提供一个用户 ID 以读取资源配置。",
    });
    setNotice(emptyNotice("输入用户 ID 后会开始读取配置。"));
    const url = new URL(window.location.href);
    url.searchParams.delete("user");
    window.history.replaceState({}, "", url);
  }

  function updateDraft(patch: Partial<ResourceConfig>): void {
    setDraft((current) => current ? { ...current, ...patch } : current);
    if (phase === "error" && saved) setPhase("ready");
  }

  function discardChanges(): void {
    if (!saved) return;
    setDraft({ ...saved });
    setNotice({
      tone: "info",
      title: "已还原未保存的修改",
      detail: "当前界面已恢复为服务器上的资源配置。",
    });
  }

  async function save(): Promise<void> {
    if (!userId || !saved || !draft || isSaving) return;

    const payload = createUpdatePayload(userId, saved, draft);
    const changes = Object.keys(payload).filter((key) => key !== "user");

    if (changes.length === 0) {
      setNotice({
        tone: "info",
        title: "没有需要保存的修改",
        detail: "资源配置与服务器当前状态一致。",
      });
      return;
    }

    setIsSaving(true);
    setNotice({
      tone: "info",
      title: "正在保存资源配置",
      detail: `正在提交 ${changes.length} 项已改动的资源字段。`,
    });

    try {
      await setResourceConfig(payload);
      const nextSaved = { ...draft };
      setSaved(nextSaved);
      setRaw((current) => current ? { ...current, ...payload } : current);
      setPhase("ready");
      setNotice({
        tone: "success",
        title: "资源配置已保存",
        detail: `已成功更新 ${changes.length} 项资源设置。`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "保存没有完成",
        detail: errorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const changeCount = saved && draft ? getChangeCount(saved, draft) : 0;

  return {
    userId,
    identity,
    phase,
    isSaving,
    saved,
    draft,
    raw,
    notice,
    changeCount,
    load: () => { if (userId) void loadSnapshot(userId); },
    selectUser,
    resetUser,
    setText: (text) => updateDraft({ text }),
    setVoice: (voice) => updateDraft({ voice }),
    setMedia: (media) => updateDraft({ media }),
    discardChanges,
    save,
  };
}
