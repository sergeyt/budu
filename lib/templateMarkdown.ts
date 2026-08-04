/**
 * Free-form Markdown codec for place event templates.
 *
 * Format (one H1 section per template):
 *
 *   # Title
 *
 *   Optional description…
 *
 *   ```meta
 *   id: clxyz…          # present on export; stable update key
 *   when: Wed 19:00     # required (EN/RU weekday or ISO 1–7)
 *   duration: 60
 *   capacity: 24
 *   reserve: 6
 *   announce: 24h
 *   url: https://…
 *   enabled: false
 *   ```
 */

export type TemplateMarkdownFields = {
  id?: string;
  title: string;
  description: string | null;
  infoUrl: string | null;
  dayOfWeek: number;
  localTime: string;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  announceOffsetMinutes: number;
  enabled: boolean;
};

export type TemplateMarkdownParseError = {
  message: string;
  /** 1-based line in the source document, when known. */
  line?: number;
  /** Template title, when the error is inside a section. */
  title?: string;
};

export type TemplateMarkdownParseResult =
  | { ok: true; templates: TemplateMarkdownFields[] }
  | { ok: false; errors: TemplateMarkdownParseError[] };

const WEEKDAY_ALIASES: Record<string, number> = {
  mon: 1,
  monday: 1,
  пн: 1,
  понедельник: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  вт: 2,
  вторник: 2,
  wed: 3,
  wednesday: 3,
  ср: 3,
  среда: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  чт: 4,
  четверг: 4,
  fri: 5,
  friday: 5,
  пт: 5,
  пятница: 5,
  sat: 6,
  saturday: 6,
  сб: 6,
  суббота: 6,
  sun: 7,
  sunday: 7,
  вс: 7,
  воскресенье: 7,
};

const WEEKDAY_EXPORT = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const META_FENCE = /^```meta\s*$/i;
const META_CLOSE = /^```\s*$/;
const H1 = /^#\s+(.+?)\s*$/;

const DEFAULT_ANNOUNCE = 1440;

/** Serialize templates to the editable Markdown document. */
export function serializeTemplatesMarkdown(
  templates: Array<{
    id?: string;
    title: string;
    description?: string | null;
    infoUrl?: string | null;
    dayOfWeek: number;
    localTime: string | Date;
    durationMinutes?: number | null;
    capacity?: number | null;
    reserveCapacity?: number | null;
    announceOffsetMinutes?: number;
    enabled?: boolean;
  }>,
): string {
  if (templates.length === 0) {
    return `# Example template

Optional description for players.

\`\`\`meta
when: Wed 19:00
capacity: 16
\`\`\`
`;
  }

  return templates
    .map((t) => {
      const localTime =
        typeof t.localTime === "string"
          ? normalizeLocalTime(t.localTime)
          : formatUtcTime(t.localTime);
      const day = WEEKDAY_EXPORT[t.dayOfWeek - 1];
      if (!day) {
        throw new Error(`invalid dayOfWeek: ${t.dayOfWeek}`);
      }

      const meta: string[] = [];
      if (t.id) {
        meta.push(`id: ${t.id}`);
      }
      meta.push(`when: ${day} ${localTime}`);
      if (t.durationMinutes != null) {
        meta.push(`duration: ${t.durationMinutes}`);
      }
      if (t.capacity != null) {
        meta.push(`capacity: ${t.capacity}`);
      }
      if (t.reserveCapacity != null) {
        meta.push(`reserve: ${t.reserveCapacity}`);
      }
      const announce = t.announceOffsetMinutes ?? DEFAULT_ANNOUNCE;
      if (announce !== DEFAULT_ANNOUNCE) {
        meta.push(`announce: ${formatAnnounce(announce)}`);
      }
      if (t.infoUrl) {
        meta.push(`url: ${t.infoUrl}`);
      }
      if (t.enabled === false) {
        meta.push("enabled: false");
      }

      const desc = (t.description ?? "").trim();
      const parts = [`# ${t.title.trim()}`];
      if (desc) {
        parts.push("", desc);
      }
      parts.push("", "```meta", ...meta, "```", "");
      return parts.join("\n");
    })
    .join("\n");
}

/** Parse a Markdown schedule document into template fields. */
export function parseTemplatesMarkdown(
  source: string,
): TemplateMarkdownParseResult {
  const errors: TemplateMarkdownParseError[] = [];
  const templates: TemplateMarkdownFields[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  type Section = {
    title: string;
    titleLine: number;
    startLine: number;
    endLine: number;
  };

  const sections: Section[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = H1.exec(lines[i]);
    if (!m) {
      continue;
    }
    if (sections.length > 0) {
      sections[sections.length - 1].endLine = i;
    }
    sections.push({
      title: m[1].trim(),
      titleLine: i + 1,
      startLine: i + 1,
      endLine: lines.length,
    });
  }

  if (sections.length === 0) {
    if (source.trim() === "") {
      return { ok: true, templates: [] };
    }
    return {
      ok: false,
      errors: [
        {
          message:
            "No templates found. Start each template with an H1 heading (`# Title`).",
        },
      ],
    };
  }

  for (const section of sections) {
    if (!section.title) {
      errors.push({
        message: "Template heading is empty",
        line: section.titleLine,
      });
      continue;
    }

    const bodyLines = lines.slice(section.startLine, section.endLine);
    const meta = extractMeta(bodyLines, section.startLine + 1);
    if (!meta.ok) {
      errors.push({
        ...meta.error,
        title: section.title,
      });
      continue;
    }

    const description = meta.description.trim() || null;
    const fields = meta.fields;
    const when = fields.when;
    if (!when) {
      errors.push({
        message: "Missing required meta field `when` (e.g. `Wed 19:00`)",
        line: meta.metaStartLine,
        title: section.title,
      });
      continue;
    }

    const parsedWhen = parseWhen(when);
    if (!parsedWhen.ok) {
      errors.push({
        message: parsedWhen.message,
        line: meta.fieldLines.when ?? meta.metaStartLine,
        title: section.title,
      });
      continue;
    }

    let announceOffsetMinutes = DEFAULT_ANNOUNCE;
    if (fields.announce != null && fields.announce !== "") {
      const a = parseAnnounce(fields.announce);
      if (!a.ok) {
        errors.push({
          message: a.message,
          line: meta.fieldLines.announce ?? meta.metaStartLine,
          title: section.title,
        });
        continue;
      }
      announceOffsetMinutes = a.minutes;
    }

    const duration = parseOptionalInt(fields.duration, "duration", {
      min: 1,
    });
    if (duration.error) {
      errors.push({
        message: duration.error,
        line: meta.fieldLines.duration ?? meta.metaStartLine,
        title: section.title,
      });
      continue;
    }

    const capacity = parseOptionalInt(fields.capacity, "capacity", {
      min: 0,
    });
    if (capacity.error) {
      errors.push({
        message: capacity.error,
        line: meta.fieldLines.capacity ?? meta.metaStartLine,
        title: section.title,
      });
      continue;
    }

    const reserve = parseOptionalInt(fields.reserve, "reserve", { min: 0 });
    if (reserve.error) {
      errors.push({
        message: reserve.error,
        line: meta.fieldLines.reserve ?? meta.metaStartLine,
        title: section.title,
      });
      continue;
    }

    let enabled = true;
    if (fields.enabled != null && fields.enabled !== "") {
      const e = parseBool(fields.enabled);
      if (e === null) {
        errors.push({
          message: `Invalid enabled value: ${JSON.stringify(fields.enabled)} (use true/false)`,
          line: meta.fieldLines.enabled ?? meta.metaStartLine,
          title: section.title,
        });
        continue;
      }
      enabled = e;
    }

    let infoUrl: string | null = null;
    if (fields.url != null && fields.url !== "") {
      try {
        infoUrl = new URL(fields.url).toString();
      } catch {
        errors.push({
          message: `Invalid url: ${JSON.stringify(fields.url)}`,
          line: meta.fieldLines.url ?? meta.metaStartLine,
          title: section.title,
        });
        continue;
      }
    }

    const id =
      fields.id != null && fields.id.trim() !== ""
        ? fields.id.trim()
        : undefined;

    templates.push({
      id,
      title: section.title,
      description,
      infoUrl,
      dayOfWeek: parsedWhen.dayOfWeek,
      localTime: parsedWhen.localTime,
      durationMinutes: duration.value,
      capacity: capacity.value,
      reserveCapacity: reserve.value,
      announceOffsetMinutes,
      enabled,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, templates };
}

function extractMeta(
  bodyLines: string[],
  absoluteStartLine: number,
):
  | {
      ok: true;
      description: string;
      fields: Record<string, string>;
      fieldLines: Record<string, number>;
      metaStartLine: number;
    }
  | { ok: false; error: TemplateMarkdownParseError } {
  let fenceOpen = -1;
  let fenceClose = -1;
  for (let i = 0; i < bodyLines.length; i++) {
    if (fenceOpen < 0 && META_FENCE.test(bodyLines[i])) {
      fenceOpen = i;
      continue;
    }
    if (fenceOpen >= 0 && META_CLOSE.test(bodyLines[i])) {
      fenceClose = i;
      break;
    }
  }

  if (fenceOpen < 0) {
    return {
      ok: false,
      error: {
        message: "Missing ```meta block with schedule fields",
        line: absoluteStartLine,
      },
    };
  }
  if (fenceClose < 0) {
    return {
      ok: false,
      error: {
        message: "Unclosed ```meta block",
        line: absoluteStartLine + fenceOpen,
      },
    };
  }

  const before = bodyLines.slice(0, fenceOpen).join("\n");
  const after = bodyLines.slice(fenceClose + 1).join("\n");
  const description = [before, after].filter((s) => s.trim()).join("\n\n");

  const fields: Record<string, string> = {};
  const fieldLines: Record<string, number> = {};
  for (let i = fenceOpen + 1; i < fenceClose; i++) {
    const raw = bodyLines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon <= 0) {
      return {
        ok: false,
        error: {
          message: `Invalid meta line (expected key: value): ${JSON.stringify(trimmed)}`,
          line: absoluteStartLine + i,
        },
      };
    }
    const key = trimmed.slice(0, colon).trim().toLowerCase();
    const value = trimmed.slice(colon + 1).trim();
    fields[key] = value;
    fieldLines[key] = absoluteStartLine + i;
  }

  return {
    ok: true,
    description,
    fields,
    fieldLines,
    metaStartLine: absoluteStartLine + fenceOpen,
  };
}

function parseWhen(
  raw: string,
):
  | { ok: true; dayOfWeek: number; localTime: string }
  | { ok: false; message: string } {
  const m = /^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/.exec(raw.trim());
  if (!m) {
    return {
      ok: false,
      message: `Invalid when: ${JSON.stringify(raw)} (expected e.g. Wed 19:00)`,
    };
  }
  const dayRaw = m[1].replace(/,/g, "").trim().toLowerCase();
  const timeRaw = m[2];

  let dayOfWeek: number | undefined;
  if (/^\d+$/.test(dayRaw)) {
    const n = Number(dayRaw);
    if (n >= 1 && n <= 7) {
      dayOfWeek = n;
    }
  } else {
    dayOfWeek = WEEKDAY_ALIASES[dayRaw];
  }
  if (dayOfWeek == null) {
    return {
      ok: false,
      message: `Unknown weekday in when: ${JSON.stringify(m[1])}`,
    };
  }

  try {
    return {
      ok: true,
      dayOfWeek,
      localTime: normalizeLocalTime(timeRaw),
    };
  } catch {
    return {
      ok: false,
      message: `Invalid time in when: ${JSON.stringify(timeRaw)}`,
    };
  }
}

function parseAnnounce(
  raw: string,
): { ok: true; minutes: number } | { ok: false; message: string } {
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) {
    const minutes = Number(s);
    if (minutes > 60 * 24 * 30) {
      return {
        ok: false,
        message: `announce out of range: ${minutes} minutes (max 30d)`,
      };
    }
    return { ok: true, minutes };
  }

  // Compact forms: 24h, 1d, 90m, or compounds: 1d 2h, 2h 30m
  const tokens = [...s.matchAll(/(\d+)\s*(d|h|m)\b/g)];
  let minutes = 0;
  for (const match of tokens) {
    const n = Number(match[1]);
    if (match[2] === "d") {
      minutes += n * 24 * 60;
    } else if (match[2] === "h") {
      minutes += n * 60;
    } else {
      minutes += n;
    }
  }
  const leftover = s.replace(/(\d+)\s*(d|h|m)\b/g, "").replace(/\s+/g, "");
  if (tokens.length === 0 || leftover !== "") {
    return {
      ok: false,
      message: `Invalid announce: ${JSON.stringify(raw)} (use minutes or e.g. 24h, 1d)`,
    };
  }
  if (minutes > 60 * 24 * 30) {
    return {
      ok: false,
      message: `announce out of range: ${minutes} minutes (max 30d)`,
    };
  }
  return { ok: true, minutes };
}

function parseOptionalInt(
  raw: string | undefined,
  label: string,
  opts: { min: number },
): { value: number | null; error?: string } {
  if (
    raw == null ||
    raw === "" ||
    raw === "-" ||
    raw.toLowerCase() === "none"
  ) {
    return { value: null };
  }
  if (!/^\d+$/.test(raw)) {
    return { value: null, error: `Invalid ${label}: ${JSON.stringify(raw)}` };
  }
  const n = Number(raw);
  if (n < opts.min) {
    return {
      value: null,
      error: `Invalid ${label}: must be >= ${opts.min}`,
    };
  }
  return { value: n };
}

function parseBool(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (s === "true" || s === "yes" || s === "1" || s === "on") {
    return true;
  }
  if (s === "false" || s === "no" || s === "0" || s === "off") {
    return false;
  }
  return null;
}

function normalizeLocalTime(s: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) {
    throw new Error(`invalid localTime: ${JSON.stringify(s)}`);
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3] ?? "0");
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    throw new Error(`invalid localTime: ${JSON.stringify(s)}`);
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function formatUtcTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatAnnounce(minutes: number): string {
  if (minutes === 0) {
    return "0";
  }
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) {
    parts.push(`${days}d`);
  }
  if (hours) {
    parts.push(`${hours}h`);
  }
  if (mins) {
    parts.push(`${mins}m`);
  }
  return parts.join(" ") || "0";
}
