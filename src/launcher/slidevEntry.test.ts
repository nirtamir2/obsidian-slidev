import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { getRelativeSlidevEntryPath, prepareSlidevLaunch } from "./slidevEntry";
import type { SlidevLaunchSpec } from "./slidevLauncher";

describe("prepareSlidevLaunch", () => {
  let testRoot = "";

  beforeEach(async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "obsidian-slidev-entry-"));
  });

  afterEach(async () => {
    if (testRoot.length > 0) {
      await rm(testRoot, { force: true, recursive: true });
    }
  });

  it("creates a project-local wrapper for a vault note outside the project", async () => {
    const projectPath = path.join(testRoot, "Slidev project");
    const entryPath = path.join(testRoot, "Vault & notes", "deck's intro.md");
    const cliPath = path.join(
      projectPath,
      "node_modules",
      "@slidev",
      "cli.mjs",
    );
    await mkdir(projectPath, { recursive: true });
    await mkdir(path.dirname(entryPath), { recursive: true });
    await writeFile(
      entryPath,
      "---\ntheme: seriph\ntitle: External deck\nlayout: cover\ndisabled: false\naddons:\n  - slidev-addon-existing\n---\n\n# One\n\n---\ntransition: fade-out\n---\n\n# Two\n",
    );

    const spec: SlidevLaunchSpec = {
      executable: process.execPath,
      args: [cliPath, entryPath, "--port", "4317"],
      cwd: projectPath,
      cliPath,
      entryPath,
      nodeVersion: process.version,
      port: 4317,
    };

    const sourceRoot = path.dirname(entryPath);
    const prepared = await prepareSlidevLaunch(spec, { sourceRoot });
    const wrapperPath = prepared.spec.entryPath;
    const wrapperDirectory = path.dirname(prepared.spec.entryPath);
    const bridgeDirectory = wrapperPath.slice(
      0,
      -path.extname(wrapperPath).length,
    );
    const relativeEntryPath = path.relative(wrapperDirectory, entryPath);

    expect(wrapperDirectory).toBe(projectPath);
    expect(path.basename(wrapperPath)).toMatch(
      /^\.obsidian-slidev-[\da-f-]+\.md$/,
    );
    const wrapperContent = await readFile(prepared.spec.entryPath, "utf8");
    const [headmatter, importer] = parseWrapperFrontmatter(wrapperContent);
    expect(headmatter).toMatchObject({
      theme: "seriph",
      title: "External deck",
      layout: "cover",
      disabled: true,
      addons: [
        "slidev-addon-existing",
        bridgeDirectory.split(path.sep).join("/"),
      ],
    });
    expect(importer).toEqual({ src: relativeEntryPath });
    const bridgeConfig = await readFile(
      path.join(bridgeDirectory, "vite.config.ts"),
      "utf8",
    );
    expect(bridgeConfig).toContain(JSON.stringify(sourceRoot));
    expect(bridgeConfig).toContain(".obsidian/**");
    expect(bridgeConfig).toContain("!(*__slidev_[0-9]*).");
    expect(prepared.spec.args).toEqual([
      cliPath,
      prepared.spec.entryPath,
      "--port",
      "4317",
    ]);

    await prepared.cleanup();
    await prepared.cleanup();
    await expect(stat(wrapperPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(stat(bridgeDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(stat(projectPath)).resolves.toMatchObject({});
  });

  it("carries YAML block headmatter into the project-local wrapper", async () => {
    const projectPath = path.join(testRoot, "project");
    const entryPath = path.join(testRoot, "vault", "slides.md");
    const cliPath = path.join(projectPath, "slidev.mjs");
    await mkdir(projectPath, { recursive: true });
    await mkdir(path.dirname(entryPath), { recursive: true });
    await writeFile(entryPath, "```yaml\ntheme: seriph\n```\n\n# One\n");

    const prepared = await prepareSlidevLaunch({
      executable: process.execPath,
      args: [cliPath, entryPath, "--port", "3030"],
      cwd: projectPath,
      cliPath,
      entryPath,
      nodeVersion: process.version,
      port: 3030,
    });

    const [headmatter, importer] = parseWrapperFrontmatter(
      await readFile(prepared.spec.entryPath, "utf8"),
    );
    expect(headmatter).toMatchObject({ theme: "seriph", disabled: true });
    expect(importer).toEqual({ src: path.relative(projectPath, entryPath) });
    await prepared.cleanup();
  });

  it("does not treat a blank-padded leading separator as headmatter", async () => {
    const projectPath = path.join(testRoot, "project");
    const entryPath = path.join(testRoot, "vault", "slides.md");
    await mkdir(projectPath, { recursive: true });
    await mkdir(path.dirname(entryPath), { recursive: true });
    await writeFile(entryPath, "---\n\n# One\n\n---\n\n# Two\n");

    const prepared = await prepareSlidevLaunch({
      executable: process.execPath,
      args: [],
      cwd: projectPath,
      cliPath: path.join(projectPath, "slidev.mjs"),
      entryPath,
      nodeVersion: process.version,
      port: 3030,
    });

    const [headmatter] = parseWrapperFrontmatter(
      await readFile(prepared.spec.entryPath, "utf8"),
    );
    expect(headmatter).toMatchObject({ disabled: true });
    await prepared.cleanup();
  });

  it("removes partial launch artifacts when headmatter is invalid", async () => {
    const projectPath = path.join(testRoot, "project");
    const entryPath = path.join(testRoot, "vault", "slides.md");
    await mkdir(projectPath, { recursive: true });
    await mkdir(path.dirname(entryPath), { recursive: true });
    await writeFile(entryPath, "---\naddons: [\n---\n\n# One\n");

    await expect(
      prepareSlidevLaunch({
        executable: process.execPath,
        args: [],
        cwd: projectPath,
        cliPath: path.join(projectPath, "slidev.mjs"),
        entryPath,
        nodeVersion: process.version,
        port: 3030,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(await readdir(projectPath)).toEqual([]);
  });
});

function parseWrapperFrontmatter(wrapperContent: string) {
  return [...wrapperContent.matchAll(/^---\n([\s\S]*?)\n---$/gm)].map(
    (match) => parse(match[1] ?? "") as Record<string, unknown>,
  );
}

describe("getRelativeSlidevEntryPath", () => {
  it("preserves a Windows UNC path so Slidev does not treat it as project-relative", () => {
    const entryPath = String.raw`\\server\share\vault\deck.md`;

    expect(
      getRelativeSlidevEntryPath(String.raw`C:\project`, entryPath, path.win32),
    ).toBe(entryPath);
  });
});
