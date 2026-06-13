import { prisma } from "@/lib/prisma";
import type { ChannelType } from "@/types/model";

export type Channel = {
  type: ChannelType;
  target: string;
  meta?: Record<string, unknown> | null;
  label?: string | null;
};

/**
 * Resolve the notification channels that apply to an event:
 * - event-level channels override place-level channels of the same type
 * - place-level channels of types not configured at the event level apply unchanged
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
  const placeChannels = event.place.channels as Channel[];
  const eventTypes = new Set(eventChannels.map((c) => c.type));

  return [
    ...eventChannels,
    ...placeChannels.filter((c) => !eventTypes.has(c.type)),
  ];
}
