"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, HStack } from "@chakra-ui/react";
import { Heading, Link, Text } from "@/ui/index";
import PlaceCalendar, {
  type CalendarEventItem,
} from "@/components/calendar/PlaceCalendar";
import EventDetailDrawer, {
  type EventDetailData,
} from "@/components/calendar/EventDetailDrawer";
import { api } from "@/lib/api";

export default function AdminCalendarClient({
  placeId,
  placeName,
  timezone,
}: {
  placeId: string;
  placeName: string;
  timezone: string;
}) {
  const t = useTranslations("calendar");
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("event"),
  );
  const [detail, setDetail] = useState<EventDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRange = useCallback(
    async (from: Date, to: Date) => {
      const list = await api.places.events(placeId, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setEvents(
        list.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          startAt:
            typeof e.startAt === "string" ? e.startAt : String(e.startAt),
          durationMinutes: e.durationMinutes,
          status: (e as { status?: string }).status,
        })),
      );
    },
    [placeId],
  );

  const loadDetail = useCallback(async (eventId: string) => {
    setDetailLoading(true);
    try {
      const data = await api.events.detail(eventId);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  return (
    <Box as="main" w="full" px={{ base: 2, md: 4 }} py={3}>
      <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
        <Heading size="lg">
          {placeName} — {t("admin_title")}
        </Heading>
        <HStack gap={3}>
          <Link href={`/admin/places/${placeId}/templates`}>
            {t("templates_link")}
          </Link>
          <Link href="/admin">{t("admin_home")}</Link>
        </HStack>
      </HStack>
      <Text fontSize="sm" color="gray.500" mb={2}>
        {timezone}
      </Text>
      <PlaceCalendar
        timezone={timezone}
        events={events}
        onRangeChange={(from, to) => {
          void loadRange(from, to);
        }}
        onEventClick={setSelectedId}
      />
      <EventDetailDrawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        event={detail}
        loading={detailLoading}
        isAdmin
        onUpdated={() => {
          if (selectedId) {
            void loadDetail(selectedId);
          }
        }}
      />
    </Box>
  );
}
