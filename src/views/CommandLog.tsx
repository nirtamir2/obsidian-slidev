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
    <ul ref={setListRef} class="slidev-command-log">
      <For
        each={props.messages}
        fallback={<li class="slidev-command-log-empty">Log is empty</li>}
      >
        {(message) => {
          const isError = message.type === "error";
          return (
            <li
              classList={{
                "slidev-command-log-item": true,
                "slidev-command-log-item--error": isError,
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
