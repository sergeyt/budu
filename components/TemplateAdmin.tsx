"use client";

import { Duration } from "luxon";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { HStack, Switch, Textarea, VStack } from "@chakra-ui/react";
import {
  api,
  type CreateEventTemplateBody,
  type TemplateChannel,
} from "@/lib/api";
import { Button, Card, Heading, Input, Text, toast } from "@/ui/index";
import { dateToLocalTime, weekdayName } from "@/lib/templates";
import {
  parseTemplatesMarkdown,
  serializeTemplatesMarkdown,
} from "@/lib/templateMarkdown";
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
      <TemplateMarkdownPanel
        place={place}
        templates={templates}
        onApplied={() => router.refresh()}
      />

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

function templatesToMarkdown(templates: EventTemplate[]): string {
  return serializeTemplatesMarkdown(
    templates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      infoUrl: t.infoUrl,
      dayOfWeek: t.dayOfWeek,
      localTime: dateToLocalTime(new Date(t.localTime)),
      durationMinutes: t.durationMinutes,
      capacity: t.capacity,
      reserveCapacity: t.reserveCapacity,
      announceOffsetMinutes: t.announceOffsetMinutes,
      enabled: t.enabled,
    })),
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TemplateMarkdownPanel({
  place,
  templates,
  onApplied,
}: {
  place: Place;
  templates: EventTemplate[];
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const openEditor = () => {
    setMarkdown(templatesToMarkdown(templates));
    setOpen(true);
  };

  const download = () => {
    const slug = place.name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "");
    downloadText(
      `${slug || "place"}-templates.md`,
      templatesToMarkdown(templates),
    );
  };

  const apply = () =>
    startTransition(async () => {
      const parsed = parseTemplatesMarkdown(markdown);
      if (!parsed.ok) {
        const first = parsed.errors[0];
        toast.error({
          title: first.line
            ? `Line ${first.line}: ${first.message}`
            : first.message,
          description:
            parsed.errors.length > 1
              ? `+${parsed.errors.length - 1} more error(s)`
              : undefined,
        });
        return;
      }

      const existingIds = new Set(templates.map((t) => t.id));
      let willUpdate = 0;
      let willCreate = 0;
      const kept = new Set<string>();
      for (const t of parsed.templates) {
        if (t.id && existingIds.has(t.id)) {
          willUpdate += 1;
          kept.add(t.id);
        } else {
          willCreate += 1;
        }
      }
      const willDelete = templates.filter((t) => !kept.has(t.id)).length;
      const summary = [
        willCreate ? `create ${willCreate}` : null,
        willUpdate ? `update ${willUpdate}` : null,
        willDelete ? `delete ${willDelete}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      if (
        !confirm(
          summary
            ? `Apply schedule? This will ${summary}.`
            : "Apply schedule? No changes detected.",
        )
      ) {
        return;
      }

      try {
        const result = await api.templates.importMarkdown(place.id, {
          markdown,
          prune: true,
        });
        toast.success({
          title: "Schedule applied",
          description: `created ${result.created}, updated ${result.updated}, deleted ${result.deleted}`,
        });
        setOpen(false);
        onApplied();
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Import failed",
        });
      }
    });

  const onFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setMarkdown(text);
      setOpen(true);
    };
    reader.onerror = () => {
      toast.error({ title: "Could not read file" });
    };
    reader.readAsText(file);
  };

  return (
    <Card.Root p={3}>
      <HStack justify="space-between" align="center" gap={2} wrap="wrap">
        <VStack align="start" gap={0}>
          <Heading size="sm">Markdown schedule</Heading>
          <Text fontSize="xs" muted>
            Download, edit as text, then upload or apply. File is source of
            truth (missing templates are deleted).
          </Text>
        </VStack>
        <HStack gap={2}>
          <Button size="sm" variant="outline" onClick={download}>
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
          <Button size="sm" variant="outline" onClick={openEditor}>
            {open ? "Reload editor" : "Edit as Markdown"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </HStack>
      </HStack>

      {open && (
        <VStack align="stretch" gap={2} pt={3}>
          <Textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            fontFamily="mono"
            fontSize="sm"
            minH="280px"
            spellCheck={false}
          />
          <HStack justify="end" gap={2}>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={apply} loading={pending} disabled={pending}>
              Apply
            </Button>
          </HStack>
        </VStack>
      )}
    </Card.Root>
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
      <TemplateChannels templateId={template.id} />
    </Card.Root>
  );
}

function TemplateChannels({ templateId }: { templateId: string }) {
  const [channels, setChannels] = useState<TemplateChannel[]>([]);
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    () =>
      startTransition(async () => {
        try {
          const rows = await api.templates.channels.list(templateId);
          setChannels(rows);
        } catch (e) {
          toast.error({
            title: e instanceof Error ? e.message : "Failed to load channels",
          });
        }
      }),
    [templateId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const add = () =>
    startTransition(async () => {
      const trimmed = target.trim();
      if (!trimmed) {
        toast.error({ title: "Chat id is required" });
        return;
      }
      try {
        await api.templates.channels.upsert(templateId, {
          type: "TELEGRAM",
          target: trimmed,
          label: label.trim() || null,
        });
        setTarget("");
        setLabel("");
        load();
        toast.success({ title: "Channel saved" });
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Save failed",
        });
      }
    });

  const removeChannel = (channelId: string) =>
    startTransition(async () => {
      try {
        await api.templates.channels.remove(templateId, channelId);
        load();
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Delete failed",
        });
      }
    });

  return (
    <VStack align="stretch" gap={2} pt={2} borderTopWidth="1px">
      <Text fontSize="xs" muted>
        Telegram channels (override place defaults for this template)
      </Text>
      {channels.length === 0 ? (
        <Text fontSize="xs" muted>
          No overrides — uses place channels.
        </Text>
      ) : (
        channels.map((ch) => (
          <HStack key={ch.id} justify="space-between" fontSize="sm">
            <Text>
              {ch.label ? `${ch.label} · ` : ""}
              <code>{ch.target}</code>
            </Text>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => removeChannel(ch.id)}
              disabled={pending}
            >
              Remove
            </Button>
          </HStack>
        ))
      )}
      <HStack gap={2}>
        <Input
          size="sm"
          placeholder="Chat id"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <Input
          size="sm"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button size="sm" onClick={add} loading={pending} disabled={pending}>
          Add
        </Button>
      </HStack>
    </VStack>
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
