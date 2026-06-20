import { notFound, redirect } from "next/navigation";
import { Box, HStack, VStack } from "@chakra-ui/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import { Heading, Link, Text } from "@/ui/index";
import type { EventTemplate, Place } from "@/types/model";
import { TemplateAdmin } from "@/components/TemplateAdmin";

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
    <Box w="full" p={4}>
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between" align="center">
          <VStack align="start" gap={0}>
            <Heading size="lg">{place.name}</Heading>
            <Text muted fontSize="xs">
              {place.timezone} · {templates.length} template
              {templates.length === 1 ? "" : "s"}
            </Text>
          </VStack>
          <Link href="/admin" fontSize="sm">
            ← back
          </Link>
        </HStack>

        <TemplateAdmin
          place={place as Place}
          initialTemplates={templates as unknown as EventTemplate[]}
        />
      </VStack>
    </Box>
  );
}
