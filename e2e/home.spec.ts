import { test, expect } from './fixtures/test-fixtures';

test.describe('Home Page', () => {
  test('should display the home page', async ({ homePage }) => {
    await homePage.goto();

    // Verify page loads correctly
    await expect(homePage.heading).toBeVisible();
  });

  test('should have correct page title', async ({ homePage }) => {
    await homePage.goto();

    const title = await homePage.getPageTitle();
    expect(title).toContain('FretNinja');
  });
});
