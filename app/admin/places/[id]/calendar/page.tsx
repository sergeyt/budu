import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import AdminCalendarClient from "@/components/calendar/AdminCalendarClient";

type Params = { id: string };

export default async function AdminPlaceCalendarPage({
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

  return (
    <AdminCalendarClient
      placeId={place.id}
      placeName={place.name}
      timezone={place.timezone}
    />
  );
}
