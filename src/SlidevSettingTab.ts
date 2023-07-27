import type { App} from "obsidian";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import type SlidevPlugin from "./main";

export interface SlidevPluginSettings {
	port: number;
}

export const DEFAULT_SETTINGS: SlidevPluginSettings = {
	port: 3030,
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
					.onChange(async (value) => {
						const parsedNumber = Number(value);
						if (!isPortNumber(parsedNumber)) {
							new Notice("Port should be an integer");
							return;
						}
						this.plugin.settings.port = parsedNumber;
						await this.plugin.saveSettings();
					}),
			);
	}
}
