import { ensureTestDatabase } from "../helpers/ensure-test-db";

// Runs once before any integration test. Validates the DATABASE_URL points
// at a disposable database (sanity check) and applies all Prisma migrations.
// We deliberately do NOT use prisma migrate reset here so that the same
// database can be reused across local runs with truncate-between-tests.
export default async function globalSetup() {
  ensureTestDatabase("Integration tests");
}
