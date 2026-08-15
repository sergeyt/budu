import { prisma } from "@/lib/prisma";
import { requireUser, isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import { errorMiddleware, errors } from "@/lib/error";
import { listPlaceEventsInRange } from "@/lib/calendar";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, placeId));
  if (!allowed) {
    throw errors.forbidden();
  }

  const url = new URL(req.url);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  if (fromRaw && toRaw) {
    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw errors.invalidPayload("range", { from: fromRaw, to: toRaw });
    }
    return await listPlaceEventsInRange({
      placeId,
      from,
      to,
      includeCancelled: true,
    });
  }

  const events = await prisma.event.findMany({
    where: { placeId },
    orderBy: { startAt: "asc" },
  });
  return events;
});
