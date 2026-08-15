"use client";

import { useTranslations } from "next-intl";
import { Badge, Box, HStack } from "@chakra-ui/react";
import { Text, Heading, Card } from "@/ui/index";
import {
  type Opt,
  type Place,
  type User,
  UserRole,
  type WorldEvent,
} from "@/types/model";
import { formatCapacity, formatEventDate } from "@/lib/format";
import ParticipantsSheet from "./ParticipantsSheet";
import { SuperAdminConsole } from "./SuperAdminConsole";
import { useEventRegistration } from "@/lib/hooks/useEventRegistration";
import RegistrationCta from "./RegistrationCta";

export default function RegisterPanel({
  event,
  user,
  place,
}: {
  event: Opt<WorldEvent>;
  user: User;
  place: Place;
}) {
  const t = useTranslations("register");
  const reg = useEventRegistration(event, user.id);
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

  const trigger = (
    <HStack cursor="pointer">
      <Badge colorScheme={reg.confirmedFull ? "red" : "green"} px={1}>
        {reg.confirmedCount}
        {reg.reservedCount > 0 && (
          <>
            ({reg.reservedCount}/
            {formatCapacity(
              typeof event.reserveCapacity === "number"
                ? event.reserveCapacity
                : Infinity,
            )}
            )
          </>
        )}
        /
        {formatCapacity(
          typeof event.capacity === "number" ? event.capacity : Infinity,
        )}
      </Badge>
    </HStack>
  );

  const at = formatEventDate(event.startAt, { t, locale: "ru" });

  return (
    <>
      <Card.Root w="full" data-testid="event-card">
        <Card.Header>
          <HStack w="full" justifyContent="space-between">
            <HStack>
              <Heading size="md" color="text">
                {event.title}
              </Heading>
              <Box color="gray.400">{at}</Box>
            </HStack>
            <ParticipantsSheet
              event={event}
              trigger={trigger}
              regs={reg.regs}
              onRegsChange={reg.setRegs}
            />
          </HStack>
        </Card.Header>
        <Card.Body>
          <Box w="full" pt={4}>
            <RegistrationCta
              state={reg}
              timezone={place.timezone}
              startAt={event.startAt}
            />
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
