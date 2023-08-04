import { EventEmitter } from "node:events";
import type ExecuteCodePlugin from "../main";
import type Executor from "./Executor";
import NonInteractiveCodeExecutor from "./NonInteractiveCodeExecutor";

export default class ExecutorContainer
	extends EventEmitter
	implements Iterable<Executor>
{
	executors: Record<string, Executor> = {};
	plugin: ExecuteCodePlugin;

	constructor(plugin: ExecuteCodePlugin) {
		super();
		this.plugin = plugin;

		// eslint-disable-next-line ssr-friendly/no-dom-globals-in-constructor
		window.addEventListener("beforeunload",  () => {
			for (const executor of this) {
				void executor.stop();
			}
		});
	}

	/**
	 * Iterate through all executors
	 */
	*[Symbol.iterator](): Iterator<Executor> {
		// eslint-disable-next-line no-restricted-syntax
		for (const file in this.executors) {
			// eslint-disable-next-line security/detect-object-injection,@typescript-eslint/no-non-null-assertion
			yield this.executors[file]!;
		}
	}

	/**
	 * Gets an executor for the given file and language. If the language in
	 * question *may* be interactive, then the executor will be cached and re-returned
	 * the same for subsequent calls with the same arguments.
	 * If there isn't a cached executor, it will be created.
	 *
	 * @param file file to get an executor for
	 * @param needsShell whether or not the language requires a shell
	 */
	getExecutorFor(file: string, needsShell: boolean) {
		// eslint-disable-next-line security/detect-object-injection
		if (!this.executors[file])
			this.setExecutorInExecutorsObject(file, needsShell);

		// eslint-disable-next-line security/detect-object-injection
		return this.executors[file];
	}

	/**
	 * Create an executor and put it into the `executors` dictionary.
	 * @param file the file to associate the new executor with
	 * @param needsShell whether or not the language requires a shell
	 */
	private setExecutorInExecutorsObject(
		file: string,
		needsShell: boolean,
	) {
		const exe = new NonInteractiveCodeExecutor(
			this.plugin.settings,
			needsShell,
			file,
		);
		exe.on("close", () => {
			// eslint-disable-next-line security/detect-object-injection,@typescript-eslint/no-dynamic-delete
			delete this.executors[file];
		});

		// eslint-disable-next-line security/detect-object-injection
		this.executors[file] = exe;
	}
}
