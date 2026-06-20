/** JSON shapes returned by public `/api/*` routes (browser client). */

export type WebPlace = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  infoUrl?: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type WebEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  durationMinutes?: number | null;
  capacity?: number | null;
  reserveCapacity?: number | null;
  regs?: WebRegistration[];
};

export type WebRegistration = {
  id: string;
  userId: string;
  status: "CONFIRMED" | "RESERVED";
  createdAt: string;
  user?: { name?: string | null; email?: string | null; image?: string | null };
};

export type WebEventTemplate = {
  id: string;
  placeId: string;
  title: string;
  description?: string | null;
  infoUrl?: string | null;
  dayOfWeek: number;
  localTime: string;
  durationMinutes?: number | null;
  capacity?: number | null;
  reserveCapacity?: number | null;
  announceOffsetMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TemplateChannel = {
  id: string;
  templateId: string;
  type: string;
  target: string;
  label: string | null;
};

export type RegisterResponse = {
  ok: true;
  status: "CONFIRMED" | "RESERVED";
  regs: WebRegistration[];
};

export type UnregisterResponse = {
  ok: true;
  unregistered: boolean;
  promoted: boolean;
  regs: WebRegistration[];
};

export type SuperAdminAction =
  | { type: "reuse_event" }
  | { type: "telegram_link" };

export type TelegramLinkResponse = {
  code: string;
  instructions: string;
};

/** Request bodies — mirror `lib/validation` without a zod dependency here. */
export type CreatePlaceBody = {
  name: string;
  location?: string | null;
  description?: string | null;
  infoUrl?: string | null;
};

export type UpdatePlaceBody = Partial<CreatePlaceBody> & {
  timezone?: string;
};

export type CreateEventBody = {
  placeId: string;
  title: string;
  description: string | null;
  startAt: string;
  capacity?: number | null;
  reserveCapacity?: number | null;
  chatId?: string | null;
};

export type CreateEventTemplateBody = {
  title: string;
  description?: string | null;
  infoUrl?: string | null;
  dayOfWeek: number;
  localTime: string;
  durationMinutes?: number | null;
  capacity?: number | null;
  reserveCapacity?: number | null;
  announceOffsetMinutes?: number;
  enabled?: boolean;
};

export type UpdateEventTemplateBody = Partial<CreateEventTemplateBody>;

export type AddPlaceAdminBody = {
  userEmail: string;
};

export type UpsertTemplateChannelBody = {
  type: string;
  target: string;
  label?: string | null;
};
