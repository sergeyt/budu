import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/lib": r("./lib"),
      "@/types": r("./types"),
      "@/components": r("./components"),
      "@/ui": r("./ui"),
      "@/app": r("./app"),
      "@/prisma": r("./prisma"),
      "@/theme": r("./theme"),
    },
  },
  test: {
    environment: "node",
    include: ["test/integration/**/*.test.ts"],
    globalSetup: ["test/integration/global-setup.ts"],
    setupFiles: ["test/integration/setup.ts"],
    globals: false,
    // Integration tests share one Postgres database and rely on per-test
    // truncation for isolation. Running files in parallel would cause
    // cross-test interference, so we serialize file execution.
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
