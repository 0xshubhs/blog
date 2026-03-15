import { createClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { isAuthenticated } from "@/lib/auth";
import { notFound } from "next/navigation";
import PostPageClient from "./PostPageClient";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://0xshubhs.com";
const siteName = "0xshubhs-blogs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) return { title: "Not Found" };

  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("title, description, date, is_private")
    .eq("id", id)
    .single();

  if (!data || data.is_private) {
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

  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
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
          ...data,
          title: decrypted.title,
          description: decrypted.description,
          photos: decrypted.photos,
          encrypted_data: undefined,
        };
        return <PostPageClient post={post} />;
      } catch {
        notFound();
      }
    }
  }

  return <PostPageClient post={{ ...data, encrypted_data: undefined }} />;
}
