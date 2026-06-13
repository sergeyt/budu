import { prisma } from "@/lib/prisma";
import { ChannelType } from "@/types/model";
import { getEffectiveChannelsForEvent } from "./effectiveChannels";
// TODO unify interface of sending message to given chat
import { sendMessage as sendMaxMessage } from "./transports/max";
import { sendTelegramMessage } from "./transports/telegram";
import { getTranslations } from "@/lib/locale";
import { log } from "@/lib/log";

type ChangeType = "REGISTERED" | "WAITLISTED" | "UNREGISTERED" | "PROMOTED";

const PARTICIPANT_LIST_LIMIT = 15;
type User = { name?: string | null; email?: string | null };

function displayName(u?: User) {
  return (u?.name || u?.email || "Anonymous").trim();
}

export async function notifyEventChange(opts: {
  req: Request;
  eventId: string;
  type: ChangeType;
  actor?: string | null;
}) {
  const event = await prisma.event.findUnique({
    where: { id: opts.eventId },
    include: { place: true },
  });
  if (!event) {
    log.warn("notifyEventChange: event not found", { eventId: opts.eventId });
    return;
  }

  const channels = await getEffectiveChannelsForEvent(event.id);
  if (!channels.length) {
    log.info("notifyEventChange: no connected channels", {
      eventId: event.id,
    });
    return;
  }

  const t = await getTranslations(opts.req, "notifications");

  // Current counts
  const [confirmedCount, reservedCount] = await Promise.all([
    prisma.registration.count({
      where: { eventId: event.id, status: "CONFIRMED" },
    }),
    prisma.registration.count({
      where: { eventId: event.id, status: "RESERVED" },
    }),
  ]);

  // Pull participants (ordered: CONFIRMED first by createdAt, then RESERVED)
  const regs = await prisma.registration.findMany({
    where: { eventId: event.id },
    include: { user: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }], // "CONFIRMED" < "RESERVED"
  });

  // Prepare a compact list up to PARTICIPANT_LIST_LIMIT
  const confirmed = regs.filter((r) => r.status === "CONFIRMED");
  const reserved = regs.filter((r) => r.status === "RESERVED");

  const merged = [...confirmed, ...reserved];
  const truncated = merged.slice(0, PARTICIPANT_LIST_LIMIT);
  const remaining = merged.length - truncated.length;

  const participants = truncated.map((r) => {
    const icon = r.status === "CONFIRMED" ? "✅" : "⏳";
    return `${icon} ${displayName(r.user)}`;
  });

  // Header lines
  const when = new Date(event.startAt).toLocaleString();
  const place = event.place.name;
  const actor = opts.actor ?? "Someone";

  const lines: string[] = [];
  lines.push(t("header", { place, event: event.title, when }));

  const translationMap = {
    REGISTERED: "registered",
    WAITLISTED: "waitlisted",
    UNREGISTERED: "unregistered",
    PROMOTED: "promoted",
  };
  lines.push(t(translationMap[opts.type], { actor }));

  lines.push(
    t("counts", { confirmed: confirmedCount, reserved: reservedCount }),
  );

  // Participants section
  lines.push("");
  if (remaining > 0) {
    const limit = PARTICIPANT_LIST_LIMIT;
    lines.push(t("participants_header_limit", { limit }));
  } else {
    lines.push(t("participants_header"));
  }

  lines.push(...participants);

  if (remaining > 0) {
    lines.push(t("more_participants", { count: remaining }));
  }

  const text = lines.join("\n");

  for (const channel of channels) {
    switch (channel.type) {
      case ChannelType.TELEGRAM:
        await sendTelegramMessage({
          chatId: channel.target,
          parseMode: "MarkdownV2",
          text,
        });
        break;
      case ChannelType.MAX:
        await sendMaxMessage(channel.target, text);
        break;
    }
  }
}
