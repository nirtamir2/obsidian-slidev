import { createContext } from "solid-js";
import type { SlidevPluginSettings } from "../SlidevSettingTab";

export const SettingsContext = createContext<SlidevPluginSettings | null>(null);
