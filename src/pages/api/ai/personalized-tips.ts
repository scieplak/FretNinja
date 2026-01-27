import type { APIRoute } from 'astro';
import { AIService } from '../../../lib/services/ai.service';
import { personalizedTipsCommandSchema } from '../../../lib/schemas/ai.schemas';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Empty body is allowed - use defaults
    body = {};
  }

  const validation = personalizedTipsCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: validation.error.issues[0].message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Call service
  const aiService = new AIService();
  const result = await aiService.generatePersonalizedTips(locals.supabase, authResult.userId, validation.data);

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
