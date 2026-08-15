"use client";

import { Stack, Link as ChakraLink } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { Button, Input, Text } from "../ui";

const DEFAULT_BOT_USERNAME = "budu_tt_bot";

const botUsername = (
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || DEFAULT_BOT_USERNAME
).replace(/^@/, "");

const passwordLoginEnabled = process.env.NEXT_PUBLIC_PASSWORD_LOGIN === "1";

type Props = {
  loginError?: string;
};

export default function SignIn({ loginError }: Props) {
  const t = useTranslations("sign_in");
  const href = `https://t.me/${botUsername}?start=login`;
  const errorMessage =
    loginError === "invalid_credentials"
      ? t("password_error")
      : loginError
        ? t("error")
        : null;

  return (
    <Stack gap={4} align="center">
      {errorMessage ? (
        <Text color="red.600" textAlign="center">
          {errorMessage}
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
          data-testid="signin-telegram"
        >
          {t("telegram")}
        </ChakraLink>
        <Text muted textAlign="center" fontSize="sm">
          {t("telegram_hint")}
        </Text>
      </Stack>
      {passwordLoginEnabled ? (
        <form
          method="POST"
          action="/api/auth/password-login"
          style={{ width: "100%", maxWidth: "20rem" }}
        >
          <Stack gap={3}>
            <Input
              name="username"
              autoComplete="username"
              placeholder={t("username")}
              data-testid="signin-username"
            />
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("password")}
              data-testid="signin-password"
            />
            <Button type="submit" w="full" data-testid="signin-submit">
              {t("password_submit")}
            </Button>
          </Stack>
        </form>
      ) : null}
    </Stack>
  );
}
