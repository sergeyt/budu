import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/model";
import AdminHomeClient from "@/components/AdminHomeClient";

export const dynamic = "force-dynamic";

/**
 * Admin landing: lists every place the signed-in user can manage.
 *
 * - SUPERADMIN sees all places.
 * - Regular users only see places where they're in PlaceAdmin.
 * - Unauthenticated → redirected home.
 */
export default async function AdminHome() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect("/");
  }

  const isSuper = user.role === UserRole.SUPERADMIN;
  const places = isSuper
    ? await prisma.place.findMany({ orderBy: { name: "asc" } })
    : (
        await prisma.placeAdmin.findMany({
          where: { userId: user.id },
          include: { place: true },
          orderBy: { place: { name: "asc" } },
        })
      ).map((row) => row.place);

  return (
    <AdminHomeClient
      places={places.map((p) => ({
        id: p.id,
        name: p.name,
        timezone: p.timezone,
      }))}
    />
  );
}
