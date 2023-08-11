import { For, createEffect, createSignal, on } from "solid-js";
import type { LogMessage } from "./PresentationView";

interface Props {
	messages: Array<LogMessage>;
}

export function CommandLog(props: Props) {
	const [listRef, setListRef] = createSignal<HTMLUListElement | null>(null);

	const messageLength = () => props.messages.length;
	function scrollToListEnd() {
		// Scroll to list's end
		const list = listRef();
		if (list != null) {
			list.scrollTop = list.scrollHeight;
		}
	}

	createEffect(
		on(messageLength, () => {
			scrollToListEnd();
		}),
	);

	return (
		<ul ref={setListRef} class="max-h-96 overflow-auto rounded border p-0">
			<For each={props.messages} fallback={<div>Log is empty</div>}>
				{(message) => {
					const isError = message.type === "error";
					return (
						<li
							classList={{
								"list-none whitespace-pre-wrap font-mono": true,
								"text-red-500": isError,
							}}
						>
							{message.value}
						</li>
					);
				}}
			</For>
		</ul>
	);
}
