import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/**/*.ts"],
      exclude: ["src/types/**", "src/**/types.ts", "src/cli.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
