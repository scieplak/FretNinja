import type { APIRoute } from "astro";
import { AchievementService } from "../../../lib/services/achievement.service";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // No authentication required - public endpoint
  const achievementService = new AchievementService(locals.supabase);
  const result = await achievementService.listAchievements();

  if (result.error) {
    return new Response(JSON.stringify(result.error.body), {
      status: result.error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
