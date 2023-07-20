import { createContext } from "react";
import type { App } from "obsidian";

export const AppContext = createContext<App | undefined>(undefined);
