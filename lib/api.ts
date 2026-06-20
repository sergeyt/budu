import { ApiClient } from "@budu/api-client";
import { createWebApi } from "@budu/api-client/web";
import type { z } from "zod";
import type {
  AddPlaceAdmin,
  CreateEvent,
  CreateEventTemplate,
  CreatePlace,
  UpdateEventTemplate,
  UpdatePlace,
} from "@/lib/validation";
import type {
  EventTemplate,
  Place,
  Registration,
  RegistrationStatus,
  WorldEvent,
} from "@/types/model";

/** Browser client — session cookies, no Bearer token. */
const client = new ApiClient({ credentials: "same-origin" });

export const api = createWebApi(client);

export type CreateEventBody = z.infer<typeof CreateEvent>;
export type CreatePlaceBody = z.infer<typeof CreatePlace>;
export type UpdatePlaceBody = z.infer<typeof UpdatePlace>;
export type AddPlaceAdminBody = z.infer<typeof AddPlaceAdmin>;
export type CreateEventTemplateBody = z.infer<typeof CreateEventTemplate>;
export type UpdateEventTemplateBody = z.infer<typeof UpdateEventTemplate>;

export type RegisterResponse = {
  ok: true;
  status: RegistrationStatus;
  regs: Registration[];
};

export type UnregisterResponse = {
  ok: true;
  unregistered: boolean;
  promoted: boolean;
  regs: Registration[];
};

export type SuperAdminAction =
  | { type: "reuse_event" }
  | { type: "telegram_link" };

export type TelegramLinkResponse = {
  code: string;
  instructions: string;
};

export type TemplateChannel = {
  id: string;
  templateId: string;
  type: string;
  target: string;
  label: string | null;
};

/** App-facing aliases — wire JSON is compatible with Prisma/model shapes. */
export type {
  Place,
  WorldEvent,
  EventTemplate,
  Registration,
} from "@/types/model";
