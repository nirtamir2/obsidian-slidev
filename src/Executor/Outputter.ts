import { EventEmitter } from "node:events";
import loadEllipses from "./svgs/loadEllipses";
import loadSpinner from "./svgs/loadSpinner";

export const TOGGLE_HTML_SIGIL = `TOGGLE_HTML_${Math.random()
	.toString(16)
	.slice(2)}`;

export class Outputter extends EventEmitter {
	codeBlockElement: HTMLElement;
	outputElement?: HTMLElement;
	clearButton?: HTMLButtonElement;
	lastPrintElem?: HTMLSpanElement | null;
	lastPrinted?: string;

	inputElement?: HTMLInputElement;

	loadStateIndicatorElement?: HTMLElement;

	htmlBuffer: string;
	escapeHTML: boolean;
	hadPreviouslyPrinted: boolean;
	inputState: "CLOSED" | "INACTIVE" | "NOT_DOING" | "OPEN";

	blockRunState: "FINISHED" | "INITIAL" | "QUEUED" | "RUNNING";

	constructor(codeBlock: HTMLElement, doInput: boolean) {
		super();

		this.inputState = doInput ? "INACTIVE" : "NOT_DOING";
		this.codeBlockElement = codeBlock;
		this.hadPreviouslyPrinted = false;
		this.escapeHTML = true;
		this.htmlBuffer = "";
		this.blockRunState = "INITIAL";
	}

	/**
	 * Clears the output log.
	 */
	clear() {
		if (this.outputElement) {
			for (const child of this.outputElement.children) {
				if (child instanceof HTMLSpanElement) child.remove();
			}
		}
		this.lastPrintElem = null;
		this.hadPreviouslyPrinted = false;
		this.lastPrinted = "";

		if (this.clearButton)
			this.clearButton.className = "clear-button-disabled";

		this.closeInput();
		this.inputState = "INACTIVE";

		// Kill code block
		this.killBlock();
	}

	/**
	 * Kills the code block.
	 * To be overwritten in an executor's run method
	 */
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	killBlock() {}

	/**
	 * Hides the output and clears the log. Visually, restores the code block to its initial state.
	 */
	delete() {
		if (this.outputElement) this.outputElement.style.display = "none";

		this.clear();
	}

	/**
	 * Add a segment of stdout data to the outputter
	 * @param text The stdout data in question
	 */
	write(text: string) {
		this.processSigilsAndWriteText(text);
	}

	/**
	 * Add a segment of stdout data to the outputter,
	 * processing `toggleHtmlSigil`s along the way.
	 * `toggleHtmlSigil`s may be interleaved with text and HTML
	 * in any way; this method will correctly interpret them.
	 * @param text The stdout data in question
	 */
	private processSigilsAndWriteText(text: string) {
		//Loop around, removing HTML toggling sigils
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			const index = text.indexOf(TOGGLE_HTML_SIGIL);
			if (index === -1) break;

			if (index > 0) this.writeRaw(text.slice(0, Math.max(0, index)));

			this.escapeHTML = !this.escapeHTML;
			this.writeHTMLBuffer(this.addStdout());

			text = text.slice(Math.max(0, index + TOGGLE_HTML_SIGIL.length));
		}
		this.writeRaw(text);
	}

	/**
	 * Writes a segment of stdout data without caring about the HTML sigil
	 * @param text The stdout data in question
	 */
	private writeRaw(text: string) {
		//remove ANSI escape codes
		// eslint-disable-next-line no-control-regex
		text = text.replace(/\u001B\\[\d;]*m/g, "");

		// Keep output field and clear button invisible if no text was printed.
		if (this.textPrinted(text)) {
			this.escapeAwareAppend(this.addStdout(), text);

			// make visible again:
			this.makeOutputVisible();
		}
	}

	/**
	 * Add a segment of stderr data to the outputter
	 * @param text The stderr data in question
	 */
	writeErr(text: string) {
		//remove ANSI escape codes
		// eslint-disable-next-line no-control-regex
		text = text.replace(/\u001B\\[\d;]*m/g, "");

		// Keep output field and clear button invisible if no text was printed.
		if (this.textPrinted(text)) {
			this.addStderr().appendText(text);

			// make visible again:
			this.makeOutputVisible();
		}
	}

	/**
	 * Hide the input element. Stop accepting input from the user.
	 */
	closeInput() {
		this.inputState = "CLOSED";
		if (this.inputElement) this.inputElement.style.display = "none";
	}

	/**
	 * Mark the block as running
	 */
	startBlock() {
		if (!this.loadStateIndicatorElement) this.addLoadStateIndicator();
		setTimeout(() => {
			if (
				this.blockRunState !== "FINISHED" &&
				this.loadStateIndicatorElement != null
			)
				this.loadStateIndicatorElement.classList.add("visible");
		}, 100);

		if (this.loadStateIndicatorElement == null) {
			return;
		}

		this.loadStateIndicatorElement.empty();
		this.loadStateIndicatorElement.append(loadSpinner());

		this.loadStateIndicatorElement.setAttribute(
			"aria-label",
			"This block is running.\nClick to stop.",
		);

		this.blockRunState = "RUNNING";
	}

	/**
	 * Marks the block as queued, but waiting for another block before running
	 */
	queueBlock() {
		if (!this.loadStateIndicatorElement) this.addLoadStateIndicator();
		setTimeout(() => {
			if (
				this.blockRunState !== "FINISHED" &&
				this.loadStateIndicatorElement == null
			) {
				return;
			}
			this.loadStateIndicatorElement.classList.add("visible");
		}, 100);

		if (this.loadStateIndicatorElement == null) {
			return;
		}
		this.loadStateIndicatorElement.empty();
		this.loadStateIndicatorElement.append(loadEllipses());

		this.loadStateIndicatorElement.setAttribute(
			"aria-label",
			"This block is waiting for another block to finish.\nClick to cancel.",
		);

		this.blockRunState = "QUEUED";
	}

	/** Marks the block as finished running */
	finishBlock() {
		if (this.loadStateIndicatorElement) {
			this.loadStateIndicatorElement.classList.remove("visible");
		}

		this.blockRunState = "FINISHED";
	}

	private addLoadStateIndicator() {
		this.loadStateIndicatorElement = document.createElement("div");

		this.loadStateIndicatorElement.classList.add("load-state-indicator");

		// Kill code block on clicking load state indicator
		this.loadStateIndicatorElement.addEventListener("click", () => {
			this.killBlock();
		});

		this.getParentElement().parentElement.append(
			this.loadStateIndicatorElement,
		);
	}

	private getParentElement() {
		return this.codeBlockElement.parentElement as HTMLDivElement;
	}

	private addClearButton() {
		const parentEl = this.getParentElement();

		this.clearButton = document.createElement("button");
		this.clearButton.className = "clear-button";
		this.clearButton.setText("Clear");
		this.clearButton.addEventListener("click", () => {
			this.delete();
		});

		parentEl.append(this.clearButton);
	}

	private addOutputElement() {
		const parentEl = this.getParentElement();

		const hr = document.createElement("hr");

		this.outputElement = document.createElement("code");
		this.outputElement.classList.add("language-output");

		this.outputElement.append(hr);
		if (this.inputState !== "NOT_DOING") this.addInputElement();
		parentEl.append(this.outputElement);
	}

	/**
	 * Add an interactive input element to the outputter
	 */
	private addInputElement() {
		this.inputElement = document.createElement("input");
		this.inputElement.classList.add("interactive-stdin");
		this.inputElement.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				if (this.inputElement == null) {
					return;
				}
				this.processInput(`${this.inputElement.value}\n`);
				this.inputElement.value = "";
			}
		});

		this.outputElement?.append(this.inputElement);
	}

	/**
	 * Ensure that input from a user gets echoed to the outputter before being emitted to event subscribers.
	 *
	 * @param input a line of input from the user. In most applications, should end with a newline.
	 */
	private processInput(input: string) {
		this.addStdin().appendText(input);

		this.emit("data", input);
	}

	private addStdin(): HTMLSpanElement {
		return this.addStreamSegmentElement("stdin");
	}

	private addStderr(): HTMLSpanElement {
		return this.addStreamSegmentElement("stderr");
	}

	private addStdout(): HTMLSpanElement {
		return this.addStreamSegmentElement("stdout");
	}

	/**
	 * Creates a wrapper element for a segment of a standard stream.
	 * In order to intermingle the streams as they are output to, segments
	 * are more effective than one-element-for-each.
	 *
	 * If the last segment was of the same stream, it will be returned instead.
	 *
	 * @param streamId The standard stream's name (stderr, stdout, or stdin)
	 * @returns the wrapper `span` element
	 */
	private addStreamSegmentElement(
		streamId: "stderr" | "stdin" | "stdout",
	): HTMLSpanElement {
		if (!this.outputElement) this.addOutputElement();

		if (this.lastPrintElem?.classList.contains(streamId) === true)
			return this.lastPrintElem;

		const stdElem = document.createElement("span");
		stdElem.addClass(streamId);

		if (this.outputElement == null) {
			throw new Error("outputElement is null");
		}
		if (this.inputElement) {
			this.outputElement.insertBefore(stdElem, this.inputElement);
		} else {
			this.outputElement.append(stdElem);
		}
		this.lastPrintElem = stdElem;

		return stdElem;
	}

	/**
	 * Appends some text to a given element. Respects `this.escapeHTML` for whether or not to escape HTML.
	 * If not escaping HTML, appends the text to the HTML buffer to ensure that the whole HTML segment is recieved
	 * before parsing it.
	 * @param element Element to append to
	 * @param text text to append
	 */
	private escapeAwareAppend(element: HTMLElement, text: string) {
		if (this.escapeHTML) {
			element.append(document.createTextNode(text));
		} else {
			this.htmlBuffer += text;
		}
	}

	/**
	 * Parses the HTML buffer and appends its elements to a given parent element.
	 * Erases the HTML buffer afterwards.
	 * @param element element to append to
	 */
	private writeHTMLBuffer(element: HTMLElement) {
		if (this.htmlBuffer !== "") {
			this.makeOutputVisible();

			const content = document.createElement("div");
			// eslint-disable-next-line no-unsanitized/property,github/no-inner-html
			content.innerHTML = this.htmlBuffer;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			for (const childElem of content.childNodes)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				element.append(childElem);

			this.htmlBuffer = "";
		}
	}

	/**
	 * Checks if either:
	 * - this outputter has printed something before.
	 * - the given `text` is non-empty.
	 * If `text` is non-empty, this function will assume that it gets printed later.
	 *
	 * @param text Text which is to be printed
	 * @returns Whether text has been printed or will be printed
	 */
	private textPrinted(text: string) {
		if (this.hadPreviouslyPrinted) return true;

		if (text.contains(TOGGLE_HTML_SIGIL)) return false;
		if (text === "") return false;

		this.hadPreviouslyPrinted = true;
		return true;
	}

	/**
	 * Restores output elements after the outputter has been `delete()`d or `clear()`d.
	 * @see {@link delete()}
	 * @see {@link clear()}
	 */
	private makeOutputVisible() {
		this.closeInput();
		if (!this.clearButton) this.addClearButton();
		if (!this.outputElement) this.addOutputElement();

		if (this.clearButton == null) return;
		if (this.outputElement == null) return;

		this.inputState = "OPEN";
		this.outputElement.style.display = "block";
		this.clearButton.className = "clear-button";

		setTimeout(() => {
			if (this.inputElement == null) {
				return;
			}
			if (this.inputState === "OPEN")
				this.inputElement.style.display = "inline";
		}, 1000);
	}
}
