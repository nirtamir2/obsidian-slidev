import type { App } from "obsidian";
import { useContext } from "solid-js";
import { AppContext } from "./AppContext";

export const useApp = (): App => {
	const value = useContext(AppContext);
	if (value == null) {
		throw new Error("useApp - context AppContext is not initialized");
	}
	return value;
};
