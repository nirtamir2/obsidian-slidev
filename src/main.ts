// import { createServer, resolveOptions } from "@slidev/cli";
import { parse } from "@slidev/parser";
import type { App, PluginManifest } from "obsidian";
import { FileSystemAdapter, MarkdownView, Plugin, debounce } from "obsidian";
import ExecutorContainer from "./Executor/ExecutorContainer";
import { Outputter } from "./Executor/Outputter";
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
	executors: ExecutorContainer;

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
		await this.loadSettings();

		this.executors = new ExecutorContainer(this);

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
				void this.activateView();
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
				void this.activateView();
			},
		});

		this.addCommand({
			id: "start-slidev-presentation-server",
			name: "Start slidev presentation server",
			icon: "play",
			callback: () => {
				// TODO: make it generic and use the settings for it

				const vaultPath = this.#getVaultPath();

				const activeFile = this.app.workspace.getActiveFile();
				const currentSlideFile =
					activeFile == null ? "" : activeFile.path;
				const sourceCommand = `source $HOME/.zshrc`;
				const packageManagerCommand = `pnpm dlx`;
				const codeBlockContent = `${sourceCommand}
cd ${vaultPath}
${packageManagerCommand} @slidev/cli ${currentSlideFile}`.trim();

				// TODO: output the code better - maybe in the view
				const codeBlock = document.createElement("code");
				codeBlock.style = {
					padding: 20,
					maxHeight: 100,
				};
				document
					.querySelector(".workspace-leaf-content")
					?.appendChild(codeBlock);

				const outputter = new Outputter(codeBlock, false);

				this.runCodeInShell({
					codeBlockContent: codeBlockContent,
					outputter: outputter,
					cmd: "bash",
					cmdArgs: "",
					ext: "zsh",
					file: "start-server.zsh",
				});
			},
		});

		// TODO: close server command
		// this.addCommand({
		// 	id: "stop-slidev-presentation-server",
		// 	name: "Stop slidev presentation server",
		// 	icon: "pause",
		// 	callback: () => {
		// 		void this.runCodeInShell("");
		// 	},
		// });

		// TODO: use different event for it instead of just click. Maybe keydown too.
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)

		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", async () => {
			await this.navigateToCurrentSlide();
		});

		this.registerDomEvent(
			document,
			"keydown",
			debounce(async () => {
				await this.navigateToCurrentSlide();
			}, 100),
		);

		// if (import.meta.env.DEV) {
		window.hmr(this);
		// }
	}

	async navigateToCurrentSlide() {
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
		const slideIndex = currentSlide == null ? 0 : currentSlide.index + 1;

		const viewInstance = this.getViewInstance();
		if (viewInstance != null) {
			viewInstance.onChangeLine(slideIndex);
		}

		// const lineCount = view.editor.lineCount();
		// console.log("view.editor.getValue()", text);
		// console.log({ slideIndex, line, currentSlide });
	}

	override onunload() {
		// if (this.server != null) {
		// 	void this.server.close();
		// }
		for (const executor of this.executors ?? []) {
			void executor.stop()
		}
	}

	/**
	 * Executes the code with the given command and arguments. The code is written to a temporary file and then executed.
	 * This is equal to {@link runCode} but the code is executed in a shell. This is necessary for some languages like groovy.
	 *
	 * @param codeBlockContent The content of the code block that should be executed.
	 * @param outputter The {@link Outputter} that should be used to display the output of the code.
	 * @param button The button that was clicked to execute the code. Is re-enabled after the code execution.
	 * @param cmd The command that should be used to execute the code. (e.g. python, java, ...)
	 * @param cmdArgs Additional arguments that should be passed to the command.
	 * @param ext The file extension of the temporary file. Should correspond to the language of the code. (e.g. py, ...)
	 * @param file The address of the file which the code originates from
	 */
	private async runCodeInShell({
		codeBlockContent,
		outputter,
		cmd,
		cmdArgs,
		ext,
		file,
	}: {
		codeBlockContent: string;
		outputter: Outputter;
		cmd: string;
		cmdArgs: string;
		ext: string;
		file: string;
	}) {
		const executor = this.executors.getExecutorFor(file, true);

		return await executor.run(
			codeBlockContent,
			outputter,
			cmd,
			cmdArgs,
			ext,
		);
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

	#getVaultPath() {
		const { adapter } = this.app.vault;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		return `Users/nirtamir/dev/slides/introduction-to-solid-js/`;
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// TODO: do it more elegantly instead of unload and load
		this.onunload();
		void this.onload();
	}
}
