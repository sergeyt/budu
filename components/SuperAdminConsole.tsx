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
  TELEGRAM_CHAT = "telegram_chat",
  TELEGRAM_ACCOUNT = "telegram_account",
}

type LinkResult = TelegramLinkResponse & {
  command: "/link" | "/link_account";
};

export function SuperAdminConsole({
  user,
  place,
}: {
  user: User;
  place: Place;
}) {
  const router = useRouter();
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null);
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

  const onTelegramChatLink = async () => {
    setBusy(ActionType.TELEGRAM_CHAT);
    try {
      const resp = await api.places.action<TelegramLinkResponse>(place.id, {
        type: "telegram_link",
      });
      if (!resp?.code) {
        throw new Error("Server did not return a link code");
      }
      setLinkResult({ ...resp, command: "/link" });
    } catch (err) {
      toast.error({
        title: "Telegram chat link failed",
        description: err instanceof ApiError ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const onTelegramAccountLink = async () => {
    setBusy(ActionType.TELEGRAM_ACCOUNT);
    try {
      const resp = await api.me.telegramLink();
      if (!resp?.code) {
        throw new Error("Server did not return a link code");
      }
      setLinkResult({ ...resp, command: "/link_account" });
    } catch (err) {
      toast.error({
        title: "Telegram account link failed",
        description: err instanceof ApiError ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const copyCommand = async () => {
    if (!linkResult) {
      return;
    }
    const text = `${linkResult.command} ${linkResult.code}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success({ title: `Copied ${linkResult.command} command` });
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
            {`${linkResult.command} ${linkResult.code}`}
          </Text>
          <Button w="full" variant="gradient" onClick={copyCommand}>
            {`Copy ${linkResult.command} command`}
          </Button>
          <Button
            w="full"
            variant="outline"
            onClick={() => setLinkResult(null)}
          >
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
          loading={busy === ActionType.TELEGRAM_CHAT}
          disabled={busy !== null}
          onClick={onTelegramChatLink}
        >
          Link Telegram Chat
        </Button>
        <Button
          w="full"
          variant="gradient"
          loading={busy === ActionType.TELEGRAM_ACCOUNT}
          disabled={busy !== null}
          onClick={onTelegramAccountLink}
        >
          Link Telegram Account
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
