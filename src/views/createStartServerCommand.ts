import { spawn } from "node:child_process";
import path from "node:path";
import type { App } from "obsidian";
import type { SlidevPluginSettings } from "../SlidevSettingTab";
import { getVaultPath } from "../utils/getVaultPath";

export function createStartServerCommand({
	app,
	config,
}: {
	app: App;
	config: SlidevPluginSettings;
}) {
	const vaultPath = getVaultPath(app.vault);

	const templatePath = config.slidevTemplateLocation;

	const activeFile = app.workspace.getActiveFile();
	const currentSlideFilePath = activeFile == null ? "" : activeFile.path;

	const slidePathRelativeToTemplatePath = path.join(
		vaultPath,
		currentSlideFilePath,
	);

	const codeBlockContent = [
		// This makes node & npm usable
		config.initialScript,
		`cd ${templatePath}`,
		// If you use npm scripts, don't forget to add -- after the npm command:
		`npm run slidev ${slidePathRelativeToTemplatePath} -- --port ${config.port}`,
	].join("\n");

	return spawn(codeBlockContent, [], {
		env: process.env,
		shell: true,
		cwd: templatePath,
	});
}
