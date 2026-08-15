"use client";

import React, { type ReactElement, useState } from "react";
import { Drawer, CloseButton, Separator } from "@chakra-ui/react";
import { api } from "@/lib/api";
import type { Registration, WorldEvent } from "@/types/model";
import { useTranslations } from "next-intl";
import ParticipantLists from "./ParticipantLists";

export default function ParticipantsSheet({
  event,
  trigger,
  regs: controlledRegs,
  onRegsChange,
}: {
  event: WorldEvent;
  trigger: ReactElement<{ onClick?: (e: unknown) => void }>;
  regs?: Registration[];
  onRegsChange?: (regs: Registration[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localRegs, setLocalRegs] = useState(event.regs || []);
  const t = useTranslations("participants");
  const regs = controlledRegs ?? localRegs;

  const show = async () => {
    const next = await api.events.participants(event.id);
    if (onRegsChange) {
      onRegsChange(next);
    } else {
      setLocalRegs(next);
    }
    setIsOpen(true);
  };

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
            <ParticipantLists participants={regs} />
            <Separator display="none" />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
