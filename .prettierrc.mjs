export default {
  plugins: ["@trivago/prettier-plugin-sort-imports"],
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
