import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { ApiErrorDTO } from '../../types';
import type { AuthUser } from '../../env';

type SupabaseClientType = SupabaseClient<Database>;

export interface AuthResult {
  userId: string;
  error?: never;
}

export interface AuthError {
  userId?: never;
  error: { status: number; body: ApiErrorDTO };
}

export type AuthCheckResult = AuthResult | AuthError;

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Verify user is authenticated and return user ID
 * Supports both cookie-based auth (via locals.user) and token-based auth (via Authorization header)
 */
export async function verifyAuth(
  supabase: SupabaseClientType,
  authHeader: string | null,
  localsUser?: AuthUser | null
): Promise<AuthCheckResult> {
  // First, check if user is already authenticated via cookies (set by middleware)
  if (localsUser) {
    return { userId: localsUser.id };
  }

  // Fall back to Authorization header token
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      error: {
        status: 401,
        body: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      error: {
        status: 401,
        body: { code: 'UNAUTHORIZED', message: 'No active session' },
      },
    };
  }

  return { userId: user.id };
}
