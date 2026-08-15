"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Box, HStack, VStack } from "@chakra-ui/react";
import { Button, Text } from "@/ui/index";
import { RegistrationStatus } from "@/types/model";
import type { EventRegistrationState } from "@/lib/hooks/useEventRegistration";
import { DateTime } from "luxon";
import { toDateTime } from "@/lib/util";

function useRandomLabel(labels: string[]) {
  const [label, setLabel] = useState(labels[0] ?? "");
  useEffect(() => {
    if (labels.length === 0) {
      return;
    }
    setLabel(labels[Math.floor(Math.random() * labels.length)]);
  }, [labels]);
  return label;
}

type Props = {
  state: EventRegistrationState;
  /** When set, use fixed labels instead of playful random ones. */
  stableLabels?: boolean;
  signedOut?: boolean;
  signInHref?: string;
  /** IANA zone for "opens at" copy. */
  timezone?: string;
  startAt?: string | Date | number;
};

export default function RegistrationCta({
  state,
  stableLabels = false,
  signedOut = false,
  signInHref,
  timezone,
  startAt,
}: Props) {
  const t = useTranslations("register");
  const err = useTranslations("errors");
  const {
    myReg,
    canReg,
    confirmedFull,
    reserveFull,
    isPending,
    register,
    unregister,
  } = state;

  const labelVariants = useMemo(() => {
    const digits = Array.from({ length: 10 }, (_, i) => i + 1);
    return {
      register: digits.map((k) => t(`register_label${k}`)),
      unregister: digits.map((k) => t(`unregister_label${k}`)),
      join: digits.map((k) => t(`join_label${k}`)),
      leave: digits.map((k) => t(`leave_label${k}`)),
    };
  }, [t]);

  const registerLabel = useRandomLabel(labelVariants.register);
  const unregisterLabel = useRandomLabel(labelVariants.unregister);
  const joinLabel = useRandomLabel(labelVariants.join);
  const leaveLabel = useRandomLabel(labelVariants.leave);

  const opensAtLabel = useMemo(() => {
    if (!startAt || canReg || myReg) {
      return null;
    }
    const openAt = toDateTime(startAt).minus({ hours: 24 });
    if (!openAt.isValid) {
      return null;
    }
    const zoned = timezone ? openAt.setZone(timezone) : openAt;
    return zoned.toLocaleString(DateTime.DATETIME_SHORT);
  }, [startAt, timezone, canReg, myReg]);

  if (signedOut) {
    return (
      <VStack align="stretch" gap={2} w="full">
        <Button
          w="full"
          cta
          data-testid="sign-in-to-register"
          onClick={() => {
            window.location.href = signInHref ?? "/";
          }}
        >
          {t("sign_in_to_register")}
        </Button>
      </VStack>
    );
  }

  const primaryCta = !myReg
    ? confirmedFull
      ? reserveFull
        ? t("full_label")
        : stableLabels
          ? t("join_waitlist")
          : joinLabel
      : stableLabels
        ? t("register")
        : registerLabel
    : myReg.status === RegistrationStatus.CONFIRMED
      ? stableLabels
        ? t("leave")
        : unregisterLabel
      : stableLabels
        ? t("leave_waitlist")
        : leaveLabel;

  const variant = myReg
    ? myReg.status === RegistrationStatus.CONFIRMED
      ? "danger"
      : "warning"
    : undefined;

  const statusChip = myReg
    ? myReg.status === RegistrationStatus.CONFIRMED
      ? t("status_confirmed")
      : t("status_waitlist")
    : null;

  return (
    <VStack align="stretch" gap={2} w="full">
      {statusChip && (
        <HStack>
          <Badge colorPalette="green" px={2} data-testid="registration-status">
            {statusChip}
          </Badge>
        </HStack>
      )}
      <Button
        onClick={myReg ? unregister : register}
        w="full"
        disabled={
          myReg
            ? isPending
            : isPending || !canReg || (confirmedFull && reserveFull)
        }
        loading={isPending}
        variant={variant}
        cta
        data-testid="registration-cta"
      >
        {primaryCta}
      </Button>
      {!myReg && (
        <Box>
          {!canReg && (
            <Text fontSize="xs" color="orange.600">
              {opensAtLabel
                ? err("opens_at", { when: opensAtLabel })
                : err("too_early")}
            </Text>
          )}
          {canReg && confirmedFull && !reserveFull && (
            <Text fontSize="xs" color="purple.600">
              {err("cap_reached")}
            </Text>
          )}
          {canReg && confirmedFull && reserveFull && (
            <Text fontSize="xs" color="red.600">
              {err("full")}
            </Text>
          )}
        </Box>
      )}
    </VStack>
  );
}
