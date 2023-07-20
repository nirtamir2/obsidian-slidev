import { useContext } from "react";
import { SlidevPluginSettings } from "../SlidevSettingTab";
import { SettingsContext } from "./SettingsContext";

export const useSettings = (): SlidevPluginSettings => {
	const value = useContext(SettingsContext);
	if (value == null) {
		throw new Error("useSettings - context AppContext is not initialized");
	}
	return value;
};
