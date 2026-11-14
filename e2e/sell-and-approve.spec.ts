import { expect, test } from "@playwright/test";
import { TINY_PNG, freshDemo, loginAs, logout } from "./helpers";

test("seller uploads artwork → admin approves → listing goes live in the shop", async ({ page }) => {
  await freshDemo(page);

  // ----- seller uploads -----
  await loginAs(page, "seller");
  await page.goto("/sell/new");
  await page.getByTestId("listing-images").setInputFiles({
    name: "painting.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await page.getByTestId("listing-title").fill("E2E Evening Rooftops");
  await page.getByTestId("listing-description").fill("A rooftop view at golden hour, painted for the E2E suite.");
  await page.getByTestId("listing-price").fill("7200");
  await page.getByTestId("listing-submit").click();

  // it shows in My Listings as Pending Review
  await expect(page.getByTestId("my-listings")).toContainText("E2E Evening Rooftops");
  await expect(page.getByTestId("listing-status-e2e-evening-rooftops")).toContainText("Pending");

  // not in the public shop yet
  await page.goto("/shop?q=E2E Evening Rooftops");
  await expect(page.getByTestId("shop-count")).toContainText("No artworks");

  // ----- admin approves -----
  await logout(page);
  await loginAs(page, "admin");
  await page.goto("/admin/review");
  await expect(page.getByTestId("review-item-e2e-evening-rooftops")).toBeVisible();
  await page.getByTestId("approve-e2e-evening-rooftops").click();

  // ----- listing is live -----
  await page.goto("/shop?q=E2E Evening Rooftops");
  await expect(page.getByTestId("artwork-card").first()).toContainText("E2E Evening Rooftops");

  // seller sees the Live badge
  await logout(page);
  await loginAs(page, "seller");
  await page.goto("/sell");
  await expect(page.getByTestId("listing-status-e2e-evening-rooftops")).toContainText("Live");
});
