// import { createServer, resolveOptions } from "@slidev/cli";
import { parse } from "@slidev/parser";
import type { Editor } from "obsidian";
import { MarkdownView, Plugin } from "obsidian";
import { SampleModal } from "../SampleModal";
import type { SlidevPluginSettings } from "../SlidevSettingTab";
import { DEFAULT_SETTINGS, SlidevSettingTab } from "../SlidevSettingTab";
import {
	SLIDEV_PRESENTATION_VIEW_TYPE,
	SlidevPresentationView,
} from "./views/SlidevPresentationView";

export default class SlidevPlugin extends Plugin {
	settings: SlidevPluginSettings = DEFAULT_SETTINGS;
	// server: Awaited<ReturnType<typeof createServer>> | null = null;
	override async onload() {
		await this.loadSettings();

		this.registerView(
			SLIDEV_PRESENTATION_VIEW_TYPE,
			(leaf) => new SlidevPresentationView(leaf, this.settings),
		);

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view == null) {
			return;
		}

		// TODO: add an option to create server
		// const options = await resolveOptions(
		// 	{
		// 		entry: view.file.path,
		// 		// userRoot: "../../",
		// 		inspect: true,
		// 	},
		// 	"dev",
		// 	false,
		// );
		// //
		// this.server = await createServer(options, );

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Open Slidev Presentation View",
			() => {
				void this.activateView();
			},
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return void 0;
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SlidevSettingTab(this.app, this));
		//
		// 	// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// 	// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", async () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view == null) {
				return;
			}

			const cursor = view.editor.getCursor();
			const { line } = cursor;
			const text = view.editor.getValue();
			const parsedView = await parse(text, view.file.path);
			const currentSlide = parsedView.slides.find((slide) => {
				return slide.start <= line && slide.end >= line;
			});
			const slideIndex = currentSlide == null ? 0 : currentSlide.index;

			const viewInstance = this.getViewInstance();
			if (viewInstance != null) {
				viewInstance.onChangeLine(slideIndex);
			}

			// const lineCount = view.editor.lineCount();
			// console.log("view.editor.getValue()", text);
			// console.log({ slideIndex, line, currentSlide });
		});
		//
		// 	// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// 	this.registerInterval(
		// 		window.setInterval(
		// 			() => {
		// 				console.log("setInterval");
		// 			},
		// 			5 * 60 * 1000,
		// 		),
		// 	);

		if (import.meta.env.DEV) {
			window.hmr(this);
		}
	}

	override onunload() {
		// if (this.server != null) {
		// 	void this.server.close();
		// }
	}

	getViewInstance(): SlidevPresentationView | null {
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

	async activateView() {
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

	async loadSettings() {
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
