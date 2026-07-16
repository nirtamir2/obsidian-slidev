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
