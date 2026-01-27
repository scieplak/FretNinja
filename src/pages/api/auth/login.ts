import type { APIRoute } from 'astro';

import { createSupabaseServerInstance } from '../../../db/supabase.client';
import { loginCommandSchema } from '../../../lib/schemas/auth.schemas';
import type { ApiErrorDTO, LoginResponseDTO } from '../../../types';

export const prerender = false;

function mapLoginError(error: Error): { status: number; body: ApiErrorDTO } {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
    return {
      status: 401,
      body: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    };
  }

  console.error('Login error:', error.message);
  return {
    status: 500,
    body: { code: 'SERVER_ERROR', message: 'Login failed' },
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
  const validation = loginCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase server instance with cookie management
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Sign in with password - cookies are automatically set by @supabase/ssr
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    const mappedError = mapLoginError(error);
    return new Response(JSON.stringify(mappedError.body), {
      status: mappedError.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data.user || !data.session) {
    return new Response(JSON.stringify({ code: 'SERVER_ERROR', message: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return success - session cookies are already set by Supabase SSR
  const response: LoginResponseDTO = {
    user: {
      id: data.user.id,
      email: data.user.email!,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
