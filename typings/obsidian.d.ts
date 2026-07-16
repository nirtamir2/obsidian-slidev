import "obsidian";
import type { EventRef } from "obsidian";

declare module "obsidian" {
  export interface Workspace {
    on(
      name: "slidev:settings-changed",
      callback: () => void,
      ctx?: unknown,
    ): EventRef;
    trigger(name: "slidev:settings-changed"): void;
  }
}
