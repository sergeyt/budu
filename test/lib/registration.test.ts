import { describe, expect, it } from "vitest";
import {
  decideRegistrationStatus,
  shouldPromoteFromWaitlist,
} from "@/lib/registration";

describe("decideRegistrationStatus", () => {
  it("confirms when there is room on the confirmed list", () => {
    expect(
      decideRegistrationStatus({
        confirmedCount: 0,
        reserveCount: 0,
        confirmedCap: 10,
        reserveCap: 5,
      }),
    ).toBe("CONFIRMED");

    expect(
      decideRegistrationStatus({
        confirmedCount: 9,
        reserveCount: 0,
        confirmedCap: 10,
        reserveCap: 5,
      }),
    ).toBe("CONFIRMED");
  });

  it("waitlists when confirmed is full but reserve has room", () => {
    expect(
      decideRegistrationStatus({
        confirmedCount: 10,
        reserveCount: 0,
        confirmedCap: 10,
        reserveCap: 5,
      }),
    ).toBe("RESERVED");

    expect(
      decideRegistrationStatus({
        confirmedCount: 10,
        reserveCount: 4,
        confirmedCap: 10,
        reserveCap: 5,
      }),
    ).toBe("RESERVED");
  });

  it("returns FULL when both lists are at capacity", () => {
    expect(
      decideRegistrationStatus({
        confirmedCount: 10,
        reserveCount: 5,
        confirmedCap: 10,
        reserveCap: 5,
      }),
    ).toBe("FULL");
  });

  it("treats null/undefined caps as unlimited", () => {
    expect(
      decideRegistrationStatus({
        confirmedCount: 1_000_000,
        reserveCount: 0,
        confirmedCap: null,
        reserveCap: null,
      }),
    ).toBe("CONFIRMED");

    expect(
      decideRegistrationStatus({
        confirmedCount: 1_000_000,
        reserveCount: 0,
        confirmedCap: undefined,
        reserveCap: 0,
      }),
    ).toBe("CONFIRMED");
  });

  it("respects a confirmedCap of 0 and waitlists onto reserve", () => {
    expect(
      decideRegistrationStatus({
        confirmedCount: 0,
        reserveCount: 0,
        confirmedCap: 0,
        reserveCap: 5,
      }),
    ).toBe("RESERVED");
  });

  it("returns FULL when confirmedCap is 0 and reserveCap is 0", () => {
    expect(
      decideRegistrationStatus({
        confirmedCount: 0,
        reserveCount: 0,
        confirmedCap: 0,
        reserveCap: 0,
      }),
    ).toBe("FULL");
  });
});

describe("shouldPromoteFromWaitlist", () => {
  it("promotes when confirmed has room", () => {
    expect(
      shouldPromoteFromWaitlist({ confirmedCount: 9, confirmedCap: 10 }),
    ).toBe(true);
  });

  it("does not promote when confirmed is at capacity", () => {
    expect(
      shouldPromoteFromWaitlist({ confirmedCount: 10, confirmedCap: 10 }),
    ).toBe(false);
  });

  it("does not promote when confirmed is over capacity", () => {
    expect(
      shouldPromoteFromWaitlist({ confirmedCount: 11, confirmedCap: 10 }),
    ).toBe(false);
  });

  it("always promotes when capacity is unlimited", () => {
    expect(
      shouldPromoteFromWaitlist({ confirmedCount: 1_000, confirmedCap: null }),
    ).toBe(true);
    expect(
      shouldPromoteFromWaitlist({
        confirmedCount: 1_000,
        confirmedCap: undefined,
      }),
    ).toBe(true);
  });
});
