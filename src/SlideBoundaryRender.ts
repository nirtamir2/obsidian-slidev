import { MarkdownRenderChild } from "obsidian";

export class SlideBoundaryRender extends MarkdownRenderChild {
	slideNumber: number;

	constructor(containerEl: HTMLElement, slideNumber: number) {
		super(containerEl);
		this.slideNumber = slideNumber;
	}

	override onload() {
		const slideNumberElement = this.containerEl.createSpan({
			text: `(#${this.slideNumber})`,
		});
		slideNumberElement.style.position = "absolute";
		slideNumberElement.style.top = "-0.8rem";
		slideNumberElement.style.left = "-3rem";
		slideNumberElement.style.color = "var(--color-base-70)";
		slideNumberElement.style.fontSize = "0.8rem";

		const root = this.containerEl.createDiv();
		root.style.position = "relative";

		const hr = this.containerEl.createEl("hr");
		root.append(slideNumberElement, hr);

		this.containerEl.replaceWith(root);
	}
}
