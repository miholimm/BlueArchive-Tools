import { parseResourceConfig, ResourceConfigValidationError } from "./resource-model";
import type { ResourceApiData, ResourceSnapshot, ResourceUpdatePayload } from "../types";

type ApiErrorKind = "network" | "http" | "payload" | "configuration";

export class ResourceApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ResourceApiError";
    this.kind = kind;
    this.status = status;
  }
}

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_RESOURCE_API_BASE_URL?.trim();
  const baseUrl = import.meta.env.BASE_URL || "/";
  const defaultBaseUrl = `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}resource-api`;
  const resolved = configured || defaultBaseUrl;
  return resolved.replace(/\/$/, "");
}

function endpoint(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  const candidate = payload.error ?? payload.message;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ResourceApiError("payload", "资源服务返回了无法解析的数据。", response.status);
  }
}

async function request(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  let response: Response;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 15_000);

  try {
    response = await fetch(endpoint(path), {
      ...init,
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    const message = controller.signal.aborted
      ? "资源服务响应超时，请稍后重新尝试。"
      : "无法连接资源服务，请检查网络或代理配置。";
    throw new ResourceApiError("network", message);
  } finally {
    globalThis.clearTimeout(timeout);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ResourceApiError("http", messageFromPayload(payload, `资源服务请求失败（HTTP ${response.status}）。`), response.status);
  }

  if (!isRecord(payload)) {
    throw new ResourceApiError("payload", "资源服务返回的数据格式不正确。", response.status);
  }

  if (payload.success !== true) {
    throw new ResourceApiError("payload", messageFromPayload(payload, "资源服务未确认本次操作。"), response.status);
  }

  return payload;
}

function getData(payload: Record<string, unknown>): ResourceApiData {
  if (!isRecord(payload.data)) {
    throw new ResourceApiError("payload", "资源服务未返回可用的用户资源数据。");
  }

  const data = payload.data as ResourceApiData;
  if (
    (typeof data.user !== "string" && typeof data.user !== "number") ||
    !String(data.user).trim()
  ) {
    throw new ResourceApiError("payload", "资源服务返回的用户 ID 无效。");
  }

  return data;
}

export async function getResourceSnapshot(userId: string): Promise<ResourceSnapshot> {
  const payload = await request(`/get_resource?user=${encodeURIComponent(userId)}`);
  const raw = getData(payload);
  try {
    return { config: parseResourceConfig(raw), raw };
  } catch (error) {
    if (error instanceof ResourceConfigValidationError) {
      throw new ResourceApiError("configuration", error.message);
    }
    throw error;
  }
}

export async function setResourceConfig(payload: ResourceUpdatePayload): Promise<void> {
  await request("/set_resource", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
