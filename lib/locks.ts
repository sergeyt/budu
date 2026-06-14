import type { Prisma } from "@prisma/client";

/**
 * Postgres-only advisory locking helpers.
 *
 * Advisory locks are pure-advisory: they don't touch any row, don't affect
 * readers, and are released automatically when the transaction commits or
 * aborts (via the `_xact_` variant). The lock key is derived from a string
 * by `hashtextextended` into a bigint; collisions across distinct keys are
 * statistically negligible for our workload (millions of distinct keys).
 *
 * If you migrate off Postgres, swap the implementations here:
 *   - MySQL:        GET_LOCK(name, timeout) / RELEASE_LOCK(name)
 *   - SQL Server:   sp_getapplock / sp_releaseapplock
 *   - CockroachDB:  use SERIALIZABLE isolation + retry instead
 *   - Engine-portable fallback: SELECT ... FOR UPDATE on a sentinel row
 */

/**
 * Acquire a transaction-scoped advisory lock keyed by an arbitrary string.
 * Any other transaction that calls this with the same key will block until
 * the holding transaction completes.
 */
export async function acquireAdvisoryLock(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

/**
 * Serialize concurrent register/unregister calls for a given event so that
 * the `count → decide-status → create` sequence is atomic with respect to
 * the event's configured capacity.
 *
 * Namespaced so unrelated lock domains (e.g. event export, soft-delete)
 * don't share a hash bucket and don't pointlessly block each other.
 */
export function lockEventForRegistration(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<void> {
  return acquireAdvisoryLock(tx, `event:register:${eventId}`);
}
