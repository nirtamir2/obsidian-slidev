import type { App } from "obsidian";
import { Notice, PluginSettingTab, Setting, debounce } from "obsidian";
import type SlidevPlugin from "./main";

export interface SlidevPluginSettings {
	port: number;
	wslMode: boolean;
	packageManager: "npm" | "pnpm" | "yarn";
}

export const DEFAULT_SETTINGS: SlidevPluginSettings = {
	port: 3030,
	wslMode: false,
	packageManager: "npm",
};

function isPortNumber(parsedNumber: number) {
	return (
		Number.isInteger(parsedNumber) &&
		parsedNumber > 0 &&
		parsedNumber < 65535
	);
}

export class SlidevSettingTab extends PluginSettingTab {
	plugin: SlidevPlugin;

	constructor(app: App, plugin: SlidevPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for slidev plugin." });

		new Setting(containerEl)
			.setName("Port")
			.setDesc("Slidev port Number")
			.addText((text) =>
				text
					.setPlaceholder(String(DEFAULT_SETTINGS.port))
					.setValue(String(this.plugin.settings.port))
					.onChange(debounce(async (value) => {
						const parsedNumber = Number(value);
						if (!isPortNumber(parsedNumber)) {
							new Notice("Port should be an integer");
							return;
						}
						this.plugin.settings.port = parsedNumber;
						await this.plugin.saveSettings();
					}, 750)),
			);

		new Setting(containerEl)
			.setName("wslMode (Windows only)")
			.setDesc("Should use WSL")
			.addToggle((value) =>
				value.setValue(this.plugin.settings.wslMode).onChange(
					debounce(async (value) => {
						this.plugin.settings.wslMode = value;
						await this.plugin.saveSettings();
					}, 750),
				),
			);

		new Setting(containerEl)
			.setName("Package manager")
			.setDesc("Which package manager to use with slidev")
			.addDropdown((cb) => {
				cb.addOption("npm", "npm")
					.addOption("yarn", "yarn")
					.addOption("pnpm", "pnpm")
					.setValue(this.plugin.settings.packageManager)
					.onChange(
						debounce(async (value) => {
							this.plugin.settings.packageManager = value;
							await this.plugin.saveSettings();
						}, 750),
					);
			});
	}
}
