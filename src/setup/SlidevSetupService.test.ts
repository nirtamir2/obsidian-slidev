import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlidevSetupService } from "./SlidevSetupService";
import { createStarterProjectManifest } from "./starterProject";

describe("slidev setup service", () => {
  let testRoot = "";

  beforeEach(async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "obsidian-slidev-setup-"));
  });

  afterEach(async () => {
    if (testRoot.length > 0) {
      await rm(testRoot, { force: true, recursive: true });
    }
  });

  it("creates, installs, and verifies a fresh vault-local project", async () => {
    const installer = createInstallerProcess();
    const spawnInstaller = vi.fn(() => {
      queueMicrotask(() => {
        completeInstaller(installer);
      });
      return installer.child;
    });
    const service = createService(spawnInstaller);

    const result = await service.setup({
      nodeExecutable: "/configured/node shim",
      vaultRoot: testRoot,
    });

    const projectPath = path.join(testRoot, ".slidev");
    expect(result).toEqual({ ok: true, projectPath });
    expect(
      JSON.parse(
        await readFile(path.join(projectPath, "package.json"), "utf8"),
      ),
    ).toEqual(createStarterProjectManifest());
    expect(spawnInstaller).toHaveBeenCalledWith(
      "/real/node & safe",
      ["/real/npm-cli.js", "install", "--no-audit", "--no-fund"],
      expect.objectContaining({
        cwd: projectPath,
        shell: false,
      }),
    );
    expect(service.getState()).toMatchObject({
      status: "success",
      stage: "ready",
    });
  });

  it("refuses to overwrite an unmarked project directory", async () => {
    const projectPath = path.join(testRoot, ".slidev");
    await mkdir(projectPath);
    await writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify({ name: "my-project" }),
    );
    const spawnInstaller = vi.fn(() => createInstallerProcess().child);
    const service = createService(spawnInstaller);

    const result = await service.setup({ vaultRoot: testRoot });

    expect(result).toMatchObject({ ok: false, code: "project-collision" });
    expect(spawnInstaller).not.toHaveBeenCalled();
    await expect(
      readFile(path.join(projectPath, "package.json"), "utf8"),
    ).resolves.toContain("my-project");
  });

  it.runIf(process.platform !== "win32")(
    "refuses a symlinked project directory",
    async () => {
      const externalPath = path.join(testRoot, "external");
      const projectPath = path.join(testRoot, ".slidev");
      await mkdir(externalPath);
      await symlink(externalPath, projectPath, "dir");
      const spawnInstaller = vi.fn(() => createInstallerProcess().child);
      const service = createService(spawnInstaller);

      const result = await service.setup({ vaultRoot: testRoot });

      expect(result).toMatchObject({ ok: false, code: "project-collision" });
      expect(spawnInstaller).not.toHaveBeenCalled();
    },
  );

  it("keeps install output and resumes after an npm failure", async () => {
    const failedInstaller = createInstallerProcess();
    const successfulInstaller = createInstallerProcess();
    const spawnInstaller = vi
      .fn()
      .mockImplementationOnce(() => {
        queueMicrotask(() => {
          failedInstaller.stderr.write("registry unavailable\n");
          failedInstaller.close(1, null);
        });
        return failedInstaller.child;
      })
      .mockImplementationOnce(() => {
        queueMicrotask(() => {
          completeInstaller(successfulInstaller);
        });
        return successfulInstaller.child;
      });
    const service = createService(spawnInstaller);

    const failed = await service.setup({ vaultRoot: testRoot });
    const retried = await service.setup({ vaultRoot: testRoot });

    expect(failed).toMatchObject({ ok: false, code: "install-failed" });
    expect(retried).toEqual({
      ok: true,
      projectPath: path.join(testRoot, ".slidev"),
    });
    expect(spawnInstaller).toHaveBeenCalledTimes(2);
    expect(service.getState().logs).toContainEqual({
      type: "message",
      value: "installed packages\n",
    });
  });

  it("shares an active setup and publishes progress to subscribers", async () => {
    const installer = createInstallerProcess();
    const service = createService(() => installer.child);
    const stages: Array<string> = [];
    const unsubscribe = service.subscribe((state) => {
      stages.push(state.stage);
    });

    const firstSetup = service.setup({ vaultRoot: testRoot });
    const secondSetup = service.setup({ vaultRoot: testRoot });
    await vi.waitFor(() => {
      expect(service.getState().stage).toBe("installing-dependencies");
    });
    completeInstaller(installer);

    expect(secondSetup).toBe(firstSetup);
    await expect(firstSetup).resolves.toMatchObject({ ok: true });
    unsubscribe();
    expect(stages).toEqual(
      expect.arrayContaining([
        "checking-runtime",
        "creating-project",
        "installing-dependencies",
        "verifying-project",
        "ready",
      ]),
    );
  });

  it("cancels only the installer owned by this setup", async () => {
    const installer = createInstallerProcess();
    const service = createService(() => installer.child);
    const setup = service.setup({ vaultRoot: testRoot });
    await vi.waitFor(() => {
      expect(service.getState().stage).toBe("installing-dependencies");
    });

    await service.cancel();

    await expect(setup).resolves.toMatchObject({
      ok: false,
      code: "cancelled",
    });
    expect(installer.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("returns the project diagnosis when verification fails", async () => {
    const installer = createInstallerProcess();
    const service = createService(
      () => {
        queueMicrotask(() => {
          completeInstaller(installer);
        });
        return installer.child;
      },
      {
        diagnoseSlidevProject: async () => ({
          ok: false,
          code: "missing-slidev-package",
          message: "Slidev was not installed.",
        }),
      },
    );

    await expect(service.setup({ vaultRoot: testRoot })).resolves.toEqual({
      ok: false,
      code: "verification-failed",
      message: "Slidev was not installed.",
    });
  });
});

function createService(
  spawnInstaller: () => ChildProcessWithoutNullStreams,
  overrides: NonNullable<
    ConstructorParameters<typeof SlidevSetupService>[0]
  > = {},
) {
  return new SlidevSetupService({
    diagnoseNodeRuntime: async () => ({
      ok: true,
      runtime: {
        nodeExecutable: "/real/node & safe",
        nodeVersion: "v24.4.1",
      },
    }),
    diagnoseSlidevProject: async ({ projectPath }) => ({
      ok: true,
      project: {
        cliPath: path.join(projectPath, "node_modules/@slidev/cli/cli.mjs"),
        nodeExecutable: "/real/node & safe",
        nodeVersion: "v24.4.1",
        projectPath,
      },
    }),
    findNpmCli: async () => ({
      ok: true,
      npmCliPath: "/real/npm-cli.js",
    }),
    spawnInstaller,
    ...overrides,
  });
}

function createInstallerProcess() {
  // eslint-disable-next-line unicorn/prefer-event-target -- Node child processes use EventEmitter semantics.
  const child = new EventEmitter() as ChildProcessWithoutNullStreams;
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const close = (code: number | null, signal: NodeJS.Signals | null) => {
    Object.assign(child, { exitCode: code, signalCode: signal });
    child.emit("close", code, signal);
  };
  const kill = vi.fn((signal: NodeJS.Signals) => {
    queueMicrotask(() => {
      close(null, signal);
    });
    return true;
  });
  Object.assign(child, {
    exitCode: null,
    kill,
    signalCode: null,
    stderr,
    stdin: new PassThrough(),
    stdout,
  });
  return { child, close, kill, stderr, stdout };
}

function completeInstaller(
  installer: ReturnType<typeof createInstallerProcess>,
) {
  installer.stdout.write("installed packages\n");
  installer.stdout.end();
  installer.stderr.end();
  installer.close(0, null);
}
