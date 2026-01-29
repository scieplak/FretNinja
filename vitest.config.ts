/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    // Enable jsdom environment for DOM testing
    environment: "jsdom",

    // Setup files run before each test file
    setupFiles: ["./src/test/setup.ts"],

    // Include test files
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    // Exclude patterns
    exclude: ["node_modules", "dist", "e2e"],

    // Global test configuration
    globals: true,

    // Coverage configuration (run with --coverage flag)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**/*",
        "src/db/database.types.ts",
        "src/env.d.ts",
        "src/components/ui/**/*",
      ],
    },

    // TypeScript path aliases
    alias: {
      "@/": new URL("./src/", import.meta.url).pathname,
    },
  },
});
