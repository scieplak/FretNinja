import { test as base } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { PasswordResetPage } from "../pages/PasswordResetPage";
import { QuizHubPage } from "../pages/QuizHubPage";
import { QuizActivePage } from "../pages/QuizActivePage";
import { QuizResultsPage } from "../pages/QuizResultsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ExplorerPage } from "../pages/ExplorerPage";
import { ProgressPage } from "../pages/ProgressPage";
import { AchievementsPage } from "../pages/AchievementsPage";
import {
  cleanupUserQuizSessions,
  cleanupAllUserTestData,
  getTestUserId,
} from "../helpers/supabase-cleanup";

/**
 * Test credentials from environment variables
 */
export const TEST_USER = {
  email: process.env.E2E_USERNAME || "test@example.com",
  password: process.env.E2E_PASSWORD || "TestPassword123!",
  id: process.env.E2E_USERNAME_ID || "",
};

/**
 * Extended test fixtures with Page Objects
 * Usage: import { test, expect, TEST_USER } from './fixtures/test-fixtures';
 */
type Fixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  passwordResetPage: PasswordResetPage;
  quizHubPage: QuizHubPage;
  quizActivePage: QuizActivePage;
  quizResultsPage: QuizResultsPage;
  dashboardPage: DashboardPage;
  explorerPage: ExplorerPage;
  progressPage: ProgressPage;
  achievementsPage: AchievementsPage;
};

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  passwordResetPage: async ({ page }, use) => {
    await use(new PasswordResetPage(page));
  },

  quizHubPage: async ({ page }, use) => {
    await use(new QuizHubPage(page));
  },

  quizActivePage: async ({ page }, use) => {
    await use(new QuizActivePage(page));
  },

  quizResultsPage: async ({ page }, use) => {
    await use(new QuizResultsPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  explorerPage: async ({ page }, use) => {
    await use(new ExplorerPage(page));
  },

  progressPage: async ({ page }, use) => {
    await use(new ProgressPage(page));
  },

  achievementsPage: async ({ page }, use) => {
    await use(new AchievementsPage(page));
  },
});

export { expect } from "@playwright/test";

// Re-export cleanup helpers for use in test files
export { cleanupUserQuizSessions, cleanupAllUserTestData, getTestUserId };

// Re-export page types for convenience
export type {
  HomePage,
  LoginPage,
  RegisterPage,
  PasswordResetPage,
  QuizHubPage,
  QuizActivePage,
  QuizResultsPage,
  DashboardPage,
  ExplorerPage,
  ProgressPage,
  AchievementsPage,
};
