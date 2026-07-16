import type { ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import type { App, TFile, Vault } from "obsidian";
import { requestUrl } from "obsidian";
import {
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  untrack,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import type { PreparedSlidevLaunch } from "../launcher/slidevEntry";
import { prepareSlidevLaunch } from "../launcher/slidevEntry";
import type { SlidevLaunchSpec } from "../launcher/slidevLauncher";
import { diagnoseSlidevLaunch, spawnSlidev } from "../launcher/slidevLauncher";
import { terminateSlidevProcess } from "../launcher/slidevProcess";
import { getSlidevServerUrl, probeSlidevServer } from "../server/slidevServer";
import { getVaultPath } from "../utils/getVaultPath";
import { CommandLog } from "./CommandLog";
import { CommandLogModal } from "./CommandLogModal";
import { SlidevStoreContext } from "./SlidevStoreContext";
import { GanttChartSquareIcon } from "./icons/GanttChartSquareIcon";
import { MonitorPlayIcon } from "./icons/MonitorPlayIcon";
import { RibbonButton } from "./icons/RibbonButton";
import { useApp } from "./useApp";
import { useSettings } from "./useSettings";

const serverProbeIntervalMs = 500;
const serverProbeAttempts = 60;

type ServerState = "checking" | "running" | "starting" | "stopped";

interface ProbeTimer {
  id: ReturnType<Window["setTimeout"]>;
  owner: Window;
}

type LaunchPreparation =
  { ok: true; prepared: PreparedSlidevLaunch } | { ok: false; message: string };

export interface LogMessage {
  type: "error" | "message";
  value: string;
}

function createMessage(value: unknown): LogMessage {
  return { type: "message", value: String(value) };
}

function createError(value: string): LogMessage {
  return { type: "error", value };
}

function SlidevDebugHeader(props: {
  onStartServer: () => void;
  onStopServer: () => void;
  onOpenLog: () => void;
}) {
  return (
    <div class="slidev-debug-toolbar">
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
        View log
      </button>
    </div>
  );
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function resolveLocalVaultEntry(vault: Vault, vaultRelativePath: string) {
  try {
    const sourceRoot = getVaultPath(vault);
    return {
      entryPath: path.join(sourceRoot, vaultRelativePath),
      sourceRoot,
    };
  } catch {
    return null;
  }
}

function getActiveMarkdownFile(app: App): TFile | null {
  const activeFile = app.workspace.getActiveFile();
  return activeFile?.extension === "md" ? activeFile : null;
}

async function tryPrepareSlidevLaunch(
  spec: SlidevLaunchSpec,
  sourceRoot: string,
): Promise<LaunchPreparation> {
  try {
    return {
      ok: true,
      prepared: await prepareSlidevLaunch(spec, { sourceRoot }),
    };
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ".";
    return {
      ok: false,
      message: `Could not create a temporary Slidev entry in the configured project${detail}`,
    };
  }
}

function SlidevFallback(props: {
  commandLogMessages: Array<LogMessage>;
  slidevUrl: string;
  activeFilePath: string | null;
  diagnostic: string | null;
  isStarting: boolean;
  onStartServer: () => void;
  onRefetch: () => void;
  onShowLog: () => void;
}) {
  return (
    <div class="slidev-view-state">
      <Show
        when={props.activeFilePath != null}
        fallback={
          <div class="slidev-stack slidev-stack--centered">
            <div class="slidev-status-title">No active Markdown file</div>
            <p>Open a Markdown file, then try again.</p>
          </div>
        }
      >
        <div class="slidev-stack slidev-stack--centered">
          <div class="slidev-status-title">
            {props.isStarting
              ? "Starting the Slidev server…"
              : "Slidev server is not running"}
          </div>
          <p>
            No server is reachable at{" "}
            <a href={props.slidevUrl}>{props.slidevUrl}</a>
          </p>
          <Show when={props.diagnostic != null}>
            <p class="slidev-diagnostic">{props.diagnostic}</p>
          </Show>
          <div class="slidev-actions">
            <button
              type="button"
              onClick={() => {
                props.onRefetch();
              }}
            >
              Check again
            </button>
            <button
              type="button"
              class="mod-cta"
              disabled={props.isStarting}
              onClick={() => {
                props.onStartServer();
              }}
            >
              Start Slidev server
            </button>
            <Show when={props.commandLogMessages.length > 0}>
              <button
                type="button"
                onClick={() => {
                  props.onShowLog();
                }}
              >
                View log
              </button>
            </Show>
          </div>
          <Show when={props.commandLogMessages.length > 0}>
            <CommandLog messages={props.commandLogMessages} />
          </Show>
        </div>
      </Show>
    </div>
  );
}

function SlidevPresentation(props: {
  title: string;
  onOpenSlideUrl: () => void;
  onOpenSlidevPresenterUrl: () => void;
  src: string;
}) {
  return (
    <div class="slidev-presentation">
      <div class="slidev-presentation-header">
        <h4>{props.title}</h4>
        <div class="slidev-presentation-actions">
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
        </div>
      </div>

      <iframe
        // eslint-disable-next-line @eslint-react/dom-no-unsafe-iframe-sandbox -- Slidev requires same-origin script access inside its sandboxed presentation frame.
        sandbox="allow-scripts allow-same-origin"
        src={props.src}
        title="Slidev presentation"
        class="slidev-presentation-frame"
      />
    </div>
  );
}

export const PresentationView = () => {
  const app = useApp();
  const config = useSettings();
  const store = useContext(SlidevStoreContext);

  const [commandLogMessages, setCommandLogMessages] = createStore<
    Array<LogMessage>
  >([]);
  const [activeFilePath, setActiveFilePath] = createSignal<string | null>(
    app.workspace.getActiveFile()?.path ?? null,
  );
  const [diagnostic, setDiagnostic] = createSignal<string | null>(null);
  const [serverState, setServerState] = createSignal<ServerState>("checking");

  let childProcess: ChildProcessWithoutNullStreams | null = null;
  let launchArtifactCleanup: (() => Promise<void>) | null = null;
  let stoppingProcess: Promise<void> | null = null;
  let disposed = false;
  let generation = 0;
  let logIndex = 0;
  let probeTimer: ProbeTimer | null = null;

  const commandLogModal = new CommandLogModal(app, commandLogMessages);
  const serverBaseUrl = () => getSlidevServerUrl(config.port);

  function appendLog(message: LogMessage) {
    setCommandLogMessages(logIndex, message);
    logIndex += 1;
  }

  function clearProbeTimer() {
    if (probeTimer != null) {
      probeTimer.owner.clearTimeout(probeTimer.id);
      probeTimer = null;
    }
  }

  function takeLaunchArtifactCleanup() {
    const cleanupLaunchArtifact = launchArtifactCleanup;
    launchArtifactCleanup = null;
    return cleanupLaunchArtifact;
  }

  async function runLaunchArtifactCleanup(
    cleanupLaunchArtifact: (() => Promise<void>) | null,
  ) {
    if (cleanupLaunchArtifact == null) {
      return;
    }
    try {
      await cleanupLaunchArtifact();
    } catch (error) {
      if (!disposed) {
        appendLog(
          createError(
            error instanceof Error
              ? error.message
              : "Could not remove the temporary Slidev files.",
          ),
        );
      }
    }
  }

  async function stopOwnedProcess() {
    clearProbeTimer();
    const processToStop = childProcess;
    const cleanupLaunchArtifact = takeLaunchArtifactCleanup();
    childProcess = null;
    if (processToStop != null) {
      const waitingForExit = terminateSlidevProcess(processToStop);
      stoppingProcess = waitingForExit;
      await waitingForExit;
      if (stoppingProcess === waitingForExit) {
        stoppingProcess = null;
      }
    } else if (stoppingProcess != null) {
      await stoppingProcess;
    }

    await runLaunchArtifactCleanup(cleanupLaunchArtifact);
  }

  async function isServerRunning() {
    return await probeSlidevServer(
      config.port,
      async (options) => await requestUrl(options),
    );
  }

  function isCurrentGeneration(currentGeneration: number) {
    return !disposed && currentGeneration === generation;
  }

  async function canContinueAfterRestart(
    restartOwnedProcess: boolean,
    currentGeneration: number,
  ) {
    if (!restartOwnedProcess) {
      return true;
    }
    await stopOwnedProcess();
    return isCurrentGeneration(currentGeneration);
  }

  function setServerStateIfCurrent(
    currentGeneration: number,
    state: ServerState,
  ) {
    if (isCurrentGeneration(currentGeneration)) {
      setServerState(state);
    }
  }

  async function pollForServer(currentGeneration: number, attempt: number) {
    if (!isCurrentGeneration(currentGeneration)) {
      return;
    }

    if (await isServerRunning()) {
      if (isCurrentGeneration(currentGeneration)) {
        setDiagnostic(null);
        setServerState("running");
      }
      return;
    }

    if (!isCurrentGeneration(currentGeneration)) {
      return;
    }

    if (childProcess == null) {
      setDiagnostic("Slidev exited before its server became reachable.");
      setServerState("stopped");
      return;
    }

    if (attempt >= serverProbeAttempts) {
      setDiagnostic(
        "Slidev started, but its server did not become reachable within 30 seconds. Check the process log for details.",
      );
      setServerState("stopped");
      return;
    }

    const owner = window.activeWindow;
    const id = owner.setTimeout(() => {
      void pollForServer(currentGeneration, attempt + 1);
    }, serverProbeIntervalMs);
    probeTimer = { id, owner };
  }

  async function finishClosedProcess(
    cleanupLaunchArtifact: (() => Promise<void>) | null,
    currentGeneration: number,
  ) {
    await runLaunchArtifactCleanup(cleanupLaunchArtifact);
    await pollForServer(currentGeneration, serverProbeAttempts);
  }

  function addProcessListeners(
    processToObserve: ChildProcessWithoutNullStreams,
    currentGeneration: number,
  ) {
    processToObserve.on("error", (error) => {
      untrack(() => {
        appendLog(createError(error.message));
        if (childProcess === processToObserve) {
          childProcess = null;
          clearProbeTimer();
          void runLaunchArtifactCleanup(takeLaunchArtifactCleanup());
          setDiagnostic(error.message);
          setServerState("stopped");
        }
      });
    });

    processToObserve.on("close", (code, signal) => {
      untrack(() => {
        const detail = `Slidev exited with code ${String(code)} and signal ${String(signal)}.`;
        const exitedUnexpectedly =
          code !== 0 && childProcess === processToObserve;
        appendLog(
          exitedUnexpectedly ? createError(detail) : createMessage(detail),
        );

        if (childProcess === processToObserve) {
          childProcess = null;
          clearProbeTimer();
          void finishClosedProcess(
            takeLaunchArtifactCleanup(),
            currentGeneration,
          );
        }
      });
    });

    processToObserve.stdout.on("data", (data: unknown) => {
      untrack(() => {
        appendLog(createMessage(data));
      });
    });
    processToObserve.stderr.on("data", (data: unknown) => {
      untrack(() => {
        appendLog(createError(String(data)));
      });
    });
  }

  async function ensureServer(restartOwnedProcess = false) {
    const currentGeneration = ++generation;
    clearProbeTimer();
    if (
      !(await canContinueAfterRestart(restartOwnedProcess, currentGeneration))
    ) {
      return;
    }

    const activeMarkdownFile = getActiveMarkdownFile(app);
    setActiveFilePath(activeMarkdownFile?.path ?? null);
    setDiagnostic(null);
    setServerState("checking");

    if (await isServerRunning()) {
      setServerStateIfCurrent(currentGeneration, "running");
      return;
    }

    if (!isCurrentGeneration(currentGeneration)) {
      return;
    }

    if (activeMarkdownFile == null) {
      setDiagnostic("Open a Markdown file before starting Slidev.");
      setServerState("stopped");
      return;
    }

    const localEntry = resolveLocalVaultEntry(
      app.vault,
      activeMarkdownFile.path,
    );
    if (localEntry == null) {
      setDiagnostic("Slidev requires a vault stored on the local file system.");
      setServerState("stopped");
      return;
    }

    const diagnosis = await diagnoseSlidevLaunch({
      projectPath: config.slidevTemplateLocation,
      entryPath: localEntry.entryPath,
      nodeExecutable: config.nodeExecutable,
      port: config.port,
    });

    if (!isCurrentGeneration(currentGeneration)) {
      return;
    }

    if (!diagnosis.ok) {
      setDiagnostic(diagnosis.message);
      setServerState("stopped");
      return;
    }

    const launchPreparation = await tryPrepareSlidevLaunch(
      diagnosis.spec,
      localEntry.sourceRoot,
    );
    if (!launchPreparation.ok) {
      appendLog(createError(launchPreparation.message));
      setDiagnostic(launchPreparation.message);
      setServerState("stopped");
      return;
    }
    const { prepared: preparedLaunch } = launchPreparation;

    if (!isCurrentGeneration(currentGeneration)) {
      await preparedLaunch.cleanup();
      return;
    }

    launchArtifactCleanup = async () => {
      await preparedLaunch.cleanup();
    };
    appendLog(
      createMessage(
        `Starting the project-local Slidev CLI with ${preparedLaunch.spec.nodeVersion}.`,
      ),
    );

    try {
      const startedProcess = spawnSlidev(preparedLaunch.spec);
      childProcess = startedProcess;
      addProcessListeners(startedProcess, currentGeneration);
      setServerState("starting");
      void pollForServer(currentGeneration, 0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The Slidev process could not be started.";
      appendLog(createError(message));
      setDiagnostic(message);
      setServerState("stopped");
      await runLaunchArtifactCleanup(takeLaunchArtifactCleanup());
    }
  }

  async function refreshServerStatus() {
    const currentGeneration = generation;
    const isRunning = await isServerRunning();
    if (!isCurrentGeneration(currentGeneration)) {
      return;
    }
    if (isRunning) {
      setServerState("running");
      return;
    }
    if (childProcess == null) {
      setServerState("stopped");
    }
  }

  function handleStopServer() {
    generation += 1;
    void stopOwnedProcess();
    setDiagnostic("The Slidev process started by this view was stopped.");
    setServerState("stopped");
  }

  const iframeSrcUrl = () =>
    `${serverBaseUrl()}${store.currentSlideNumber.toFixed(0)}?embedded=true`;

  const title = () => {
    const currentActiveFilePath = activeFilePath();
    const currentSlideFileName =
      currentActiveFilePath == null
        ? "Slidev presentation"
        : (app.workspace.getActiveFile()?.basename ??
          path.basename(
            currentActiveFilePath,
            path.extname(currentActiveFilePath),
          ));
    return `${currentSlideFileName} #${store.currentSlideNumber.toFixed(0)}`;
  };

  createEffect(
    on(
      () => [config.port, config.nodeExecutable, config.slidevTemplateLocation],
      () => {
        void ensureServer(true);
      },
      { defer: true },
    ),
  );

  onMount(() => {
    const fileOpenEvent = app.workspace.on("file-open", () => {
      untrack(() => {
        void ensureServer(true);
      });
    });
    void ensureServer();

    onCleanup(() => {
      app.workspace.offref(fileOpenEvent);
    });
  });

  onCleanup(() => {
    disposed = true;
    generation += 1;
    void stopOwnedProcess();
    commandLogModal.close();
  });

  return (
    <div class="slidev-view">
      <Show when={config.isDebug}>
        <SlidevDebugHeader
          onStartServer={() => {
            void ensureServer(true);
          }}
          onStopServer={handleStopServer}
          onOpenLog={() => {
            commandLogModal.open();
          }}
        />
      </Show>
      <Show
        when={serverState() === "running"}
        fallback={
          <SlidevFallback
            activeFilePath={activeFilePath()}
            commandLogMessages={commandLogMessages}
            diagnostic={diagnostic()}
            isStarting={
              serverState() === "checking" || serverState() === "starting"
            }
            slidevUrl={serverBaseUrl()}
            onStartServer={() => {
              void ensureServer(true);
            }}
            onRefetch={() => {
              void refreshServerStatus();
            }}
            onShowLog={() => {
              commandLogModal.open();
            }}
          />
        }
      >
        <SlidevPresentation
          title={title()}
          src={iframeSrcUrl()}
          onOpenSlideUrl={() => {
            openExternal(
              `${serverBaseUrl()}${store.currentSlideNumber.toFixed(0)}`,
            );
          }}
          onOpenSlidevPresenterUrl={() => {
            openExternal(
              `${serverBaseUrl()}presenter/${store.currentSlideNumber.toFixed(0)}`,
            );
          }}
        />
      </Show>
    </div>
  );
};
