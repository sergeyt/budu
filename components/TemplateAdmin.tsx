"use client";

import { Duration } from "luxon";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HStack, Switch, VStack } from "@chakra-ui/react";
import { api, type CreateEventTemplateBody } from "@/lib/api";
import { Button, Card, Heading, Input, Text, toast } from "@/ui/index";
import { dateToLocalTime, weekdayName } from "@/lib/templates";
import type { EventTemplate, Place } from "@/types/model";

type Draft = {
  title: string;
  dayOfWeek: number;
  localTime: string;
  durationMinutes: string;
  capacity: string;
  reserveCapacity: string;
  announceOffsetMinutes: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  dayOfWeek: 3,
  localTime: "19:00",
  durationMinutes: "60",
  capacity: "",
  reserveCapacity: "",
  announceOffsetMinutes: "1440",
};

const DAYS = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
  { iso: 6, label: "Sat" },
  { iso: 7, label: "Sun" },
];

function parseIntOrNull(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "") {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("expected a non-negative integer");
  }
  return n;
}

function draftToBody(d: Draft): CreateEventTemplateBody {
  return {
    title: d.title.trim(),
    dayOfWeek: d.dayOfWeek,
    localTime: d.localTime.trim(),
    durationMinutes: parseIntOrNull(d.durationMinutes) ?? undefined,
    capacity: parseIntOrNull(d.capacity),
    reserveCapacity: parseIntOrNull(d.reserveCapacity),
    announceOffsetMinutes: parseIntOrNull(d.announceOffsetMinutes) ?? undefined,
  };
}

export function TemplateAdmin({
  place,
  initialTemplates,
}: {
  place: Place;
  initialTemplates: EventTemplate[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(initialTemplates.length === 0);

  const templates = initialTemplates;

  const create = () =>
    startTransition(async () => {
      try {
        const body = draftToBody(draft);
        if (!body.title) {
          toast.error({ title: "Title is required" });
          return;
        }
        await api.templates.create(place.id, body);
        setDraft(EMPTY_DRAFT);
        setShowForm(false);
        router.refresh();
        toast.success({ title: "Template created" });
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Create failed",
        });
      }
    });

  return (
    <VStack align="stretch" gap={3}>
      {templates.map((tpl) => (
        <TemplateRow
          key={tpl.id}
          template={tpl}
          onChanged={() => router.refresh()}
        />
      ))}

      {showForm ? (
        <Card.Root p={4}>
          <Card.Header pb={2}>
            <Heading size="sm">New template</Heading>
          </Card.Header>
          <Card.Body>
            <DraftForm draft={draft} onChange={setDraft} />
          </Card.Body>
          <Card.Footer>
            <HStack justify="end" w="full" gap={2}>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(EMPTY_DRAFT);
                  setShowForm(false);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button onClick={create} loading={pending} disabled={pending}>
                Create
              </Button>
            </HStack>
          </Card.Footer>
        </Card.Root>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline">
          + Add template
        </Button>
      )}
    </VStack>
  );
}

function DraftForm({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    onChange({ ...draft, [k]: v });

  return (
    <VStack align="stretch" gap={3}>
      <Field label="Title">
        <Input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Лесенка (еженедельно)"
        />
      </Field>

      <Field label="Day of week">
        <HStack gap={1} wrap="wrap">
          {DAYS.map((d) => (
            <Button
              key={d.iso}
              size="sm"
              variant={draft.dayOfWeek === d.iso ? "solid" : "outline"}
              onClick={() => set("dayOfWeek", d.iso)}
            >
              {d.label}
            </Button>
          ))}
        </HStack>
      </Field>

      <HStack gap={3}>
        <Field label="Local time">
          <Input
            type="time"
            value={draft.localTime}
            onChange={(e) => set("localTime", e.target.value)}
          />
        </Field>
        <Field label="Duration (min)">
          <Input
            type="number"
            inputMode="numeric"
            value={draft.durationMinutes}
            onChange={(e) => set("durationMinutes", e.target.value)}
          />
        </Field>
      </HStack>

      <HStack gap={3}>
        <Field label="Capacity">
          <Input
            type="number"
            inputMode="numeric"
            value={draft.capacity}
            placeholder="∞"
            onChange={(e) => set("capacity", e.target.value)}
          />
        </Field>
        <Field label="Reserve">
          <Input
            type="number"
            inputMode="numeric"
            value={draft.reserveCapacity}
            placeholder="∞"
            onChange={(e) => set("reserveCapacity", e.target.value)}
          />
        </Field>
      </HStack>

      <Field label="Announce ahead (minutes)">
        <Input
          type="number"
          inputMode="numeric"
          value={draft.announceOffsetMinutes}
          onChange={(e) => set("announceOffsetMinutes", e.target.value)}
        />
      </Field>
    </VStack>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <VStack align="stretch" gap={1} w="full">
      <Text fontSize="xs" muted>
        {label}
      </Text>
      {children}
    </VStack>
  );
}

function TemplateRow({
  template,
  onChanged,
}: {
  template: EventTemplate;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const localTime = useMemo(
    () => dateToLocalTime(new Date(template.localTime)),
    [template.localTime],
  );

  const toggle = (next: boolean) =>
    startTransition(async () => {
      try {
        await api.templates.update(template.id, { enabled: next });
        onChanged();
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Update failed",
        });
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!confirm(`Delete template "${template.title}"?`)) {
        return;
      }
      try {
        await api.templates.remove(template.id);
        onChanged();
        toast.success({ title: "Deleted" });
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Delete failed",
        });
      }
    });

  return (
    <Card.Root p={3} opacity={template.enabled ? 1 : 0.6}>
      <HStack justify="space-between" align="start" w="full" gap={3}>
        <VStack align="start" gap={0} flex={1}>
          <Heading size="sm">{template.title}</Heading>
          <Text fontSize="xs" muted>
            {weekdayName(template.dayOfWeek)} {localTime}
            {template.capacity != null && ` · cap ${template.capacity}`}
            {template.reserveCapacity != null &&
              ` · res ${template.reserveCapacity}`}
            {` · announce −${formatMinutes(template.announceOffsetMinutes)}`}
          </Text>
        </VStack>
        <HStack gap={2}>
          <Switch.Root
            checked={template.enabled}
            disabled={pending}
            onCheckedChange={(d) => toggle(d.checked)}
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={remove}
            disabled={pending}
          >
            Delete
          </Button>
        </HStack>
      </HStack>
    </Card.Root>
  );
}

function formatMinutes(min: number): string {
  if (min === 0) {
    return "now";
  }
  // shiftTo over an explicit unit list keeps weeks out of the picture
  // (we want "8d", not "1w 1d") and lets us render compound values like
  // 1d 1h cleanly without modulo arithmetic.
  const d = Duration.fromObject({ minutes: min }).shiftTo(
    "days",
    "hours",
    "minutes",
  );
  const parts: string[] = [];
  if (d.days) {
    parts.push(`${d.days}d`);
  }
  if (d.hours) {
    parts.push(`${d.hours}h`);
  }
  if (d.minutes) {
    parts.push(`${d.minutes}m`);
  }
  return parts.join(" ");
}
