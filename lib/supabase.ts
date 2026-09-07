import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const CLOUD_MODE = Boolean(url && key);
export const supabase = CLOUD_MODE
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export function requireSupabase() {
  if (!supabase) throw new Error("Cloud storage is not configured.");
  return supabase;
}
export function authReturnUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}
