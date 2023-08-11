import type { App } from "obsidian";
import { Notice, PluginSettingTab, Setting, debounce } from "obsidian";
import type SlidevPlugin from "./main";

export interface SlidevPluginSettings {
	port: number;
	initialScript: string;
	isDebug: boolean;
}

export const DEFAULT_SETTINGS: SlidevPluginSettings = {
	port: 3030,
	initialScript: "source $HOME/.profile",
	isDebug: false,
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
					.onChange(
						debounce(async (value) => {
							const parsedNumber = Number(value);
							if (!isPortNumber(parsedNumber)) {
								new Notice("Port should be an integer");
								return;
							}
							this.plugin.settings.port = parsedNumber;
							await this.plugin.saveSettings();
						}, 750),
					),
			);

		new Setting(containerEl)
			.setName("Initial Script")
			.setDesc("The script to load Node.js to PATH")
			.addText((text) =>
				text
					.setPlaceholder(String(DEFAULT_SETTINGS.initialScript))
					.setValue(String(this.plugin.settings.initialScript))
					.onChange(
						debounce(async (value) => {
							this.plugin.settings.initialScript = value;
							await this.plugin.saveSettings();
						}, 750),
					),
			);

		new Setting(containerEl)
			.setName("Debug mode")
			.setDesc("Should show debug mode")
			.addToggle((value) =>
				value.setValue(this.plugin.settings.isDebug).onChange(
					debounce(async (value) => {
						this.plugin.settings.isDebug = value;
						await this.plugin.saveSettings();
					}, 750),
				),
			);
	}
}
