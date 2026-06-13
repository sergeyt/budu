"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Badge, Box, HStack } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { Button, Text, Heading, toast, Card } from "@/ui/index";
import {
  type DateLike,
  type Opt,
  type Place,
  type Registration,
  RegistrationStatus,
  type User,
  UserRole,
  type WorldEvent,
} from "@/types/model";
import { countBy, toDateTime } from "@/lib/util";
import { formatCapacity, formatEventDate } from "@/lib/format";
import ParticipantsSheet from "./ParticipantsSheet";
import { SuperAdminConsole } from "./SuperAdminConsole";

function within24h(startAt: DateLike) {
  const start = toDateTime(startAt).toJSDate();
  const openAt = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();
  return now >= openAt && now < start;
}

/**
 * Picks a stable label on the server (always index 0) so SSR and the
 * initial client render match, then re-rolls to a random label after
 * mount. Prevents React hydration warnings while keeping the playful
 * variation on the client.
 */
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

export default function RegisterPanel({
  event,
  user,
  place,
}: {
  event: Opt<WorldEvent>;
  user: User;
  place: Place;
}) {
  const [isPending, startTransition] = useTransition();
  const [regs, setRegs] = useState<Registration[]>(event?.regs ?? []);
  const t = useTranslations("register");
  const err = useTranslations("errors");

  const userId = user.id;

  const labelVariants = useMemo(() => {
    const digits = Array.from({ length: 10 }, (_, i) => i + 1);
    const register = digits.map((k) => t(`register_label${k}`));
    const unregister = digits.map((k) => t(`unregister_label${k}`));
    const join = digits.map((k) => t(`join_label${k}`));
    const leave = digits.map((k) => t(`leave_label${k}`));
    return {
      register,
      unregister,
      join,
      leave,
    };
  }, [t]);
  const registerLabel = useRandomLabel(labelVariants.register);
  const unregisterLabel = useRandomLabel(labelVariants.unregister);
  const joinLabel = useRandomLabel(labelVariants.join);
  const leaveLabel = useRandomLabel(labelVariants.leave);

  const { confirmedCount, reservedCount, myReg, canReg } = useMemo(() => {
    const counts = countBy(regs, "status", {
      [RegistrationStatus.CONFIRMED]: 0,
      [RegistrationStatus.RESERVED]: 0,
    });
    const confirmedCount = counts[RegistrationStatus.CONFIRMED];
    const reservedCount = counts[RegistrationStatus.RESERVED];
    const myReg = regs.find((r) => r.userId === userId);
    const canReg = !!event && within24h(event.startAt);
    return { confirmedCount, reservedCount, myReg, canReg };
  }, [userId, event, regs]);

  const isSuperAdmin = user.role === UserRole.SUPERADMIN;

  if (!event) {
    if (isSuperAdmin) {
      return <SuperAdminConsole user={user} place={place} />;
    }
    return (
      <Card.Root>
        <Card.Body>
          <Text fontSize="sm">{t("no_upcoming_event")}</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  const confirmedCap =
    typeof event.capacity === "number" ? event.capacity : Infinity;
  const reserveCap =
    typeof event.reserveCapacity === "number"
      ? event.reserveCapacity
      : Infinity;
  const confirmedFull = confirmedCount >= confirmedCap;
  const reserveFull = reservedCount >= reserveCap;

  const renderCounts = () => {
    const trigger = (
      <HStack cursor="pointer">
        <Badge colorScheme={confirmedFull ? "red" : "green"} px={1}>
          {confirmedCount}
          {reservedCount > 0 && (
            <>
              ({reservedCount}/{formatCapacity(reserveCap)})
            </>
          )}
          /{formatCapacity(confirmedCap)}
        </Badge>
      </HStack>
    );
    return <ParticipantsSheet event={event} trigger={trigger} />;
  };

  const renderTitle = () => {
    const at = formatEventDate(event.startAt, { t, locale: "ru" });
    // TODO render info about capacity
    /*
      {typeof event.capacity === "number" && (
            <Badge>Capacity {event.capacity}</Badge>
          )}
          {typeof event.reserveCapacity === "number" && (
            <Badge colorScheme="purple">Reserve {event.reserveCapacity}</Badge>
          )}
     */
    return (
      <HStack w="full" justifyContent="space-between">
        <HStack>
          <Heading size="md" color="text">
            {event.title}
          </Heading>
          <Box color="gray.400">{at}</Box>
        </HStack>
        {renderCounts()}
      </HStack>
    );
  };

  const register = () =>
    startTransition(async () => {
      try {
        const { regs } = await api.events.register(event.id);
        setRegs(regs);
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Could not register",
        });
      }
    });

  const unregister = () =>
    startTransition(async () => {
      try {
        const { regs } = await api.events.unregister(event.id);
        setRegs(regs);
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Could not unregister",
        });
      }
    });

  const renderCTA = () => {
    const primaryCta = !myReg
      ? confirmedFull
        ? reserveFull
          ? "Full"
          : joinLabel
        : registerLabel
      : myReg.status === RegistrationStatus.CONFIRMED
        ? unregisterLabel
        : leaveLabel;
    const variant = myReg
      ? myReg.status === RegistrationStatus.CONFIRMED
        ? "danger"
        : "warning"
      : undefined;
    return (
      <Button
        onClick={myReg ? unregister : register}
        w="full"
        disabled={
          myReg
            ? isPending
            : isPending || !canReg || (!myReg && confirmedFull && reserveFull)
        }
        loading={isPending}
        variant={variant}
        cta
      >
        {primaryCta}
      </Button>
    );
  };

  const renderError = () => {
    if (myReg) {
      return null;
    }
    return (
      <>
        {!canReg && (
          <Text fontSize="xs" color="orange.600">
            {err("too_early")}
          </Text>
        )}
        {confirmedFull && !reserveFull && (
          <Text fontSize="xs" color="purple.600">
            {err("cap_reached")}
          </Text>
        )}
        {confirmedFull && reserveFull && (
          <Text fontSize="xs" color="red.600">
            {err("full")}
          </Text>
        )}
      </>
    );
  };

  return (
    <>
      <Card.Root w="full">
        <Card.Header>{renderTitle()}</Card.Header>
        <Card.Body>
          <Box w="full" pt={4}>
            {renderCTA()}
            {renderError()}
          </Box>
        </Card.Body>
      </Card.Root>
      {isSuperAdmin && (
        <Box pt={3}>
          <SuperAdminConsole user={user} place={place} />
        </Box>
      )}
    </>
  );
}
