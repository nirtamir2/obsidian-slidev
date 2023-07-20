import { createContext } from "react";
import { SlidevPluginSettings } from "../SlidevSettingTab";

export const SettingsContext = createContext<SlidevPluginSettings | null>(null);
