import { AsyncLocalStorage } from "node:async_hooks";

// Per-async-chain test user. Concurrent requests each get their own store.
export const userALS = new AsyncLocalStorage<{ userId: string }>();

export function withUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return userALS.run({ userId }, fn);
}
