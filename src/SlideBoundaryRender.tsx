import { MarkdownRenderChild } from "obsidian";
import { render } from "solid-js/web";

export class SlideBoundaryRender extends MarkdownRenderChild {
  slideNumber: number;

  constructor(containerEl: HTMLElement, slideNumber: number) {
    super(containerEl);
    this.slideNumber = slideNumber;
  }

  override onload() {
    render(
      () => (
        <div class="relative h-0">
          <div class="absolute bottom-6 -left-6 text-sm text-gray-500">#{this.slideNumber.toFixed(0)}</div>
        </div>
      ),
      this.containerEl,
    );
  }
}
