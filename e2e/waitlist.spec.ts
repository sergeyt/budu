import { loginAs } from "./helpers/auth";
import { expect, test } from "./fixtures";

test.use({
  seedOptions: { capacity: 1, reserveCapacity: 5, fillConfirmed: true },
});

test("testuser lands on the waitlist when confirmed spots are full", async ({
  page,
  seed,
}) => {
  await loginAs(page, "testuser");
  await expect(page.getByTestId("event-card")).toContainText(seed.event.title);
  await page.getByTestId("registration-cta").click();
  await expect(page.getByTestId("registration-status")).toContainText(
    "В листе ожидания",
  );
});
