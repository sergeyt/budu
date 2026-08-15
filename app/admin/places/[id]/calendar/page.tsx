import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { Box, Text } from "@chakra-ui/react";
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
    <Suspense
      fallback={
        <Box p={6}>
          <Text>…</Text>
        </Box>
      }
    >
      <AdminCalendarClient
        placeId={place.id}
        placeName={place.name}
        timezone={place.timezone}
      />
    </Suspense>
  );
}
