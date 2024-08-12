import nirtamir2 from '@nirtamir2/eslint-config'

export default nirtamir2({
  formatters: true,
  solid: true,
  typescript: true,
  tailwindcss: true,
}, [
  {
    ignores: ["typings/*", "*/electron.d.ts"],
  },
  {
    rules: {
      "no-new": "off",
      "tailwindcss/no-custom-classname": "off",
      "n/prefer-global/process": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/method-signature-style": "off",
      "@typescript-eslint/explicit-member-accessibility": "off",
      "no-console": "off",
      "@typescript-eslint/require-await": "off",
      "import/no-nodejs-modules": "off",
      "@typescript-eslint/member-ordering": "off",
      "unicorn/consistent-destructuring": "off",
    }
  }
])
