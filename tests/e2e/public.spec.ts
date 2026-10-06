import { expect, test } from "@playwright/test";

test("public account flow is usable without fabricated content", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "desktop content check");
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "One clear place for the work that matters." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make room for better study" })).toBeVisible();
  await expect(page.getByText("No fabricated posts, activity, rankings, or testimonials.")).toBeVisible();
  await page.getByRole("tab", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeEditable();
  await expect(page.getByLabel("Password")).toBeEditable();
  expect(consoleErrors).toEqual([]);
});

test("mobile layout does not overflow horizontally", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile viewport only");
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await expect(page.getByRole("button", { name: /Create my study space/i })).toBeVisible();
});
