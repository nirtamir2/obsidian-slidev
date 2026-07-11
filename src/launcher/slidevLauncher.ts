import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { execFile, spawn } from "node:child_process";
import { readFile, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const nodeProbeTimeoutMs = 5000;

export type SlidevLaunchErrorCode =
  | "invalid-port"
  | "missing-project"
  | "missing-entry"
  | "missing-slidev-package"
  | "invalid-slidev-package"
  | "invalid-slidev-bin"
  | "missing-node"
  | "invalid-node";

export interface SlidevLaunchInput {
  projectPath: string;
  entryPath: string;
  port: number;
  nodeExecutable?: string;
}

export interface SlidevLaunchSpec {
  executable: string;
  args: Array<string>;
  cwd: string;
  cliPath: string;
  nodeVersion: string;
}

export type SlidevLaunchDiagnosis =
  | { ok: true; spec: SlidevLaunchSpec }
  | {
      ok: false;
      code: SlidevLaunchErrorCode;
      message: string;
    };

interface SlidevPackageJson {
  name?: unknown;
  bin?: unknown;
}

interface SlidevLauncherDependencies {
  env: NodeJS.ProcessEnv;
  probeNode(executable: string): Promise<string>;
}

interface SlidevSpawnOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  stdio: "pipe";
  windowsHide: true;
}

export type SpawnSlidevImplementation = (
  executable: string,
  args: Array<string>,
  options: SlidevSpawnOptions,
) => ChildProcessWithoutNullStreams;

const defaultDependencies: SlidevLauncherDependencies = {
  env: process.env,
  async probeNode(executable) {
    const { stdout } = await execFileAsync(executable, ["--version"], {
      encoding: "utf8",
      timeout: nodeProbeTimeoutMs,
      windowsHide: true,
    });
    const version = stdout.trim();
    if (!/^v\d+\.\d+\.\d+/.test(version)) {
      throw new Error("Unexpected Node.js version output");
    }
    return version;
  },
};

const defaultSpawn: SpawnSlidevImplementation = (executable, args, options) =>
  spawn(executable, args, options);

export async function diagnoseSlidevLaunch(
  input: SlidevLaunchInput,
  dependencies: Partial<SlidevLauncherDependencies> = {},
): Promise<SlidevLaunchDiagnosis> {
  const deps = { ...defaultDependencies, ...dependencies };

  if (!isPort(input.port)) {
    return failure(
      "invalid-port",
      "Port must be an integer between 1 and 65535.",
    );
  }

  const configuredProjectPath = input.projectPath.trim();
  if (configuredProjectPath.length === 0) {
    return failure(
      "missing-project",
      "Choose an existing Slidev project folder.",
    );
  }

  const projectPath = path.resolve(configuredProjectPath);
  if (!(await isDirectory(projectPath))) {
    return failure(
      "missing-project",
      "Choose an existing Slidev project folder.",
    );
  }

  const entryPath = path.resolve(input.entryPath);
  if (!(await isFile(entryPath))) {
    return failure(
      "missing-entry",
      "Open an existing Markdown file before starting Slidev.",
    );
  }

  const packagePath = path.join(projectPath, "node_modules", "@slidev", "cli");
  const packageJsonPath = path.join(packagePath, "package.json");

  let packageJson: SlidevPackageJson;
  try {
    packageJson = JSON.parse(
      await readFile(packageJsonPath, "utf8"),
    ) as SlidevPackageJson;
  } catch (error) {
    if (isMissingFileError(error)) {
      return failure(
        "missing-slidev-package",
        "Install @slidev/cli in the configured Slidev project.",
      );
    }
    return failure(
      "invalid-slidev-package",
      "The local @slidev/cli package metadata is invalid.",
    );
  }

  if (packageJson.name !== "@slidev/cli") {
    return failure(
      "invalid-slidev-package",
      "The local Slidev package metadata has an unexpected name.",
    );
  }

  const binPath = getSlidevBinPath(packageJson.bin);
  if (binPath == null) {
    return failure(
      "invalid-slidev-package",
      "The local @slidev/cli package does not declare its slidev executable.",
    );
  }

  const cliPath = path.resolve(packagePath, binPath);
  if (!isPathInside(packagePath, cliPath) || !(await isFile(cliPath))) {
    return failure(
      "invalid-slidev-bin",
      "The local Slidev executable is missing or invalid.",
    );
  }

  try {
    const realPackagePath = await realpath(packagePath);
    const realCliPath = await realpath(cliPath);
    if (!isPathInside(realPackagePath, realCliPath)) {
      return failure(
        "invalid-slidev-bin",
        "The local Slidev executable resolves outside its package.",
      );
    }
  } catch {
    return failure(
      "invalid-slidev-bin",
      "The local Slidev executable cannot be resolved.",
    );
  }

  const nodeExecutable = await resolveNodeExecutable(
    input.nodeExecutable,
    deps.env,
  );
  if (nodeExecutable == null) {
    return failure(
      "missing-node",
      "Node.js was not found. Configure its executable path in Slidev settings.",
    );
  }

  let nodeVersion: string;
  try {
    nodeVersion = await deps.probeNode(nodeExecutable);
  } catch {
    return failure(
      "invalid-node",
      "The configured Node.js executable could not be started.",
    );
  }

  return {
    ok: true,
    spec: {
      executable: nodeExecutable,
      args: [cliPath, entryPath, "--port", String(input.port)],
      cwd: projectPath,
      cliPath,
      nodeVersion,
    },
  };
}

export function spawnSlidev(
  spec: SlidevLaunchSpec,
  spawnImplementation: SpawnSlidevImplementation = defaultSpawn,
): ChildProcessWithoutNullStreams {
  return spawnImplementation(spec.executable, spec.args, {
    cwd: spec.cwd,
    env: process.env,
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });
}

function failure(
  code: SlidevLaunchErrorCode,
  message: string,
): SlidevLaunchDiagnosis {
  return { ok: false, code, message };
}

function getSlidevBinPath(bin: unknown): string | null {
  if (typeof bin === "string") {
    return bin;
  }
  if (isRecord(bin) && typeof bin["slidev"] === "string") {
    return bin["slidev"];
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function isPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65_535;
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function resolveNodeExecutable(
  configuredExecutable: string | undefined,
  env: NodeJS.ProcessEnv,
): Promise<string | null> {
  const configured = configuredExecutable?.trim();
  if (configured != null && configured.length > 0) {
    const expandedPath = expandHome(configured);
    if (path.isAbsolute(expandedPath) || hasPathSeparator(expandedPath)) {
      const absolutePath = path.resolve(expandedPath);
      return (await isFile(absolutePath)) ? absolutePath : null;
    }
    return findOnPath(expandedPath, env);
  }
  return findOnPath("node", env);
}

async function findOnPath(
  executableName: string,
  env: NodeJS.ProcessEnv,
): Promise<string | null> {
  const pathValue = env["PATH"] ?? env["Path"] ?? env["path"];
  if (pathValue == null || pathValue.length === 0) {
    return null;
  }

  const extensions = getExecutableExtensions(env["PATHEXT"]);
  for (const directoryEntry of pathValue.split(path.delimiter)) {
    const directory = stripSurroundingQuotes(directoryEntry.trim());
    if (directory.length === 0) {
      continue;
    }
    for (const extension of extensions) {
      const candidate = path.join(directory, `${executableName}${extension}`);
      if (await isFile(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function getExecutableExtensions(pathExt: string | undefined): Array<string> {
  if (pathExt == null || pathExt.length === 0) {
    return ["", ".exe"];
  }
  return [
    "",
    ...pathExt
      .split(";")
      .filter((extension) => extension.length > 0)
      .map((extension) => extension.toLowerCase()),
  ];
}

function expandHome(filePath: string): string {
  if (filePath === "~") {
    return homedir();
  }
  if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
    return path.join(homedir(), filePath.slice(2));
  }
  return filePath;
}

function hasPathSeparator(value: string): boolean {
  return value.includes("/") || value.includes("\\");
}

function stripSurroundingQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function isMissingFileError(error: unknown): boolean {
  return (
    isRecord(error) &&
    "code" in error &&
    (error["code"] === "ENOENT" || error["code"] === "ENOTDIR")
  );
}
