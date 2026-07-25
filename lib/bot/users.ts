import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BotUserDto } from "@/lib/bot/types";
import { verifyUserLinkCode } from "@/lib/telegramLinkCode";
import { errors } from "@/lib/error";

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

  return toDto(user);
}

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  telegramUserId: bigint | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  _count: { accounts: number };
};

function isRealOAuthUser(user: UserRow): boolean {
  return !!user.email || user._count.accounts > 0;
}

function toDto(user: {
  id: string;
  name: string | null;
  telegramUserId: bigint | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
}): BotUserDto {
  return {
    id: user.id,
    name: user.name,
    telegramUserId: user.telegramUserId?.toString() ?? null,
    telegramUsername: user.telegramUsername,
    telegramFirstName: user.telegramFirstName,
  };
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  telegramUserId: true,
  telegramUsername: true,
  telegramFirstName: true,
  _count: { select: { accounts: true } },
} as const;

/**
 * Attach a Telegram identity to a Budu user identified by a short-lived
 * HMAC link code (minted via `POST /api/me/telegram-link`).
 *
 * Merges bot-only orphan rows that already hold this telegramUserId;
 * refuses to steal the id from another OAuth-backed user.
 */
export async function linkTelegramAccount(input: {
  code: string;
  telegramUserId: number;
  username?: string;
  firstName?: string;
}): Promise<BotUserDto> {
  const verified = verifyUserLinkCode(input.code);
  if (!verified.ok) {
    throw errors.invalidUserLinkCode(verified.error);
  }

  const tid = BigInt(input.telegramUserId);
  const username = input.username ?? null;
  const firstName = input.firstName ?? null;

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: verified.userId },
      select: userSelect,
    });
    if (!target) {
      throw errors.userNotFound();
    }

    if (target.telegramUserId != null) {
      if (target.telegramUserId === tid) {
        const updated = await tx.user.update({
          where: { id: target.id },
          data: {
            telegramUsername: username,
            telegramFirstName: firstName,
          },
          select: userSelect,
        });
        return toDto(updated);
      }
      throw errors.telegramAlreadyLinked();
    }

    const owner = await tx.user.findUnique({
      where: { telegramUserId: tid },
      select: userSelect,
    });

    if (owner && owner.id !== target.id) {
      if (isRealOAuthUser(owner)) {
        throw errors.telegramOwnedByOtherUser();
      }
      await mergeOrphanTelegramUser(tx, owner.id, target.id);
    }

    const updated = await tx.user.update({
      where: { id: target.id },
      data: {
        telegramUserId: tid,
        telegramUsername: username,
        telegramFirstName: firstName,
      },
      select: userSelect,
    });
    return toDto(updated);
  });
}

async function mergeOrphanTelegramUser(
  tx: Prisma.TransactionClient,
  orphanId: string,
  targetId: string,
): Promise<void> {
  // Free the unique telegramUserId before assigning it to the target.
  await tx.user.update({
    where: { id: orphanId },
    data: {
      telegramUserId: null,
      telegramUsername: null,
      telegramFirstName: null,
    },
  });

  const orphanRegs = await tx.registration.findMany({
    where: { userId: orphanId },
    select: { id: true, eventId: true },
  });
  for (const reg of orphanRegs) {
    const clash = await tx.registration.findUnique({
      where: {
        userId_eventId: { userId: targetId, eventId: reg.eventId },
      },
      select: { id: true },
    });
    if (clash) {
      await tx.registration.delete({ where: { id: reg.id } });
    } else {
      await tx.registration.update({
        where: { id: reg.id },
        data: { userId: targetId },
      });
    }
  }

  const orphanAdmins = await tx.placeAdmin.findMany({
    where: { userId: orphanId },
    select: { id: true, placeId: true },
  });
  for (const admin of orphanAdmins) {
    const clash = await tx.placeAdmin.findUnique({
      where: {
        userId_placeId: { userId: targetId, placeId: admin.placeId },
      },
      select: { id: true },
    });
    if (clash) {
      await tx.placeAdmin.delete({ where: { id: admin.id } });
    } else {
      await tx.placeAdmin.update({
        where: { id: admin.id },
        data: { userId: targetId },
      });
    }
  }

  await tx.user.delete({ where: { id: orphanId } });
}
