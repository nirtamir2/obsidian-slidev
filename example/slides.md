---
defaults:
    layout: "fact"
---

# Hello from Slidev

---

## This is the obsidian-slidev plugin

---

## The code examples are great here!

```bash
npm init slidev@latest
```

---

## You can mark rows!

```tsx {4, 7-14, 16, all}
import { createEffect, createSignal, onCleanup } from "solid-js";

export default function Component() {
	const [count, setCount] = createSignal(0);

	createEffect(() => {
		const interval = setInterval(() => {
			setCount((count) => count + 1);
		}, 1000);

		onCleanup(() => {
			clearInterval(interval);
		});
	});

	return <div>{count()}</div>;
}
```

---

layout: image
image: ../docs/screenshot.png

---

Full image layout

---

layout: iframe-left
url: https://github.com/nirtamir2/obsidian-slidev
layout: "iframe-right"

---

You can see this source

---

layout: end

# The End

![screenshort]()
