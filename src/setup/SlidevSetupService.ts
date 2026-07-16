import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  diagnoseNodeRuntime,
  diagnoseSlidevProject,
} from "../launcher/slidevLauncher";
import { terminateSlidevProcess } from "../launcher/slidevProcess";
import { findNpmCli } from "./npmCli";
import {
  createStarterProjectManifest,
  isStarterProjectManifest,
} from "./starterProject";

export type SlidevSetupStage =
  | "idle"
  | "checking-runtime"
  | "creating-project"
  | "installing-dependencies"
  | "verifying-project"
  | "ready";

export type SlidevSetupErrorCode =
  | "missing-node"
  | "invalid-node"
  | "missing-npm"
  | "project-collision"
  | "filesystem-error"
  | "install-failed"
  | "verification-failed"
  | "cancelled";

export interface SlidevSetupLogMessage {
  type: "error" | "message";
  value: string;
}

export interface SlidevSetupState {
  errorCode?: SlidevSetupErrorCode;
  logs: Array<SlidevSetupLogMessage>;
  message: string;
  stage: SlidevSetupStage;
  status: "idle" | "running" | "success" | "error";
}

export interface SlidevSetupInput {
  nodeExecutable?: string;
  vaultRoot: string;
}

export type SlidevSetupResult =
  | { ok: true; projectPath: string }
  | { ok: false; code: SlidevSetupErrorCode; message: string };

interface InstallerSpawnOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  stdio: "pipe";
  windowsHide: true;
}

type SpawnInstaller = (
  executable: string,
  args: Array<string>,
  options: InstallerSpawnOptions,
) => ChildProcessWithoutNullStreams;

interface SlidevSetupDependencies {
  diagnoseNodeRuntime: typeof diagnoseNodeRuntime;
  diagnoseSlidevProject: typeof diagnoseSlidevProject;
  findNpmCli: typeof findNpmCli;
  spawnInstaller: SpawnInstaller;
}

const defaultDependencies: SlidevSetupDependencies = {
  diagnoseNodeRuntime,
  diagnoseSlidevProject,
  findNpmCli,
  spawnInstaller: (executable, args, options) =>
    spawn(executable, args, options),
};

const initialState: SlidevSetupState = {
  logs: [],
  message: "Slidev is not configured.",
  stage: "idle",
  status: "idle",
};

export class SlidevSetupService {
  private activeSetup: Promise<SlidevSetupResult> | null = null;
  private cancelRequested = false;
  private readonly dependencies: SlidevSetupDependencies;
  private installerProcess: ChildProcessWithoutNullStreams | null = null;
  private readonly listeners = new Set<(state: SlidevSetupState) => void>();
  private state: SlidevSetupState = initialState;

  constructor(dependencies: Partial<SlidevSetupDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  getState(): SlidevSetupState {
    return { ...this.state, logs: [...this.state.logs] };
  }

  subscribe(listener: (state: SlidevSetupState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setup(input: SlidevSetupInput): Promise<SlidevSetupResult> {
    if (this.activeSetup != null) {
      return this.activeSetup;
    }

    this.cancelRequested = false;
    this.setState({ ...initialState, logs: [] });
    const setup = this.runSetup(input);
    this.activeSetup = setup;
    void setup.finally(() => {
      if (this.activeSetup === setup) {
        this.activeSetup = null;
      }
    });
    return setup;
  }

  async cancel(): Promise<void> {
    this.cancelRequested = true;
    const { installerProcess } = this;
    if (installerProcess != null) {
      await terminateSlidevProcess(installerProcess);
    }
  }

  private async runSetup(input: SlidevSetupInput): Promise<SlidevSetupResult> {
    try {
      this.setRunning("checking-runtime", "Checking Node.js and npm…");
      const runtime = await this.dependencies.diagnoseNodeRuntime(
        input.nodeExecutable == null
          ? {}
          : { nodeExecutable: input.nodeExecutable },
      );
      if (!runtime.ok) {
        return this.fail(runtime.code, runtime.message);
      }
      if (this.cancelRequested) {
        return this.cancelled();
      }

      const npm = await this.dependencies.findNpmCli(
        runtime.runtime.nodeExecutable,
      );
      if (!npm.ok) {
        return this.fail(npm.code, npm.message);
      }
      if (this.cancelRequested) {
        return this.cancelled();
      }

      this.setRunning("creating-project", "Creating the starter project…");
      const projectPath = path.join(path.resolve(input.vaultRoot), ".slidev");
      const preparedProject = await prepareProject(projectPath);
      if (!preparedProject.ok) {
        return this.fail(preparedProject.code, preparedProject.message);
      }
      if (this.cancelRequested) {
        return this.cancelled();
      }

      this.setRunning(
        "installing-dependencies",
        "Installing Slidev dependencies…",
      );
      const child = this.dependencies.spawnInstaller(
        runtime.runtime.nodeExecutable,
        [npm.npmCliPath, "install", "--no-audit", "--no-fund"],
        {
          cwd: projectPath,
          env: process.env,
          shell: false,
          stdio: "pipe",
          windowsHide: true,
        },
      );
      this.installerProcess = child;
      const installResult = await waitForInstaller(child, (message) => {
        this.appendLog(message);
      });
      if (this.installerProcess === child) {
        this.installerProcess = null;
      }
      if (this.cancelRequested) {
        return this.cancelled();
      }
      if (!installResult.ok) {
        return this.fail("install-failed", installResult.message);
      }

      this.setRunning("verifying-project", "Verifying the Slidev project…");
      const diagnosis = await this.dependencies.diagnoseSlidevProject({
        nodeExecutable: runtime.runtime.nodeExecutable,
        projectPath,
      });
      if (!diagnosis.ok) {
        return this.fail("verification-failed", diagnosis.message);
      }
      if (this.cancelRequested) {
        return this.cancelled();
      }

      this.setState({
        ...this.state,
        message: "Slidev is ready.",
        stage: "ready",
        status: "success",
      });
      return { ok: true, projectPath: diagnosis.project.projectPath };
    } catch (error) {
      const message =
        error instanceof Error
          ? `Could not set up the Slidev project: ${error.message}`
          : "Could not set up the Slidev project.";
      return this.fail("filesystem-error", message);
    }
  }

  private appendLog(message: SlidevSetupLogMessage) {
    this.setState({ ...this.state, logs: [...this.state.logs, message] });
  }

  private cancelled(): SlidevSetupResult {
    return this.fail("cancelled", "Slidev quick setup was cancelled.");
  }

  private fail(code: SlidevSetupErrorCode, message: string): SlidevSetupResult {
    this.setState({
      ...this.state,
      errorCode: code,
      message,
      status: "error",
    });
    return { ok: false, code, message };
  }

  private setRunning(stage: SlidevSetupStage, message: string) {
    this.setState({ ...this.state, message, stage, status: "running" });
  }

  private setState(state: SlidevSetupState) {
    this.state = state;
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }
}

type ProjectPreparation =
  | { ok: true }
  | {
      ok: false;
      code: "project-collision";
      message: string;
    };

async function prepareProject(
  projectPath: string,
): Promise<ProjectPreparation> {
  let projectStats;
  try {
    projectStats = await lstat(projectPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      await mkdir(projectPath);
      await writeFile(
        path.join(projectPath, "package.json"),
        `${JSON.stringify(createStarterProjectManifest(), null, 2)}\n`,
        { encoding: "utf8", flag: "wx" },
      );
      return { ok: true };
    }
    throw error;
  }

  if (projectStats.isSymbolicLink() || !projectStats.isDirectory()) {
    return projectCollision();
  }

  const packagePath = path.join(projectPath, "package.json");
  try {
    const packageStats = await lstat(packagePath);
    if (packageStats.isSymbolicLink() || !packageStats.isFile()) {
      return projectCollision();
    }
    const manifest: unknown = JSON.parse(await readFile(packagePath, "utf8"));
    return isStarterProjectManifest(manifest)
      ? { ok: true }
      : projectCollision();
  } catch {
    return projectCollision();
  }
}

function projectCollision(): ProjectPreparation {
  return {
    ok: false,
    code: "project-collision",
    message:
      "The vault already contains a .slidev folder that quick setup cannot safely modify. Configure that project manually or move the folder.",
  };
}

function waitForInstaller(
  child: ChildProcessWithoutNullStreams,
  onLog: (message: SlidevSetupLogMessage) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { ok: true } | { ok: false; message: string }) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    child.stdout.on("data", (data: unknown) => {
      onLog({ type: "message", value: String(data) });
    });
    child.stderr.on("data", (data: unknown) => {
      onLog({ type: "error", value: String(data) });
    });
    child.once("error", (error) => {
      finish({
        ok: false,
        message: `npm could not be started: ${error.message}`,
      });
    });
    child.once("close", (code, signal) => {
      if (code === 0) {
        finish({ ok: true });
        return;
      }
      finish({
        ok: false,
        message: `npm install exited with code ${String(code)} and signal ${String(signal)}.`,
      });
    });
  });
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
