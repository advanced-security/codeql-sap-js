import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import jestPlugin from "eslint-plugin-jest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["out/**/*", "**/node_modules", "**/coverage", "**/*.d.ts"]),
    {
        extends: fixupConfigRules(compat.extends(
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:@typescript-eslint/recommended-requiring-type-checking",
            "plugin:import/errors",
            "plugin:import/warnings",
            "plugin:import/typescript",
            "plugin:prettier/recommended",
        )),

        plugins: {
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
            import: fixupPluginRules(_import),
            prettier: fixupPluginRules(prettier),
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 2018,
            sourceType: "module",

            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: "/Users/data-douser/Git/data-douser/codeql-sap-js/extractors/cds/tools",
                createDefaultProgram: true,
            },
        },

        settings: {
            "import/resolver": {
                typescript: {
                    alwaysTryTypes: true,
                    project: "./tsconfig.json",
                },

                node: {
                    extensions: [".js", ".jsx", ".ts", ".tsx"],
                },
            },
        },

        rules: {
            "no-console": "off",
            "no-duplicate-imports": "error",
            "no-unused-vars": "off",
            "no-use-before-define": "off",
            "no-trailing-spaces": "error",
            "@typescript-eslint/explicit-module-boundary-types": "off",

            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            }],

            "@typescript-eslint/no-use-before-define": ["error", {
                functions: false,
                classes: true,
            }],

            "@typescript-eslint/explicit-function-return-type": ["warn", {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
            }],

            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/ban-ts-comment": "warn",
            "@typescript-eslint/prefer-nullish-coalescing": "warn",
            "@typescript-eslint/prefer-optional-chain": "warn",

            "import/order": ["error", {
                groups: ["builtin", "external", "internal", ["parent", "sibling"], "index"],
                "newlines-between": "always",

                alphabetize: {
                    order: "asc",
                    caseInsensitive: true,
                },
            }],

            "import/no-duplicates": "error",

            "prettier/prettier": ["error", {
                singleQuote: true,
                trailingComma: "all",
                printWidth: 100,
                tabWidth: 2,
            }],
        },
    },
    {
        files: ["**/*.ts"],

        languageOptions: {
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: "/Users/data-douser/Git/data-douser/codeql-sap-js/extractors/cds/tools",
            },
        },
    },
    {
        files: ["**/*.test.ts", "test/**/*.ts", "**/index-files.ts"],
        extends: fixupConfigRules(compat.extends("plugin:jest/recommended")),
        plugins: {
            jest: fixupPluginRules(jestPlugin),
        },
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: "module",

            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: "/Users/data-douser/Git/data-douser/codeql-sap-js/extractors/cds/tools",
            },
        },

        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/unbound-method": "off"
        },
    },
    // Add JavaScript-specific configuration that doesn't use TypeScript parser
    {
        files: ["**/*.js", "**/.prettierrc.js", "**/jest.config.js"],
        languageOptions: {
            // Use default parser for JS files (removes TS parser requirement)
            parser: undefined,
            ecmaVersion: 2018,
            sourceType: "module"
        },
        rules: {
            // Disable TypeScript-specific rules for JS files
            "@typescript-eslint/explicit-function-return-type": "off", 
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off", 
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/unbound-method": "off"
        }
    },
    {
        files: ["test/src/**/*.js"],
        extends: fixupConfigRules(compat.extends("plugin:jest/recommended")),
        plugins: {
            jest: fixupPluginRules(jestPlugin),
        },
        languageOptions: {
            // Use default parser for JS files (removes TS parser requirement)
            parser: undefined,
            ecmaVersion: 2018,
            sourceType: "module"
        },
    },
]);