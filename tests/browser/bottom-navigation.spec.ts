import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("a7-property-language")) localStorage.setItem("a7-property-language", "en");
  });
});

test("bottom navigation follows links, reloads, and browser history", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.locator(".web-home-hero")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Primary mobile navigation" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?purpose=rent/);
  await expect(nav.getByRole("link", { name: "Explore", exact: true })).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(nav.getByRole("link", { name: "Explore", exact: true })).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Saved", exact: true }).focus();
  await expect(nav.getByRole("link", { name: "Saved", exact: true })).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
  await expect(nav).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("a7-auth-return-to"))).toBe("/saved");
});

test("bottom navigation fits 320px, keeps touch targets and translates labels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".web-home-hero")).toHaveCount(0);
  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("button", { name: /မြန်မာ\s*Myanmar/ }).click();
  const nav = page.getByRole("navigation", { name: "မိုဘိုင်းအဓိက လမ်းညွှန်" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "ပင်မ", exact: true })).toHaveAttribute("aria-current", "page");
  for (const link of await nav.getByRole("link").all()) {
    const rect = await link.boundingBox();
    expect(rect!.width).toBeGreaterThanOrEqual(44);
    expect(rect!.height).toBeGreaterThanOrEqual(44);
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
  }
  // The development-only insights badge overlaps the bottom bar at 320px.
  const devBadge = page.getByRole("button", { name: "Collapse issues badge" });
  if (await devBadge.isVisible()) await devBadge.click();
  await nav.getByRole("link", { name: "လေ့လာ", exact: true }).click();
  await expect(nav.getByRole("link", { name: "လေ့လာ", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav).toHaveCSS("opacity", "1");
  await expect(nav).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(nav).toBeHidden();
});
