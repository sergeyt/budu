import { test as base } from "@playwright/test";
import { truncateAll } from "./helpers/db";
import { seedE2e, type SeedOptions } from "./helpers/seed";

type Seed = Awaited<ReturnType<typeof seedE2e>>;

export const test = base.extend<{ seed: Seed; seedOptions: SeedOptions }>({
  seedOptions: [{}, { option: true }],
  seed: async ({ seedOptions }, use) => {
    await truncateAll();
    const seed = await seedE2e(seedOptions);
    await use(seed);
  },
});

export { expect } from "@playwright/test";
