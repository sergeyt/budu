// One-shot smoke test for the materializer via the internal API.
//   deno run --allow-env --allow-net --allow-read --allow-import \
//     --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
import { api } from "../src/api/client.ts";

const r1 = await api.materialize.upcoming();
console.log("first pass:", r1);

const r2 = await api.materialize.upcoming();
console.log("second pass (should be 0 inserted, idempotent):", r2);
