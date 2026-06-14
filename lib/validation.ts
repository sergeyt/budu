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
