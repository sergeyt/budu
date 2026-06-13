"use client";

import React, { type ReactElement, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Separator,
  Drawer,
  HStack,
  VStack,
  CloseButton,
  Stack,
} from "@chakra-ui/react";
import { Text } from "../ui";
import { api } from "@/lib/api";
import {
  type Registration,
  RegistrationStatus,
  type WorldEvent,
} from "@/types/model";
import { useTranslations } from "next-intl";

export default function ParticipantsSheet({
  event,
  trigger,
}: {
  event: WorldEvent;
  trigger: ReactElement<{ onClick?: (e: unknown) => void }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [regs, setRegs] = useState(event.regs || []);
  const t = useTranslations("participants");

  const { confirmed, reserved } = useMemo(() => {
    const confirmed = regs.filter(
      (p) => p.status === RegistrationStatus.CONFIRMED,
    );
    const reserved = regs.filter(
      (p) => p.status === RegistrationStatus.RESERVED,
    );
    return { confirmed, reserved };
  }, [regs]);

  const show = async () => {
    const regs = await api.events.participants(event.id);
    setRegs(regs);
    setIsOpen(true);
  };

  const renderList = (regs: Registration[], label: string) => (
    <Stack gap={2}>
      <Text fontSize="sm">
        {label} ({regs.length})
      </Text>
      <VStack align="stretch" gap={3} maxH="30dvh" overflowY="auto" mb={4}>
        {regs.map((it) => (
          <HStack key={it.id} borderWidth="1px" rounded="xl" p={3}>
            <Avatar.Root size="sm">
              <Avatar.Fallback name={it.user?.name ?? "Anonymous"} />
              <Avatar.Image src={it.user?.image ?? undefined} />
            </Avatar.Root>
            <Box flex="1">
              <Text fontSize="sm" fontWeight="medium" color="text">
                {it.user?.name ?? "Anonymous"}
              </Text>
              {it.user?.email && (
                <Text fontSize="xs" color="gray.500">
                  {it.user.email}
                </Text>
              )}
            </Box>
            <Text fontSize="xs" color="gray.500">
              {new Date(it.createdAt).toLocaleTimeString()}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Stack>
  );

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => {
        setIsOpen(e.open);
      }}
      placement="bottom"
    >
      <Drawer.Backdrop />
      <Drawer.Trigger asChild>
        {React.cloneElement(trigger, {
          onClick: show,
        })}
      </Drawer.Trigger>
      <Drawer.Positioner>
        <Drawer.Content roundedTop="2xl">
          <Drawer.CloseTrigger asChild>
            <CloseButton size="sm" />
          </Drawer.CloseTrigger>
          <Drawer.Header>
            <Drawer.Title textAlign="center">
              {t("participants_label")}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            {renderList(confirmed, t("confirmed_label"))}
            {!!reserved.length && (
              <>
                <Separator />
                {renderList(reserved, t("reserved_label"))}
              </>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
