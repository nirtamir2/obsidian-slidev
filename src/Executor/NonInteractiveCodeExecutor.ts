import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { promises } from "node:fs";
import { Notice } from "obsidian";
import { SlidevPluginSettings } from "../SlidevSettingTab";
import Executor from "./Executor";
import type { Outputter } from "./Outputter";
import windowsPathToWsl from "./windowsPathToWsl.js";

export default class NonInteractiveCodeExecutor extends Executor {
	usesShell: boolean;
	stdoutCb: (chunk: any) => void;
	stderrCb: (chunk: any) => void;
	resolveRun: (value: PromiseLike<void> | void) => undefined | void =
		undefined;
	settings: SlidevPluginSettings;

	constructor(
		settings: SlidevPluginSettings,
		usesShell: boolean,
		file: string,
	) {
		super(file);

		this.settings = settings;
		this.usesShell = usesShell;
	}

	async stop(): Promise<void> {
		return;
	}

	async run(
		codeBlockContent: string,
		outputter: Outputter,
		cmd: string,
		cmdArgs: string,
		ext: string,
	) {
		// Resolve any currently running blocks
		if (this.resolveRun !== undefined) this.resolveRun();
		this.resolveRun = undefined;

		await new Promise<void>((resolve, reject) => {
			const tempFileName = this.getTempFile(ext);

			promises
				.writeFile(tempFileName, codeBlockContent)
				.then(() => {
					const args = cmdArgs ? cmdArgs.split(" ") : [];

					if (this.settings.wslMode) {
						args.unshift("-e", cmd);
						cmd = "wsl";
						args.push(windowsPathToWsl(tempFileName));
					} else {
						args.push(tempFileName);
					}

					const child = spawn(cmd, args, {
						env: process.env,
						shell: this.usesShell,
					});

					this.handleChildOutput(child, outputter, tempFileName).then(
						() => {
							this.tempFileId = undefined; // Reset the file id to use a new file next time
						},
					);

					// We don't resolve the promise here - 'handleChildOutput' registers a listener
					// For when the child_process closes, and will resolve the promise there
					this.resolveRun = resolve;
					// eslint-disable-next-line github/no-then
				})
				.catch((error: unknown) => {
					this.notifyError(
						cmd,
						cmdArgs,
						tempFileName,
						error,
						outputter,
					);
					resolve();
				});
		});
	}

	/**
	 * Handles the output of a child process and redirects stdout and stderr to the given {@link Outputter} element.
	 * Removes the temporary file after the code execution. Creates a new Notice after the code execution.
	 *
	 * @param child The child process to handle.
	 * @param outputter The {@link Outputter} that should be used to display the output of the code.
	 * @param fileName The name of the temporary file that was created for the code execution.
	 * @returns a promise that will resolve when the child proces finishes
	 */
	protected async handleChildOutput(
		child: ChildProcessWithoutNullStreams,
		outputter: Outputter,
		fileName: string | undefined,
	) {
		outputter.clear();

		// Kill process on clear
		outputter.killBlock = () => {
			// Kill the process
			child.kill("SIGINT");
		};

		this.stdoutCb = (data) => {
			outputter.write(data.toString());
		};
		this.stderrCb = (data) => {
			outputter.writeErr(data.toString());
		};

		child.stdout.on("data", this.stdoutCb);
		child.stderr.on("data", this.stderrCb);

		outputter.on("data", (data: string) => {
			child.stdin.write(data);
		});

		child.on("close", (code) => {
			if (code !== 0) new Notice("Error!");

			// Resolve the run promise once finished running the code block
			if (this.resolveRun !== undefined) this.resolveRun();

			outputter.closeInput();

			if (fileName === undefined) return;

			promises.rm(fileName).catch((error: unknown) => {
				console.error(
					`Error in 'Obsidian Execute Code' Plugin while removing file: ${error}`,
				);
			});
		});

		child.on("error", (err) => {
			new Notice("Error!");
			outputter.writeErr(err.toString());
		});
	}
}
