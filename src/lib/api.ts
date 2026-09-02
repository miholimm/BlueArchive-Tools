import { defaultModuleVisibility } from "../data/siteModules";
import type { DownloadData, Member, NewsItem, SiteSettings, StatusData, ThemePreference } from "../types";
import type { AdminIdentity } from "../data/adminPermissions";
import { normalizeStatusData } from "./status";

export type { SiteSettings } from "../types";

export type SiteContent = {
  news: NewsItem[];
  download: DownloadData;
  team: Member[];
  status: StatusData;
  settings: SiteSettings;
};

export type QqIdentity = {
  provider: "qq";
  nickname: string;
  avatar: string;
};

export type QqAuthStatus = {
  configured: boolean;
  identity: QqIdentity | null;
};

const fallback: SiteContent = {
  news: [],
  download: { android: [], windows: [], ios: [], macos: [] },
  team: [],
  status: normalizeStatusData(undefined),
    settings: {
    siteTitle: "蔚蓝档案汉化组",
    siteSubtitle: "为玩家提供高质量本地化体验",
    wallpaper: "",
    backgroundDim: 0,
    accent: "cyan",
    theme: "system",
    moduleVisibility: defaultModuleVisibility,
  },
};

function normalizeBackgroundDim(value: unknown) {
  const numericValue =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(numericValue)
    ? Math.min(80, Math.max(0, Math.round(numericValue)))
    : 0;
}

function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function normalizeContent(value: Partial<SiteContent>): SiteContent {
  return {
    ...fallback,
    ...value,
    news: Array.isArray(value.news) ? value.news : fallback.news,
    team: Array.isArray(value.team) ? value.team : fallback.team,
    download: { ...fallback.download, ...(value.download || {}) },
    status: normalizeStatusData(value.status),
    settings: {
      ...fallback.settings,
      ...(value.settings || {}),
      backgroundDim: normalizeBackgroundDim(value.settings?.backgroundDim),
      theme: normalizeTheme(value.settings?.theme),
      moduleVisibility: {
        ...defaultModuleVisibility,
        ...(value.settings?.moduleVisibility || {}),
        workspace: "admin",
        archive: "admin",
      },
    },
  };
}

export async function getContent(): Promise<SiteContent> {
  const response = await authFetch("/api/content");
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new Error(value.message || value.error || "内容读取失败");
  }
  return normalizeContent(await response.json());
}

export async function adminLogin(username: string, password: string) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new Error(value.message || "登录失败");
  }
  const value = await response.json();
  localStorage.setItem("ba_admin_token", value.token);
  const { token: _token, ...identity } = value;
  localStorage.setItem("ba_admin_identity", JSON.stringify(identity));
  window.dispatchEvent(new Event("ba_admin_auth_changed"));
  return value;
}

export function clearAdminSession() {
  localStorage.removeItem("ba_admin_token");
  localStorage.removeItem("ba_admin_identity");
  window.dispatchEvent(new Event("ba_admin_auth_changed"));
}

export async function adminLogout() {
  try {
    await authFetch("/api/admin/logout", { method: "POST" });
  } finally {
    clearAdminSession();
  }
}

export async function getAdminMe(): Promise<AdminIdentity> {
  const response = await authFetch("/api/admin/me");
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearAdminSession();
    throw new Error(value.message || value.error || "登录状态已失效");
  }
  localStorage.setItem("ba_admin_identity", JSON.stringify(value));
  return value as AdminIdentity;
}

export async function getQqAuthStatus(): Promise<QqAuthStatus> {
  const response = await fetch("/api/auth/qq/status", {
    credentials: "same-origin",
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.message || value.error || "QQ 登录状态读取失败");
  return {
    configured: Boolean(value.configured),
    identity: value.identity || null,
  };
}

export function startQqLogin() {
  window.location.assign("/api/auth/qq/start");
}

export async function logoutQq() {
  const response = await fetch("/api/auth/qq/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("QQ 退出登录失败");
}

export async function saveAdmin(path: string, value: unknown) {
  const token = localStorage.getItem("ba_admin_token");
  const response = await fetch(`/api/admin/${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "保存失败");
  }
  return response.json();
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("ba_admin_token");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

export function isAdmin() {
  return Boolean(localStorage.getItem("ba_admin_token"));
}
