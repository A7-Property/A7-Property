import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`hero rotates and wraps without moving content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    await page.goto("/");
    const slides = page.locator("[data-hero-slideshow] > div");
    await expect(slides.first()).toHaveAttribute("data-active", "true");
    await expect.poll(() => slides.locator("img").evaluateAll((images) =>
      images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
    )).toBe(true);
    // Finish existing entrance animations before comparing stationary content.
    await page.clock.runFor(2000);
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    const form = await page.getByRole("search").first().boundingBox();
    await page.clock.runFor(7999);
    await expect(slides.first()).toHaveAttribute("data-active", "true");
    await page.clock.runFor(1);
    await expect(slides.nth(1)).toHaveAttribute("data-active", "true");
    await expect(slides.first()).toHaveCSS("opacity", "1");
    await expect(slides.nth(1)).toHaveCSS("transition-duration", "1s");
    await page.clock.runFor(1000);
    await expect(slides.nth(1)).toHaveCSS("opacity", "1");
    expect(await page.getByRole("heading", { level: 1 }).boundingBox()).toEqual(heading);
    expect(await page.getByRole("search").first().boundingBox()).toEqual(form);
    const count = await slides.count();
    for (let index = 2; index <= count; index++) {
      await page.clock.runFor(index === 2 ? 9000 : 10000);
      await expect(slides.nth(index % count)).toHaveAttribute("data-active", "true");
    }
  });
}

test("reduced motion switches images without fading", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.goto("/");
  const slides = page.locator("[data-hero-slideshow] > div");
  await expect.poll(() => slides.nth(1).locator("img").evaluate((image) =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
  )).toBe(true);
  await page.clock.runFor(10000);
  await expect(slides.nth(1)).toHaveAttribute("data-active", "true");
  await expect(slides.nth(1)).toHaveCSS("transition-duration", "0s");
  await expect(slides.nth(1)).toHaveCSS("opacity", "1");
});
