import type { APIRoute } from 'astro';
import { QuizSessionService } from '../../../lib/services/quiz-session.service';
import {
  createQuizSessionCommandSchema,
  quizSessionsQuerySchema,
} from '../../../lib/schemas/quiz-session.schemas';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Verify authentication (supports both cookie and token auth)
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
  const validation = createQuizSessionCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0].message,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.createSession(authResult.userId, validation.data);

  // Return response
  if (result.error) {
    return new Response(JSON.stringify(result.error.body), {
      status: result.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  // Verify authentication (supports both cookie and token auth)
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate query parameters
  const queryParams = Object.fromEntries(url.searchParams);
  const validation = quizSessionsQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid query parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Call service
  const sessionService = new QuizSessionService(locals.supabase);
  const result = await sessionService.listSessions(authResult.userId, validation.data);

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
