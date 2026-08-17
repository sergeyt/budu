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
  await expect(page.getByTestId("admin-add-place")).toHaveCount(0);
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
  await expect(page.getByTestId("admin-add-place")).toHaveCount(0);
  await expect(page.getByTestId("admin-delete-place")).toHaveCount(0);

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

test("non-super-admins cannot open the create-place wizard", async ({
  page,
  seed: _seed,
}) => {
  await loginAs(page, "testadmin");
  await page.goto("/admin/places/new");
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("admin-add-place")).toHaveCount(0);
});

test("superadmin can create and delete a place", async ({
  page,
  seed: _seed,
}) => {
  await loginAs(page, "testsuperadmin");
  await page.goto("/admin");
  await page.getByTestId("admin-add-place").click();
  await expect(page).toHaveURL(/\/admin\/places\/new/);

  await page.getByTestId("place-name-input").fill("E2E New Club");
  await page.getByTestId("wizard-next").click();
  await page.getByTestId("wizard-skip").click();
  await page.getByTestId("wizard-skip").click();
  await page.getByTestId("wizard-skip").click();
  await expect(page.getByTestId("place-timezone-input")).toHaveValue(
    "Europe/Moscow",
  );
  await page.getByTestId("wizard-next").click();

  await expect(page).toHaveURL(/\/admin\/?$/);
  const created = page
    .getByTestId("admin-place-row")
    .filter({ hasText: "E2E New Club" });
  await expect(created).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await created.getByTestId("admin-delete-place").click();
  await expect(
    page.getByTestId("admin-place-row").filter({ hasText: "E2E New Club" }),
  ).toHaveCount(0);
});
