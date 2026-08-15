import type { ReactNode } from "react";
import { Center } from "@chakra-ui/react";

/** Phone-width shell for home / sign-in. */
export default function NarrowLayout({ children }: { children: ReactNode }) {
  return (
    <Center maxW="md" minH="100vh" bg="bg.page" mx="auto">
      {children}
    </Center>
  );
}
