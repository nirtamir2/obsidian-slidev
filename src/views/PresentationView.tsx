import { useContext } from "solid-js";
import { SlidevStoreContext } from "./SlidevStoreContext";
import { useApp } from "./useApp";
import { useSettings } from "./useSettings";

const localhost = () => "localhost"; //`127.0.0.1`;

export const PresentationView = () => {
	const { vault } = useApp();
	const config = useSettings();
	const store = useContext(SlidevStoreContext);

	const serverAddr = () => `http://${localhost()}:${config.port}/`;

	// const indexUrl = `${serverAddr}index.html`
	// const resolvedBody = await got.get(indexUrl, { responseType: 'text', resolveBodyOnly: true }).catch(() => null)
	// if (!resolvedBody) {
	// 	serverAddr = `http://[::1]:${config.port}/`
	// }
	const url = () =>
		`${serverAddr()}${store.currentSlideNumber}?embedded=true`;

	// const getSlideNumber = () => {
	// 	const activeEditor = workspace.getActiveViewOfType(MarkdownView);
	// 	if (activeEditor == null) {
	// 		console.log("null");
	// 		return 1;
	// 	}
	//
	// 	const cursor = activeEditor.editor.getCursor();
	// 	console.log("activeEditor.data", activeEditor.data);
	// 	const { line } = cursor;
	// 	console.log("line", line);
	// 	activeEditor.data;
	// 	const noteFile = workspace.getActiveFile(); // Currently Open Note
	// 	if (noteFile == null) {
	// 		return 1;
	// 	}
	// 	if (!noteFile.name) return; // Nothing Open
	//
	// 	// Read the currently open note file. We are reading it off the HDD - we are NOT accessing the editor to do this.
	// 	// 		const text = await vault.read(noteFile);
	// };

	return (
		<>
			<style>
				{`
			.container {
			display: flex;
			flex-direction: column;
			height: 100%;
			}
			`}
			</style>
			<div class="container">
				<h4>
					{vault.getName()} #{store.currentSlideNumber}
				</h4>
				<iframe
					sandbox
					title="Slidev presentation"
					style={{ height: "100%", width: "100%" }}
					id="iframe"
					src={url()}
				/>
			</div>
		</>
	);
};
