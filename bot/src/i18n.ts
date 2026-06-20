import en from "../messages/en.json" with { type: "json" };
import ru from "../messages/ru.json" with { type: "json" };

export type Locale = "en" | "ru";

const catalogs = { en, ru } as const;

export function resolveLocale(languageCode?: string): Locale {
  if (languageCode?.toLowerCase().startsWith("ru")) {
    return "ru";
  }
  return "en";
}

export function localeFrom(ctx: { from?: { language_code?: string } }): Locale {
  return resolveLocale(ctx.from?.language_code);
}

export function t(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let node: unknown = catalogs[locale];
  for (const part of parts) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      return key;
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") {
    return key;
  }
  if (!vars) {
    return node;
  }
  return node.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

/** Shorthand when you already have a Context-like object. */
export function tr(
  ctx: { from?: { language_code?: string } },
  key: string,
  vars?: Record<string, string | number>,
): string {
  return t(localeFrom(ctx), key, vars);
}

/** Nested command descriptions for setMyCommands. */
export function commandDescriptions(locale: Locale) {
  const c = catalogs[locale].commands;
  return c;
}
