import type { APIRoute } from "astro";
import { StatsService } from "../../../lib/services/stats.service";
import { heatmapQuerySchema } from "../../../lib/schemas/stats.schemas";
import { verifyAuth } from "../../../lib/helpers/auth.helper";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals, url }) => {
  // Verify authentication
  const authHeader = request.headers.get("Authorization");
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate query parameters
  const queryParams = Object.fromEntries(url.searchParams);
  const validation = heatmapQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return new Response(JSON.stringify({ code: "VALIDATION_ERROR", message: "Invalid date format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Call service
  const statsService = new StatsService(locals.supabase);
  const result = await statsService.getHeatmap(authResult.userId, validation.data);

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
