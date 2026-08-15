import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import type { EventTemplate, Place } from "@/types/model";
import { TemplateAdmin } from "@/components/TemplateAdmin";
import AdminTemplatesHeader from "@/components/AdminTemplatesHeader";

export const dynamic = "force-dynamic";

type Params = { id: string };

/**
 * Place-scoped template management. Server-renders the initial state so
 * admins see the data instantly; mutations go through the typed
 * `api.templates.*` client and the route re-renders via `router.refresh`.
 */
export default async function TemplatesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect("/");
  }

  const { id: placeId } = await params;
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    notFound();
  }

  const allowed =
    (await isSuperAdmin(user.id)) || (await isPlaceAdmin(user.id, placeId));
  if (!allowed) {
    redirect("/admin");
  }

  const templates = await prisma.eventTemplate.findMany({
    where: { placeId },
    orderBy: [{ enabled: "desc" }, { dayOfWeek: "asc" }, { localTime: "asc" }],
  });

  return (
    <AdminTemplatesHeader
      placeName={place.name}
      timezone={place.timezone}
      templateCount={templates.length}
    >
      <TemplateAdmin
        place={place as Place}
        initialTemplates={templates as unknown as EventTemplate[]}
      />
    </AdminTemplatesHeader>
  );
}
