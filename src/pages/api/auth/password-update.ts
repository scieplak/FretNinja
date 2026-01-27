import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

import { createSupabaseServerInstance } from '../../../db/supabase.client';
import { passwordUpdateCommandSchema } from '../../../lib/schemas/auth.schemas';
import type { Database } from '../../../db/database.types';
import type { ApiErrorDTO, PasswordUpdateResponseDTO } from '../../../types';

export const prerender = false;

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

function mapPasswordUpdateError(error: Error): { status: number; body: ApiErrorDTO } {
  const message = error.message.toLowerCase();

  if (
    message.includes('expired') ||
    message.includes('invalid') ||
    message.includes('token') ||
    message.includes('jwt') ||
    message.includes('session')
  ) {
    return {
      status: 401,
      body: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
    };
  }

  if (message.includes('password')) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
    };
  }

  console.error('Password update error:', error.message);
  return {
    status: 500,
    body: { code: 'SERVER_ERROR', message: 'Password update failed' },
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate input
  const validation = passwordUpdateCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0].message,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Try to get token from Authorization header (fallback for direct token flow)
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  let supabase;

  if (token) {
    // Use token-based client for direct token flow
    supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify token is valid
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    // Use SSR client with cookies (for callback-based recovery flow)
    supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Verify we have an active session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: 'No active session. Please use the reset link from your email.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error) {
    const mappedError = mapPasswordUpdateError(error);
    return new Response(JSON.stringify(mappedError.body), {
      status: mappedError.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response: PasswordUpdateResponseDTO = {
    message: 'Password updated successfully',
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
