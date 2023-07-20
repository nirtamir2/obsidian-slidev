import * as React from "react";
import {useEffect} from "react";
import {useApp} from "./useApp";
import {MarkdownView} from "obsidian";

function usePluginSettings() {

}

export const ReactView = () => {
	const {vault, workspace} = useApp();
	const settings = usePluginSettings()
	const config = {port: 3030};
	const idx = 1;


	const localhost = "localhost";//`127.0.0.1`;
	const serverAddr = `http://${localhost}:${config.port}/`

	// const indexUrl = `${serverAddr}index.html`
	// const resolvedBody = await got.get(indexUrl, { responseType: 'text', resolveBodyOnly: true }).catch(() => null)
	// if (!resolvedBody) {
	// 	serverAddr = `http://[::1]:${config.port}/`
	// }
	const url = `${serverAddr}${idx}?embedded=true`

	const getSlideNumber = () => {
		const activeEditor = workspace.getActiveViewOfType(MarkdownView);
		if (activeEditor == null) {
			console.log("null", )
			return 1;
		}
		const cursor = activeEditor.editor.getCursor();
		console.log("activeEditor.data", activeEditor.data)
			const line = cursor.line
		console.log("line", line)
		activeEditor.data
		const noteFile = workspace.getActiveFile(); // Currently Open Note
		if(noteFile == null ){
			return 1
		}
		if(!noteFile.name) return; // Nothing Open

// Read the currently open note file. We are reading it off the HDD - we are NOT accessing the editor to do this.
// 		const text = await vault.read(noteFile);

	}


	return <>
		<style>
			{`
			.container {
			display: flex;
			flex-direction: column;
			height: 100%;
			}
			`}
		</style>
		<div className="container">
			<h4>{vault.getName()}</h4>
			<button type="button" onClick={() => getSlideNumber()}>Log</button>
			<iframe style={{height: "100%", width: "100%"}} id="iframe" src={url}/>
		</div>
	</>;
};
