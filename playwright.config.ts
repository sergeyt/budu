import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

const e2eEnv = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret",
  AUTH_URL: baseURL,
  AUTH_TRUST_HOST: "true",
  AUTH_PASSWORD_LOGIN: "1",
  NEXT_PUBLIC_PASSWORD_LOGIN: "1",
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ]
    : [
        ["list"],
        ["html", { open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    headless: process.env.E2E_HEADED !== "1",
    launchOptions: process.env.E2E_HEADED === "1" ? { slowMo: 400 } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_REUSE_SERVER
    ? undefined
    : {
        command: process.env.CI
          ? `pnpm build && pnpm exec next start -p ${PORT}`
          : `pnpm exec next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
        env: e2eEnv,
      },
});
