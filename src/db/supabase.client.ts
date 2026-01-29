import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types";

// Legacy client for backwards compatibility (use sparingly)
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Cookie configuration for secure session management
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Parse cookie header string into array of name/value pairs
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name: name || "", value: rest.join("=") };
  });
}

/**
 * Create a Supabase server client with proper cookie management for SSR
 * This client should be used in all API routes and middleware
 */
export function createSupabaseServerInstance(context: { headers: Headers; cookies: AstroCookies }) {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, {
            ...options,
            path: options?.path ?? "/",
            secure: options?.secure ?? import.meta.env.PROD,
            httpOnly: options?.httpOnly ?? true,
            sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
          });
        });
      },
    },
  });
}

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerInstance>;
