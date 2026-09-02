import { describe, expect, it } from "vitest";
import { parseServerInfoUserId, resolveInitialUserId } from "./user-id";

describe("user ID resolution", () => {
  it("gives URL user parameter the highest priority", () => {
    expect(resolveInitialUserId("?user=url-user", "serverinfo=cookie-user")).toMatchObject({
      userId: "url-user",
      source: "url",
    });
  });

  it("reads a direct serverinfo cookie when no URL user exists", () => {
    expect(resolveInitialUserId("", "serverinfo=cookie-user")).toMatchObject({
      userId: "cookie-user",
      source: "cookie",
    });
  });

  it("reads JSON and encoded query-string cookie formats", () => {
    expect(parseServerInfoUserId(encodeURIComponent(JSON.stringify({ user: "json-user" })))).toBe("json-user");
    expect(parseServerInfoUserId("uid=query-user%26region%3DCN")).toBe("query-user");
  });

  it("does not fall through to a cookie when an explicit URL user is invalid", () => {
    expect(resolveInitialUserId("?user=%20", "serverinfo=cookie-user")).toMatchObject({
      userId: null,
      source: "unavailable",
    });
  });
});
