import { prisma } from "@/lib/prisma";
import type { BotUserDto } from "@/lib/bot/types";

export async function findOrCreateTelegramUser(input: {
  telegramUserId: number;
  username?: string;
  firstName?: string;
}): Promise<BotUserDto> {
  const tid = BigInt(input.telegramUserId);
  const username = input.username ?? null;
  const firstName = input.firstName ?? null;
  const idHint = `tg_${input.telegramUserId}_${crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)}`;

  const user = await prisma.user.upsert({
    where: { telegramUserId: tid },
    create: {
      id: idHint,
      name: firstName,
      telegramUserId: tid,
      telegramUsername: username,
      telegramFirstName: firstName,
    },
    update: {
      telegramUsername: username,
      telegramFirstName: firstName,
    },
    select: {
      id: true,
      name: true,
      telegramUserId: true,
      telegramUsername: true,
      telegramFirstName: true,
    },
  });

  return {
    id: user.id,
    name: user.name,
    telegramUserId: user.telegramUserId?.toString() ?? null,
    telegramUsername: user.telegramUsername,
    telegramFirstName: user.telegramFirstName,
  };
}
