import { useTranslations } from "next-intl";
import { Box, HStack } from "@chakra-ui/react";
import { ColorModeButton, Heading } from "../ui";

// TODO display some logo image
export default function HomePromo() {
  const t = useTranslations("home");
  return (
    <HStack w="full" justifyContent="center">
      <Heading as="h1" size="lg" textAlign="center">
        {t("title")}
      </Heading>
      <Box>
        <ColorModeButton />
      </Box>
    </HStack>
  );
}
