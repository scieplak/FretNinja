import type { APIRoute } from 'astro';
import { loginCommandSchema } from '../../../lib/schemas/auth.schemas';
import { AuthService } from '../../../lib/services/auth.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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

  // Call service
  const authService = new AuthService(locals.supabase);
  const result = await authService.login(validation.data);

  // Return response
  if (result.error) {
    return new Response(JSON.stringify(result.error.body), {
      status: result.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
