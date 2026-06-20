import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { canRegisterNow } from "../src/services/registrationWindow.ts";

Deno.test("canRegisterNow: closed before 24h window", () => {
  const start = new Date("2026-06-25T19:00:00.000Z");
  const now = new Date("2026-06-24T18:59:59.000Z");
  assertEquals(canRegisterNow(start, now), false);
});

Deno.test("canRegisterNow: open at exactly 24h before start", () => {
  const start = new Date("2026-06-25T19:00:00.000Z");
  const now = new Date("2026-06-24T19:00:00.000Z");
  assertEquals(canRegisterNow(start, now), true);
});

Deno.test("canRegisterNow: open just before start", () => {
  const start = new Date("2026-06-25T19:00:00.000Z");
  const now = new Date("2026-06-25T18:59:59.000Z");
  assertEquals(canRegisterNow(start, now), true);
});

Deno.test("canRegisterNow: closed at start time", () => {
  const start = new Date("2026-06-25T19:00:00.000Z");
  const now = new Date("2026-06-25T19:00:00.000Z");
  assertEquals(canRegisterNow(start, now), false);
});

Deno.test("canRegisterNow: closed after start", () => {
  const start = new Date("2026-06-25T19:00:00.000Z");
  const now = new Date("2026-06-25T19:00:01.000Z");
  assertEquals(canRegisterNow(start, now), false);
});
