// One-shot smoke test for the materializer via the internal API.
//   deno run --allow-env --allow-net --allow-read --allow-import \
//     --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
import { materializeUpcoming } from "../src/api/materialize.ts";

const r1 = await materializeUpcoming();
console.log("first pass:", r1);

const r2 = await materializeUpcoming();
console.log("second pass (should be 0 inserted, idempotent):", r2);
