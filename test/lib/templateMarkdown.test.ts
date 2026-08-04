import { describe, expect, it } from "vitest";
import {
  parseTemplatesMarkdown,
  serializeTemplatesMarkdown,
} from "@/lib/templateMarkdown";

const SAMPLE = `# Лесенка

Открытая игра. Рейтинг не важен.

\`\`\`meta
id: tpl_1
when: Wed 19:00
duration: 60
capacity: 24
reserve: 6
\`\`\`

# Утренняя Заря

Утренний слот.

\`\`\`meta
when: Сб 10:00
capacity: 4
announce: 48h
enabled: false
url: https://example.com/info
\`\`\`
`;

describe("parseTemplatesMarkdown", () => {
  it("parses free-form sections with EN/RU weekdays", () => {
    const result = parseTemplatesMarkdown(SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0]).toMatchObject({
      id: "tpl_1",
      title: "Лесенка",
      description: "Открытая игра. Рейтинг не важен.",
      dayOfWeek: 3,
      localTime: "19:00",
      durationMinutes: 60,
      capacity: 24,
      reserveCapacity: 6,
      announceOffsetMinutes: 1440,
      enabled: true,
      infoUrl: null,
    });
    expect(result.templates[1]).toMatchObject({
      title: "Утренняя Заря",
      description: "Утренний слот.",
      dayOfWeek: 6,
      localTime: "10:00",
      capacity: 4,
      announceOffsetMinutes: 48 * 60,
      enabled: false,
      infoUrl: "https://example.com/info",
    });
  });

  it("accepts ISO weekday numbers in when", () => {
    const result = parseTemplatesMarkdown(`# A

\`\`\`meta
when: 1 07:30
\`\`\`
`);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.templates[0].dayOfWeek).toBe(1);
    expect(result.templates[0].localTime).toBe("07:30");
  });

  it("returns line-oriented errors for bad meta", () => {
    const result = parseTemplatesMarkdown(`# Broken

\`\`\`meta
when: Blorp 19:00
\`\`\`
`);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors[0].title).toBe("Broken");
    expect(result.errors[0].message).toMatch(/weekday/i);
  });

  it("requires a meta block", () => {
    const result = parseTemplatesMarkdown("# Only a title\n\nNo meta.\n");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors[0].message).toMatch(/meta/i);
  });

  it("parses empty document as zero templates", () => {
    expect(parseTemplatesMarkdown("")).toEqual({ ok: true, templates: [] });
    expect(parseTemplatesMarkdown("   \n")).toEqual({
      ok: true,
      templates: [],
    });
  });
});

describe("serializeTemplatesMarkdown", () => {
  it("round-trips through parse", () => {
    const parsed = parseTemplatesMarkdown(SAMPLE);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const md = serializeTemplatesMarkdown(parsed.templates);
    const again = parseTemplatesMarkdown(md);
    expect(again.ok).toBe(true);
    if (!again.ok) {
      return;
    }
    expect(again.templates).toEqual(parsed.templates);
  });

  it("emits a starter example when there are no templates", () => {
    const md = serializeTemplatesMarkdown([]);
    const parsed = parseTemplatesMarkdown(md);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.templates[0].title).toBe("Example template");
  });
});
