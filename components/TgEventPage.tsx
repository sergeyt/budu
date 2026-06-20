"use client";

import { useEffect, useState } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { Heading, Text } from "@/ui/index";

type Participant = {
  userId: string;
  status: "CONFIRMED" | "RESERVED";
  displayName: string;
};

type EventInfo = {
  id: string;
  title: string;
  placeName: string;
  startAt: string;
  placeTimezone: string;
  capacity: number | null;
  reserveCapacity: number | null;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        themeParams: Record<string, string>;
      };
    };
  }
}

export default function TgEventPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    const initData = tg?.initData ?? "";
    if (!initData) {
      setError("Open this page from Telegram.");
      return;
    }

    void (async () => {
      try {
        const res = await fetch(`/api/tg/events/${eventId}`, {
          headers: { "x-telegram-init-data": initData },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? res.statusText);
        }
        const data = (await res.json()) as {
          event: EventInfo;
          participants: Participant[];
        };
        setEvent(data.event);
        setParticipants(data.participants);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [eventId]);

  if (error) {
    return (
      <Box p={4}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box p={4}>
        <Text muted>Loading…</Text>
      </Box>
    );
  }

  const when = new Date(event.startAt).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.placeTimezone,
  });

  const confirmed = participants.filter((p) => p.status === "CONFIRMED");
  const reserved = participants.filter((p) => p.status === "RESERVED");

  return (
    <Box p={4} maxW="md" mx="auto">
      <VStack align="stretch" gap={4}>
        <Box>
          <Heading size="md">{event.title}</Heading>
          <Text muted fontSize="sm">
            {event.placeName} · {when}
          </Text>
          {event.capacity != null && (
            <Text fontSize="sm" pt={1}>
              {confirmed.length}/{event.capacity} confirmed
              {event.reserveCapacity != null &&
                ` · ${reserved.length}/${event.reserveCapacity} waitlist`}
            </Text>
          )}
        </Box>

        <Section title={`Confirmed (${confirmed.length})`} items={confirmed} />
        {reserved.length > 0 && (
          <Section title={`Waitlist (${reserved.length})`} items={reserved} />
        )}
      </VStack>
    </Box>
  );
}

function Section({ title, items }: { title: string; items: Participant[] }) {
  return (
    <Box>
      <Text fontWeight="semibold" mb={2}>
        {title}
      </Text>
      {items.length === 0 ? (
        <Text muted fontSize="sm">
          No one yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={1}>
          {items.map((p) => (
            <Text key={p.userId} fontSize="sm">
              {p.displayName}
            </Text>
          ))}
        </VStack>
      )}
    </Box>
  );
}
