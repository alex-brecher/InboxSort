const globals = require("globals");

const extensionGlobals = { ...globals.browser, chrome: "readonly" };

module.exports = [
  {
    ignores: ["node_modules/**", "store-assets/**", "store-listing/**"]
  },
  {
    files: ["shared.js", "content*.js", "popup.js", "theme-boot.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: extensionGlobals },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-redeclare": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-case-declarations": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-var": "warn"
    }
  },
  {
    files: ["test/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node } },
    rules: { "no-undef": "error", "no-unused-vars": ["error", { args: "none" }] }
  }
];
