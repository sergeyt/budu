import type { Page } from "@playwright/test";
import { E2E_ADMIN, E2E_PLAYER } from "./seed";

export type E2eAccount = "testuser" | "testadmin";

const credentials = {
  testuser: E2E_PLAYER,
  testadmin: E2E_ADMIN,
} as const;

/** Sign in through the home password form (AUTH_PASSWORD_LOGIN must be on). */
export async function loginAs(page: Page, who: E2eAccount): Promise<void> {
  const { username, password } = credentials[who];
  await page.goto("/");
  await page.getByTestId("signin-username").fill(username);
  await page.getByTestId("signin-password").fill(password);
  await page.getByTestId("signin-submit").click();
  await page.getByTestId("place-picker").waitFor();
}
