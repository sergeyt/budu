import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { UpdatePlace } from "@/lib/validation";
import { BadRequestError, NotFoundError, errorMiddleware } from "@/lib/error";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  await requireUser();
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw new BadRequestError("placeId is required");
  }
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    include: { admins: { include: { user: true } }, events: true },
  });
  if (!place) {
    throw new NotFoundError("Place not found");
  }
  return place;
});

export const PATCH = errorMiddleware<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw new BadRequestError("placeId is required");
  }
  await requireUser({ isSuperAdmin: true });
  const body = await req.json();
  const parsed = UpdatePlace.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError("Invalid place payload", {
      details: parsed.error.flatten(),
    });
  }
  const place = await prisma.place.update({
    where: { id: placeId },
    data: parsed.data,
  });
  return place;
});
