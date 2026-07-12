import type { Workspace } from "obsidian";
import { MarkdownRenderChild } from "obsidian";

export const SLIDEV_SETTINGS_CHANGED_EVENT = "slidev:settings-changed";

interface SlideBoundaryRenderOptions {
  shouldRender: () => boolean;
  slideNumber: number;
  workspace: Workspace;
}

export class SlideBoundaryRender extends MarkdownRenderChild {
  private labelEl: HTMLDivElement | null = null;
  private readonly shouldRender: () => boolean;
  private readonly slideNumber: number;
  private readonly workspace: Workspace;

  constructor(
    containerEl: HTMLElement,
    { shouldRender, slideNumber, workspace }: SlideBoundaryRenderOptions,
  ) {
    super(containerEl);
    this.shouldRender = shouldRender;
    this.slideNumber = slideNumber;
    this.workspace = workspace;
  }

  override onload() {
    this.renderSlideNumber();
    this.registerEvent(
      this.workspace.on(SLIDEV_SETTINGS_CHANGED_EVENT, () => {
        this.renderSlideNumber();
      }),
    );
  }

  override onunload() {
    this.labelEl?.remove();
    this.labelEl = null;
  }

  private renderSlideNumber() {
    this.labelEl?.remove();
    this.labelEl = null;
    if (!this.shouldRender()) {
      return;
    }

    this.labelEl = this.containerEl.createDiv({
      cls: "slidev-slide-number",
      text: `#${this.slideNumber.toFixed(0)}`,
    });
  }
}
