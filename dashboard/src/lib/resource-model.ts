import type { ResourceConfig, ResourceUpdatePayload, TextLocale, VoiceLocale } from "../types";

const textLocales = new Set<TextLocale>(["CN", "JP"]);
const voiceLocales = new Set<VoiceLocale>(["Default", "CN", "KR"]);

export class ResourceConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceConfigValidationError";
  }
}

export function normalizeTextLocale(value: unknown, field: "text" | "media"): TextLocale {
  if (value === true) return "CN";
  if (value === false) return "JP";
  if (value === "" || value === null || value === undefined) return "JP";
  if (typeof value === "string" && textLocales.has(value as TextLocale)) {
    return value as TextLocale;
  }
  throw new ResourceConfigValidationError(`${field} 的资源值无法识别。`);
}

export function normalizeVoiceLocale(value: unknown): VoiceLocale {
  if (value === "" || value === null || value === undefined) return "Default";
  if (typeof value === "string" && voiceLocales.has(value as VoiceLocale)) {
    return value as VoiceLocale;
  }
  throw new ResourceConfigValidationError("voice 的资源值无法识别。");
}

export function parseResourceConfig(data: Record<string, unknown>): ResourceConfig {
  return {
    text: normalizeTextLocale(data.text, "text"),
    voice: normalizeVoiceLocale(data.voice),
    media: normalizeTextLocale(data.media, "media"),
  };
}

export function isChineseTextEnabled(value: TextLocale): boolean {
  return value === "CN";
}

export function textLocaleFromEnabled(enabled: boolean): TextLocale {
  return enabled ? "CN" : "JP";
}

export function textLocaleLabel(value: TextLocale): string {
  return value === "CN" ? "中文" : "日文";
}

export function voiceLocaleLabel(value: VoiceLocale): string {
  if (value === "CN") return "中配";
  if (value === "KR") return "韩配";
  return "日配";
}

export function getResourceChanges(saved: ResourceConfig, draft: ResourceConfig): Omit<ResourceUpdatePayload, "user"> {
  const changes: Omit<ResourceUpdatePayload, "user"> = {};

  if (saved.text !== draft.text) changes.text = draft.text;
  if (saved.voice !== draft.voice) changes.voice = draft.voice;
  if (saved.media !== draft.media) changes.media = draft.media;

  return changes;
}

export function createUpdatePayload(
  user: string,
  saved: ResourceConfig,
  draft: ResourceConfig,
): ResourceUpdatePayload {
  return { user, ...getResourceChanges(saved, draft) };
}

export function getChangeCount(saved: ResourceConfig, draft: ResourceConfig): number {
  return Object.keys(getResourceChanges(saved, draft)).length;
}
