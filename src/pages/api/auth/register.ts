import type { APIRoute } from 'astro';

import { createSupabaseServerInstance } from '../../../db/supabase.client';
import { registerCommandSchema } from '../../../lib/schemas/auth.schemas';
import type { ApiErrorDTO, RegisterResponseDTO } from '../../../types';

export const prerender = false;

function mapRegisterError(error: Error): { status: number; body: ApiErrorDTO } {
  const message = error.message.toLowerCase();

  if (message.includes('user already registered')) {
    return {
      status: 409,
      body: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
    };
  }

  console.error('Registration error:', error.message);
  return {
    status: 500,
    body: { code: 'SERVER_ERROR', message: 'Registration failed' },
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate input
  const validation = registerCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0].message,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase server instance with cookie management
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Sign up - cookies are automatically set by @supabase/ssr
  const { data, error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    const mappedError = mapRegisterError(error);
    return new Response(JSON.stringify(mappedError.body), {
      status: mappedError.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data.user) {
    return new Response(
      JSON.stringify({ code: 'SERVER_ERROR', message: 'Registration failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Return success - session cookies are already set by Supabase SSR
  const response: RegisterResponseDTO = {
    user: {
      id: data.user.id,
      email: data.user.email!,
    },
    message: 'Account created successfully!',
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
