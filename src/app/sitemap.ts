import { createClient } from "@/lib/supabase";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://0xshubhs.com";

export default async function sitemap() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, date, created_at")
    .eq("is_private", false)
    .order("date", { ascending: false });

  const postEntries = (posts || []).map((post) => ({
    url: `${siteUrl}/post/${post.id}`,
    lastModified: post.created_at || post.date,
  }));

  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/private`, lastModified: new Date() },
    { url: `${siteUrl}/write`, lastModified: new Date() },
    ...postEntries,
  ];
}
