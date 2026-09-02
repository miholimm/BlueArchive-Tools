import { afterEach, describe, expect, it, vi } from "vitest";
import { getResourceSnapshot, setResourceConfig } from "./resource-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resource API client", () => {
  it("parses a successful resource response without coercing values to booleans", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: "demo-123", text: "CN", voice: "KR", media: "JP", use: 0 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getResourceSnapshot("demo-123")).resolves.toMatchObject({
      config: { text: "CN", voice: "KR", media: "JP" },
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/resource-api/get_resource?user=demo-123");
  });

  it("posts only the supplied update fields plus user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await setResourceConfig({ user: "123", text: "JP", voice: "KR" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({ user: "123", text: "JP", voice: "KR" });
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("surfaces API and JSON errors as handled resource errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(getResourceSnapshot("missing")).rejects.toMatchObject({
      name: "ResourceApiError",
      message: "User not found",
      kind: "http",
      status: 404,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })));
    await expect(getResourceSnapshot("broken")).rejects.toMatchObject({
      name: "ResourceApiError",
      kind: "payload",
    });
  });
});
