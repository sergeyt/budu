"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Box,
  Drawer,
  CloseButton,
  HStack,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Button, Heading, Input, Text, toast } from "@/ui/index";
import { formatEventDate } from "@/lib/format";
import { api } from "@/lib/api";
import type { EventStatus, Registration, WorldEvent } from "@/types/model";
import { useEventRegistration } from "@/lib/hooks/useEventRegistration";
import RegistrationCta from "@/components/RegistrationCta";
import ParticipantLists, {
  type ParticipantRow,
} from "@/components/ParticipantLists";

export type EventDetailData = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  durationMinutes?: number | null;
  capacity?: number | null;
  reserveCapacity?: number | null;
  status?: string;
  cancelReason?: string | null;
  placeTimezone: string;
  participants: ParticipantRow[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  event: EventDetailData | null;
  loading?: boolean;
  /** Public calendar path for sign-in return, e.g. `/places/ID/calendar`. */
  calendarPath?: string;
  isAdmin?: boolean;
  onUpdated?: () => void;
};

export default function EventDetailDrawer({
  open,
  onClose,
  event,
  loading,
  calendarPath,
  isAdmin = false,
  onUpdated,
}: Props) {
  const t = useTranslations("calendar");
  const tr = useTranslations("register");
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setParticipants(event.participants);
      setTitle(event.title);
      setDescription(event.description ?? "");
      setEditing(false);
      setCancelOpen(false);
      setCancelReason("");
    }
  }, [event]);

  const worldEvent: WorldEvent | null = useMemo(() => {
    if (!event) {
      return null;
    }
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.startAt,
      durationMinutes: event.durationMinutes,
      capacity: event.capacity,
      reserveCapacity: event.reserveCapacity,
      status: event.status as EventStatus | undefined,
      regs: participants.map((p) => ({
        id: p.id ?? `${p.userId}`,
        userId: p.userId,
        status: p.status as Registration["status"],
        createdAt: p.createdAt ?? new Date().toISOString(),
        user: p.user ?? { name: p.displayName },
      })),
    };
  }, [event, participants]);

  const reg = useEventRegistration(worldEvent, userId, {
    onRegsChange: (regs) => {
      setParticipants(
        regs.map((r) => ({
          id: r.id,
          userId: r.userId,
          status: r.status,
          createdAt: r.createdAt,
          displayName: r.user?.name ?? undefined,
          user: r.user,
        })),
      );
    },
  });

  const when = event
    ? formatEventDate(event.startAt, { t: tr, locale: "ru" })
    : "";

  const signInHref = calendarPath
    ? `/?callbackUrl=${encodeURIComponent(`${calendarPath}?event=${event?.id ?? ""}`)}`
    : "/";

  const saveEdit = async () => {
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      await api.events.update(event.id, {
        title,
        description: description || null,
      });
      toast.success({ title: t("saved") });
      setEditing(false);
      onUpdated?.();
    } catch (e) {
      toast.error({
        title: e instanceof Error ? e.message : t("save_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      await api.events.cancel(event.id, { reason: cancelReason });
      toast.success({ title: t("cancelled") });
      setCancelOpen(false);
      onClose();
      onUpdated?.();
    } catch (e) {
      toast.error({
        title: e instanceof Error ? e.message : t("cancel_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelled = event?.status === "CANCELLED";

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          onClose();
        }
      }}
      placement="end"
      size="md"
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.CloseTrigger asChild>
            <CloseButton size="sm" />
          </Drawer.CloseTrigger>
          <Drawer.Header>
            <Drawer.Title>
              {loading ? "…" : (event?.title ?? t("event"))}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            {loading || !event ? (
              <Text>{t("loading")}</Text>
            ) : (
              <VStack align="stretch" gap={4}>
                <Text color="gray.500">{when}</Text>
                {cancelled && (
                  <Box
                    borderWidth="1px"
                    rounded="md"
                    p={3}
                    borderColor="red.300"
                  >
                    <Text fontWeight="medium" color="red.600">
                      {t("cancelled_banner")}
                    </Text>
                    {event.cancelReason && (
                      <Text fontSize="sm" mt={1}>
                        {event.cancelReason}
                      </Text>
                    )}
                  </Box>
                )}

                {editing ? (
                  <VStack align="stretch" gap={2}>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("field_title")}
                    />
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("description")}
                      rows={4}
                    />
                    <HStack>
                      <Button
                        onClick={saveEdit}
                        loading={saving}
                        variant="success"
                      >
                        {t("save")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditing(false)}
                      >
                        {t("discard")}
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  event.description && (
                    <Text whiteSpace="pre-wrap">{event.description}</Text>
                  )
                )}

                {!cancelled && (
                  <RegistrationCta
                    state={reg}
                    stableLabels
                    signedOut={!userId}
                    signInHref={signInHref}
                    timezone={event.placeTimezone}
                    startAt={event.startAt}
                  />
                )}

                {isAdmin && !cancelled && !editing && (
                  <HStack>
                    <Button variant="outline" onClick={() => setEditing(true)}>
                      {t("edit")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setCancelOpen(true)}
                    >
                      {t("cancel_event")}
                    </Button>
                  </HStack>
                )}

                {cancelOpen && (
                  <VStack align="stretch" gap={2}>
                    <Heading size="sm">{t("cancel_reason_title")}</Heading>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder={t("cancel_reason_placeholder")}
                      rows={3}
                    />
                    <HStack>
                      <Button
                        variant="danger"
                        loading={saving}
                        disabled={cancelReason.trim().length < 3}
                        onClick={confirmCancel}
                      >
                        {t("confirm_cancel")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCancelOpen(false)}
                      >
                        {t("discard")}
                      </Button>
                    </HStack>
                  </VStack>
                )}

                <Box>
                  <Heading size="sm" mb={2}>
                    {t("participants")}
                  </Heading>
                  <ParticipantLists
                    participants={participants}
                    highlightUserId={userId}
                  />
                </Box>
              </VStack>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
