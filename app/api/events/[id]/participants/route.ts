import { prisma } from "@/lib/prisma";
import { BadRequestError, errorMiddleware } from "@/lib/error";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw new BadRequestError("eventId is required");
  }
  const regs = await prisma.registration.findMany({
    where: { eventId },
    include: { user: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return regs;
});
