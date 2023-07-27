import { useContext } from "solid-js";
import type { App } from "obsidian";
import { AppContext } from "./AppContext";

export const useApp = (): App => {
	const value = useContext(AppContext);
	if (value == null) {
		throw new Error("useApp - context AppContext is not initialized");
	}
	return value;
};
