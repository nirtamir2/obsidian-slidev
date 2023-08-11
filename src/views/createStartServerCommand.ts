import { spawn } from "node:child_process";
import type { App, Vault } from "obsidian";
import { FileSystemAdapter } from "obsidian";
import type { SlidevPluginSettings } from "../SlidevSettingTab";

function getVaultPath(vault: Vault) {
	const { adapter } = vault;
	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath();
	}
	throw new Error("No vault path");
}

export function createStartServerCommand({
	app,
	config,
}: {
	app: App;
	config: SlidevPluginSettings;
}) {
	const vaultPath = getVaultPath(app.vault);

	const activeFile = app.workspace.getActiveFile();
	const currentSlideFile = activeFile == null ? "" : activeFile.path;

	const templatePath = `${vaultPath}/.obsidian/plugins/obsidian-slidev/slidev-template`;
	const slidePathRelativeToTemplatePath = `../../../../${currentSlideFile}`;

	const codeBlockContent = [
		// This makes npm usable
		`source $HOME/.profile`,
		`cd ${templatePath}`,
		// Just make sure it install the stuff (because I ignore node_modules in git)
		"npm i",
		// If you use npm scripts, don't forget to add -- after the npm command:
		`npm run slidev ${slidePathRelativeToTemplatePath} -- --port ${config.port}`,
	].join("\n");

	return spawn(codeBlockContent, [], {
		env: process.env,
		shell: true,
		cwd: templatePath,
	});
}
