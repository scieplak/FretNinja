import type { APIRoute } from 'astro';
import { AchievementService } from '../../../lib/services/achievement.service';
import { verifyAuth } from '../../../lib/helpers/auth.helper';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  const authResult = await verifyAuth(locals.supabase, authHeader);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Call service
  const achievementService = new AchievementService(locals.supabase);
  const result = await achievementService.getUserAchievements(authResult.userId);

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
