import { loginAs } from "./helpers/auth";
import { expect, test } from "./fixtures";

test("unauthenticated /admin redirects home", async ({ page, seed: _seed }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("signin-telegram")).toBeVisible();
});

test("testuser sees an empty admin place list", async ({
  page,
  seed: _seed,
}) => {
  await loginAs(page, "testuser");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("admin-empty")).toBeVisible();
});

test("testadmin sees their place and can create a template", async ({
  page,
  seed,
}) => {
  await loginAs(page, "testadmin");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("admin-calendar-link")).toContainText(
    seed.place.name,
  );

  await page.getByTestId("admin-templates-link").click();
  await expect(
    page.getByRole("heading", { name: "New template" }),
  ).toBeVisible();
  await page.getByPlaceholder("Лесенка (еженедельно)").fill("E2E Weekly");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("E2E Weekly")).toBeVisible();
});

test("testadmin can cancel an event from the calendar drawer", async ({
  page,
  seed,
}) => {
  await loginAs(page, "testadmin");
  await page.goto(
    `/admin/places/${seed.place.id}/calendar?event=${seed.event.id}`,
  );
  await expect(page.getByTestId("event-drawer")).toBeVisible();
  await page.getByRole("button", { name: "Отменить событие" }).click();
  await page
    .getByPlaceholder("Причина (увидят игроки)")
    .fill("e2e cancel reason");
  await page.getByRole("button", { name: "Подтвердить отмену" }).click();

  await page.goto(
    `/admin/places/${seed.place.id}/calendar?event=${seed.event.id}`,
  );
  await expect(page.getByTestId("event-drawer")).toBeVisible();
  await expect(page.getByText("Событие отменено")).toBeVisible();
  await expect(page.getByText("e2e cancel reason")).toBeVisible();
});
