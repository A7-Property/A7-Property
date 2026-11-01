import { expect, test } from "@playwright/test";

test("desktop logo leads the header without overlapping navigation in either language", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const language of ["en", "my"]) {
    await page.addInitScript((value) => localStorage.setItem("a7-property-language", value), language);
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      const header = page.locator(".web-header");
      await expect(header.locator(":scope > :first-child")).toHaveClass("web-brand");
      const brand = await header.locator(".web-brand").boundingBox();
      const navigation = await header.locator(".web-header-left").boundingBox();
      const account = await header.locator(".web-header-right").boundingBox();
      expect(brand!.x + brand!.width).toBeLessThanOrEqual(navigation!.x);
      expect(navigation!.x + navigation!.width).toBeLessThanOrEqual(account!.x);
      expect(account!.x + account!.width).toBeLessThanOrEqual(width);
    }
  }
});
