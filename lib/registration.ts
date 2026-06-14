/**
 * Pure decision logic for event registration.
 *
 * Kept free of any I/O so it can be exhaustively unit-tested. All capacity
 * fields accept `null | undefined` and are treated as "unlimited" in that
 * case (matching how the `Event` schema models them).
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

/**
 * Decide what status a new registration should have, given current counts and
 * caps. Returns "FULL" if neither list has room.
 */
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

/**
 * After someone unregisters from the CONFIRMED list, decide whether the next
 * waitlister should be promoted. Pass the post-unregister CONFIRMED count.
 */
export function shouldPromoteFromWaitlist(input: {
  confirmedCount: number;
  confirmedCap: number | null | undefined;
}): boolean {
  return input.confirmedCount < cap(input.confirmedCap);
}
