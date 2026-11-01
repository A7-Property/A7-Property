import { expect, test } from "@playwright/test";

for (const width of [320, 1440]) {
  test(`listing errors stay centered after scrolling at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("a7-property-language", "en"));
    await page.route("**/auth/refresh", route => route.fulfill({ json: { data: { accessToken: "test-token" } } }));
    await page.route("**/auth/me", route => route.fulfill({ json: { data: {
      id: "test-lister", email: "layout@example.com", firstName: "Test", lastName: "Lister",
      role: "LISTER", isAgent: false, phoneVerified: false, emailVerifiedAt: null,
    } } }));
    await page.goto("/owner?create=1");
    // The development-only Next.js badge overlaps the footer on narrow screens.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const editor = page.getByRole("dialog", { name: "Create a listing", exact: true });
    await expect(editor).toBeVisible();
    await editor.getByRole("textbox", { name: "Property title", exact: true }).fill("dag");
    await editor.locator(".overflow-y-auto").evaluate(element => { element.scrollTop = element.scrollHeight; });
    await editor.getByRole("button", { name: "Save listing", exact: true }).click();
    const alert = page.getByRole("alertdialog");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Add a clear title (at least 5 characters).");
    const box = await alert.boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(box!.y + box!.height / 2 - 450)).toBeLessThan(2);
    await expect(alert.getByRole("button", { name: "Back to editing" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(alert).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("textbox", { name: "Property title", exact: true })).toHaveValue("dag");
    await editor.getByRole("button", { name: "Save listing", exact: true }).click();
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Back to editing" }).click();
    await expect(alert).toHaveCount(0);
    await expect(editor.getByRole("button", { name: "Save listing", exact: true })).toBeFocused();
  });
}
