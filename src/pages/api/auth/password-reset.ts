import type { APIRoute } from 'astro';
import { passwordResetCommandSchema } from '../../../lib/schemas/auth.schemas';
import { AuthService } from '../../../lib/services/auth.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
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

  // Build redirect URL (password update page on same domain)
  const redirectTo = `${url.origin}/auth/password-update`;

  // Call service
  const authService = new AuthService(locals.supabase);
  const result = await authService.requestPasswordReset(validation.data, redirectTo);

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
