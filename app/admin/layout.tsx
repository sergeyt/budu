import type { ReactNode } from "react";
import { Box } from "@chakra-ui/react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Box w="100%" minH="100dvh" bg="bg.page" maxW="6xl" mx="auto">
      {children}
    </Box>
  );
}
