import { loginAs } from "./helpers/auth";
import { expect, test } from "./fixtures";

test("signed-out home shows Telegram and password login, not the event card", async ({
  page,
  seed,
}) => {
  expect(seed.place.name).toBe("E2E Club");
  await page.goto("/");
  await expect(page.getByTestId("signin-telegram")).toBeVisible();
  await expect(page.getByTestId("signin-username")).toBeVisible();
  await expect(page.getByTestId("signin-password")).toBeVisible();
  await expect(page.getByTestId("event-card")).toHaveCount(0);
});

test("wrong password stays on home with a login error", async ({
  page,
  seed: _,
}) => {
  await page.goto("/");
  await page.getByTestId("signin-username").fill("testuser");
  await page.getByTestId("signin-password").fill("wrong");
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/loginError=invalid_credentials/);
  await expect(page.getByTestId("signin-username")).toBeVisible();
});

test("testuser can register and unregister on the home event card", async ({
  page,
  seed,
}) => {
  await loginAs(page, "testuser");
  await expect(page.getByTestId("event-card")).toContainText(seed.event.title);

  await page.getByTestId("registration-cta").click();
  await expect(page.getByTestId("registration-status")).toBeVisible();

  await page.getByTestId("registration-cta").click();
  await expect(page.getByTestId("registration-status")).toHaveCount(0);
});
