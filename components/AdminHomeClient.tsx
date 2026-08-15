"use client";

import { Box, VStack } from "@chakra-ui/react";
import { Card, Heading, Link, Text } from "@/ui/index";

export type AdminPlaceRow = {
  id: string;
  name: string;
  timezone: string;
};

export default function AdminHomeClient({
  places,
}: {
  places: AdminPlaceRow[];
}) {
  return (
    <Box w="full" p={4}>
      <VStack align="stretch" gap={4}>
        <Heading size="lg">Admin</Heading>
        {places.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <Text muted fontSize="sm" data-testid="admin-empty">
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
                  <Link
                    href={`/admin/places/${p.id}/calendar`}
                    data-testid="admin-calendar-link"
                  >
                    {p.name} — calendar
                  </Link>
                  <Link
                    href={`/admin/places/${p.id}/templates`}
                    data-testid="admin-templates-link"
                  >
                    Templates
                  </Link>
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
