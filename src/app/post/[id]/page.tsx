import { cache } from "react";
import { createClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { isAuthenticated } from "@/lib/auth";
import { notFound } from "next/navigation";
import PostPageClient from "./PostPageClient";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://0xshubhs.com";
const siteName = "0xshubhs-blogs";

export const revalidate = 60;

const getPost = cache(async (id: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, title, description, photos, date, created_at, is_private, tags, pinned")
    .eq("id", id)
    .eq("is_private", false)
    .single();
  return data;
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) return { title: "Not Found" };

  const data = await getPost(id);

  if (!data) {
    return { title: "Not Found" };
  }

  const plainDesc = data.description
    .replace(/[#*_~`>\[\]()!-]/g, "")
    .replace(/\n+/g, " ")
    .slice(0, 160);

  return {
    title: data.title,
    description: plainDesc,
    openGraph: {
      title: data.title,
      description: plainDesc,
      url: `${siteUrl}/post/${id}`,
      siteName,
      type: "article",
      publishedTime: data.date,
    },
    twitter: {
      card: "summary",
      title: data.title,
      description: plainDesc,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) notFound();

  // Try the cached public fetch first (deduplicates with generateMetadata).
  const publicData = await getPost(id);

  if (publicData) {
    // Public post — no encrypted_data on this path.
    return <PostPageClient post={publicData} />;
  }

  // Post not found as public — check if it exists as a private post.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, encrypted_data, date, created_at, is_private, tags, pinned")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  if (data.is_private) {
    const authed = await isAuthenticated();
    if (!authed) notFound();

    if (data.encrypted_data) {
      try {
        const decrypted = JSON.parse(decrypt(data.encrypted_data));
        const post = {
          id: data.id,
          date: data.date,
          created_at: data.created_at,
          is_private: data.is_private,
          tags: data.tags,
          pinned: data.pinned,
          title: decrypted.title,
          description: decrypted.description,
          photos: decrypted.photos,
        };
        return <PostPageClient post={post} />;
      } catch {
        notFound();
      }
    }
  }

  // If we reach here, the post is neither public nor a valid private post
  notFound();
}
