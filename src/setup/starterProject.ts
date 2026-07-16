// eslint-disable-next-line eslint-plugin-default-import-name/default-import-name -- `package` is reserved in strict-mode modules.
import templatePackage from "../../slidev-template/package.json";

const generatedBy = "slidev-plugin";
const schemaVersion = 1;

export interface StarterProjectManifest {
  name: "obsidian-slidev-starter";
  type: "module";
  private: true;
  scripts: {
    build: string;
    dev: string;
    export: string;
  };
  dependencies: {
    "@slidev/cli": string;
    "@slidev/theme-default": string;
    "@slidev/theme-seriph": string;
    vue: string;
  };
  obsidianSlidev: {
    generatedBy: typeof generatedBy;
    schemaVersion: typeof schemaVersion;
  };
}

export function createStarterProjectManifest(): StarterProjectManifest {
  return {
    name: "obsidian-slidev-starter",
    type: "module",
    private: true,
    scripts: {
      build: templatePackage.scripts.build,
      dev: templatePackage.scripts.dev,
      export: templatePackage.scripts.export,
    },
    dependencies: {
      "@slidev/cli": pinVersion(templatePackage.dependencies["@slidev/cli"]),
      "@slidev/theme-default": pinVersion(
        templatePackage.dependencies["@slidev/theme-default"],
      ),
      "@slidev/theme-seriph": pinVersion(
        templatePackage.dependencies["@slidev/theme-seriph"],
      ),
      vue: pinVersion(templatePackage.dependencies.vue),
    },
    obsidianSlidev: { generatedBy, schemaVersion },
  };
}

export function isStarterProjectManifest(
  value: unknown,
): value is StarterProjectManifest {
  return (
    JSON.stringify(value) === JSON.stringify(createStarterProjectManifest())
  );
}

function pinVersion(version: string) {
  return version.replace(/^[~^]/, "");
}
