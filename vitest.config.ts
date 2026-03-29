import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      "**/*.bak",
      "**/*.bak2",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "node_modules",
        "dist",
        "**/*.test.ts",
        "**/*.bak",
        "**/*.bak2",
        "src/_deprecated",
        "src/native",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    reporters: ["verbose"],
    maxConcurrency: 4,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
