import type { SlidevSetupState } from "../setup/SlidevSetupService";

export type PresentationServerState =
  "checking" | "running" | "starting" | "stopped";

export type PresentationSurface = "onboarding" | "presentation" | "fallback";

export function getPresentationSurface(
  projectPath: string,
  serverState: PresentationServerState,
): PresentationSurface {
  if (projectPath.trim().length === 0) {
    return "onboarding";
  }
  return serverState === "running" ? "presentation" : "fallback";
}

export function getSetupButtonLabel(status: SlidevSetupState["status"]) {
  switch (status) {
    case "running": {
      return "Setting up…";
    }
    case "error": {
      return "Retry setup";
    }
    case "success": {
      return "Slidev is ready";
    }
    case "idle": {
      return "Set up Slidev";
    }
  }
}
