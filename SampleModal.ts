import {Modal} from "obsidian";

export class SampleModal extends Modal {
	override onOpen() {
		const {contentEl} = this;
		contentEl.setText("Woah!");
	}

	override onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
