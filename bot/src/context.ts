import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";

export type SessionData = Record<string, never>;

export type BotContext =
  & Context
  & SessionFlavor<SessionData>
  & ConversationFlavor;
