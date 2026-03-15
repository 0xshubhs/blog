import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-side ONLY — no NEXT_PUBLIC_ prefix means these are never bundled into client JS
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseKey);
}
