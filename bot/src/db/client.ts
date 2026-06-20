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
});

export type Sql = typeof sql;
