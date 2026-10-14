import { expect, test, type Page } from "@playwright/test";

async function startInEnglish(page: Page) {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("a7-browser-test-initialized")) return;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem("a7-browser-test-initialized", "1");
    window.localStorage.setItem("a7-property-language", "en");
  });
}

async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.waitForTimeout(400);
}

test.beforeEach(async ({ page }) => {
  await startInEnglish(page);
});

test("search filters survive reload through URL state", async ({ page }) => {
  await gotoReady(page, "/search?purpose=rent&browse=all");
  await page.getByRole("button", { name: "Open all filters" }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  await page.getByRole("combobox", { name: "City" }).selectOption("Yangon");
  await expect(page).toHaveURL(/location=Yangon/);
  await page.getByRole("button", { name: "Apply filters" }).click();

  await page.reload();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/purpose=rent/);
  await expect(page).toHaveURL(/location=Yangon/);
  await expect(page.getByRole("heading", { name: "Best matches" })).toBeVisible();
});

test("protected routes redirect to sign-in without a session", async ({ page }) => {
  await gotoReady(page, "/saved");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("language choice persists across navigation", async ({ page }) => {
  await gotoReady(page, "/help");
  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("button", { name: /မြန်မာ\s*Myanmar/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "my");
  await expect(page.getByRole("heading", { level: 1, name: "အိမ်တစ်လုံးရရှိရန် ခြေလှမ်းတိုင်းအတွက် အကူအညီ။" })).toBeVisible();

  await gotoReady(page, "/privacy");
  await expect(page.locator("html")).toHaveAttribute("lang", "my");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("သင့်အိမ်ရှာဖွေမှု");
});