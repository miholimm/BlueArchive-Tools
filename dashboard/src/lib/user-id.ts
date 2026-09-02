import type { UserIdResolution, UserIdSource } from "../types";

export function normalizeUserId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 256 || /[\r\n]/.test(normalized)) return null;
  return normalized;
}

export function getCookieValue(name: string, cookieString = document.cookie): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const item = cookieString.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(prefix));
  if (!item) return null;
  return item.slice(prefix.length);
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readUserFromRecord(value: Record<string, unknown>): string | null {
  const candidate = value.user ?? value.userId ?? value.uid ?? value.id;
  return typeof candidate === "string" || typeof candidate === "number"
    ? normalizeUserId(String(candidate))
    : null;
}

export function parseServerInfoUserId(rawValue: string | null): string | null {
  if (!rawValue) return null;
  const decoded = decodeCookieValue(rawValue).trim();
  const directValue = normalizeUserId(decoded);

  try {
    const parsed: unknown = JSON.parse(decoded);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const recordValue = readUserFromRecord(parsed as Record<string, unknown>);
      if (recordValue) return recordValue;
    }
  } catch {
    void 0;
  }

  const params = new URLSearchParams(decoded);
  const parameterValue = normalizeUserId(params.get("user") ?? params.get("userId") ?? params.get("uid"));
  if (parameterValue) return parameterValue;

  const matched = decoded.match(/(?:^|[,&;|\s])(?:user|userId|uid)=([^,&;|\s]+)/i);
  if (matched?.[1]) return normalizeUserId(matched[1]);

  return directValue && !/[=:{[\]}]/.test(directValue) ? directValue : null;
}

export function resolveInitialUserId(locationSearch = window.location.search, cookieString = document.cookie): UserIdResolution {
  const params = new URLSearchParams(locationSearch);
  const urlParameter = params.get("user");

  if (urlParameter !== null) {
    const userId = normalizeUserId(urlParameter);
    return userId
      ? { userId, source: "url", detail: "已使用 URL 参数中的 user。" }
      : { userId: null, source: "unavailable", detail: "URL 中的 user 参数无效，请重新输入。" };
  }

  const cookieUserId = parseServerInfoUserId(getCookieValue("serverinfo", cookieString));
  if (cookieUserId) {
    return { userId: cookieUserId, source: "cookie", detail: "已从 serverinfo Cookie 读取用户 ID。" };
  }

  return {
    userId: null,
    source: "unavailable",
    detail: "未发现 URL 参数或可读取的 serverinfo Cookie。",
  };
}

export function setUserIdInUrl(userId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("user", userId);
  window.history.replaceState({}, "", url);
}

export function userIdSourceLabel(source: UserIdSource): string {
  if (source === "url") return "URL 参数";
  if (source === "cookie") return "serverinfo Cookie";
  if (source === "manual") return "手动输入";
  return "等待提供";
}
