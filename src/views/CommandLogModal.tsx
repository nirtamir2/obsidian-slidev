import type { App } from "obsidian";
import { Modal } from "obsidian";
import {
	For,
	createEffect,
	createRoot,
	createSignal,
	onCleanup,
} from "solid-js";
import { insert } from "solid-js/web";
import type { LogMessage } from "./PresentationView";

function CommandLogView(props: { messages: Array<LogMessage> }) {
	const [listRef, setListRef] = createSignal<HTMLUListElement | null>(null);

	createEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		props.messages;

		// Scroll to list's end
		const list = listRef();
		if (list != null) {
			list.scrollTop = list.scrollHeight;
		}
	});

	return (
		<div>
			<h3>Log</h3>
			<ul
				ref={setListRef}
				class="max-h-96 overflow-auto rounded border p-0"
			>
				<For each={props.messages} fallback={<div>Log is empty</div>}>
					{(message) => {
						const isError = message.type === "error";
						return (
							<li
								classList={{
									"list-none whitespace-pre-wrap font-mono":
										true,
									"text-red-500": isError,
								}}
							>
								{message.value}
							</li>
						);
					}}
				</For>
			</ul>
		</div>
	);
}

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
