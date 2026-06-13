import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperAdmin, isPlaceAdmin } from "@/lib/api-auth";
import { AddPlaceAdmin } from "@/lib/validation";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  errorMiddleware,
} from "@/lib/error";

type Params = { id?: string };

export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw new BadRequestError("placeId is required");
  }
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, placeId));
  if (!allowed) {
    throw new ForbiddenError();
  }
  const body = await req.json();
  const parsed = AddPlaceAdmin.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError("Invalid admin payload", {
      details: parsed.error.flatten(),
    });
  }
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.userEmail },
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const admin = await prisma.placeAdmin.upsert({
    where: { userId_placeId: { userId: user.id, placeId } },
    create: { userId: user.id, placeId },
    update: {},
  });
  return NextResponse.json(admin, { status: 201 });
});
