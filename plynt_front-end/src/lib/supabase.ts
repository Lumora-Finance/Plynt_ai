import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Use bracket notation to satisfy `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

// Supabase is optional at runtime — if env vars aren't set the client is null.
// Guards: always check `supabase !== null` before calling any Supabase method.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase) {
  console.warn(
    "[plynt] Supabase client not initialised — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from .env. " +
      "Off-chain persistence features will be disabled.",
  );
}
