import { prisma } from "@/lib/prisma";

let cachedTables: string[] | null = null;

async function listUserTables(): Promise<string[]> {
  if (cachedTables) {
    return cachedTables;
  }
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma_%'
  `;
  cachedTables = rows.map((r) => r.tablename);
  return cachedTables;
}

// Truncates all application tables and resets identity sequences. We rely on
// this for per-test isolation rather than transactions because the routes we
// exercise open their own `prisma.$transaction` blocks that would conflict
// with a wrapping outer transaction.
export async function truncateAll(): Promise<void> {
  const tables = await listUserTables();
  if (tables.length === 0) {
    return;
  }
  const list = tables.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export { prisma };
