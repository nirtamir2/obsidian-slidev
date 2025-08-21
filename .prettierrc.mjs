export default {
  plugins: [
    "prettier-plugin-packagejson",
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss", // must come last
  ],
  // @see https://github.com/tailwindlabs/prettier-plugin-tailwindcss?tab=readme-ov-file#specifying-your-tailwind-stylesheet-path-tailwind-css-v4
  tailwindStylesheet: "./src/styles.css",
  // pluginSearchDirs: false, // for prettier-plugin-tailwindcss to work with other plugins
  // @see https://github.com/tailwindlabs/prettier-plugin-tailwindcss#resolving-your-tailwind-configuration
  // tailwindConfig: "./tailwind.config.cjs",
  // @see https://github.com/trivago/prettier-plugin-sort-imports
  importOrder: [
    "^react$",
    "<THIRD_PARTY_MODULES>",
    // Internal modules
    "^@app/(.*)$",
    // TypeScript TSConfig path aliases
    "^@/(.*)$",
    // Relative imports
    "^[./]",
  ],
  importOrderSortSpecifiers: true,
  overrides: [
    {
      files: "*.svg",
      options: {
        parser: "html",
      },
    },
  ],
};
