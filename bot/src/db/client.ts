import postgres from "postgres";
import { loadConfig } from "@/config.ts";

/**
 * Single postgresjs client shared by all queries.
 *
 * `transform: { undefined: null }` mirrors how Prisma writes JSON: avoids the
 * footgun where `undefined` becomes the literal string "undefined" in JSONB.
 */
export const sql = postgres(loadConfig().DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  prepare: true,
  transform: { undefined: null },
  types: {
    // OID 1114 = `timestamp without time zone`. Prisma writes UTC
    // wall-clock components into these columns and reads them back as
    // UTC; postgresjs's default codec parses TIMESTAMP through the
    // connection's session timezone, which silently corrupts values
    // relative to Prisma. Force a UTC interpretation by appending "Z"
    // to the bare TIMESTAMP string before letting `Date` parse it.
    //
    // NOTE: This only fixes the READ path — postgresjs picks codecs by
    // OID on receive but by JS type on send, so the `serialize` here is
    // unused. Writers must explicitly pass an ISO-with-`Z` string
    // (which Postgres strips when casting to `timestamp`).
    timestamp: {
      to: 1114,
      from: [1114],
      serialize: (v: Date | string) =>
        v instanceof Date ? v.toISOString() : String(v),
      parse: (s: string) => new Date(`${s}Z`),
    },
  },
});

export type Sql = typeof sql;

/**
 * Close the pool. Used by smoke scripts and graceful shutdown — the
 * long-running bot just lets `Deno.exit` reap it.
 */
export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
