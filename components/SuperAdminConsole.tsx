"use client";

import { useState } from "react";
import type { User, Place } from "@/types/model";
import { useRouter } from "next/navigation";
import { VStack } from "@chakra-ui/react";
import { Button, Text, Card, toast } from "@/ui/index";
import { api, type TelegramLinkResponse } from "@/lib/api";
import { ApiError } from "@budu/api-client";
import { SuperAdminGate } from "./Gate";

enum ActionType {
  REUSE_EVENT = "reuse_event",
  TELEGRAM_LINK = "telegram_link",
}

export function SuperAdminConsole({
  user,
  place,
}: {
  user: User;
  place: Place;
}) {
  const router = useRouter();
  const [linkResult, setLinkResult] = useState<TelegramLinkResponse | null>(
    null,
  );
  const [busy, setBusy] = useState<ActionType | null>(null);

  const onReuseEvent = async () => {
    setBusy(ActionType.REUSE_EVENT);
    try {
      await api.places.action(place.id, { type: "reuse_event" });
      toast.success({ title: "Event reused" });
      router.refresh();
    } catch (err) {
      toast.error({
        title: "Reuse event failed",
        description: err instanceof ApiError ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const onTelegramLink = async () => {
    setBusy(ActionType.TELEGRAM_LINK);
    try {
      const resp = await api.places.action<TelegramLinkResponse>(place.id, {
        type: "telegram_link",
      });
      if (!resp?.code) {
        throw new Error("Server did not return a link code");
      }
      setLinkResult(resp);
    } catch (err) {
      toast.error({
        title: "Telegram link failed",
        description: err instanceof ApiError ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    if (!linkResult) {
      return;
    }
    try {
      await navigator.clipboard.writeText(`/link ${linkResult.code}`);
      toast.success({ title: "Copied /link command" });
    } catch {
      toast.error({ title: "Could not copy to clipboard" });
    }
  };

  const renderContent = () => {
    if (linkResult) {
      return (
        <VStack gap={3} align="stretch">
          <Text fontSize="sm" color="text">
            {linkResult.instructions}
          </Text>
          <Text
            as="pre"
            fontSize="xs"
            whiteSpace="pre-wrap"
            wordBreak="break-all"
            p={3}
            borderWidth="1px"
            borderRadius="md"
            color="text"
          >
            {linkResult.code}
          </Text>
          <Button w="full" variant="gradient" onClick={copyCode}>
            Copy /link command
          </Button>
          <Button w="full" variant="outline" onClick={() => setLinkResult(null)}>
            Close
          </Button>
        </VStack>
      );
    }

    return (
      <VStack gap={2} align="stretch">
        <Button
          w="full"
          variant="gradient"
          loading={busy === ActionType.REUSE_EVENT}
          disabled={busy !== null}
          onClick={onReuseEvent}
        >
          Reuse Event
        </Button>
        <Button
          w="full"
          variant="gradient"
          loading={busy === ActionType.TELEGRAM_LINK}
          disabled={busy !== null}
          onClick={onTelegramLink}
        >
          Telegram Link
        </Button>
      </VStack>
    );
  };

  return (
    <SuperAdminGate user={user}>
      <Card.Root w="full" p={3}>
        <Card.Header color="text" mb={2}>
          SUPER-ADMIN ACTIONS
        </Card.Header>
        <Card.Body>{renderContent()}</Card.Body>
      </Card.Root>
    </SuperAdminGate>
  );
}
