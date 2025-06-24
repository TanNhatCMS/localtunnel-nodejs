const {
    defineConfig,
} = require("eslint/config");

const babelParser = require("babel-eslint");
const prettier = require("eslint-plugin-prettier");
const jest = require("eslint-plugin-jest");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        parser: babelParser,

        globals: {
            ...jest.environments.globals.globals,
        },
    },

    extends: compat.extends("airbnb", "prettier", "plugin:jest/recommended"),

    plugins: {
        prettier,
        jest,
    },

    rules: {
        "prettier/prettier": ["warn", {
            printWidth: 100,
            tabWidth: 2,
            bracketSpacing: true,
            trailingComma: "es5",
            singleQuote: true,
            jsxBracketSameLine: false,
        }],
    },
}]);
