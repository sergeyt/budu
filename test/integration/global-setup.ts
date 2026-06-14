import { execSync } from "node:child_process";

// Runs once before any integration test. Validates the DATABASE_URL points
// at a disposable database (sanity check) and applies all Prisma migrations.
// We deliberately do NOT use prisma migrate reset here so that the same
// database can be reused across local runs with truncate-between-tests.
export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Integration tests require DATABASE_URL pointing at a disposable Postgres instance",
    );
  }

  // Cheap guard: bail if someone accidentally pointed this at a non-test DB.
  // Accept anything that looks intentionally test-y; tweak as your env evolves.
  const looksTestable =
    /test|localhost|127\.0\.0\.1|::1/.test(url) ||
    process.env.ALLOW_NON_TEST_DB === "1";
  if (!looksTestable) {
    throw new Error(
      `Refusing to run integration tests against DATABASE_URL=${url.replace(
        /:\/\/[^@]+@/,
        "://***@",
      )}. Set ALLOW_NON_TEST_DB=1 to override.`,
    );
  }

  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
