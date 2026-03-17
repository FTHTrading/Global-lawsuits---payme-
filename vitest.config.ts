import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "packages/*/src/**/*.spec.ts"],
    exclude: ["node_modules", "dist", "apps"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@class-action-os/shared": path.resolve(__dirname, "packages/shared/src"),
      "@class-action-os/db": path.resolve(__dirname, "packages/db/src"),
      "@class-action-os/source-connectors": path.resolve(__dirname, "packages/source-connectors/src"),
      "@class-action-os/case-normalizer": path.resolve(__dirname, "packages/case-normalizer/src"),
      "@class-action-os/ai-triage": path.resolve(__dirname, "packages/ai-triage/src"),
      "@class-action-os/claimability-engine": path.resolve(__dirname, "packages/claimability-engine/src"),
      "@class-action-os/entity-matcher": path.resolve(__dirname, "packages/entity-matcher/src"),
      "@class-action-os/deadline-monitor": path.resolve(__dirname, "packages/deadline-monitor/src"),
      "@class-action-os/claim-builder": path.resolve(__dirname, "packages/claim-builder/src"),
    },
  },
});
