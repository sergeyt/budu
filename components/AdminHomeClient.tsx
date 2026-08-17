"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, HStack, VStack } from "@chakra-ui/react";
import { Button, Card, Heading, Link, Text, toast } from "@/ui/index";
import { api } from "@/lib/api";
import { ApiError } from "@budu/api-client";

export type AdminPlaceRow = {
  id: string;
  name: string;
  timezone: string;
};

export default function AdminHomeClient({
  places,
  isSuperAdmin,
}: {
  places: AdminPlaceRow[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (place: AdminPlaceRow) => {
    if (
      !confirm(
        `Delete place "${place.name}"? Events, templates, and registrations at this place will be removed.`,
      )
    ) {
      return;
    }
    setDeletingId(place.id);
    try {
      await api.places.delete(place.id);
      toast.success({ title: "Place deleted" });
      router.refresh();
    } catch (err) {
      toast.error({
        title: "Could not delete place",
        description: err instanceof ApiError ? err.message : String(err),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box w="full" p={4}>
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between" align="center">
          <Heading size="lg">Admin</Heading>
          {isSuperAdmin ? (
            <Link href="/admin/places/new" data-testid="admin-add-place">
              + Add place
            </Link>
          ) : null}
        </HStack>
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
              <Card.Root key={p.id} p={3} data-testid="admin-place-row">
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
                  <HStack justify="space-between" align="center">
                    <Text muted fontSize="xs">
                      {p.timezone}
                    </Text>
                    {isSuperAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        colorPalette="red"
                        loading={deletingId === p.id}
                        disabled={deletingId !== null}
                        onClick={() => void onDelete(p)}
                        data-testid="admin-delete-place"
                      >
                        Delete
                      </Button>
                    ) : null}
                  </HStack>
                </VStack>
              </Card.Root>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
