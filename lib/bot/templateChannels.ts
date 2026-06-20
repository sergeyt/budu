import { prisma } from "@/lib/prisma";
import type { ChannelType } from "@/types/model";

export type TemplateChannelDto = {
  id: string;
  templateId: string;
  type: ChannelType;
  target: string;
  label: string | null;
};

export async function listTemplateChannels(
  templateId: string,
): Promise<TemplateChannelDto[]> {
  const rows = await prisma.eventTemplateNotificationChannel.findMany({
    where: { templateId },
    orderBy: [{ type: "asc" }, { target: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    templateId: r.templateId,
    type: r.type as ChannelType,
    target: r.target,
    label: r.label,
  }));
}

export async function upsertTemplateChannel(input: {
  templateId: string;
  type: ChannelType;
  target: string;
  label?: string | null;
}): Promise<TemplateChannelDto> {
  const row = await prisma.eventTemplateNotificationChannel.upsert({
    where: {
      templateId_type_target: {
        templateId: input.templateId,
        type: input.type,
        target: input.target,
      },
    },
    create: {
      templateId: input.templateId,
      type: input.type,
      target: input.target,
      label: input.label ?? null,
    },
    update: { label: input.label ?? null },
  });
  return {
    id: row.id,
    templateId: row.templateId,
    type: row.type as ChannelType,
    target: row.target,
    label: row.label,
  };
}

export async function deleteTemplateChannel(
  templateId: string,
  channelId: string,
): Promise<boolean> {
  const deleted = await prisma.eventTemplateNotificationChannel.deleteMany({
    where: { id: channelId, templateId },
  });
  return deleted.count > 0;
}
