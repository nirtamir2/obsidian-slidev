import type { App } from "obsidian";
import { Modal } from "obsidian";
import { For, createRoot, onCleanup } from "solid-js";
import { insert } from "solid-js/web";
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
			insert(
				element,
				<div>
					<h3>Log</h3>
					<ul class="max-h-96 overflow-auto rounded border p-0">
						<For
							each={this.messages}
							fallback={<div>Log is empty</div>}
						>
							{(message) => {
								const isError = message.type === "error";
								return (
									<li
										classList={{
											"list-none whitespace-pre-wrap font-mono":
												true,
											"text-red": isError,
										}}
									>
										{message.value}
									</li>
								);
							}}
						</For>
					</ul>
				</div>,
			);
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
