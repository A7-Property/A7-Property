import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("a7-property-language", "en");
  });
});

test("homepage keeps its existing search controls and keyboard journey", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".web-home-hero");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(hero.getByRole("button")).toHaveCount(3);
  await hero.getByRole("button", { name: "Rent", exact: true }).click();
  await expect(hero.getByRole("button", { name: "Rent", exact: true })).toHaveAttribute("aria-pressed", "true");
  const search = hero.getByRole("textbox", { name: "Search location or property" });
  await search.fill("Bahan");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?purpose=rent&q=Bahan/);
});

test("reduced motion keeps the hero and scrolled content visible without animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".web-home-hero")).toBeVisible();
  const locations = page.locator(".web-location-grid");
  await locations.scrollIntoViewIfNeeded();
  await expect(locations.getByRole("link")).toHaveCount(3);
  expect(await page.locator(".web-main").evaluate((main) => main.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
});

test("homepage fits desktop and mobile widths in both languages", async ({ page }) => {
  await page.goto("/");
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const language of ["en", "my"]) {
      const current = await page.locator("html").getAttribute("lang");
      if (current !== language) {
        await page.getByRole("button", { name: /Change language|ဘာသာစကား ပြောင်းရန်/ }).click();
        await page.getByRole("button", { name: language === "my" ? /မြန်မာ\s*Myanmar/ : /English/ }).click();
      }
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width >= 1024) {
        const hero = await page.locator(".web-home-hero").boundingBox();
        const form = await page.locator(".web-hero-search").boundingBox();
        expect(hero).not.toBeNull();
        expect(form).not.toBeNull();
        expect(form!.y + form!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
      }
    }
  }
});
