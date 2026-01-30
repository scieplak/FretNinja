import type { APIRoute } from "astro";
import { ProfileService } from "../../../lib/services/profile.service";
import { updateProfileCommandSchema } from "../../../lib/schemas/profile.schemas";
import { verifyAuth } from "../../../lib/helpers/auth.helper";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  // Verify authentication
  const authHeader = request.headers.get("Authorization");
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Call service
  const profileService = new ProfileService(locals.supabase);
  const result = await profileService.getProfile(authResult.userId);

  // Return response
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

export const PATCH: APIRoute = async ({ request, locals }) => {
  // Verify authentication
  const authHeader = request.headers.get("Authorization");
  const authResult = await verifyAuth(locals.supabase, authHeader, locals.user);

  if (authResult.error) {
    return new Response(JSON.stringify(authResult.error.body), {
      status: authResult.error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: "VALIDATION_ERROR", message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate input
  const validation = updateProfileCommandSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        code: "VALIDATION_ERROR",
        message: validation.error.issues[0].message,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Call service
  const profileService = new ProfileService(locals.supabase);
  const result = await profileService.updateProfile(authResult.userId, validation.data);

  // Return response
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
