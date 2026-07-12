import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2(
  {
    formatters: true,
    solid: true,
    typescript: {
      tsconfigPath: "./tsconfig.json",
    },
  },
  [
    {
      ignores: ["typings/*", "*/electron.d.ts"],
    },
    {
      rules: {
        "no-new": "off",
        "n/prefer-global/process": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/method-signature-style": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "no-console": "off",
        "@typescript-eslint/require-await": "off",
        "import/no-nodejs-modules": "off",
        "@typescript-eslint/member-ordering": "off",
        "unicorn/consistent-destructuring": "off",
        "sonarjs/function-return-type": "off",
        "ssr-friendly/no-dom-globals-in-module-scope": "off",
        "unicorn/prefer-global-this": "off",
        "sonarjs/os-command": "off",
        "eslint-plugin-sort-destructure-keys-typescript/sort-jsx-attributes-by-type":
          "off",
      },
    },
  ],
);
