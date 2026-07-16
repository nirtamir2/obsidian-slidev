import { describe, expect, it } from "vitest";
import type { SlidevSetupState } from "../setup/SlidevSetupService";
import { getQuickSetupControl } from "../setup/quickSetupState";
import { getPresentationSurface } from "./presentationState";

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
    expect(getQuickSetupControl(createState("idle")).label).toBe(
      "Set up Slidev",
    );
    expect(getQuickSetupControl(createState("running")).label).toBe(
      "Setting up…",
    );
    expect(getQuickSetupControl(createState("error")).label).toBe(
      "Retry setup",
    );
    expect(getQuickSetupControl(createState("success")).label).toBe(
      "Slidev is ready",
    );
  });
});

function createState(status: SlidevSetupState["status"]): SlidevSetupState {
  return {
    logs: [],
    message: "Status",
    stage: "idle",
    status,
  };
}
