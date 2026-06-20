import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin, requireUser } from "@/lib/api-auth";
import { UpdateEventTemplate } from "@/lib/validation";
import { errorMiddleware, errors } from "@/lib/error";
import { localTimeToDate } from "@/lib/templates";

type Params = { id?: string };

async function loadAndAuthorize(templateId: string, userId: string) {
  const tpl = await prisma.eventTemplate.findUnique({
    where: { id: templateId },
  });
  if (!tpl) {
    throw errors.templateNotFound();
  }
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, tpl.placeId));
  if (!allowed) {
    throw errors.forbidden();
  }
  return tpl;
}

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  const { userId } = await requireUser();
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  return await loadAndAuthorize(id, userId);
});

export const PATCH = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  await loadAndAuthorize(id, userId);

  const body = await req.json();
  const parsed = UpdateEventTemplate.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("template", parsed.error.flatten());
  }
  const d = parsed.data;
  const updated = await prisma.eventTemplate.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.infoUrl !== undefined && { infoUrl: d.infoUrl }),
      ...(d.dayOfWeek !== undefined && { dayOfWeek: d.dayOfWeek }),
      ...(d.localTime !== undefined && {
        localTime: localTimeToDate(d.localTime),
      }),
      ...(d.durationMinutes !== undefined && {
        durationMinutes: d.durationMinutes,
      }),
      ...(d.capacity !== undefined && { capacity: d.capacity }),
      ...(d.reserveCapacity !== undefined && {
        reserveCapacity: d.reserveCapacity,
      }),
      ...(d.announceOffsetMinutes !== undefined && {
        announceOffsetMinutes: d.announceOffsetMinutes,
      }),
      ...(d.enabled !== undefined && { enabled: d.enabled }),
    },
  });
  return updated;
});

export const DELETE = errorMiddleware<Params>(async (_req, ctx) => {
  const { userId } = await requireUser();
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  await loadAndAuthorize(id, userId);
  await prisma.eventTemplate.delete({ where: { id } });
  return { ok: true, deleted: id };
});
