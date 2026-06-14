import { DateTime } from "luxon";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { errorMiddleware, errors } from "@/lib/error";
import { createLinkCode } from "@/lib/telegramLinkCode";

enum ActionType {
  REUSE_EVENT = "reuse_event",
  TELEGRAM_LINK = "telegram_link",
}

type Params = { id?: string };

export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { params } = ctx;
  const { id: placeId } = await params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  await requireUser({ isSuperAdmin: true });
  const body = await req.json();

  // TODO validate payload

  if (body.type === ActionType.TELEGRAM_LINK) {
    return generateTelegramLink(placeId);
  }

  await prisma.$transaction(async (tx) => {
    const place = await tx.place.findUnique({ where: { id: placeId } });
    if (!place) {
      throw errors.placeNotFound();
    }

    switch (body.type) {
      case ActionType.REUSE_EVENT: {
        const event = await tx.event.findFirst({
          where: { placeId },
          orderBy: { startAt: "desc" },
        });
        if (!event) {
          throw errors.noEventInPlace();
        }

        const pivot = DateTime.now();
        const startAt = pivot
          .plus({ day: pivot.get("hour") >= 19 ? 1 : 0 })
          .startOf("day")
          .set({ hour: 19 })
          .toJSDate();

        const res = await tx.event.update({
          where: { id: event.id },
          data: {
            startAt,
          },
        });
        return res;
      }
      default:
        throw new Error(`Unknown action type: ${body.type}`);
    }
  });
});

async function generateTelegramLink(placeId: string) {
  const code = createLinkCode(placeId, 15 * 60); // 15 min TTL
  return {
    code,
    instructions: `Open Telegram → DM your bot and send:\n/link ${code}`,
  };
}
