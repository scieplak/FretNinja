import { test, expect } from "./fixtures/test-fixtures";

/**
 * Home Page E2E Tests
 */

test.describe("Home Page", () => {
  test("should display the home page", async ({ homePage }) => {
    await homePage.goto();

    // Verify page loads correctly
    await expect(homePage.heading).toBeVisible();
  });

  test("should have correct page title", async ({ homePage }) => {
    await homePage.goto();

    const title = await homePage.getPageTitle();
    expect(title).toContain("FretNinja");
  });

  test("should have Get Started button that navigates to register", async ({ homePage, page }) => {
    await homePage.goto();

    await homePage.clickGetStarted();

    await expect(page).toHaveURL(/register/);
  });

  test("should have Try as Guest button that navigates to dashboard", async ({ homePage, page }) => {
    await homePage.goto();

    await homePage.clickTryAsGuest();

    await expect(page).toHaveURL(/dashboard/);
  });

  test("should display login/register links for guests", async ({ homePage, page }) => {
    await homePage.goto();

    const loginLink = page.getByRole("link", { name: /log\s*in/i });
    const getStartedLink = page.getByRole("link", { name: /get started/i });

    // Check login link is visible
    await expect(loginLink).toBeVisible();
    // Check get started link is visible
    await expect(getStartedLink).toBeVisible();
  });

  test("should be responsive on mobile viewport", async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await homePage.goto();

    await expect(homePage.heading).toBeVisible();
  });

  test("should display feature cards", async ({ homePage }) => {
    await homePage.goto();

    const count = await homePage.getFeatureCount();
    // Home page shows 4 feature cards + the fretboard preview card
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
