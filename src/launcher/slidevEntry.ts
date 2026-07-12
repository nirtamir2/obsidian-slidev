import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import type { SlidevLaunchSpec } from "./slidevLauncher";

export interface PreparedSlidevLaunch {
  cleanup(): Promise<void>;
  spec: SlidevLaunchSpec;
}

export interface SlidevLaunchPreparationOptions {
  sourceRoot?: string;
}

export async function prepareSlidevLaunch(
  spec: SlidevLaunchSpec,
  options: SlidevLaunchPreparationOptions = {},
): Promise<PreparedSlidevLaunch> {
  const artifactStem = path.join(spec.cwd, `.obsidian-slidev-${randomUUID()}`);
  const wrapperPath = `${artifactStem}.md`;
  const bridgeDirectory = artifactStem;
  const sourceRoot = path.resolve(
    options.sourceRoot ?? path.dirname(spec.entryPath),
  );
  const relativeEntryPath = getRelativeSlidevEntryPath(
    spec.cwd,
    spec.entryPath,
  );

  try {
    await mkdir(bridgeDirectory);
    await writeFile(
      path.join(bridgeDirectory, "package.json"),
      `${JSON.stringify({ name: "obsidian-slidev-vault-bridge", private: true }, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    await writeFile(
      path.join(bridgeDirectory, "vite.config.ts"),
      createBridgeViteConfig(sourceRoot),
      { encoding: "utf8", flag: "wx" },
    );
    const wrapperContent = await createWrapperContent(
      spec.entryPath,
      relativeEntryPath,
      toPortablePath(bridgeDirectory),
    );
    await writeFile(wrapperPath, wrapperContent, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    await removeLaunchArtifacts(wrapperPath, bridgeDirectory);
    throw error;
  }

  let cleanupPromise: Promise<void> | null = null;
  return {
    spec: {
      ...spec,
      args: [spec.cliPath, wrapperPath, "--port", String(spec.port)],
      entryPath: wrapperPath,
    },
    async cleanup() {
      cleanupPromise ??= removeLaunchArtifacts(wrapperPath, bridgeDirectory);
      await cleanupPromise;
    },
  };
}

async function createWrapperContent(
  entryPath: string,
  relativeEntryPath: string,
  bridgeAddonPath: string,
) {
  const source = await readFile(entryPath, "utf8");
  const headmatter = parseHeadmatter(source);
  const existingAddons = normalizeAddons(headmatter["addons"]);
  headmatter["addons"] = [...existingAddons, bridgeAddonPath];
  headmatter["disabled"] = true;
  delete headmatter["src"];

  return [
    "---",
    stringify(headmatter, { lineWidth: 0 }).trimEnd(),
    "---",
    "",
    "---",
    `src: ${JSON.stringify(relativeEntryPath)}`,
    "---",
    "",
  ].join("\n");
}

function createBridgeViteConfig(sourceRoot: string) {
  return `export default ${JSON.stringify(
    {
      server: {
        fs: {
          allow: [sourceRoot],
          deny: createVaultDenyPatterns(sourceRoot),
        },
      },
    },
    null,
    2,
  )};\n`;
}

function createVaultDenyPatterns(sourceRoot: string) {
  const vaultPattern = escapeGlobPath(toPortablePath(sourceRoot));
  return [
    ".env",
    ".env.*",
    "*.{crt,pem}",
    "**/.git/**",
    `${vaultPattern}/**/.obsidian/**`,
    `${vaultPattern}/**/.git/**`,
    `${vaultPattern}/**/!(*__slidev_[0-9]*).{md,markdown,canvas,json,json5,yaml,yml,toml}`,
  ];
}

function escapeGlobPath(filePath: string) {
  return filePath.replaceAll(/([!()*+?[\]{}@])/g, String.raw`\$1`);
}

async function removeLaunchArtifacts(
  wrapperPath: string,
  bridgeDirectory: string,
) {
  await Promise.all([
    rm(wrapperPath, { force: true }),
    rm(bridgeDirectory, { force: true, recursive: true }),
  ]);
}

function toPortablePath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

export function getRelativeSlidevEntryPath(
  entryDirectory: string,
  entryPath: string,
  pathImplementation: Pick<typeof path, "relative"> = path,
) {
  return pathImplementation.relative(entryDirectory, entryPath);
}

function parseHeadmatter(source: string): Record<string, unknown> {
  const rawHeadmatter = extractHeadmatter(source);
  if (rawHeadmatter.length === 0) {
    return {};
  }

  const parsedHeadmatter: unknown = parse(rawHeadmatter.join("\n"));
  if (parsedHeadmatter == null) {
    return {};
  }
  if (!isRecord(parsedHeadmatter)) {
    throw new TypeError("Slidev deck headmatter must be a YAML mapping.");
  }
  return parsedHeadmatter;
}

function extractHeadmatter(source: string): Array<string> {
  const lines = source.split(/\r?\n/);
  const openingLine = lines[0]?.trimEnd();

  if (
    /^---(?:[^-].*)?$/.test(openingLine ?? "") &&
    (lines[1]?.trim().length ?? 0) > 0
  ) {
    return extractDelimitedHeadmatter(lines, "---");
  }

  if (/^```ya?ml$/i.test(openingLine ?? "")) {
    return extractDelimitedHeadmatter(lines, "```");
  }

  return [];
}

function extractDelimitedHeadmatter(
  lines: Array<string>,
  closingDelimiter: string,
): Array<string> {
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trimEnd() === closingDelimiter,
  );
  if (closingIndex === -1) {
    return [];
  }

  return lines.slice(1, closingIndex);
}

function normalizeAddons(value: unknown): Array<unknown> {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
