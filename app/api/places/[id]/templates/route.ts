import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin, requireUser } from "@/lib/api-auth";
import { CreateEventTemplate } from "@/lib/validation";
import { errorMiddleware, errors } from "@/lib/error";
import { localTimeToDate } from "@/lib/templates";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
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
  return await prisma.eventTemplate.findMany({
    where: { placeId },
    orderBy: [{ enabled: "desc" }, { dayOfWeek: "asc" }, { localTime: "asc" }],
  });
});

export const POST = errorMiddleware<Params>(async (req, ctx) => {
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

  const body = await req.json();
  const parsed = CreateEventTemplate.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("template", parsed.error.flatten());
  }
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    throw errors.placeNotFound();
  }

  const data = parsed.data;
  const tpl = await prisma.eventTemplate.create({
    data: {
      placeId,
      title: data.title,
      description: data.description ?? null,
      infoUrl: data.infoUrl ?? null,
      dayOfWeek: data.dayOfWeek,
      localTime: localTimeToDate(data.localTime),
      durationMinutes: data.durationMinutes ?? null,
      capacity: data.capacity ?? null,
      reserveCapacity: data.reserveCapacity ?? null,
      announceOffsetMinutes: data.announceOffsetMinutes ?? 1440,
      enabled: data.enabled ?? true,
    },
  });
  return NextResponse.json(tpl, { status: 201 });
});
