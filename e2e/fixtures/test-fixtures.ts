import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

/**
 * Extended test fixtures with Page Objects
 * Usage: import { test, expect } from './fixtures/test-fixtures';
 */
type Fixtures = {
  homePage: HomePage;
};

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
});

export { expect } from '@playwright/test';
