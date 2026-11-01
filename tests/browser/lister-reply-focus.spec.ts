import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`lister can type a complete reply without losing focus at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("a7-property-language", "en"));
    await page.route("**/auth/refresh", route => route.fulfill({ json: { data: { accessToken: "test-token" } } }));
    await page.route("**/auth/me", route => route.fulfill({ json: { data: {
      id: "lister", email: "lister@example.com", firstName: "Test", lastName: "Lister", role: "LISTER",
      isAgent: false, phoneVerified: false, emailVerifiedAt: null,
    } } }));
    const message = { id: "message", conversationId: "thread", senderId: "seeker", body: "Is it available?", isRead: false, createdAt: new Date().toISOString() };
    await page.route("**/conversations?*", route => route.fulfill({ json: {
      data: [{ id: "thread", propertyId: "property", seekerId: "seeker", listerId: "lister", updatedAt: message.createdAt,
        property: { id: "property", title: "Test home", city: "Yangon", township: "Bahan", images: [] },
        seeker: { id: "seeker", firstName: "Focus", lastName: "Seeker", avatarUrl: null },
        lister: { id: "lister", firstName: "Test", lastName: "Lister", avatarUrl: null },
        messages: [message], unreadCount: 1 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    } }));
    let sends = 0;
    await page.route("**/conversations/thread/read", route => route.fulfill({ json: { data: { updated: 1 } } }));
    await page.route("**/conversations/thread/messages*", async route => {
      if (route.request().method() === "POST") {
        sends += 1;
        if (sends === 1) return route.abort("connectionrefused");
        await new Promise(resolve => setTimeout(resolve, 400));
        return route.fulfill({ json: { data: { ...message, id: "reply", senderId: "lister", body: route.request().postDataJSON().body } } });
      }
      if (new URL(route.request().url()).searchParams.has("before")) {
        return route.fulfill({ json: { data: [
          { ...message, id: "older-reply", senderId: "lister", body: "Yes, viewings are available.", isRead: true },
          { ...message, id: "first-message", body: "Hello, I would like to see this home." },
        ], meta: { nextCursor: null } } });
      }
      return route.fulfill({ json: { data: [message], meta: { nextCursor: "older-page" } } });
    });
    await page.goto("/owner");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const lead = page.getByRole("button").filter({ hasText: "Focus Seeker" }).first();
    await lead.click();
    const dialog = page.getByRole("dialog", { name: /Focus Seeker/ });
    const thread = dialog.getByRole("region", { name: "Conversation", exact: true });
    await expect(thread.locator("p")).toHaveText([
      "Hello, I would like to see this home.", "Yes, viewings are available.", "Is it available?",
    ]);
    await expect(thread.locator('[data-slot="message"][data-align="end"]')).toContainText("You");
    await expect(thread.locator('[data-slot="message"][data-align="end"]')).toContainText("Read");
    const input = dialog.getByRole("textbox", { name: "Reply to lead" });
    await input.click();
    const reply = "Hello, yes it is available. When would you like to visit?";
    await input.pressSequentially(reply, { delay: 30 });
    await expect(input).toHaveValue(reply);
    await expect(input).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type(" tomorrow");
    await expect(input).toHaveValue(reply.slice(0, -1) + " tomorrow?");
    await expect(input).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Send lead reply" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: "Send lead reply" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Reply not sent");
    await expect(input).toHaveValue(reply.slice(0, -1) + " tomorrow?");
    await expect(page.getByText("Cannot reach the server.", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "Send lead reply" }).click();
    await expect(dialog.getByRole("button", { name: "Sending reply…" })).toBeDisabled();
    await input.press("Enter");
    await expect(dialog.getByRole("status")).toContainText("Reply sent to Focus Seeker");
    await expect(input).toHaveValue("");
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    expect(sends).toBe(2);
    await expect(thread.locator("p").last()).toHaveText(reply.slice(0, -1) + " tomorrow?");
    await expect(thread.locator('[data-slot="message"]').last()).toContainText("Sent");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(lead).toBeFocused();
  });
}
