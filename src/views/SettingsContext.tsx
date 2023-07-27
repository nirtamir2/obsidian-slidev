import { createContext } from "solid-js";
import { SlidevPluginSettings } from "../../SlidevSettingTab";

export const SettingsContext = createContext<SlidevPluginSettings | null>(null);
