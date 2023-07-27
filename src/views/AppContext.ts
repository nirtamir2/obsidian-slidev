import { createContext } from "solid-js";
import type { App } from "obsidian";

export const AppContext = createContext<App | undefined>(undefined);
