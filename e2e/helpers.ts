import { expect, type Page } from "@playwright/test";

/** 1×1 red PNG for file-upload tests. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export async function freshDemo(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/");
}

export async function loginAs(page: Page, kind: "buyer" | "seller" | "admin") {
  await page.goto("/login");
  await page.getByTestId(`demo-${kind}`).click();
  await expect(page.getByTestId("user-menu")).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByTestId("user-menu").click();
  await page.getByTestId("logout").click();
  await expect(page.getByTestId("login-button")).toBeVisible();
}
