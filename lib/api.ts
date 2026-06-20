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

const webApi = createWebApi(client);

/** Wire JSON matches app model shapes; assert at the boundary. */
export const api = {
  places: webApi.places,
  templates: webApi.templates,
  events: {
    create: webApi.events.create,
    participants: (id: string): Promise<Registration[]> =>
      webApi.events.participants(id) as Promise<Registration[]>,
    register: (id: string): Promise<RegisterResponse> =>
      webApi.events.register(id) as Promise<RegisterResponse>,
    unregister: (id: string): Promise<UnregisterResponse> =>
      webApi.events.unregister(id) as Promise<UnregisterResponse>,
  },
};

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
