import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { SlidevPluginSettings } from "../SlidevSettingTab";
import { AppContext } from "./AppContext";
import { CurrentSlideNumberContext } from "./CurrentSlideNumberContext";
import { ReactView } from "./ReactView";
import { SettingsContext } from "./SettingsContext";

export const SLIDEV_PRESENTATION_VIEW_TYPE = "slidev-presentation-view";

export class SlidevPresentationView extends ItemView {
	root: Root | null = null;
	settings: SlidevPluginSettings;
	currentSlideNumber = 0;

	constructor(leaf: WorkspaceLeaf, settings: SlidevPluginSettings) {
		super(leaf);
		this.settings = settings;
	}

	onChangeLine(currentSlideNumber: number) {
		this.currentSlideNumber = currentSlideNumber;
		this.rerender();
	}

	getViewType() {
		return SLIDEV_PRESENTATION_VIEW_TYPE;
	}

	getDisplayText() {
		return "Slidev Presentation View";
	}

	override async onOpen() {
		if (this.containerEl.children[1] == null) {
			throw new Error("SlidevPresentationView root not found");
		}
		this.root = createRoot(this.containerEl.children[1]);
		this.rerender();
	}

	override async onClose() {
		if (this.root != null) {
			this.root.unmount();
		}
	}

	private rerender() {
		if (this.root == null) {
			return;
		}
		this.root.render(
			<AppContext.Provider value={this.app}>
				<SettingsContext.Provider value={this.settings}>
					<CurrentSlideNumberContext.Provider
						value={this.currentSlideNumber}
					>
						<ReactView />
					</CurrentSlideNumberContext.Provider>
				</SettingsContext.Provider>
			</AppContext.Provider>,
		);
	}
}
