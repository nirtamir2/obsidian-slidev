import type { SlidevSetupState } from "./SlidevSetupService";

export interface QuickSetupControl {
  disabled: boolean;
  label: string;
  message: string;
  status: SlidevSetupState["status"];
  tone: "neutral" | "error" | "success";
}

export function shouldOfferQuickSetup(projectPath: string) {
  return projectPath.trim().length === 0;
}

export function getQuickSetupControl(
  state: SlidevSetupState,
): QuickSetupControl {
  switch (state.status) {
    case "running": {
      return {
        disabled: true,
        label: "Setting up…",
        message: state.message,
        status: state.status,
        tone: "neutral",
      };
    }
    case "error": {
      return {
        disabled: false,
        label: "Retry setup",
        message: state.message,
        status: state.status,
        tone: "error",
      };
    }
    case "success": {
      return {
        disabled: true,
        label: "Slidev is ready",
        message: state.message,
        status: state.status,
        tone: "success",
      };
    }
    case "idle": {
      return {
        disabled: false,
        label: "Set up Slidev",
        message: "",
        status: state.status,
        tone: "neutral",
      };
    }
  }
}
