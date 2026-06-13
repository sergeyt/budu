import { useState } from "react";
import type { User, Place } from "@/types/model";
import { useRouter } from "next/navigation";
import { VStack } from "@chakra-ui/react";
import { Button, Text, Card } from "@/ui/index";
import { api } from "@/lib/api";
import { SuperAdminGate } from "./Gate";

enum ActionType {
  REUSE_EVENT = "reuse_event",
  TELEGRAM_LINK = "telegram_link",
}

const isEmptyResponse = (obj: unknown) => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const keys = Object.keys(obj);
  return keys.length === 0 || (keys.length === 1 && keys[0] === "ok");
};

async function executeAction(type: ActionType, place: Place) {
  const resp = await api.places.action(place.id, { type });
  return resp;
}

export function SuperAdminConsole({
  user,
  place,
}: {
  user: User;
  place: Place;
}) {
  const router = useRouter();
  const [response, setResponse] = useState<string | null>(null);

  const reload = () => {
    // Revalidates data and re-renders the route
    router.refresh();
  };

  const meta = [
    {
      id: ActionType.REUSE_EVENT,
      label: "Reuse Event",
    },
    {
      id: ActionType.TELEGRAM_LINK,
      label: "Telegram Link",
    },
  ];

  const actions = meta.map(({ id: type, label }) => {
    return (
      <Button
        key={type}
        w="full"
        variant="gradient"
        onClick={async () => {
          const resp = await executeAction(type, place);
          if (!isEmptyResponse(resp)) {
            setResponse(JSON.stringify(resp, null, 2));
          }
          reload();
        }}
      >
        {label}
      </Button>
    );
  });

  const renderContent = () => {
    if (response) {
      return (
        <VStack gap={3}>
          <Text
            w="full"
            h="300px"
            as="pre"
            color="text"
            border="1px solid gray.100"
          >
            {response}
          </Text>
          <Button w="full" onClick={() => setResponse(null)}>
            Close
          </Button>
        </VStack>
      );
    }
    return <VStack>{actions}</VStack>;
  };

  const renderConsole = () => {
    return (
      <Card.Root w="full" p={3}>
        <Card.Header color="text" mb={2}>
          SUPER-ADMIN ACTIONS
        </Card.Header>
        <Card.Body>{renderContent()}</Card.Body>
      </Card.Root>
    );
  };

  return <SuperAdminGate user={user}>{renderConsole()}</SuperAdminGate>;
}
