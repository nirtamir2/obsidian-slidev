import { describe, expect, it } from "vitest";
import type { SlidevSetupState } from "./SlidevSetupService";
import { getQuickSetupControl, shouldOfferQuickSetup } from "./quickSetupState";

describe("quick setup UI state", () => {
  it("only offers quick setup when no project is configured", () => {
    expect(shouldOfferQuickSetup("")).toBe(true);
    expect(shouldOfferQuickSetup("   ")).toBe(true);
    expect(shouldOfferQuickSetup("/projects/slides")).toBe(false);
  });

  it.each([
    {
      disabled: false,
      label: "Set up Slidev",
      status: "idle" as const,
    },
    {
      disabled: true,
      label: "Setting up…",
      status: "running" as const,
    },
    {
      disabled: false,
      label: "Retry setup",
      status: "error" as const,
    },
    {
      disabled: true,
      label: "Slidev is ready",
      status: "success" as const,
    },
  ])("maps $status to an explicit button state", (expected) => {
    const state: SlidevSetupState = {
      logs: [],
      message: "Current setup status",
      stage: expected.status === "idle" ? "idle" : "checking-runtime",
      status: expected.status,
    };

    expect(getQuickSetupControl(state)).toMatchObject(expected);
  });
});
