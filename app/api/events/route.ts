import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import { CreateEvent } from "@/lib/validation";
import { toDateTime } from "@/lib/util";
import { errorMiddleware, errors } from "@/lib/error";

export const POST = errorMiddleware(async (req) => {
  const { userId } = await requireUser();
  const body = await req.json();
  const parsed = CreateEvent.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("event", parsed.error.flatten());
  }
  const { placeId } = parsed.data;
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, placeId));
  if (!allowed) {
    throw errors.forbidden();
  }
  const startDate = toDateTime(parsed.data.startAt);
  if (!startDate.isValid) {
    throw errors.invalidStartAt();
  }
  const event = await prisma.event.create({
    data: { ...parsed.data, startAt: startDate.toJSDate() },
  });
  return NextResponse.json(event, { status: 201 });
});
