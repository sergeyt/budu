"use client";

import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
  createViewWeekAgenda,
} from "@schedule-x/calendar";

export type CalendarEventItem = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  durationMinutes?: number | null;
  status?: string;
};

function toZoned(
  iso: string,
  durationMinutes: number | null | undefined,
  timezone: string,
) {
  const mins = durationMinutes ?? 60;
  const start = Temporal.Instant.from(
    new Date(iso).toISOString(),
  ).toZonedDateTimeISO(timezone);
  const end = start.add({ minutes: mins });
  return { start, end };
}

export default function PlaceCalendar({
  timezone,
  events,
  onRangeChange,
  onEventClick,
  locale = "ru-RU",
}: {
  timezone: string;
  events: CalendarEventItem[];
  onRangeChange?: (from: Date, to: Date) => void;
  onEventClick?: (eventId: string) => void;
  locale?: string;
}) {
  const onRangeChangeRef = useRef(onRangeChange);
  const onEventClickRef = useRef(onEventClick);
  onRangeChangeRef.current = onRangeChange;
  onEventClickRef.current = onEventClick;

  const mapped = useMemo(
    () =>
      events.map((e) => {
        const { start, end } = toZoned(e.startAt, e.durationMinutes, timezone);
        return {
          id: e.id,
          title: e.title,
          description: e.description ?? undefined,
          start,
          end,
          calendarId: e.status === "CANCELLED" ? "cancelled" : "default",
        };
      }),
    [events, timezone],
  );

  const calendar = useNextCalendarApp({
    views: [
      createViewDay(),
      createViewWeek(),
      createViewMonthGrid(),
      createViewWeekAgenda(),
      createViewMonthAgenda(),
    ],
    defaultView: createViewMonthGrid().name,
    locale,
    timezone: timezone as `${string}/${string}`,
    calendars: {
      default: {
        colorName: "default",
        lightColors: {
          main: "#1a73e8",
          container: "#d2e3fc",
          onContainer: "#174ea6",
        },
        darkColors: {
          main: "#8ab4f8",
          container: "#1e3a5f",
          onContainer: "#d2e3fc",
        },
      },
      cancelled: {
        colorName: "cancelled",
        lightColors: {
          main: "#9aa0a6",
          container: "#e8eaed",
          onContainer: "#5f6368",
        },
        darkColors: {
          main: "#9aa0a6",
          container: "#3c4043",
          onContainer: "#e8eaed",
        },
      },
    },
    events: mapped,
    callbacks: {
      onEventClick(calendarEvent) {
        onEventClickRef.current?.(String(calendarEvent.id));
      },
      onRangeUpdate(range) {
        const from = new Date(range.start.toString());
        const to = new Date(range.end.toString());
        onRangeChangeRef.current?.(from, to);
      },
    },
  });

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (calendar) {
      setReady(true);
    }
  }, [calendar]);

  useEffect(() => {
    if (!calendar) {
      return;
    }
    calendar.events.set(mapped);
  }, [calendar, mapped]);

  if (!ready || !calendar) {
    return (
      <Box
        w="100%"
        h="calc(100dvh - 4rem)"
        minH="480px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        …
      </Box>
    );
  }

  return (
    <Box
      w="100%"
      h="calc(100dvh - 4rem)"
      minH="480px"
      className="sx-calendar-wrap"
      css={{
        "& .sx-react-calendar-wrapper": {
          width: "100%",
          height: "100%",
          maxWidth: "100%",
        },
      }}
    >
      <ScheduleXCalendar calendarApp={calendar} />
    </Box>
  );
}
