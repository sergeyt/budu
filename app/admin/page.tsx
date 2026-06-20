import { redirect } from "next/navigation";
import { Box, VStack } from "@chakra-ui/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/model";
import { Card, Heading, Link, Text } from "@/ui/index";

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
    <Box w="full" p={4}>
      <VStack align="stretch" gap={4}>
        <Heading size="lg">Admin</Heading>
        {places.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <Text muted fontSize="sm">
                You don't manage any places yet. Ask a super-admin to add you as
                a PlaceAdmin.
              </Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <VStack align="stretch" gap={2}>
            {places.map((p) => (
              <Card.Root key={p.id} p={3}>
                <VStack align="stretch" gap={1}>
                  <Link href={`/admin/places/${p.id}/templates`}>{p.name}</Link>
                  <Text muted fontSize="xs">
                    {p.timezone}
                  </Text>
                </VStack>
              </Card.Root>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
