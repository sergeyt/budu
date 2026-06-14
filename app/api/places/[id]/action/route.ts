import { DateTime } from "luxon";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { errorMiddleware, errors } from "@/lib/error";
import { createLinkCode } from "@/lib/telegramLinkCode";
import { SuperAdminAction } from "@/lib/validation";

type Params = { id?: string };

export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  await requireUser({ isSuperAdmin: true });

  const body = await req.json();
  const parsed = SuperAdminAction.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("action", parsed.error.flatten());
  }

  switch (parsed.data.type) {
    case "telegram_link":
      return generateTelegramLink(placeId);
    case "reuse_event":
      return reuseLatestEvent(placeId);
  }
});

async function generateTelegramLink(placeId: string) {
  const code = createLinkCode(placeId, 15 * 60); // 15 min TTL
  return {
    code,
    instructions: `Open Telegram → DM your bot and send:\n/link ${code}`,
  };
}

async function reuseLatestEvent(placeId: string) {
  return prisma.$transaction(async (tx) => {
    const place = await tx.place.findUnique({ where: { id: placeId } });
    if (!place) {
      throw errors.placeNotFound();
    }
    const event = await tx.event.findFirst({
      where: { placeId },
      orderBy: { startAt: "desc" },
    });
    if (!event) {
      throw errors.noEventInPlace();
    }

    // Schedule the next instance at 19:00 of the current or next day,
    // depending on whether we've already passed 19:00 locally.
    const pivot = DateTime.now();
    const startAt = pivot
      .plus({ day: pivot.get("hour") >= 19 ? 1 : 0 })
      .startOf("day")
      .set({ hour: 19 })
      .toJSDate();

    return tx.event.update({
      where: { id: event.id },
      data: { startAt },
    });
  });
}
