import { z } from "zod";

export const CreatePlace = z.object({
  name: z.string().min(1),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  infoUrl: z.url().optional().nullable(),
});

export const UpdatePlace = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  infoUrl: z.url().optional().nullable(),
  // IANA zone (e.g. "Europe/Moscow"). Validated by the runtime via
  // Intl.DateTimeFormat in the API handler — zod can't statically check it.
  timezone: z.string().min(1).optional(),
});

export const AddPlaceAdmin = z.object({
  userEmail: z.email(),
});

export const CreateEvent = z.object({
  placeId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  startAt: z.string().min(1), // ISO or datetime-local string
  capacity: z.number().int().nonnegative().nullable().optional(),
  reserveCapacity: z.number().int().nonnegative().nullable().optional(),
  chatId: z.string().min(1).optional().nullable(),
});

export const SuperAdminAction = z.object({
  type: z.enum(["reuse_event", "telegram_link"]),
});

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const localTime = z.string().regex(HHMM, "expected HH:MM (24h)");

/**
 * Shared shape of all the user-editable fields on `EventTemplate`. Create
 * and Update reuse it via .pick/partial so the form schema is a single
 * source of truth.
 */
const EventTemplateBase = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  infoUrl: z.url().nullish(),
  // ISO 1 = Mon … 7 = Sun. Materializer + lib/templates.ts use the same.
  dayOfWeek: z.number().int().min(1).max(7),
  localTime,
  durationMinutes: z.number().int().min(1).nullish(),
  capacity: z.number().int().nonnegative().nullish(),
  reserveCapacity: z.number().int().nonnegative().nullish(),
  // Default 24h; 0 = post the moment we materialize. UpperBound: 30d keeps
  // a typo from announcing a 19:00 event nine years early.
  announceOffsetMinutes: z
    .number()
    .int()
    .min(0)
    .max(60 * 24 * 30)
    .optional(),
  enabled: z.boolean().optional(),
});

export const CreateEventTemplate = EventTemplateBase;
export const UpdateEventTemplate = EventTemplateBase.partial();
