import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { errorMiddleware, errors } from "@/lib/error";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  await requireUser();
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const events = await prisma.event.findMany({
    where: { placeId },
    orderBy: { startAt: "asc" },
  });
  return events;
});
