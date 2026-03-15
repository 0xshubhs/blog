import { NextResponse } from "next/server";
import { createClient, type Post } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

// GET /api/posts/export - download all posts as JSON (requires auth)
export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, description, photos, date, created_at, is_private, encrypted_data, tags, pinned")
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  const exported = (data as Post[]).map((post) => {
    if (post.is_private && post.encrypted_data) {
      try {
        const decrypted = JSON.parse(decrypt(post.encrypted_data));
        return {
          id: post.id,
          title: decrypted.title,
          description: decrypted.description,
          photos: decrypted.photos,
          date: post.date,
          is_private: true,
          tags: post.tags || [],
          pinned: post.pinned || false,
          created_at: post.created_at,
        };
      } catch {
        return { ...post, encrypted_data: undefined };
      }
    }
    return { ...post, encrypted_data: undefined };
  });

  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="blog-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
