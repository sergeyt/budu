import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { truncateAll } from "./helpers/db";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});
