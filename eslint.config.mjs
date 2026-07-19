import nirtamir2 from "@nirtamir2/eslint-config";

export default nirtamir2(
  {
    formatters: true,
    solid: true,
    typescript: true,
  },
  [
    {
      ignores: ["slidev-template/**", "typings/*", "*/electron.d.ts"],
    },
    {
      files: ["**/*.{ts,tsx}"],
      rules: {
        "@typescript-eslint/no-unsafe-argument": "error",
        "@typescript-eslint/no-unsafe-assignment": "error",
        "@typescript-eslint/no-unsafe-call": "error",
        "@typescript-eslint/no-unsafe-member-access": "error",
        "@typescript-eslint/no-unsafe-return": "error",
      },
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
        "e18e/prefer-array-from-map": "off",
        "e18e/prefer-static-regex": "off",
        "n/prefer-global/buffer": "off",
        "@eslint-react/no-use-context": "off",
        "@eslint-react/no-context-provider": "off",
        "eslint-plugin-sort-destructure-keys-typescript/sort-jsx-attributes-by-type":
          "off",
      },
    },
  ],
);
