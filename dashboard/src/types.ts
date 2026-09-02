export type TextLocale = "CN" | "JP";
export type VoiceLocale = "Default" | "CN" | "KR";

export interface ResourceConfig {
  text: TextLocale;
  voice: VoiceLocale;
  media: TextLocale;
}

export interface ResourceApiData extends Record<string, unknown> {
  user: string | number;
  text: unknown;
  voice: unknown;
  media: unknown;
}

export interface ResourceSnapshot {
  config: ResourceConfig;
  raw: ResourceApiData;
}

export type ResourceUpdatePayload = {
  user: string;
  text?: TextLocale;
  voice?: VoiceLocale;
  media?: TextLocale;
};

export type UserIdSource = "url" | "cookie" | "manual" | "unavailable";

export interface UserIdResolution {
  userId: string | null;
  source: UserIdSource;
  detail: string;
}

export type ConsolePhase = "awaiting-user" | "loading" | "ready" | "saving" | "error";

export type NoticeTone = "info" | "success" | "error";

export interface ConsoleNotice {
  tone: NoticeTone;
  title: string;
  detail: string;
}
