import type { App } from "obsidian";
import { Modal } from "obsidian";
import { createRoot, onCleanup } from "solid-js";
import { insert } from "solid-js/web";
import { CommandLogView } from "./CommandLogView";
import type { LogMessage } from "./PresentationView";


export class CommandLogModal extends Modal {
	messages: Array<LogMessage> = [];

	#dispose?: () => void;
	constructor(app: App, messages: Array<LogMessage>) {
		super(app);
		this.messages = messages;
	}

	override async onOpen() {
		this.#dispose = createRoot((dispose) => {
			const element = this.contentEl;
			insert(element, <CommandLogView messages={this.messages} />);
			onCleanup(() => {
				element.empty();
			});
			return dispose;
		});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.#dispose?.();
	}
}
