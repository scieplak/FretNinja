import type { APIRoute } from 'astro';
import { QuizSessionService } from '../../../lib/services/quiz-session.service';
import { updateQuizSessionCommandSchema } from '../../../lib/schemas/quiz-session.schemas';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get session ID from path
  const sessionId = params.id;
  if (!sessionId) {
    return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Quiz session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.getSession(authResult.userId, sessionId);

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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = params.id;
  if (!sessionId) {
    return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Quiz session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validation = updateQuizSessionCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ code: 'VALIDATION_ERROR', message: validation.error.issues[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.updateSession(authResult.userId, sessionId, validation.data);

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
