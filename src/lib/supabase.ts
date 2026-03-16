import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface Post {
  id: string;
  title: string;
  description: string;
  photos: { data: string; name: string }[];
  is_private: boolean;
  encrypted_data: string | null;
  date: string;
  created_at: string;
  tags: string[] | null;
  pinned: boolean;
}

// Server-side ONLY — no NEXT_PUBLIC_ prefix means these are never bundled into client JS
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

export function createClient() {
  if (_client) return _client;
  _client = createSupabaseClient(supabaseUrl, supabaseKey);
  return _client;
}

/** Type-safe query helper — use .returns<Post[]>() on queries for type inference */
export type { Post as PostRow };
