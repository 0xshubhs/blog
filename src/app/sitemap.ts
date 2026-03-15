import { createClient } from "@/lib/supabase";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://0xshubhs.com";

export default async function sitemap() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, date, created_at")
    .eq("is_private", false)
    .order("date", { ascending: false });

  const postEntries = ((posts || []) as { id: string; date: string; created_at: string }[]).map((post) => ({
    url: `${siteUrl}/post/${post.id}`,
    lastModified: post.created_at || post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    ...postEntries,
  ];
}
