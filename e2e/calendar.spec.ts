import { loginAs } from "./helpers/auth";
import { expect, test } from "./fixtures";

test("public calendar deep-link opens the event drawer for a signed-out visitor", async ({
  page,
  seed,
}) => {
  await page.goto(`/places/${seed.place.id}/calendar?event=${seed.event.id}`);
  await expect(page.getByTestId("place-calendar-name")).toHaveText(
    seed.place.name,
  );
  await expect(page.getByTestId("event-drawer")).toBeVisible();
  await expect(page.getByTestId("sign-in-to-register")).toBeVisible();
});

test("testuser can register from the public calendar drawer", async ({
  page,
  seed,
}) => {
  await loginAs(page, "testuser");
  await page.goto(`/places/${seed.place.id}/calendar?event=${seed.event.id}`);
  await expect(page.getByTestId("event-drawer")).toBeVisible();
  await expect(page.getByTestId("registration-cta")).toBeVisible();
  await page.getByTestId("registration-cta").click();
  await expect(page.getByTestId("registration-status")).toBeVisible();
});
