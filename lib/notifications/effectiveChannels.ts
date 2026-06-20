import { prisma } from "@/lib/prisma";
import type { ChannelType } from "@/types/model";

export type Channel = {
  type: ChannelType;
  target: string;
  meta?: Record<string, unknown> | null;
  label?: string | null;
};

/**
 * Resolve notification channels for an event. Precedence per `type`:
 *   event-level overrides template-level overrides place-level.
 */
export async function getEffectiveChannelsForEvent(
  eventId: string,
): Promise<Channel[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      placeId: true,
      channels: {
        select: {
          type: true,
          target: true,
          meta: true,
          label: true,
        },
      },
      template: {
        select: {
          channels: {
            select: { type: true, target: true, meta: true, label: true },
          },
        },
      },
      place: {
        select: {
          channels: {
            select: { type: true, target: true, meta: true, label: true },
          },
        },
      },
    },
  });
  if (!event) {
    return [];
  }

  const eventChannels = event.channels as Channel[];
  const templateChannels = (event.template?.channels ?? []) as Channel[];
  const placeChannels = event.place.channels as Channel[];

  const covered = new Set(eventChannels.map((c) => c.type));
  const fromTemplate = templateChannels.filter((c) => !covered.has(c.type));
  for (const c of fromTemplate) {
    covered.add(c.type);
  }
  const fromPlace = placeChannels.filter((c) => !covered.has(c.type));

  return [...eventChannels, ...fromTemplate, ...fromPlace];
}
