const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // TypeScript resolves the workspace alias; this rule recursively scans above the sandbox on Windows.
    rules: { "import/no-unresolved": "off" },
  },
  { ignores: ["dist/**", ".expo/**", "coverage/**"] },
]);
