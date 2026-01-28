import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase test helper for E2E test cleanup
 * Uses test user authentication to respect RLS policies
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;

let supabaseClient: SupabaseClient | null = null;
let isAuthenticated = false;

/**
 * Get authenticated Supabase client for test cleanup
 * Authenticates as the E2E test user to respect RLS policies
 */
export async function getAuthenticatedSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("SUPABASE_URL or SUPABASE_KEY not set. Database cleanup will be skipped.");
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Authenticate as test user if not already authenticated
  if (!isAuthenticated) {
    const email = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      console.warn("E2E_USERNAME or E2E_PASSWORD not set. Database cleanup will be skipped.");
      return null;
    }

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Error signing in for cleanup:", signInError.message);
      return null;
    }

    isAuthenticated = true;
  }

  return supabaseClient;
}

/**
 * Sign out and reset the client state
 */
export async function signOutSupabase(): Promise<void> {
  if (supabaseClient && isAuthenticated) {
    await supabaseClient.auth.signOut();
    isAuthenticated = false;
  }
}

/**
 * Clean up quiz sessions for the authenticated user
 * Deletes quiz answers first (due to foreign key), then sessions
 */
export async function cleanupUserQuizSessions(): Promise<void> {
  const supabase = await getAuthenticatedSupabase();
  if (!supabase) return;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("No authenticated user for cleanup");
      return;
    }

    // Get all session IDs for this user
    const { data: sessions } = await supabase
      .from("quiz_sessions")
      .select("id")
      .eq("user_id", user.id);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);

      // Delete quiz answers first (foreign key constraint)
      const { error: answersError } = await supabase
        .from("quiz_answers")
        .delete()
        .in("session_id", sessionIds);

      if (answersError) {
        console.error("Error deleting quiz answers:", answersError.message);
      }

      // Delete quiz sessions
      const { error: sessionsError } = await supabase
        .from("quiz_sessions")
        .delete()
        .eq("user_id", user.id);

      if (sessionsError) {
        console.error("Error deleting quiz sessions:", sessionsError.message);
      }
    }
  } catch (error) {
    console.error("Failed to cleanup quiz sessions:", error);
  }
}

/**
 * Clean up user achievements for the authenticated user
 */
export async function cleanupUserAchievements(): Promise<void> {
  const supabase = await getAuthenticatedSupabase();
  if (!supabase) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_achievements")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting user achievements:", error.message);
    }
  } catch (error) {
    console.error("Failed to cleanup user achievements:", error);
  }
}

/**
 * Note: Statistics are calculated dynamically from quiz_sessions and quiz_answers
 * No separate user_statistics table exists, so no reset is needed
 */

/**
 * Clean up all test data for the authenticated user
 * Call this in global teardown
 */
export async function cleanupAllUserTestData(): Promise<void> {
  // Order matters due to foreign key constraints
  await cleanupUserQuizSessions();
  await cleanupUserAchievements();
  // Sign out after cleanup
  await signOutSupabase();
}

/**
 * Ensure the test user has a profile record
 * This handles cases where the user was created before the trigger existed
 * or was created via a method that bypassed the trigger
 */
export async function ensureTestUserProfile(): Promise<void> {
  const supabase = await getAuthenticatedSupabase();
  if (!supabase) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("No authenticated user for profile check");
      return;
    }

    // Check if profile exists
    const { data: profile, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (selectError && selectError.code === "PGRST116") {
      // Profile doesn't exist - create it
      console.log(`Creating missing profile for test user: ${user.id}`);

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id });

      if (insertError) {
        console.error("Failed to create test user profile:", insertError.message);
      } else {
        console.log("✓ Created profile for test user");
      }
    } else if (profile) {
      console.log("✓ Test user profile exists");
    }
  } catch (error) {
    console.error("Failed to ensure test user profile:", error);
  }
}

/**
 * Get test user ID from environment
 */
export function getTestUserId(): string {
  return process.env.E2E_USERNAME_ID || "";
}
