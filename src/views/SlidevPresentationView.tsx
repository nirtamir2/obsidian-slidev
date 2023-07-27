import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { createRoot, createSignal, onCleanup } from "solid-js";
import { Signal } from "solid-js/types/reactive/signal";
import { insert } from "solid-js/web";
import type { SlidevPluginSettings } from "../../SlidevSettingTab";
import { AppContext } from "./AppContext";
import { CurrentSlideNumberContext } from "./CurrentSlideNumberContext";
import { ReactView } from "./ReactView";
import { SettingsContext } from "./SettingsContext";


export const SLIDEV_PRESENTATION_VIEW_TYPE = "slidev-presentation-view";

export class SlidevPresentationView extends ItemView {
	settings: SlidevPluginSettings;
	currentSlideNumber: Signal<number>[0] = () => 0;
	setCurrentSlideNumber: Signal<number>[1] = () => {
		// noop
	};

	#dispose?: () => void;

	constructor(leaf: WorkspaceLeaf, settings: SlidevPluginSettings) {
		super(leaf);
		this.settings = settings;
		const [currentSlideNumber, setCurrentSlideNumber] = createSignal(0);
		this.currentSlideNumber = currentSlideNumber;
		this.setCurrentSlideNumber = setCurrentSlideNumber;
	}

	onChangeLine(currentSlideNumber: number) {
		console.log("currentSlideNumber", currentSlideNumber);
		this.setCurrentSlideNumber(currentSlideNumber);
	}

	getViewType() {
		return SLIDEV_PRESENTATION_VIEW_TYPE;
	}

	getDisplayText() {
		return "Slidev Presentation View";
	}

	override onOpen() {
		this.#dispose = createRoot((dispose) => {
			if (this.containerEl.children[1] == null) {
				throw new Error("SlidevPresentationView root not found");
			}
			const element = this.containerEl.children[1];
			insert(
				element,
				<AppContext.Provider value={this.app}>
					<SettingsContext.Provider value={this.settings}>
						<CurrentSlideNumberContext.Provider
							value={this.currentSlideNumber()}
						>
							<ReactView />
						</CurrentSlideNumberContext.Provider>
					</SettingsContext.Provider>
				</AppContext.Provider>,
			);
			onCleanup(() => {
				element.empty();
			});
			return dispose;
		});
	}

	override async onClose() {
		this.#dispose();
	}
}
