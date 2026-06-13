import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { CreatePlace } from "@/lib/validation";
import { BadRequestError, errorMiddleware } from "@/lib/error";

export const GET = errorMiddleware(async () => {
  const places = await prisma.place.findMany({ orderBy: { name: "asc" } });
  return places;
});

export const POST = errorMiddleware(async (req) => {
  await requireUser({ isSuperAdmin: true });
  const body = await req.json();
  const parsed = CreatePlace.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError("Invalid place payload", {
      details: parsed.error.flatten(),
    });
  }
  const place = await prisma.place.create({ data: parsed.data });
  return NextResponse.json(place, { status: 201 });
});
