import { expect, test } from "@playwright/test";

test("search and account fields use a single neutral focus indicator", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("a7-property-language", "en"));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const search = page.locator(".web-hero-search input");
  await search.click();
  await expect(search).toHaveCSS("outline-style", "none");
  await expect(page.locator(".web-hero-search")).toHaveCSS("outline-color", "rgb(152, 162, 179)");
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const selector of ["#email", "#password"]) {
    if (selector === "#password") {
      await page.locator("#email").fill("focus@example.com");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }
    const input = page.locator(selector);
    await input.click();
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS("outline-style", "none");
    await expect(input.locator("..")).toHaveCSS("outline-color", "rgb(152, 162, 179)");
  }
  await page.goto("/sign-in?mode=create");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const selector of ["#first-name", "#last-name", "#address"]) {
    const input = page.locator(selector);
    await input.focus();
    await expect(input).toHaveCSS("outline-style", "none");
    await expect(input.locator("..")).toHaveCSS("outline-color", "rgb(152, 162, 179)");
  }
});
