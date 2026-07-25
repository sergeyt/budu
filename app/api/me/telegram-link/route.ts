import { errorMiddleware } from "@/lib/error";
import { requireUser } from "@/lib/api-auth";
import { createUserLinkCode } from "@/lib/telegramLinkCode";

/** Mint a short-lived code for `/link_account` in the Telegram bot. */
export const POST = errorMiddleware(async () => {
  const { userId } = await requireUser();
  const code = createUserLinkCode(userId);
  return {
    code,
    instructions: `Open Telegram → DM your bot and send:\n/link_account ${code}`,
  };
});
