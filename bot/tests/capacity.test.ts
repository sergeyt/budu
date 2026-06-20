import { assertEquals } from "jsr:@std/assert@^1.0.0";
import {
  decideRegistrationStatus,
  shouldPromoteFromWaitlist,
} from "../src/services/capacity.ts";

// Mirror of test/lib/registration.test.ts in the Next app. Keep these in
// sync — if you change the FSM you have to change both copies.

Deno.test("decideRegistrationStatus: confirms when room on confirmed list", () => {
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 0,
      reserveCount: 0,
      confirmedCap: 10,
      reserveCap: 5,
    }),
    "CONFIRMED",
  );
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 9,
      reserveCount: 0,
      confirmedCap: 10,
      reserveCap: 5,
    }),
    "CONFIRMED",
  );
});

Deno.test("decideRegistrationStatus: waitlists when full but reserve has room", () => {
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 10,
      reserveCount: 0,
      confirmedCap: 10,
      reserveCap: 5,
    }),
    "RESERVED",
  );
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 10,
      reserveCount: 4,
      confirmedCap: 10,
      reserveCap: 5,
    }),
    "RESERVED",
  );
});

Deno.test("decideRegistrationStatus: FULL when both lists are at capacity", () => {
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 10,
      reserveCount: 5,
      confirmedCap: 10,
      reserveCap: 5,
    }),
    "FULL",
  );
});

Deno.test("decideRegistrationStatus: null/undefined caps mean unlimited", () => {
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 1_000_000,
      reserveCount: 0,
      confirmedCap: null,
      reserveCap: null,
    }),
    "CONFIRMED",
  );
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 1_000_000,
      reserveCount: 0,
      confirmedCap: undefined,
      reserveCap: 0,
    }),
    "CONFIRMED",
  );
});

Deno.test("decideRegistrationStatus: confirmedCap=0 falls through to reserve", () => {
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 0,
      reserveCount: 0,
      confirmedCap: 0,
      reserveCap: 5,
    }),
    "RESERVED",
  );
});

Deno.test("decideRegistrationStatus: both caps 0 is FULL", () => {
  assertEquals(
    decideRegistrationStatus({
      confirmedCount: 0,
      reserveCount: 0,
      confirmedCap: 0,
      reserveCap: 0,
    }),
    "FULL",
  );
});

Deno.test("shouldPromoteFromWaitlist", () => {
  assertEquals(
    shouldPromoteFromWaitlist({ confirmedCount: 9, confirmedCap: 10 }),
    true,
  );
  assertEquals(
    shouldPromoteFromWaitlist({ confirmedCount: 10, confirmedCap: 10 }),
    false,
  );
  assertEquals(
    shouldPromoteFromWaitlist({ confirmedCount: 11, confirmedCap: 10 }),
    false,
  );
  assertEquals(
    shouldPromoteFromWaitlist({ confirmedCount: 1000, confirmedCap: null }),
    true,
  );
});
