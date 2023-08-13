---
defaults:
  layout: "fact"
---

# Hello from Slidev

---

---

## This is the obsidian-slidev plugin

---

layout: two-cols

---

## Here I load image to the right

and I can still have a list

- First
- Second
  - Senod but nested
    - nest

::right::

![Cool image](https://source.unsplash.com/collection/94734566/1920x1080)

---

## You can mark rows!

```tsx {4|6-14|16|all}
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
image: https://source.unsplash.com/collection/94734566/1920x1080

---

# Full image layout

---

layout: iframe-right
url: https://github.com/nirtamir2/obsidian-slidev

---

# See this on the right?

You can see this source to my github repository here

---

layout: end

---

# The End
