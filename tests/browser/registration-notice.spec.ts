import { expect, test } from "@playwright/test";

for (const outcome of ["sent", "mail-failed", "registration-failed"] as const) {
  test(`registration notice follows the API result: ${outcome}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("a7-property-language", "en"));
    await page.route("**/auth/refresh", route => route.fulfill({ status: 401, json: { message: "Signed out" } }));
    await page.route("**/auth/register", route => route.fulfill(outcome === "registration-failed"
      ? { status: 409, json: { message: "Email already registered" } }
      : { json: { data: { accessToken: "test-token", verificationEmailSent: outcome === "sent", user: {
        id: "test-user", email: "notice@example.com", firstName: "Test", lastName: "User", address: "Yangon",
        role: "SEEKER", isAgent: false, phoneVerified: false, emailVerifiedAt: null,
      } } } }));
    await page.goto("/sign-in");
    await expect(page.getByText("Your account is created on the A7 Property server.", { exact: false })).toHaveCount(0);
    await page.goto("/sign-in?mode=create");
    await expect(page.getByText("Your account is created on the A7 Property server.", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Account created. Please verify your email to continue.")).toHaveCount(0);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#email").fill("notice@example.com");
    await page.locator("#first-name").fill("Test");
    await page.locator("#last-name").fill("User");
    await page.locator("#address").fill("Yangon");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#password").fill("TestPassword1234");
    await page.locator("#confirm-password").fill("TestPassword1234");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    if (outcome === "registration-failed") {
      await expect(page.getByRole("alert").filter({ hasText: "already" })).toBeVisible();
      await expect(page.getByText("Account created. Please verify your email to continue.")).toHaveCount(0);
    } else {
      await expect(page.getByRole("status").filter({ hasText: outcome === "sent"
        ? "Account created. Please verify your email to continue."
        : "Your account was created, but the confirmation email could not be sent." })).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });
}
