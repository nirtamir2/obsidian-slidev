import type { ChildProcessWithoutNullStreams } from "node:child_process";
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
import { createStartServerCommand } from "./createStartServerCommand";
import { GanttChartSquareIcon } from "./icons/GanttChartSquareIcon";
import { MonitorPlayIcon } from "./icons/MonitorPlayIcon";
import { RibbonButton } from "./icons/RibbonButton";
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

let command: ChildProcessWithoutNullStreams | null = null;

export interface LogMessage {
	type: "error" | "message";
	value: string;
}

function createMessage(data: any) {
	return {
		type: "message" as const,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
		value: String(data.toString()),
	};
}

function createError(value: string) {
	return { type: "error" as const, value };
}

export const PresentationView = () => {
	const app = useApp();
	const config = useSettings();
	const store = useContext(SlidevStoreContext);

	const [commandLogMessages, setCommandLogMessages] = createStore<
		Array<LogMessage>
	>([]);

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

	onCleanup(() => {
		if (command != null) {
			command.kill("SIGINT");
		}
	});

	const commandLogModal = new CommandLogModal(app, commandLogMessages);

	const iframeSrcUrl = () => {
		return `${serverBaseUrl()}${store.currentSlideNumber}?embedded=true`;
	};

	function addLogListeners(command: ChildProcessWithoutNullStreams) {
		command.on("disconnect", () => {
			setCommandLogMessages([
				...commandLogMessages,
				createError("disconnect"),
			]);
		});

		command.on("error", (error) => {
			setCommandLogMessages([
				...commandLogMessages,
				createError(error.message),
			]);
		});

		command.on("close", (code) => {
			setCommandLogMessages([
				...commandLogMessages,
				createError(`child process exited with code ${String(code)}`),
			]);
		});

		command.on("message", (message) => {
			setCommandLogMessages([
				...commandLogMessages,
				createMessage(message),
			]);
		});

		command.on("exit", (code, signal) => {
			const errorMessage = `child process exited with code ${String(
				code,
			)} and signal ${String(signal)}`;

			setCommandLogMessages([
				...commandLogMessages,
				createError(errorMessage),
			]);
		});

		command.stdout.on("data", (data) => {
			setCommandLogMessages([...commandLogMessages, createMessage(data)]);
		});

		command.stderr.on("data", (data) => {
			setCommandLogMessages([...commandLogMessages, createMessage(data)]);
		});
	}

	function startSlidevServer() {
		if (command != null) {
			command.kill("SIGINT");
		}

		command = createStartServerCommand({ app, config });

		addLogListeners(command);

		process.on("exit", () => {
			if (command != null) {
				command.kill("SIGINT");
			}
		});
	}

	return (
		<Suspense
			fallback={
				<div class="flex h-full items-center justify-center">
					Loading slidev slides
				</div>
			}
		>
			<div class="flex items-center gap-3">
				<button
					type="button"
					onClick={() => {
						startSlidevServer();
					}}
				>
					Start
				</button>
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
			</div>
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
