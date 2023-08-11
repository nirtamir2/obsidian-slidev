import { For, createEffect, createSignal } from "solid-js";
import { LogMessage } from "./PresentationView";

type Props = { messages: Array<LogMessage> };

export function CommandLogModalView(props: Props) {
	const [listRef, setListRef] = createSignal<HTMLUListElement | null>(null);

	function scrollToListEnd() {
		// Scroll to list's end
		const list = listRef();
		if (list != null) {
			list.scrollTop = list.scrollHeight;
		}
	}

	createEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		props.messages;
		scrollToListEnd();
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
