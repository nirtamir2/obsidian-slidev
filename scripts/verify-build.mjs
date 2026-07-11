import { readFile, stat } from "node:fs/promises";

const requiredAssets = [
  "dist/main.js",
  "dist/manifest.json",
  "dist/styles.css",
];

for (const assetPath of requiredAssets) {
  const assetStats = await stat(assetPath);
  if (!assetStats.isFile() || assetStats.size === 0) {
    throw new Error(`Expected a non-empty build asset at ${assetPath}.`);
  }
}

const [sourceManifest, builtManifest, mainBundle] = await Promise.all([
  readFile("manifest.json", "utf8"),
  readFile("dist/manifest.json", "utf8"),
  readFile("dist/main.js", "utf8"),
]);

if (sourceManifest !== builtManifest) {
  throw new Error("The built manifest does not match manifest.json.");
}

if (!mainBundle.includes("Copyright (c) 2016-2025 Ryan Carniato")) {
  throw new Error("The production bundle is missing Solid's MIT notice.");
}

if (!mainBundle.includes("Copyright (c) 2020-2021 Anthony Fu")) {
  throw new Error("The production bundle is missing Slidev's MIT notice.");
}

if (!mainBundle.includes("Copyright Eemeli Aro <eemeli@gmail.com>")) {
  throw new Error("The production bundle is missing YAML's ISC notice.");
}

console.log("Verified Obsidian release assets and bundled license notice.");
