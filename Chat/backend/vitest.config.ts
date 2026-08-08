import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.ts"],
        passWithNoTests: false,
        testTimeout: 180000,
        hookTimeout: 120000,
        setupFiles: ["tests/setup.ts"],
        fileParallelism: false,
    },
});
