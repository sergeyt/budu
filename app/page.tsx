import { Box } from "@chakra-ui/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PlacePicker from "@/components/PlacePicker";
import RegisterPanel from "@/components/RegisterPanel";
import SignIn from "@/components/SignIn";
import HomePromo from "@/components/HomePromo";
import NarrowShell from "@/components/NarrowShell";
import type { User, WorldEvent } from "@/types/model";

type SearchParams = {
  place?: string;
  loginError?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const user = session?.user;
  const places = await prisma.place.findMany({ orderBy: { name: "asc" } });
  const params = await searchParams;
  const placeId = params.place ?? places[0]?.id;
  const place = placeId
    ? await prisma.place.findUnique({ where: { id: placeId } })
    : null;
  const upcomingEvent = place
    ? await prisma.event.findFirst({
        where: {
          placeId: place.id,
          startAt: { gt: new Date() },
          status: "SCHEDULED",
        },
        orderBy: { startAt: "asc" },
        include: { regs: true },
      })
    : null;

  const renderContent = () => {
    if (!user?.id) {
      return (
        <Box p={4}>
          <SignIn loginError={params.loginError} />
        </Box>
      );
    }
    if (!place) {
      return <>Select place</>;
    }
    return (
      <Box p={4}>
        <RegisterPanel
          event={upcomingEvent as WorldEvent}
          user={user as User}
          place={place}
        />
      </Box>
    );
  };

  return (
    <NarrowShell>
      <Box w="full" as="main" display="grid" gap={4} bg="bg.page">
        <HomePromo />
        {user?.id && (
          <Box px={4}>
            <PlacePicker places={places} currentId={place?.id ?? ""} />
          </Box>
        )}
        {renderContent()}
      </Box>
    </NarrowShell>
  );
}
