// Single-shot smoke test for the materializer. Not a Deno.test because
// it touches the live dev DB. Run manually:
//   deno run --allow-env --allow-net --allow-read --allow-import \
//     --env-file=../.env scripts/smoke_materialize.ts
import { materializeUpcoming } from "../src/services/materialize.ts";
import { closeDb, sql } from "../src/db/client.ts";

const r1 = await materializeUpcoming();
console.log("first pass:", r1);

const r2 = await materializeUpcoming();
console.log("second pass (should be 0 inserted, idempotent):", r2);

const rows = await sql`
  SELECT id, title, "startAt", "templateId"
  FROM "Event"
  WHERE "templateId" IS NOT NULL
  ORDER BY "startAt" ASC
  LIMIT 10
`;
console.table(rows);

await closeDb();
