import { createContext } from "solid-js";
import type { SlidevPluginSettings } from "../settings";

export const SettingsContext = createContext<SlidevPluginSettings | null>(null);
