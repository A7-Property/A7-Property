import { expect, test } from "@playwright/test";

for (const initialStatus of ["UNVERIFIED", "PENDING", "REJECTED", "VERIFIED"]) {
  test(`admin can review a paused ${initialStatus} property`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem("a7-property-language", "en"));
    await page.route("**/auth/refresh", route => route.fulfill({ json: { data: { accessToken: "test-token" } } }));
    await page.route("**/auth/me", route => route.fulfill({ json: { data: {
      id: "test-admin", email: "admin@example.com", firstName: "Test", lastName: "Admin", role: "ADMIN",
      isAgent: false, phoneVerified: false, emailVerifiedAt: null,
    } } }));
    const property = {
      id: "review-property", title: "Property for review", description: "Property description", address: "Test address",
      city: "Yangon", township: "Bahan", propertyType: "HOUSE", listingType: "RENT", price: 2600000,
      currency: "MMK", bedrooms: 2, bathrooms: 2, areaSqft: 1200, status: "PAUSED", verificationStatus: initialStatus,
      images: [], amenities: [], documents: [], createdAt: "2026-11-01T00:00:00Z",
      owner: { id: "owner", firstName: "Test", lastName: "Owner", isAgent: false, phoneVerified: false },
    };
    const meta = { page: 1, limit: 12, total: 1, totalPages: 1 };
    await page.route("**/admin/properties?*", route => route.fulfill({ json: { data: [property], meta } }));
    await page.route("**/admin/verification-documents?*", route => route.fulfill({ json: { data: [], meta: { ...meta, total: 0 } } }));
    const requests: unknown[] = [];
    await page.route("**/admin/properties/review-property/verification", route => {
      requests.push(route.request().postDataJSON());
      expect(route.request().method()).toBe("PATCH");
      property.verificationStatus = "VERIFIED";
      return route.fulfill({ json: { data: property } });
    });
    await page.goto("/admin?section=properties");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const openProperty = () => page.getByRole("button").filter({ hasText: "Property for review" }).click();
    await openProperty();
    const details = page.getByRole("dialog", { name: "Property for review" });
    await expect(details).toContainText(initialStatus);
    const verify = details.getByRole("button", { name: "Verify property", exact: true });
    if (initialStatus === "VERIFIED") {
      await expect(verify).toHaveCount(0);
      expect(requests).toHaveLength(0);
      return;
    }
    await expect(verify).toBeInViewport();
    await verify.click();
    expect(requests).toHaveLength(0);
    await page.getByRole("dialog", { name: "Approve listing", exact: true }).getByRole("button", { name: "Confirm action" }).click();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ status: "VERIFIED" });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await openProperty();
    await expect(details).toContainText("VERIFIED");
    await expect(details).toContainText("PAUSED");
    await expect(verify).toHaveCount(0);
  });
}
