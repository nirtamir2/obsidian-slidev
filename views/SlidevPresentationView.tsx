import { ItemView, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { ReactView } from "./ReactView";
import { createRoot } from "react-dom/client";
import { AppContext } from "./AppContext";

export const SLIDEV_PRESENTATION_VIEW_TYPE = "slidev-presentation-view";

export class SlidevPresentationView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return SLIDEV_PRESENTATION_VIEW_TYPE;
	}

	getDisplayText() {
		return "Slidev Presentation View";
	}

	async onOpen() {
		const root = createRoot(this.containerEl.children[1]);
		root.render(
			<AppContext.Provider value={this.app}>
				<ReactView />
			</AppContext.Provider>,
		);
	}

	async onClose() {
		ReactDOM.unmountComponentAtNode(this.containerEl.children[1]);
	}
}
