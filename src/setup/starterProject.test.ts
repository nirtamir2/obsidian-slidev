import { describe, expect, it } from "vitest";
import {
  createStarterProjectManifest,
  isStarterProjectManifest,
} from "./starterProject";

describe("createStarterProjectManifest", () => {
  it("creates a marked manifest with pinned starter dependencies", () => {
    const manifest = createStarterProjectManifest();

    expect(manifest).toMatchObject({
      name: "obsidian-slidev-starter",
      private: true,
      type: "module",
      obsidianSlidev: {
        generatedBy: "slidev-plugin",
        schemaVersion: 1,
      },
      scripts: {
        build: "slidev build",
        dev: "slidev",
        export: "slidev export",
      },
    });
    expect(manifest.dependencies).toEqual({
      "@slidev/cli": "52.17.0",
      "@slidev/theme-default": "0.25.0",
      "@slidev/theme-seriph": "0.25.0",
      vue: "3.5.39",
    });
  });

  it("only accepts an unchanged generated manifest", () => {
    const manifest = createStarterProjectManifest();

    expect(isStarterProjectManifest(manifest)).toBe(true);
    expect(
      isStarterProjectManifest({
        ...manifest,
        dependencies: { ...manifest.dependencies, vue: "0.0.1" },
      }),
    ).toBe(false);
    expect(
      isStarterProjectManifest({ ...manifest, obsidianSlidev: undefined }),
    ).toBe(false);
  });
});
