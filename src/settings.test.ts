import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

describe("normalizeSettings", () => {
  it("uses safe defaults for a fresh install", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({
      nodeExecutable: "",
      slidevTemplateLocation: "",
    });
  });

  it("preserves supported saved values and drops the legacy shell script", () => {
    const settings = normalizeSettings({
      initialScript: "source $HOME/.profile",
      isDebug: true,
      nodeExecutable: "/opt/node/bin/node",
      port: 4040,
      shouldRenderSlideNumberInMarkdownPreview: true,
      slidevTemplateLocation: "/presentations/project",
      unknownSetting: "ignored",
    });

    expect(settings).toEqual({
      isDebug: true,
      nodeExecutable: "/opt/node/bin/node",
      port: 4040,
      shouldRenderSlideNumberInMarkdownPreview: true,
      slidevTemplateLocation: "/presentations/project",
    });
    expect(settings).not.toHaveProperty("initialScript");
    expect(settings).not.toHaveProperty("unknownSetting");
  });

  it("repairs invalid persisted value types", () => {
    expect(
      normalizeSettings({
        isDebug: "yes",
        nodeExecutable: 42,
        port: 70_000,
        shouldRenderSlideNumberInMarkdownPreview: null,
        slidevTemplateLocation: false,
      }),
    ).toEqual(DEFAULT_SETTINGS);
  });
});
