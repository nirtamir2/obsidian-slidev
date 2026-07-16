import { describe, expect, it } from "vitest";
import {
  getPresentationSurface,
  getSetupButtonLabel,
} from "./presentationState";

describe("presentation view state", () => {
  it("shows onboarding whenever no project is configured", () => {
    expect(getPresentationSurface("", "checking")).toBe("onboarding");
    expect(getPresentationSurface("   ", "running")).toBe("onboarding");
  });

  it("keeps the existing running and fallback surfaces for configured users", () => {
    expect(getPresentationSurface("/projects/slides", "running")).toBe(
      "presentation",
    );
    expect(getPresentationSurface("/projects/slides", "stopped")).toBe(
      "fallback",
    );
  });

  it("uses explicit setup, progress, and retry labels", () => {
    expect(getSetupButtonLabel("idle")).toBe("Set up Slidev");
    expect(getSetupButtonLabel("running")).toBe("Setting up…");
    expect(getSetupButtonLabel("error")).toBe("Retry setup");
    expect(getSetupButtonLabel("success")).toBe("Slidev is ready");
  });
});
