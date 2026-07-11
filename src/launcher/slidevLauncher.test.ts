import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type SlidevLaunchInput,
  type SlidevLaunchSpec,
  diagnoseSlidevLaunch,
  spawnSlidev,
} from "./slidevLauncher";

const validPort = 3030;

describe("diagnoseSlidevLaunch", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "obsidian-slidev-launcher-"));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(testRoot, { force: true, recursive: true });
  });

  it("requires a project-local Slidev package even when slidev is on PATH", async () => {
    const projectPath = path.join(testRoot, "project");
    const entryPath = path.join(testRoot, "slides.md");
    const globalBinPath = path.join(testRoot, "global-bin");
    const globalSlidevPath = path.join(
      globalBinPath,
      process.platform === "win32" ? "slidev.cmd" : "slidev",
    );

    await mkdir(projectPath, { recursive: true });
    await mkdir(globalBinPath, { recursive: true });
    await writeFile(entryPath, "# Slides\n");
    await writeFile(
      globalSlidevPath,
      process.platform === "win32" ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n",
    );
    if (process.platform !== "win32") {
      await chmod(globalSlidevPath, 0o755);
    }
    vi.stubEnv("PATH", globalBinPath);

    const diagnosis = await diagnoseSlidevLaunch({
      projectPath,
      entryPath,
      nodeExecutable: process.execPath,
      port: validPort,
    });

    expect(diagnosis).toMatchObject({
      ok: false,
      code: "missing-slidev-package",
    });
  });

  it("resolves the slidev bin declared by the local package", async () => {
    const fixture = await createValidFixture(testRoot);

    const diagnosis = await diagnoseSlidevLaunch(fixture.input);

    expect(diagnosis).toEqual({
      ok: true,
      spec: {
        executable: process.execPath,
        args: [fixture.cliPath, fixture.entryPath, "--port", String(validPort)],
        cwd: fixture.projectPath,
        cliPath: fixture.cliPath,
        nodeVersion: process.version,
      },
    });
  });

  it("rejects a package bin that escapes the installed package directory", async () => {
    const projectPath = path.join(testRoot, "project");
    const entryPath = path.join(testRoot, "slides.md");
    const packagePath = path.join(
      projectPath,
      "node_modules",
      "@slidev",
      "cli",
    );
    const escapedBinPath = path.join(projectPath, "outside-slidev.mjs");

    await mkdir(packagePath, { recursive: true });
    await writeFile(entryPath, "# Slides\n");
    await writeFile(escapedBinPath, "// must not be launched\n");
    await writeFile(
      path.join(packagePath, "package.json"),
      JSON.stringify({
        name: "@slidev/cli",
        bin: { slidev: "../../../../outside-slidev.mjs" },
      }),
    );

    const diagnosis = await diagnoseSlidevLaunch({
      projectPath,
      entryPath,
      nodeExecutable: process.execPath,
      port: validPort,
    });

    expect(diagnosis).toMatchObject({ ok: false, code: "invalid-slidev-bin" });
  });

  it.each([
    { name: "zero", port: 0 },
    { name: "a negative number", port: -1 },
    { name: "a fraction", port: 3030.5 },
    { name: "the first value above the TCP range", port: 65_536 },
    { name: "NaN", port: Number.NaN },
  ])("reports invalid-port for $name", async ({ port }) => {
    const fixture = await createValidFixture(testRoot);

    const diagnosis = await diagnoseSlidevLaunch({ ...fixture.input, port });

    expect(diagnosis).toMatchObject({ ok: false, code: "invalid-port" });
  });

  it("reports missing-project separately", async () => {
    const entryPath = path.join(testRoot, "slides.md");
    await writeFile(entryPath, "# Slides\n");

    const diagnosis = await diagnoseSlidevLaunch({
      projectPath: path.join(testRoot, "missing-project"),
      entryPath,
      nodeExecutable: process.execPath,
      port: validPort,
    });

    expect(diagnosis).toMatchObject({ ok: false, code: "missing-project" });
  });

  it("does not interpret an empty project setting as the process directory", async () => {
    const entryPath = path.join(testRoot, "slides.md");
    await writeFile(entryPath, "# Slides\n");

    const diagnosis = await diagnoseSlidevLaunch({
      projectPath: "",
      entryPath,
      nodeExecutable: process.execPath,
      port: validPort,
    });

    expect(diagnosis).toMatchObject({ ok: false, code: "missing-project" });
  });

  it("reports missing-entry separately", async () => {
    const fixture = await createValidFixture(testRoot);

    const diagnosis = await diagnoseSlidevLaunch({
      ...fixture.input,
      entryPath: path.join(testRoot, "missing-slides.md"),
    });

    expect(diagnosis).toMatchObject({ ok: false, code: "missing-entry" });
  });

  it("reports invalid-slidev-package for malformed package metadata", async () => {
    const fixture = await createValidFixture(testRoot);
    await writeFile(fixture.packageJsonPath, "{ definitely not JSON");

    const diagnosis = await diagnoseSlidevLaunch(fixture.input);

    expect(diagnosis).toMatchObject({
      ok: false,
      code: "invalid-slidev-package",
    });
  });

  it("reports missing-node separately", async () => {
    const fixture = await createValidFixture(testRoot);

    const diagnosis = await diagnoseSlidevLaunch({
      ...fixture.input,
      nodeExecutable: path.join(testRoot, "missing-node"),
    });

    expect(diagnosis).toMatchObject({ ok: false, code: "missing-node" });
  });

  it("reports invalid-node separately", async () => {
    const fixture = await createValidFixture(testRoot);
    const invalidNodePath = path.join(testRoot, "not-a-node-executable");
    await writeFile(invalidNodePath, "This is not Node.js.\n");
    if (process.platform !== "win32") {
      await chmod(invalidNodePath, 0o755);
    }

    const diagnosis = await diagnoseSlidevLaunch({
      ...fixture.input,
      nodeExecutable: invalidNodePath,
    });

    expect(diagnosis).toMatchObject({ ok: false, code: "invalid-node" });
  });

  it("keeps spaces and shell metacharacters in paths as individual arguments", async () => {
    const fixture = await createValidFixture(
      testRoot,
      "Slidev project & (conference) $draft",
      "deck; keynote & notes $(draft).md",
    );

    const diagnosis = await diagnoseSlidevLaunch(fixture.input);

    expect(diagnosis).toMatchObject({
      ok: true,
      spec: {
        executable: process.execPath,
        args: [fixture.cliPath, fixture.entryPath, "--port", String(validPort)],
        cwd: fixture.projectPath,
      },
    });
  });
});

describe("spawnSlidev", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "obsidian-slidev-spawn-"));
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  it("spawns the diagnosed executable and arguments with shell disabled", () => {
    const spec: SlidevLaunchSpec = {
      executable: "/Node installations/node & safe",
      args: [
        "/project & safe/node_modules/@slidev/cli/bin/slidev.mjs",
        "/vault/deck; safe.md",
        "--port",
        String(validPort),
      ],
      cwd: "/project & safe",
      cliPath: "/project & safe/node_modules/@slidev/cli/bin/slidev.mjs",
      nodeVersion: "v24.0.0",
    };
    const child = {} as ChildProcessWithoutNullStreams;
    const spawnImpl = vi.fn(() => child);

    const result = spawnSlidev(spec, spawnImpl);

    expect(result).toBe(child);
    expect(spawnImpl).toHaveBeenCalledOnce();
    expect(spawnImpl).toHaveBeenCalledWith(
      spec.executable,
      spec.args,
      expect.objectContaining({ cwd: spec.cwd, shell: false }),
    );
  });

  it("runs a fake local CLI end-to-end without reparsing metacharacters", async () => {
    const invocationPath = path.join(testRoot, "invocation.json");
    const fixture = await createValidFixture(
      testRoot,
      "Slidev project & (conference) $draft",
      "deck; keynote & notes $(draft).md",
      [
        'import { writeFileSync } from "node:fs";',
        `writeFileSync(${JSON.stringify(invocationPath)}, JSON.stringify(process.argv.slice(2)));`,
      ].join("\n"),
    );
    const diagnosis = await diagnoseSlidevLaunch(fixture.input);
    expect(diagnosis.ok).toBe(true);
    if (!diagnosis.ok) {
      throw new Error(diagnosis.message);
    }

    const child = spawnSlidev(diagnosis.spec);
    const stderrChunks: Array<Buffer> = [];
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    const [exitCode, signal] = (await once(child, "close")) as [
      number | null,
      NodeJS.Signals | null,
    ];

    expect({
      exitCode,
      signal,
      stderr: Buffer.concat(stderrChunks).toString("utf8"),
    }).toEqual({ exitCode: 0, signal: null, stderr: "" });
    expect(JSON.parse(await readFile(invocationPath, "utf8"))).toEqual([
      fixture.entryPath,
      "--port",
      String(validPort),
    ]);
  });
});

async function createValidFixture(
  testRoot: string,
  projectName = "project",
  entryName = "slides.md",
  cliSource = "// fake Slidev CLI\n",
) {
  const projectPath = path.join(testRoot, projectName);
  const entryPath = path.join(testRoot, entryName);
  const packagePath = path.join(projectPath, "node_modules", "@slidev", "cli");
  const cliPath = path.join(packagePath, "bin", "slidev.mjs");
  const packageJsonPath = path.join(packagePath, "package.json");

  await mkdir(path.dirname(cliPath), { recursive: true });
  await writeFile(entryPath, "# Slides\n");
  await writeFile(cliPath, cliSource);
  await writeFile(
    packageJsonPath,
    JSON.stringify({
      name: "@slidev/cli",
      bin: { slidev: "./bin/slidev.mjs" },
    }),
  );

  const input: SlidevLaunchInput = {
    projectPath,
    entryPath,
    nodeExecutable: process.execPath,
    port: validPort,
  };

  return {
    cliPath,
    entryPath,
    input,
    packageJsonPath,
    projectPath,
  };
}
