import { prisma } from "@/lib/prisma";

/**
 * Canonical participants query: confirmed list first (ordered by signup
 * time), reserved list second (also ordered by signup time). Used by both
 * GET /api/events/:id/participants and POST/DELETE on the register route
 * so clients can update local state from a single response.
 */
export function fetchParticipants(eventId: string) {
  return prisma.registration.findMany({
    where: { eventId },
    include: { user: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}
