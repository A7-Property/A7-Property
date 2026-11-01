import { expect, test } from "@playwright/test";

for (const language of ["en", "my"]) {
  for (const width of [320, 696, 1440]) {
    test(`password label sits above its field at ${width}px in ${language}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("a7-property-language", value), language);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/sign-in");
      await page.locator('button[type="submit"]').click();
      await page.locator("#email").fill("layout@example.com");
      await page.locator('button[type="submit"]').click();

      const label = page.locator('label[for="password"]');
      await expect(label).toBeVisible();
      const back = label.locator("xpath=preceding-sibling::button");
      const field = page.locator("#password").locator("..");
      const labelBox = await label.boundingBox();
      const backBox = await back.boundingBox();
      const fieldBox = await field.boundingBox();
      expect(labelBox).not.toBeNull();
      expect(backBox).not.toBeNull();
      expect(fieldBox).not.toBeNull();
      expect(labelBox!.y).toBeGreaterThanOrEqual(backBox!.y + backBox!.height);
      expect(fieldBox!.y).toBeGreaterThanOrEqual(labelBox!.y + labelBox!.height);
      expect(Math.abs(labelBox!.x - fieldBox!.x)).toBeLessThan(1);
    });
  }
}
