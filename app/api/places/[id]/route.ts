import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { UpdatePlace } from "@/lib/validation";
import { errorMiddleware, errors } from "@/lib/error";
import { isValidIanaZone } from "@/lib/templates";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  await requireUser();
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    include: { admins: { include: { user: true } }, events: true },
  });
  if (!place) {
    throw errors.placeNotFound();
  }
  return place;
});

export const PATCH = errorMiddleware<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  await requireUser({ isSuperAdmin: true });
  const body = await req.json();
  const parsed = UpdatePlace.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("place", parsed.error.flatten());
  }
  if (parsed.data.timezone && !isValidIanaZone(parsed.data.timezone)) {
    throw errors.invalidTimezone(parsed.data.timezone);
  }
  const place = await prisma.place.update({
    where: { id: placeId },
    data: parsed.data,
  });
  return place;
});
