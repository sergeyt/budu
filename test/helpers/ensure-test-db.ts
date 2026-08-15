import { execSync } from "node:child_process";

/** Refuse non-disposable DATABASE_URL values, then apply Prisma migrations. */
export function ensureTestDatabase(kind: string): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      `${kind} require DATABASE_URL pointing at a disposable Postgres instance`,
    );
  }

  const looksTestable =
    /test|localhost|127\.0\.0\.1|::1/.test(url) ||
    process.env.ALLOW_NON_TEST_DB === "1";
  if (!looksTestable) {
    throw new Error(
      `Refusing to run ${kind} against DATABASE_URL=${url.replace(
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
