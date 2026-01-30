import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

// Routes that require authentication - hard redirect to login
const PROTECTED_ROUTES = ["/profile", "/statistics", "/settings"];

// Routes that should redirect authenticated users away (e.g., login/register)
const AUTH_ROUTES = ["/login", "/register", "/reset-password", "/auth/password-update"];

// Public routes that don't need any auth check
const PUBLIC_ROUTES = [
  "/",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/password-reset",
  "/api/auth/password-update",
  "/auth/callback",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, request, redirect } = context;
  const { pathname } = url;

  // Create Supabase server instance with cookie management
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Always set supabase on locals
  context.locals.supabase = supabase;
  context.locals.user = null;

  // Skip auth check for public API routes
  if (isPublicRoute(pathname)) {
    return next();
  }

  // Get the current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Set user in locals if authenticated
  if (user) {
    context.locals.user = {
      id: user.id,
      email: user.email ?? "",
    };
  }

  // Handle protected routes - require authentication
  if (isProtectedRoute(pathname)) {
    if (!user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      return redirect(redirectUrl);
    }
  }

  // Handle auth routes - redirect authenticated users to dashboard
  if (isAuthRoute(pathname)) {
    if (user) {
      return redirect("/dashboard");
    }
  }

  // Mixed routes - allow access, page will handle guest mode
  // User info (or null) is already set in locals

  return next();
});
