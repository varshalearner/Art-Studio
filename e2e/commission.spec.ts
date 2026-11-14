import { expect, test } from "@playwright/test";
import { TINY_PNG, freshDemo, loginAs, logout } from "./helpers";

test("commission with photo + sketch → artist quote → buyer accepts → deposit paid", async ({ page }) => {
  await freshDemo(page);

  // ----- buyer submits a commission with a reference photo and a sketch -----
  await loginAs(page, "buyer");
  await page.goto("/commission");

  await page.getByTestId("reference-input").setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(page.getByTestId("reference-previews")).toBeVisible();

  await page.getByTestId("commission-title").fill("E2E Mountain Cabin");
  await page
    .getByTestId("commission-description")
    .fill("A cabin in the mountains at dusk, warm window light, long shadows.");

  // draw on the sketch canvas (mouse)
  await page.getByTestId("open-sketch").click();
  const canvas = page.locator('[data-testid="sketch-canvas"] canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.35, { steps: 12 });
  await page.mouse.up();

  // pick a specific artist (Arjun — the demo seller account) and submit
  await page.getByTestId("artist-select").selectOption("u_arjun");
  await page.getByTestId("commission-submit").click();

  // buyer lands on the commission page: Submitted
  await expect(page.getByTestId("commission-status")).toContainText("Submitted");

  // ----- artist sends a quote -----
  await logout(page);
  await loginAs(page, "seller");
  await page.goto("/sell?tab=commissions");
  await expect(page.getByTestId("artist-commissions")).toContainText("E2E Mountain Cabin");
  await page.getByTestId("send-quote").first().click();
  await page.getByTestId("quote-input").fill("15000");
  await page.getByTestId("quote-send").click();

  // ----- buyer accepts and pays the deposit -----
  await logout(page);
  await loginAs(page, "buyer");
  await page.goto("/account/commissions");
  await page.getByTestId("commissions-list").getByText("E2E Mountain Cabin").click();
  await expect(page.getByTestId("quote-amount")).toBeVisible();
  await page.getByTestId("accept-quote").click();
  await page.getByTestId("pay-deposit").click();
  await page.getByTestId("mock-pay-button").click();

  await expect(page.getByTestId("commission-status")).toContainText("Deposit Paid");
});
