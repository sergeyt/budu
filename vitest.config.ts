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
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["lib/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/node_modules/**",
        "lib/prisma.ts",
        "lib/notifications/transports/**",
      ],
      reporter: ["text", "html"],
    },
  },
});
