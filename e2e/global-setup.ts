import { ensureTestDatabase } from "../test/helpers/ensure-test-db";

export default async function globalSetup() {
  ensureTestDatabase("e2e tests");
}
