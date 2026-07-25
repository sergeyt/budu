import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserLinkCode } from "@/lib/telegramLinkCode";
import { ConflictError, NotFoundError, BadRequestError } from "@/lib/error";

const {
  findUnique,
  update,
  deleteUser,
  findManyRegs,
  findUniqueReg,
  updateReg,
  findManyAdmins,
  findUniqueAdmin,
  updateAdmin,
  transaction,
} = vi.hoisted(() => {
  const findUnique = vi.fn();
  const update = vi.fn();
  const deleteUser = vi.fn();
  const findManyRegs = vi.fn();
  const findUniqueReg = vi.fn();
  const deleteReg = vi.fn();
  const updateReg = vi.fn();
  const findManyAdmins = vi.fn();
  const findUniqueAdmin = vi.fn();
  const deleteAdmin = vi.fn();
  const updateAdmin = vi.fn();
  const tx = {
    user: { findUnique, update, delete: deleteUser },
    registration: {
      findMany: findManyRegs,
      findUnique: findUniqueReg,
      delete: deleteReg,
      update: updateReg,
    },
    placeAdmin: {
      findMany: findManyAdmins,
      findUnique: findUniqueAdmin,
      delete: deleteAdmin,
      update: updateAdmin,
    },
  };
  const transaction = vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx));
  return {
    findUnique,
    update,
    deleteUser,
    findManyRegs,
    findUniqueReg,
    updateReg,
    findManyAdmins,
    findUniqueAdmin,
    updateAdmin,
    transaction,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    user: { findUnique, update, delete: deleteUser },
  },
}));

import { linkTelegramAccount } from "@/lib/bot/users";

function row(
  partial: Partial<{
    id: string;
    name: string | null;
    email: string | null;
    telegramUserId: bigint | null;
    telegramUsername: string | null;
    telegramFirstName: string | null;
    accounts: number;
  }>,
) {
  return {
    id: partial.id ?? "user_1",
    name: partial.name ?? "Ada",
    email: partial.email ?? null,
    telegramUserId: partial.telegramUserId ?? null,
    telegramUsername: partial.telegramUsername ?? null,
    telegramFirstName: partial.telegramFirstName ?? null,
    _count: { accounts: partial.accounts ?? 0 },
  };
}

describe("linkTelegramAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyRegs.mockResolvedValue([]);
    findManyAdmins.mockResolvedValue([]);
  });

  it("attaches telegram id to a clean target user", async () => {
    const code = createUserLinkCode("web_user");
    const target = row({ id: "web_user", email: "a@b.c", accounts: 1 });
    findUnique
      .mockResolvedValueOnce(target) // target by id
      .mockResolvedValueOnce(null); // no owner
    update.mockResolvedValueOnce(
      row({
        id: "web_user",
        email: "a@b.c",
        accounts: 1,
        telegramUserId: 42n,
        telegramUsername: "ada",
        telegramFirstName: "Ada",
      }),
    );

    const result = await linkTelegramAccount({
      code,
      telegramUserId: 42,
      username: "ada",
      firstName: "Ada",
    });

    expect(result).toEqual({
      id: "web_user",
      name: "Ada",
      telegramUserId: "42",
      telegramUsername: "ada",
      telegramFirstName: "Ada",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "web_user" },
        data: expect.objectContaining({ telegramUserId: 42n }),
      }),
    );
  });

  it("is idempotent when the same telegram id is already linked", async () => {
    const code = createUserLinkCode("web_user");
    findUnique.mockResolvedValueOnce(
      row({
        id: "web_user",
        email: "a@b.c",
        accounts: 1,
        telegramUserId: 42n,
      }),
    );
    update.mockResolvedValueOnce(
      row({
        id: "web_user",
        email: "a@b.c",
        accounts: 1,
        telegramUserId: 42n,
        telegramUsername: "ada",
        telegramFirstName: "Ada",
      }),
    );

    const result = await linkTelegramAccount({
      code,
      telegramUserId: 42,
      username: "ada",
      firstName: "Ada",
    });
    expect(result.telegramUserId).toBe("42");
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("rejects when target already has a different telegram id", async () => {
    const code = createUserLinkCode("web_user");
    findUnique.mockResolvedValueOnce(
      row({
        id: "web_user",
        email: "a@b.c",
        accounts: 1,
        telegramUserId: 99n,
      }),
    );

    await expect(
      linkTelegramAccount({ code, telegramUserId: 42 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects when telegram id belongs to another OAuth user", async () => {
    const code = createUserLinkCode("web_user");
    findUnique
      .mockResolvedValueOnce(
        row({ id: "web_user", email: "a@b.c", accounts: 1 }),
      )
      .mockResolvedValueOnce(
        row({
          id: "other_oauth",
          email: "x@y.z",
          accounts: 1,
          telegramUserId: 42n,
        }),
      );

    await expect(
      linkTelegramAccount({ code, telegramUserId: 42 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("merges a bot-only orphan that already owns the telegram id", async () => {
    const code = createUserLinkCode("web_user");
    const target = row({ id: "web_user", email: "a@b.c", accounts: 1 });
    const orphan = row({
      id: "tg_orphan",
      telegramUserId: 42n,
      accounts: 0,
    });
    findUnique.mockResolvedValueOnce(target).mockResolvedValueOnce(orphan);
    update
      .mockResolvedValueOnce(orphan) // clear orphan telegram
      .mockResolvedValueOnce(
        row({
          id: "web_user",
          email: "a@b.c",
          accounts: 1,
          telegramUserId: 42n,
          telegramUsername: "ada",
        }),
      );
    findManyRegs.mockResolvedValueOnce([{ id: "reg1", eventId: "ev1" }]);
    findUniqueReg.mockResolvedValueOnce(null);
    updateReg.mockResolvedValueOnce({});
    findManyAdmins.mockResolvedValueOnce([{ id: "pa1", placeId: "pl1" }]);
    findUniqueAdmin.mockResolvedValueOnce(null);
    updateAdmin.mockResolvedValueOnce({});
    deleteUser.mockResolvedValueOnce({});

    const result = await linkTelegramAccount({
      code,
      telegramUserId: 42,
      username: "ada",
    });

    expect(result.telegramUserId).toBe("42");
    expect(updateReg).toHaveBeenCalledWith({
      where: { id: "reg1" },
      data: { userId: "web_user" },
    });
    expect(updateAdmin).toHaveBeenCalledWith({
      where: { id: "pa1" },
      data: { userId: "web_user" },
    });
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "tg_orphan" } });
  });

  it("rejects a bad code", async () => {
    await expect(
      linkTelegramAccount({ code: "not-a-code", telegramUserId: 42 }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects when the target user is missing", async () => {
    const code = createUserLinkCode("missing");
    findUnique.mockResolvedValueOnce(null);
    await expect(
      linkTelegramAccount({ code, telegramUserId: 42 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
