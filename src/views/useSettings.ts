import { useContext } from "solid-js";
import type { SlidevPluginSettings } from "../SlidevSettingTab";
import { SettingsContext } from "./SettingsContext";

export const useSettings = (): SlidevPluginSettings => {
	const value = useContext(SettingsContext);
	if (value == null) {
		throw new Error("useSettings - context AppContext is not initialized");
	}
	return value;
};
