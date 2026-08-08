"use client";

import { Stack, Link as ChakraLink } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { Text } from "../ui";

const DEFAULT_BOT_USERNAME = "budu_tt_bot";

const botUsername = (
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || DEFAULT_BOT_USERNAME
).replace(/^@/, "");

type Props = {
  loginError?: string;
};

export default function SignIn({ loginError }: Props) {
  const t = useTranslations("sign_in");
  const href = `https://t.me/${botUsername}?start=login`;

  return (
    <Stack gap={4} align="center">
      {loginError ? (
        <Text color="red.600" textAlign="center">
          {t("error")}
        </Text>
      ) : null}
      <Stack gap={2} align="center">
        <ChakraLink
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          colorPalette="blue"
          fontWeight="semibold"
          fontSize="lg"
        >
          {t("telegram")}
        </ChakraLink>
        <Text color="fg.muted" textAlign="center" fontSize="sm">
          {t("telegram_hint")}
        </Text>
      </Stack>
    </Stack>
  );
}
