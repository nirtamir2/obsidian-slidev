import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export type NpmCliDiagnosis =
  | { ok: true; npmCliPath: string }
  | { ok: false; code: "missing-npm"; message: string };

export function getNpmCliCandidates(
  nodeExecutable: string,
  platform: NodeJS.Platform = process.platform,
): Array<string> {
  const pathImplementation = platform === "win32" ? path.win32 : path.posix;
  const nodeDirectory = pathImplementation.dirname(nodeExecutable);
  return [
    pathImplementation.join(
      nodeDirectory,
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
    pathImplementation.join(
      nodeDirectory,
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ];
}

export async function findNpmCli(
  nodeExecutable: string,
): Promise<NpmCliDiagnosis> {
  let resolvedNodeExecutable = nodeExecutable;
  try {
    resolvedNodeExecutable = await realpath(nodeExecutable);
  } catch {
    // Node.js was already probed. Keep its reported path for a useful npm error.
  }

  for (const candidate of getNpmCliCandidates(resolvedNodeExecutable)) {
    if (await isFile(candidate)) {
      return { ok: true, npmCliPath: candidate };
    }
  }

  return {
    ok: false,
    code: "missing-npm",
    message:
      "npm was not found alongside Node.js. Install npm or configure an existing Slidev project manually.",
  };
}

async function isFile(filePath: string) {
  try {
    const fileStats = await stat(filePath);
    return fileStats.isFile();
  } catch {
    return false;
  }
}
