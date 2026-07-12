import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface Manifest {
  description: string;
  minAppVersion: string;
  version: string;
}

interface PackageJson {
  description: string;
  version: string;
}

async function readRepositoryFile(path: string): Promise<string> {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function readRepositoryJson<T>(path: string): Promise<T> {
  return JSON.parse(await readRepositoryFile(path)) as T;
}

describe("community plugin metadata", () => {
  it("keeps the release metadata consistent and directory-safe", async () => {
    const [manifest, packageJson, versions] = await Promise.all([
      readRepositoryJson<Manifest>("manifest.json"),
      readRepositoryJson<PackageJson>("package.json"),
      readRepositoryJson<Record<string, string>>("versions.json"),
    ]);

    expect(manifest.description).toBe(packageJson.description);
    expect(manifest.description).not.toMatch(/\bobsidian\b/i);
    expect(manifest.version).toBe(packageJson.version);
    expect(versions[manifest.version]).toBe(manifest.minAppVersion);
  });

  it("provides contributors with the complete local verification command", async () => {
    const contributingGuide = await readRepositoryFile("CONTRIBUTING.md");

    expect(contributingGuide).toContain("pnpm run ci");
  });

  it("stages every metadata file changed by the version lifecycle", async () => {
    const versionScript = await readRepositoryFile("version-bump.mjs");

    expect(versionScript).toContain(
      'execFileSync("git", ["add", "manifest.json", "versions.json"])',
    );
  });
});
