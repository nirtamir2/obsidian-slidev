import path from "node:path";
import type { Plugin } from "obsidian";
import { Platform, debounce } from "obsidian";

interface HmrOptions {
  watchFiles?:
    | Array<"main.js" | "manifest.json" | "styles.css">
    | Array<string>;
}

declare global {
  interface Window {
    hmr(plugin: Plugin, options?: HmrOptions): void;
  }
}

Window.prototype.hmr = function (plugin: Plugin, options?: HmrOptions): void {
  if (Platform.isMobile) {
    return;
  }

  console.log(`[hmr: ${plugin.manifest.name}]`, new Date());

  options ??= {};
  options.watchFiles ??= ["main.js", "manifest.json", "styles.css"];
  const { watchFiles } = options;

  const {
    app: {
      vault: { adapter },
      plugins,
    },
    manifest: { dir: pluginDir, id },
  } = plugin;
  const {
    app: { vault },
  } = plugin;

  if (pluginDir == null) {
    throw new Error(`hmr.ts - pluginDir not found.`);
  }

  const restartPlugin = async () => {
    const dbgKey = "debug-plugin";
    const oldDebug = localStorage.getItem(dbgKey);
    try {
      localStorage.setItem(dbgKey, "1");
      await plugins.disablePlugin(id);
      await plugins.enablePlugin(id);
    } finally {
      if (oldDebug == null) {
        localStorage.removeItem(dbgKey);
      } else {
        localStorage.setItem(dbgKey, oldDebug);
      }
    }
  };

  const entry = path.normalize(path.join(pluginDir, "main.js"));
  const onChange = debounce(
    async (file: string) => {
      if (file.startsWith(pluginDir)) {
        if (!(await adapter.exists(entry))) {
          return;
        }
        if (file === pluginDir) {
          // reload
        } else if (
          watchFiles.length > 0 &&
          !watchFiles.some((o) => file.endsWith(o))
        ) {
          return;
        }
        await restartPlugin();
      }
    },
    500,
    true,
  );

  plugin.registerEvent(vault.on("raw", onChange));

  plugin.register(() => {
    adapter.stopWatchPath(pluginDir);
  });
  adapter.startWatchPath(pluginDir);
};
