import type { App } from "obsidian";
import { createContext } from "solid-js";

export const AppContext = createContext<App | undefined>(undefined);
