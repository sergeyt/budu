import type { ReactNode } from "react";
import { Box } from "@chakra-ui/react";

/** Full-bleed shell for public place calendar. */
export default function PlacesLayout({ children }: { children: ReactNode }) {
  return (
    <Box w="100%" minH="100dvh" bg="bg.page">
      {children}
    </Box>
  );
}
