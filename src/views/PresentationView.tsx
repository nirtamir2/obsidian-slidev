import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { Notice } from "obsidian";
import {
  Show,
  Suspense,
  createEffect,
  createResource,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import "../styles.css";
import { CommandLog } from "./CommandLog";
import { CommandLogModal } from "./CommandLogModal";
import { SlidevStoreContext } from "./SlidevStoreContext";
import { createStartServerCommand } from "./createStartServerCommand";
import { ClipboardIcon } from "./icons/ClipboardIcon";
import { GanttChartSquareIcon } from "./icons/GanttChartSquareIcon";
import { MonitorPlayIcon } from "./icons/MonitorPlayIcon";
import { RibbonButton } from "./icons/RibbonButton";
import { useApp } from "./useApp";
import { useSettings } from "./useSettings";

const localhost = () => "localhost"; //`127.0.0.1`;

async function fetchIsServerUp(serverBaseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverBaseUrl}index.html`, {
      mode: "no-cors",
    });
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function SlidevDebugHeader(props: {
  onStartServer: () => void;
  onStopServer: () => void;
  onOpenLog: () => void;
}) {
  return (
    <div class="sticky top-0 left-0 flex w-full items-center gap-3">
      <button
        type="button"
        onClick={() => {
          props.onStartServer();
        }}
      >
        Start
      </button>
      <button
        type="button"
        onClick={() => {
          props.onStopServer();
        }}
      >
        Stop
      </button>
      <button
        type="button"
        onClick={() => {
          props.onOpenLog();
        }}
      >
        Log
      </button>
    </div>
  );
}

function SlidevFallback(props: {
  commandLogMessages: Array<LogMessage>;
  slidevUrl: string;
  onStartServer: () => void;
  onShowLog: () => void;
}) {
  return (
    <div class="flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="text-xl text-red-400">Slidev server is down</div>
        <div>
          No server found at <a href={props.slidevUrl}>{props.slidevUrl}</a>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              props.onStartServer();
            }}
          >
            Start slidev server
          </button>
        </div>
        <CommandLog messages={props.commandLogMessages} />
      </div>
    </div>
  );
}

function SlidevPresentation(props: {
  title: string;
  onOpenSlideUrl: () => void;
  onOpenSlidevPresenterUrl: () => void;
  src: string;
  slidevStartCommand: string;
}) {
  return (
    <div class="flex h-full flex-col">
      <h4 class="flex items-center gap-2">
        <div class="flex-1">{props.title}</div>
        <div class="flex items-center gap-2">
          <RibbonButton
            label="Open presentation view"
            onClick={props.onOpenSlideUrl}
          >
            <MonitorPlayIcon />
          </RibbonButton>
          <RibbonButton
            label="Open presenter view"
            onClick={props.onOpenSlidevPresenterUrl}
          >
            <GanttChartSquareIcon />
          </RibbonButton>
          <RibbonButton
            label="Copy slidev start command to clipboard"
            onClick={() => {
              void navigator.clipboard.writeText(props.slidevStartCommand);
              void new Notice(
                `"${props.slidevStartCommand}" command copied to clipboard`,
              );
            }}
          >
            <ClipboardIcon />
          </RibbonButton>
        </div>
      </h4>

      <iframe
        // eslint-disable-next-line @eslint-react/dom/no-unsafe-iframe-sandbox
        sandbox="allow-scripts allow-same-origin"
        src={props.src}
        title="Slidev presentation"
        class="size-full"
        id="iframe"
      />
    </div>
  );
}

function killCommand() {
  if (command != null) {
    command.kill("SIGINT");
  }
}

export const PresentationView = () => {
  const app = useApp();
  const config = useSettings();
  const store = useContext(SlidevStoreContext);

  const [commandLogMessages, setCommandLogMessages] = createStore<
    Array<LogMessage>
  >([]);

  const serverBaseUrl = () =>
    `http://${localhost()}:${config.port.toFixed(0)}/`;

  const [isServerUp, { refetch }] = createResource(
    serverBaseUrl,
    fetchIsServerUp,
  );

  createEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.currentSlideNumber;
    void refetch();
  });

  const commandLogModal = new CommandLogModal(app, commandLogMessages);

  const iframeSrcUrl = () => {
    return `${serverBaseUrl()}${store.currentSlideNumber.toFixed(0)}?embedded=true`;
  };

  function addLogListeners(command: ChildProcessWithoutNullStreams) {
    command.on("disconnect", () => {
      setCommandLogMessages([...commandLogMessages, createError("disconnect")]);
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
      setCommandLogMessages([...commandLogMessages, createMessage(message)]);
    });

    command.on("exit", (code, signal) => {
      const errorMessage = `child process exited with code ${String(
        code,
      )} and signal ${String(signal)}`;

      setCommandLogMessages([...commandLogMessages, createError(errorMessage)]);
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

    // Arbitrary wait to the server to start
    setTimeout(() => {
      void refetch();
    }, 3000);

    process.on("exit", () => {
      killCommand();
    });
  }

  onMount(() => {
    startSlidevServer();
  });

  onCleanup(() => {
    killCommand();
  });

  function handleOpenLog() {
    commandLogModal.open();
  }

  function handleStopServer() {
    if (command != null) {
      command.kill();
      void refetch();
    }
  }

  function handleOpenSlideUrl() {
    window.open(
      `${serverBaseUrl()}${store.currentSlideNumber.toFixed(0)}`,
      "noopener=true,noreferrer=true",
    );
  }

  function handleOpenSlidePresenterUrl() {
    window.open(
      `${serverBaseUrl()}presenter/${store.currentSlideNumber.toFixed(0)}`,
      "noopener=true,noreferrer=true",
    );
  }

  const slidevStartCommand = () => {
    const activeFile = app.workspace.getActiveFile();
    if (activeFile == null) {
      return `No active file`;
    }
    return `npm run dev ${activeFile.path} -- --port ${config.port.toFixed(0)}`;
  };

  const title = () => {
    const activeFile = app.workspace.getActiveFile();
    const currentSlideFileName = activeFile == null ? "" : activeFile.basename;

    const slideNumber =
      store.currentSlideNumber === 0
        ? ""
        : ` #${store.currentSlideNumber.toFixed(0)}`;

    return `${currentSlideFileName}${slideNumber}`;
  };

  return (
    <Suspense
      fallback={
        <div class="flex h-full items-center justify-center">
          Loading slidev slides
        </div>
      }
    >
      <div class="flex h-full flex-col">
        <Show when={config.isDebug}>
          <SlidevDebugHeader
            onStartServer={startSlidevServer}
            onStopServer={handleStopServer}
            onOpenLog={handleOpenLog}
          />
        </Show>
        <Show
          when={isServerUp()}
          fallback={
            <SlidevFallback
              commandLogMessages={commandLogMessages}
              slidevUrl={serverBaseUrl()}
              onStartServer={startSlidevServer}
              onShowLog={handleOpenLog}
            />
          }
        >
          <SlidevPresentation
            title={title()}
            src={iframeSrcUrl()}
            slidevStartCommand={slidevStartCommand()}
            onOpenSlideUrl={handleOpenSlideUrl}
            onOpenSlidevPresenterUrl={handleOpenSlidePresenterUrl}
          />
        </Show>
      </div>
    </Suspense>
  );
};
