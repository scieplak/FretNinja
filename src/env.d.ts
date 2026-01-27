/// <reference types="astro/client" />
/// <reference types="vitest/globals" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: AuthUser | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
