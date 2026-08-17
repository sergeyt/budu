import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { CreatePlace } from "@/lib/validation";
import { errorMiddleware, errors } from "@/lib/error";
import { isValidIanaZone } from "@/lib/templates";

export const GET = errorMiddleware(async () => {
  const places = await prisma.place.findMany({ orderBy: { name: "asc" } });
  return places;
});

export const POST = errorMiddleware(async (req) => {
  await requireUser({ isSuperAdmin: true });
  const body = await req.json();
  const parsed = CreatePlace.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("place", parsed.error.flatten());
  }
  if (parsed.data.timezone && !isValidIanaZone(parsed.data.timezone)) {
    throw errors.invalidTimezone(parsed.data.timezone);
  }
  try {
    const place = await prisma.place.create({ data: parsed.data });
    return NextResponse.json(place, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw errors.placeNameTaken();
    }
    throw err;
  }
});
