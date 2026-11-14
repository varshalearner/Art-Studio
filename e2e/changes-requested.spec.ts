import { expect, test } from "@playwright/test";
import { TINY_PNG, freshDemo, loginAs, logout } from "./helpers";

test("admin requests changes → seller edits & resubmits → admin re-approves", async ({ page }) => {
  await freshDemo(page);

  // seller uploads a listing
  await loginAs(page, "seller");
  await page.goto("/sell/new");
  await page.getByTestId("listing-images").setInputFiles({
    name: "sketch.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await page.getByTestId("listing-title").fill("E2E Harbour Study");
  await page.getByTestId("listing-description").fill("Initial description.");
  await page.getByTestId("listing-price").fill("3100");
  await page.getByTestId("listing-submit").click();
  await expect(page.getByTestId("my-listings")).toContainText("E2E Harbour Study");

  // admin requests changes WITH a reason (required)
  await logout(page);
  await loginAs(page, "admin");
  await page.goto("/admin/review");
  await page.getByTestId("request-changes-e2e-harbour-study").click();
  await page.getByTestId("review-note").fill("Please photograph the sketch in daylight.");
  await page.getByTestId("review-note-submit").click();

  // seller sees the note and the terracotta badge
  await logout(page);
  await loginAs(page, "seller");
  await page.goto("/sell");
  await expect(page.getByTestId("listing-status-e2e-harbour-study")).toContainText("Changes Requested");
  await expect(page.getByTestId("admin-note").first()).toContainText("daylight");

  // seller edits and resubmits (wait for the form to hydrate with existing data)
  await page.getByTestId("edit-e2e-harbour-study").click();
  await expect(page.getByTestId("listing-title")).toHaveValue("E2E Harbour Study");
  await page.getByTestId("listing-description").fill("Updated with daylight photos as requested.");
  await page.getByTestId("listing-submit").click();
  await expect(page.getByTestId("listing-status-e2e-harbour-study")).toContainText("Pending");

  // admin re-approves
  await logout(page);
  await loginAs(page, "admin");
  await page.goto("/admin/review");
  await page.getByTestId("approve-e2e-harbour-study").click();

  // live in the shop
  await page.goto("/shop?q=E2E Harbour Study");
  await expect(page.getByTestId("artwork-card").first()).toContainText("E2E Harbour Study");
});
