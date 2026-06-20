import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin, requireUser } from "@/lib/api-auth";
import {
  deleteTemplateChannel,
  listTemplateChannels,
  upsertTemplateChannel,
} from "@/lib/bot/templateChannels";
import { UpsertTemplateChannel } from "@/lib/validation";
import { errorMiddleware, errors, NotFoundError } from "@/lib/error";

type Params = { id?: string };

async function authorizeTemplate(templateId: string, userId: string) {
  const tpl = await prisma.eventTemplate.findUnique({
    where: { id: templateId },
  });
  if (!tpl) {
    throw errors.templateNotFound();
  }
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, tpl.placeId));
  if (!allowed) {
    throw errors.forbidden();
  }
  return tpl;
}

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  const { userId } = await requireUser();
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  await authorizeTemplate(id, userId);
  return await listTemplateChannels(id);
});

export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  await authorizeTemplate(id, userId);

  const body = await req.json();
  const parsed = UpsertTemplateChannel.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("channel", parsed.error.flatten());
  }
  return await upsertTemplateChannel({
    templateId: id,
    ...parsed.data,
  });
});

export const DELETE = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  await authorizeTemplate(id, userId);

  const channelId = new URL(req.url).searchParams.get("channelId");
  if (!channelId) {
    throw errors.missingParam("channelId");
  }
  const ok = await deleteTemplateChannel(id, channelId);
  if (!ok) {
    throw new NotFoundError("Channel not found");
  }
  return { ok: true, deleted: channelId };
});
