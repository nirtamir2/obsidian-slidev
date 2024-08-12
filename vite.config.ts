import builtins from "builtin-modules";
import { exec } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import { viteStaticCopy } from "vite-plugin-static-copy";

const banner = `
/*!
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository https://github.com/nirtamir2/obsidian-slidev.
*/
`;

export default defineConfig(async ({ mode }) => {
  const prod = mode === "production";

  let { OUT_DIR } = loadEnv(mode, process.cwd(), ["OUT_"]);

  OUT_DIR = path.normalize(OUT_DIR!);
  if (OUT_DIR !== "dist" && OUT_DIR !== path.join(process.cwd(), "dist")) {
    await rm("dist", { recursive: true });
    exec(
      process.platform === "win32"
        ? `mklink /J dist ${OUT_DIR}`
        : `ln -s ${OUT_DIR} dist`,
    );
  }

  return {
    plugins: [
      solidPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: "manifest.json",
            dest: ".",
          },
        ],
      }),
      prod ? undefined : inject(["src/hmr.ts"]),
    ],
    build: {
      lib: {
        entry: "src/main.ts",
        name: "main",
        fileName: () => "main.js",
        formats: ["cjs"],
      },
      minify: prod,
      sourcemap: prod ? false : "inline",
      cssCodeSplit: false,
      emptyOutDir: false,
      // outDir: '',
      rollupOptions: {
        output: {
          exports: "named",
          assetFileNames: (v) =>
            v.name === "style.css" ? "styles.css" : v.name,
          banner,
        },
        external: [
          "obsidian",
          "electron",
          "@codemirror/autocomplete",
          "@codemirror/closebrackets",
          "@codemirror/collab",
          "@codemirror/commands",
          "@codemirror/comment",
          "@codemirror/fold",
          "@codemirror/gutter",
          "@codemirror/highlight",
          "@codemirror/history",
          "@codemirror/language",
          "@codemirror/lint",
          "@codemirror/matchbrackets",
          "@codemirror/panel",
          "@codemirror/rangeset",
          "@codemirror/rectangular-selection",
          "@codemirror/search",
          "@codemirror/state",
          "@codemirror/stream-parser",
          "@codemirror/text",
          "@codemirror/tooltip",
          "@codemirror/view",
          "@lezer/common",
          "@lezer/highlight",
          "@lezer/lr",
          ...builtins,
          ...builtins.map((module) => `node:${module}`),
        ],
      },
    },
  };
});

const inject = (files: Array<string>): Plugin => {
  if (files.length > 0) {
    return {
      name: "inject-code",
      async load(this, id) {
        const info = this.getModuleInfo(id);
        if (info.isEntry) {
          const code = await readFile(id, "utf8");
          const dir = path.dirname(id);
          const inject_code = files
            .map((v) => path.relative(dir, v))
            .map((p) => path.join("./", path.basename(p, path.extname(p))))
            .map((p) => `import './${p}'`)
            .join(";");
          return `
          ${inject_code};
          ${code}
          `;
        }
      },
    };
  }
};
