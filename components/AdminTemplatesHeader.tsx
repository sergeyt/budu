"use client";

import type { ReactNode } from "react";
import { Box, HStack, VStack } from "@chakra-ui/react";
import { Heading, Link, Text } from "@/ui/index";

export default function AdminTemplatesHeader({
  placeName,
  timezone,
  templateCount,
  children,
}: {
  placeName: string;
  timezone: string;
  templateCount: number;
  children: ReactNode;
}) {
  return (
    <Box w="full" p={4}>
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between" align="center">
          <VStack align="start" gap={0}>
            <Heading size="lg">{placeName}</Heading>
            <Text muted fontSize="xs">
              {timezone} · {templateCount} template
              {templateCount === 1 ? "" : "s"}
            </Text>
          </VStack>
          <Link href="/admin" fontSize="sm">
            ← back
          </Link>
        </HStack>
        {children}
      </VStack>
    </Box>
  );
}
