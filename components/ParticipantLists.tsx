"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Avatar,
  Box,
  HStack,
  Separator,
  Stack,
  VStack,
} from "@chakra-ui/react";
import { Text } from "@/ui/index";
import { type Registration, RegistrationStatus } from "@/types/model";

export type ParticipantRow = {
  id?: string;
  userId: string;
  status: "CONFIRMED" | "RESERVED" | RegistrationStatus;
  createdAt?: string | Date | number;
  displayName?: string;
  user?: { name?: string | null; email?: string | null; image?: string | null };
};

function nameOf(p: ParticipantRow) {
  return p.displayName ?? p.user?.name ?? "Anonymous";
}

function sortByCreatedAt(a: ParticipantRow, b: ParticipantRow) {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ta - tb;
}

export default function ParticipantLists({
  participants,
  highlightUserId,
  maxH = "40dvh",
}: {
  participants: ParticipantRow[] | Registration[];
  highlightUserId?: string;
  maxH?: string;
}) {
  const t = useTranslations("participants");
  const { confirmed, reserved } = useMemo(() => {
    const list = [...participants] as ParticipantRow[];
    const confirmed = list
      .filter((p) => p.status === RegistrationStatus.CONFIRMED)
      .sort(sortByCreatedAt);
    const reserved = list
      .filter((p) => p.status === RegistrationStatus.RESERVED)
      .sort(sortByCreatedAt);
    return { confirmed, reserved };
  }, [participants]);

  const renderList = (rows: ParticipantRow[], label: string) => (
    <Stack gap={2}>
      <Text fontSize="sm">
        {label} ({rows.length})
      </Text>
      <VStack align="stretch" gap={2} maxH={maxH} overflowY="auto" mb={2}>
        {rows.length === 0 ? (
          <Text fontSize="xs" color="gray.500">
            —
          </Text>
        ) : (
          rows.map((it, i) => {
            const isYou = highlightUserId && it.userId === highlightUserId;
            return (
              <HStack
                key={it.id ?? `${it.userId}-${i}`}
                borderWidth="1px"
                rounded="xl"
                p={3}
                bg={isYou ? "bg.muted" : undefined}
              >
                <Avatar.Root size="sm">
                  <Avatar.Fallback name={nameOf(it)} />
                  <Avatar.Image src={it.user?.image ?? undefined} />
                </Avatar.Root>
                <Box flex="1">
                  <Text fontSize="sm" fontWeight="medium" color="text">
                    {nameOf(it)}
                    {isYou ? ` (${t("you")})` : ""}
                  </Text>
                </Box>
                {it.createdAt && (
                  <Text fontSize="xs" color="gray.500">
                    {new Date(it.createdAt).toLocaleTimeString()}
                  </Text>
                )}
              </HStack>
            );
          })
        )}
      </VStack>
    </Stack>
  );

  return (
    <VStack align="stretch" gap={3}>
      {renderList(confirmed, t("confirmed_label"))}
      <Separator />
      {renderList(reserved, t("reserved_label"))}
    </VStack>
  );
}
