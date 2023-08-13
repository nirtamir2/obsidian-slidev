import { createContext } from "solid-js";

export interface SlidevStore {
  currentSlideNumber: number;
}

export const SlidevStoreContext = createContext<SlidevStore>({
  currentSlideNumber: -1,
});
