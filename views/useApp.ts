import * as React from "react";
import {App} from 'obsidian';
import {AppContext} from "./AppContext";

export const useApp = (): App => {
	const value = React.useContext(AppContext);
	if(value == null){
		throw new Error("useApp - context AppContext is not initialized")
	}
	return value;
};
