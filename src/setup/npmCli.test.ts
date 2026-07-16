import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findNpmCli, getNpmCliCandidates } from "./npmCli";

describe("getNpmCliCandidates", () => {
  it("uses the standard POSIX layout relative to Node.js", () => {
    expect(
      getNpmCliCandidates("/opt/node versions/v24/bin/node", "linux"),
    ).toContain("/opt/node versions/v24/lib/node_modules/npm/bin/npm-cli.js");
  });

  it("uses the standard Windows layout without parsing metacharacters", () => {
    expect(
      getNpmCliCandidates(
        String.raw`C:\Program Files & tools\nodejs\node.exe`,
        "win32",
      ),
    ).toContain(
      String.raw`C:\Program Files & tools\nodejs\node_modules\npm\bin\npm-cli.js`,
    );
  });
});

describe("findNpmCli", () => {
  let testRoot = "";

  afterEach(async () => {
    if (testRoot.length > 0) {
      await rm(testRoot, { force: true, recursive: true });
    }
  });

  it("resolves an installed npm JavaScript CLI", async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "obsidian-slidev-npm-"));
    const nodePath = path.join(testRoot, "bin", "node");
    const npmCliPath = path.join(
      testRoot,
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );
    await mkdir(path.dirname(npmCliPath), { recursive: true });
    await mkdir(path.dirname(nodePath), { recursive: true });
    await writeFile(nodePath, "node");
    await writeFile(npmCliPath, "// npm");

    await expect(findNpmCli(nodePath)).resolves.toEqual({
      ok: true,
      npmCliPath: await realpath(npmCliPath),
    });
  });

  it("returns a typed failure when npm is not installed", async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "obsidian-slidev-npm-"));
    const nodePath = path.join(testRoot, "bin", "node");
    await mkdir(path.dirname(nodePath), { recursive: true });
    await writeFile(nodePath, "node");

    await expect(findNpmCli(nodePath)).resolves.toMatchObject({
      ok: false,
      code: "missing-npm",
    });
  });
});
