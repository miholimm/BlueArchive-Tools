import { describe, expect, it } from "vitest";
import {
  createUpdatePayload,
  getResourceChanges,
  isChineseTextEnabled,
  parseResourceConfig,
  textLocaleFromEnabled,
  voiceLocaleLabel,
} from "./resource-model";

describe("resource model", () => {
  it("maps text and media through explicit CN/JP values", () => {
    expect(textLocaleFromEnabled(true)).toBe("CN");
    expect(textLocaleFromEnabled(false)).toBe("JP");
    expect(isChineseTextEnabled("CN")).toBe(true);
    expect(isChineseTextEnabled("JP")).toBe(false);
  });

  it("uses safe defaults for empty resource fields", () => {
    expect(parseResourceConfig({ text: "", voice: "", media: "" })).toEqual({
      text: "JP",
      voice: "Default",
      media: "JP",
    });
  });

  it("accepts boolean text and media values returned by the resource API", () => {
    expect(parseResourceConfig({ text: true, voice: "Default", media: false })).toEqual({
      text: "CN",
      voice: "Default",
      media: "JP",
    });
  });

  it("keeps voice display labels separate from API values", () => {
    expect(voiceLocaleLabel("Default")).toBe("日配");
    expect(voiceLocaleLabel("CN")).toBe("中配");
    expect(voiceLocaleLabel("KR")).toBe("韩配");
  });

  it("builds an update payload with only changed fields", () => {
    const saved = { text: "CN" as const, voice: "Default" as const, media: "CN" as const };
    const draft = { text: "JP" as const, voice: "KR" as const, media: "CN" as const };

    expect(getResourceChanges(saved, draft)).toEqual({ text: "JP", voice: "KR" });
    expect(createUpdatePayload("123", saved, draft)).toEqual({ user: "123", text: "JP", voice: "KR" });
  });

  it("does not create any resource fields when state is unchanged", () => {
    const config = { text: "CN" as const, voice: "Default" as const, media: "JP" as const };
    expect(createUpdatePayload("123", config, config)).toEqual({ user: "123" });
  });
});
