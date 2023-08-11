import { parse } from "@slidev/parser";
import type { App, PluginManifest } from "obsidian";
import { MarkdownView, Plugin, debounce } from "obsidian";
import { SlideBoundaryRender } from "./SlideBoundaryRender";
import type { SlidevPluginSettings } from "./SlidevSettingTab";
import { DEFAULT_SETTINGS, SlidevSettingTab } from "./SlidevSettingTab";
import "./styles.css";
import {
	SLIDEV_PRESENTATION_VIEW_TYPE,
	SlidevPresentationView,
} from "./views/SlidevPresentationView";

export default class SlidevPlugin extends Plugin {
	settings: SlidevPluginSettings = DEFAULT_SETTINGS;

	// server: Awaited<ReturnType<typeof createServer>> | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.saveSettings = debounce(
			this.saveSettings.bind(this),
			1000,
			true,
		) as unknown as typeof this.saveSettings;
	}

	override async onload() {
		await this.#loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SlidevSettingTab(this.app, this));

		this.registerView(
			SLIDEV_PRESENTATION_VIEW_TYPE,
			(leaf) => new SlidevPresentationView(leaf, this.settings),
		);

		this.registerMarkdownPostProcessor((_element, context) => {
			const hrBlocks = document.querySelectorAll(
				".markdown-preview-view hr",
			);
			for (let index = 0; index < hrBlocks.length; index++) {
				const hrBlock = hrBlocks.item(index) as HTMLElement;
				context.addChild(new SlideBoundaryRender(hrBlock, index + 1));
			}
		});

		// const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		// if (view == null) {
		// 	return;
		// }

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"presentation",
			"Open Slidev Presentation View",
			() => {
				void this.#activateView();
			},
		);

		// Perform additional things with the ribbon
		ribbonIconEl.addClass("slidev-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		this.addCommand({
			id: "open-slidev-presentation-view",
			name: "Open slidev presentation view",
			icon: "presentation",
			callback: () => {
				void this.#activateView();
			},
		});

		// TODO: use different event for it instead of just click. Maybe keydown too.
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)

		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", async () => {
			await this.#navigateToCurrentSlide();
		});

		this.registerDomEvent(
			document,
			"keydown",
			debounce(async () => {
				await this.#navigateToCurrentSlide();
			}, 100),
		);

		if (import.meta.env.DEV) {
			window.hmr(this);
		}
	}

	async #navigateToCurrentSlide() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view == null) {
			return;
		}

		const cursor = view.editor.getCursor();
		const { line } = cursor;
		const text = view.editor.getValue();
		if (view.file == null) {
			throw new Error("navigateToCurrentSlide - view not found");
		}
		const parsedView = await parse(text, view.file.path);
		const currentSlide = parsedView.slides.find((slide) => {
			return slide.start <= line && slide.end >= line;
		});
		const slideIndex = currentSlide == null ? 0 : currentSlide.index + 1;

		const viewInstance = this.#getViewInstance();
		if (viewInstance != null) {
			viewInstance.onChangeLine(slideIndex);
		}

		// const lineCount = view.editor.lineCount();
		// console.log("view.editor.getValue()", text);
		// console.log({ slideIndex, line, currentSlide });
	}

	override onunload() {
		this.app.workspace.detachLeavesOfType(SLIDEV_PRESENTATION_VIEW_TYPE);
	}

	#getViewInstance(): SlidevPresentationView | null {
		for (const leaf of this.app.workspace.getLeavesOfType(
			SLIDEV_PRESENTATION_VIEW_TYPE,
		)) {
			const { view } = leaf;
			if (view instanceof SlidevPresentationView) {
				return view;
			}
		}
		return null;
	}

	async #activateView() {
		this.app.workspace.detachLeavesOfType(SLIDEV_PRESENTATION_VIEW_TYPE);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: SLIDEV_PRESENTATION_VIEW_TYPE,
			active: true,
		});

		const viewLeaf = this.app.workspace.getLeavesOfType(
			SLIDEV_PRESENTATION_VIEW_TYPE,
		)[0];

		if (viewLeaf == null) {
			return;
		}
		this.app.workspace.revealLeaf(viewLeaf);
	}

	async #loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as SlidevPluginSettings,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.onunload();
		void this.onload();
	}
}
