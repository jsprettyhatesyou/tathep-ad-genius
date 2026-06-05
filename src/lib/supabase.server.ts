import process from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client. The .server.ts suffix keeps this out of the
// client bundle, so the service_role key never reaches the browser.
// Env is read lazily (inside the getter) so it resolves per-request on
// runtimes that bind env at request time.

let cached: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env (see .env.example).",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
