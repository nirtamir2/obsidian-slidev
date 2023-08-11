import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { FileSystemAdapter } from "obsidian";
import type { JSXElement } from "solid-js";
import {
	Show,
	Suspense,
	createEffect,
	createResource,
	onCleanup,
	useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import "../styles.css";
import { CommandLogModal } from "./CommandLogModal";
import { SlidevStoreContext } from "./SlidevStoreContext";
import { useApp } from "./useApp";
import { useSettings } from "./useSettings";

const localhost = () => "localhost"; //`127.0.0.1`;

async function fetchIsServerUp(serverBaseUrl: string): Promise<boolean> {
	try {
		const response = await fetch(`${serverBaseUrl}index.html`);
		try {
			await response.text();
			return true;
		} catch {
			return false;
		}
	} catch {
		return false;
	}
}

function RibbonButton(props: {
	onClick: () => void;
	label: string;
	children: JSXElement;
}) {
	return (
		<button
			type="button"
			class="clickable-icon side-dock-ribbon-action slidev-plugin-ribbon-class"
			aria-label={props.label}
			data-tooltip-position="top"
			// eslint-disable-next-line jsx-a11y/aria-props
			aria-label-delay="300"
			onClick={() => {
				props.onClick();
			}}
		>
			{props.children}
		</button>
	);
}

function MonitorPlayIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-monitor-play"
		>
			<path d="m10 7 5 3-5 3Z" />
			<rect width="20" height="14" x="2" y="3" rx="2" />
			<path d="M12 17v4" />
			<path d="M8 21h8" />
		</svg>
	);
}

function GanttChartSquareIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-gantt-chart-square"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M9 8h7" />
			<path d="M8 12h6" />
			<path d="M11 16h5" />
		</svg>
	);
}

let command: ChildProcessWithoutNullStreams | null = null;

export interface LogMessage {
	type: "error" | "message";
	value: string;
}
export const PresentationView = () => {
	const app = useApp();
	const config = useSettings();
	const store = useContext(SlidevStoreContext);

	const [commandLogMessages, setCommandLogMessages] = createStore<
		Array<LogMessage>
	>([]);

	const commandLogModal = new CommandLogModal(app, commandLogMessages);

	const serverBaseUrl = () => `http://${localhost()}:${config.port}/`;

	const [isServerUp, { refetch }] = createResource(
		serverBaseUrl,
		fetchIsServerUp,
	);

	createEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		store.currentSlideNumber;
		void refetch();
	});

	const iframeSrcUrl = () => {
		return `${serverBaseUrl()}${store.currentSlideNumber}?embedded=true`;
	};
	function getVaultPath() {
		const { adapter } = app.vault;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		throw new Error("No vault path");
	}

	function startServer() {
		// TODO: make it generic and use the settings for it

		const vaultPath = getVaultPath();

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

		console.log("PresentationView#startServer()");

		if (command != null) {
			command.kill("SIGINT");
		}

		command = spawn(codeBlockContent, [], {
			env: process.env,
			shell: true,
			cwd: templatePath,
		});

		command.on("disconnect", () => {
			setCommandLogMessages([]);
			console.log("disconnect");
		});

		command.on("error", (error) => {
			setCommandLogMessages([
				...commandLogMessages,
				{ type: "error", value: error.message },
			]);
			console.error({ error });
		});

		command.on("close", (code) => {
			setCommandLogMessages([]);
			console.log(`child process exited with code ${String(code)}`);
		});

		command.on("message", (message) => {
			setCommandLogMessages([
				...commandLogMessages,
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				{ type: "message", value: message.toString() },
			]);
			console.log("message", message);
		});

		command.on("exit", (code, signal) => {
			setCommandLogMessages([]);
			console.log(
				"child process exited with " +
					`code ${String(code)} and signal ${String(signal)}`,
			);
		});

		command.stdout.on("data", (data) => {
			setCommandLogMessages([
				...commandLogMessages,
				{
					type: "message",

					// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
					value: String(data.toString()),
				},
			]);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
			console.log(`stdout: ${String(data.toString())}`);
		});

		command.stderr.on("data", (data) => {
			setCommandLogMessages([
				...commandLogMessages,
				{
					type: "message",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
					value: String(data.toString()),
				},
			]);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
			console.error(`stderr: ${String(data.toString())}`);
		});

		process.on("exit", () => {
			console.log("PresentationView#exit()");
			if (command != null) {
				command.kill();
			}
		});
	}

	onCleanup(() => {
		if (command != null) {
			console.log("PresentationView#onCleanup()");
			command.kill("SIGINT");
		}
	});

	return (
		<Suspense
			fallback={
				<div class="flex h-full items-center justify-center">
					Loading slidev slides
				</div>
			}
		>
			<button
				type="button"
				onClick={() => {
					startServer();
				}}
			>
				Start
			</button>{" "}
			<button
				type="button"
				onClick={() => {
					if (command != null) {
						command.kill();
					}
				}}
			>
				Stop
			</button>
			<button
				type="button"
				onClick={() => {
					commandLogModal.open();
				}}
			>
				Log
			</button>
			<Show
				when={isServerUp()}
				fallback={
					<div class="flex h-full items-center justify-center">
						<div class="flex flex-col items-center gap-4">
							<div class="text-xl text-red-400">
								Slidev server is down
							</div>
							<div>
								No server found at{" "}
								{/* eslint-disable-next-line react/forbid-elements */}
								<a href={serverBaseUrl()}>{serverBaseUrl()}</a>
							</div>
							<div>
								Try running <code>slidev slides.md</code>
							</div>
						</div>
					</div>
				}
			>
				<div class="flex h-full flex-col">
					<h4 class="flex items-center gap-2">
						<div class="flex-1">
							{app.vault.getName()} #{store.currentSlideNumber}
						</div>
						<div class="flex items-center gap-2">
							<RibbonButton
								label="Open presentation view"
								onClick={() => {
									window.open(
										`${serverBaseUrl()}${
											store.currentSlideNumber
										}`,
										"noopener=true,noreferrer=true",
									);
								}}
							>
								<MonitorPlayIcon />
							</RibbonButton>
							<RibbonButton
								label="Open presenter view"
								onClick={() => {
									window.open(
										`${serverBaseUrl()}presenter/${
											store.currentSlideNumber
										}`,
										"noopener=true,noreferrer=true",
									);
								}}
							>
								<GanttChartSquareIcon />
							</RibbonButton>
						</div>
					</h4>

					{/* eslint-disable-next-line react/iframe-missing-sandbox */}
					<iframe
						sandbox="allow-scripts allow-same-origin"
						title="Slidev presentation"
						class="h-full w-full"
						id="iframe"
						src={iframeSrcUrl()}
					/>
				</div>
			</Show>
		</Suspense>
	);
};
