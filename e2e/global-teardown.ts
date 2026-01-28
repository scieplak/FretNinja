import { cleanupAllUserTestData } from "./helpers/supabase-cleanup";

/**
 * Global teardown for E2E tests
 * Runs once after all tests to clean up test data
 * Authenticates as test user and removes all test-generated data
 */
async function globalTeardown() {
  console.log("\n🧹 Running global teardown - cleaning test data...\n");

  // Clean up all test data for the authenticated user
  await cleanupAllUserTestData();
  console.log("✓ Cleaned up all test data and signed out");

  console.log("\n✅ Global teardown complete\n");
}

export default globalTeardown;
