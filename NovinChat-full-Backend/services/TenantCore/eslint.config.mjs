import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
    {
        ignores: [
            "dist/**",
            "tests/**",
            "coverage/**",
            "node_modules/**",
            "eslint.config.mjs",
            "vitest.config.ts",
        ],
    },

    js.configs.recommended,

    ...tseslint.configs.recommendedTypeChecked,

    {
        files: ["**/*.ts"],

        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: globals.node,
        },
        rules: {
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-explicit-any": "warn",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/strict-boolean-expressions": "warn",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
            "no-console": "off",
        },
    },

    prettier,
);
