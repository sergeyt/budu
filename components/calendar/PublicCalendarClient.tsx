"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, HStack } from "@chakra-ui/react";
import { Heading, Text } from "@/ui/index";
import PlaceCalendar, {
  type CalendarEventItem,
} from "@/components/calendar/PlaceCalendar";
import EventDetailDrawer, {
  type EventDetailData,
} from "@/components/calendar/EventDetailDrawer";

type PlaceInfo = { id: string; name: string; timezone: string };

export default function PublicCalendarClient({
  placeId,
  initialPlace,
}: {
  placeId: string;
  initialPlace: PlaceInfo;
}) {
  const t = useTranslations("calendar");
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [place, setPlace] = useState<PlaceInfo>(initialPlace);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("event"),
  );
  const [detail, setDetail] = useState<EventDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const loadRange = useCallback(
    async (from: Date, to: Date) => {
      try {
        const res = await fetch(
          `/api/places/${encodeURIComponent(placeId)}/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? res.statusText);
        }
        const data = (await res.json()) as {
          place: PlaceInfo;
          events: CalendarEventItem[];
        };
        setPlace(data.place);
        setEvents(data.events);
        setRangeError(null);
      } catch (e) {
        setRangeError(e instanceof Error ? e.message : t("load_failed"));
      }
    },
    [placeId, t],
  );

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/places/${encodeURIComponent(placeId)}/calendar/events/${selectedId}`,
        );
        if (!res.ok) {
          throw new Error("Failed to load event");
        }
        const data = (await res.json()) as EventDetailData;
        if (!cancelled) {
          setDetail(data);
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, placeId]);

  return (
    <Box as="main" w="full" px={{ base: 2, md: 4 }} py={3}>
      <HStack justify="space-between" mb={2} px={1}>
        <Heading size="lg" as="h1" data-testid="place-calendar-name">
          {place.name}
        </Heading>
        <Text fontSize="sm" muted>
          {place.timezone}
        </Text>
      </HStack>
      {rangeError && (
        <Text color="red.500" mb={2}>
          {rangeError}
        </Text>
      )}
      <PlaceCalendar
        timezone={place.timezone}
        events={events}
        onRangeChange={loadRange}
        onEventClick={setSelectedId}
      />
      <EventDetailDrawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        event={detail}
        loading={detailLoading}
        calendarPath={`/places/${placeId}/calendar`}
      />
    </Box>
  );
}
