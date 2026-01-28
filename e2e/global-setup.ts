import {
  cleanupUserQuizSessions,
  cleanupUserAchievements,
  ensureTestUserProfile,
  signOutSupabase,
} from "./helpers/supabase-cleanup";

/**
 * Global setup for E2E tests
 * Runs once before all tests to ensure clean state
 * Authenticates as test user and cleans up leftover data from previous runs
 */
async function globalSetup() {
  console.log("\n🧹 Running global setup - preparing test environment...\n");

  // Ensure test user has a profile (handles missing trigger scenario)
  await ensureTestUserProfile();

  // Clean up any leftover quiz sessions from previous test runs
  await cleanupUserQuizSessions();
  console.log("✓ Cleaned up quiz sessions for test user");

  // Clean up achievements that might have been earned in previous runs
  await cleanupUserAchievements();
  console.log("✓ Cleaned up user achievements");

  // Sign out to start fresh
  await signOutSupabase();

  console.log("\n✅ Global setup complete\n");
}

export default globalSetup;
