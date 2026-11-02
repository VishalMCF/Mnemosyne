import { expect, test } from "@playwright/test";

test("renders the local-first learning dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Good morning." })).toBeVisible();
  await expect(page.getByText("Your notes and learning history stay on this device.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Start a review/ })).toHaveAttribute("href", "/training");
});
