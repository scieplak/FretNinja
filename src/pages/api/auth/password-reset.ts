import type { APIRoute } from 'astro';

import { createSupabaseServerInstance } from '../../../db/supabase.client';
import { passwordResetCommandSchema } from '../../../lib/schemas/auth.schemas';
import type { PasswordResetResponseDTO } from '../../../types';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
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
  const validation = passwordResetCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build redirect URL (uses auth callback which then redirects to password update)
  const redirectTo = `${url.origin}/auth/callback`;

  // Create Supabase server instance
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Request password reset
  const { error } = await supabase.auth.resetPasswordForEmail(validation.data.email, {
    redirectTo,
  });

  // Log errors but always return success to prevent email enumeration
  if (error) {
    console.error('Password reset error:', error.message);

    // Only expose actual server errors
    if (
      error.message.includes('rate') ||
      error.message.includes('limit') ||
      error.message.includes('server') ||
      error.message.includes('network')
    ) {
      return new Response(
        JSON.stringify({ code: 'SERVER_ERROR', message: 'Password reset request failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Always return success to prevent email enumeration
  const response: PasswordResetResponseDTO = {
    message: 'If an account exists with this email, a password reset link has been sent.',
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
