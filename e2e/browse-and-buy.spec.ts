import { expect, test } from "@playwright/test";
import { freshDemo, loginAs } from "./helpers";

test("guest browses, buyer logs in, buys a painting with the demo gateway", async ({ page }) => {
  await freshDemo(page);

  // guests can browse the shop
  await page.goto("/shop");
  await expect(page.getByTestId("artwork-card").first()).toBeVisible();

  // open the seeded artwork
  await page.goto("/artwork/haveli-at-dusk");
  await expect(page.getByTestId("artwork-title")).toHaveText("Haveli at Dusk");

  // login, then add to cart
  await loginAs(page, "buyer");
  await page.goto("/artwork/haveli-at-dusk");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  // cart → checkout
  await page.goto("/cart");
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  await page.getByTestId("checkout-button").click();

  // shipping address
  await page.locator("#fullName").fill("Maya Kapoor");
  await page.locator("#line1").fill("14 Lotus Apartments, MG Road");
  await page.locator("#city").fill("Bengaluru");
  await page.locator("#state").fill("Karnataka");
  await page.locator("#postalCode").fill("560001");
  await page.locator("#country").fill("India");
  await page.locator("#phone").fill("+91 98765 43210");
  await page.getByTestId("save-address").click();

  // pay with the mock gateway
  await page.getByTestId("pay-button").click();
  await page.getByTestId("mock-pay-button").click();

  // success + order tracking
  await expect(page.getByTestId("order-success")).toBeVisible();
  await page.getByRole("link", { name: "Track order" }).click();
  await expect(page.getByTestId("order-status")).toBeVisible();
});
