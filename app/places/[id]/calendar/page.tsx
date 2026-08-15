import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Box, Text } from "@chakra-ui/react";
import { prisma } from "@/lib/prisma";
import PublicCalendarClient from "@/components/calendar/PublicCalendarClient";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function PublicPlaceCalendarPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: placeId } = await params;
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, name: true, timezone: true },
  });
  if (!place) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <Box p={6}>
          <Text>…</Text>
        </Box>
      }
    >
      <PublicCalendarClient placeId={place.id} initialPlace={place} />
    </Suspense>
  );
}
