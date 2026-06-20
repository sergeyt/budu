/**
 * Pure registration FSM. Duplicated bit-for-bit from
 * lib/registration.ts in the Next app. Keep in sync — covered by the
 * mirrored test in tests/capacity.test.ts.
 */

export type RegistrationDecision = "CONFIRMED" | "RESERVED" | "FULL";

export type CapacityState = {
  confirmedCount: number;
  reserveCount: number;
  confirmedCap: number | null | undefined;
  reserveCap: number | null | undefined;
};

function cap(value: number | null | undefined): number {
  return typeof value === "number" ? value : Number.POSITIVE_INFINITY;
}

export function decideRegistrationStatus(
  state: CapacityState,
): RegistrationDecision {
  const confirmedCap = cap(state.confirmedCap);
  const reserveCap = cap(state.reserveCap);
  if (state.confirmedCount < confirmedCap) {
    return "CONFIRMED";
  }
  if (state.reserveCount < reserveCap) {
    return "RESERVED";
  }
  return "FULL";
}

export function shouldPromoteFromWaitlist(input: {
  confirmedCount: number;
  confirmedCap: number | null | undefined;
}): boolean {
  return input.confirmedCount < cap(input.confirmedCap);
}
