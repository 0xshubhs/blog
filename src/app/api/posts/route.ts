import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { encrypt, decrypt } from "@/lib/encryption";
import { isAuthenticated } from "@/lib/auth";

const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 50000;
const MAX_PHOTOS = 20;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB per photo base64
const MAX_BODY_SIZE = 100 * 1024 * 1024; // 100MB total
const DEFAULT_PAGE_SIZE = 20;

// GET /api/posts?mode=public|private&sort=desc|asc&search=...&page=1&limit=20&tag=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "public";
  const sort = searchParams.get("sort") || "desc";
  const search = searchParams.get("search") || "";
  const tag = searchParams.get("tag") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  const supabase = createClient();

  if (mode === "private") {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("posts")
      .select("*", { count: "exact" })
      .eq("is_private", true)
      .order("pinned", { ascending: false })
      .order("date", { ascending: sort === "asc" })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    let decrypted = data.map((post) => {
      if (post.encrypted_data) {
        try {
          const decryptedData = JSON.parse(decrypt(post.encrypted_data));
          return {
            ...post,
            title: decryptedData.title,
            description: decryptedData.description,
            photos: decryptedData.photos,
            encrypted_data: undefined,
          };
        } catch {
          return { ...post, title: "[Decryption failed]", description: "", photos: [] };
        }
      }
      return post;
    });

    // Client-side search for private posts (since content is encrypted in DB)
    if (search) {
      const q = search.toLowerCase();
      decrypted = decrypted.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ posts: decrypted, total: count || 0, page, limit });
  }

  // Public posts
  let query = supabase
    .from("posts")
    .select("id, title, description, photos, date, created_at, tags, pinned", { count: "exact" })
    .eq("is_private", false)
    .order("pinned", { ascending: false })
    .order("date", { ascending: sort === "asc" })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  return NextResponse.json({ posts: data, total: count || 0, page, limit });
}

// POST /api/posts - requires wallet auth
export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check content-length header as early guard
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, photos, is_private, date, tags } = body;

  if (!title || !description || typeof title !== "string" || typeof description !== "string") {
    return NextResponse.json({ error: "Title and description required" }, { status: 400 });
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be under ${MAX_TITLE_LENGTH} characters` }, { status: 400 });
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be under ${MAX_DESCRIPTION_LENGTH} characters` }, { status: 400 });
  }

  // Validate photos
  const validPhotos: { data: string; name: string }[] = [];
  if (Array.isArray(photos)) {
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 });
    }
    for (const photo of photos) {
      if (!photo?.data || typeof photo.data !== "string" || !photo.data.startsWith("data:image/")) {
        continue; // skip invalid photos
      }
      if (photo.data.length > MAX_PHOTO_SIZE) {
        return NextResponse.json({ error: "Individual photo must be under 5MB" }, { status: 400 });
      }
      validPhotos.push({ data: photo.data, name: String(photo.name || "image.png") });
    }
  }

  // Validate date format
  const postDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().split("T")[0];

  // Validate tags
  const validTags = Array.isArray(tags)
    ? tags.filter((t: unknown) => typeof t === "string" && t.length <= 50).slice(0, 10)
    : [];

  const supabase = createClient();

  if (is_private) {
    const encrypted = encrypt(JSON.stringify({ title, description, photos: validPhotos }));

    const { data: row, error } = await supabase
      .from("posts")
      .insert({
        title: "[Private]",
        description: "[Encrypted]",
        photos: [],
        is_private: true,
        encrypted_data: encrypted,
        date: postDate,
        tags: validTags,
        pinned: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json(row, { status: 201 });
  }

  const { data: row, error } = await supabase
    .from("posts")
    .insert({
      title,
      description,
      photos: validPhotos,
      is_private: false,
      date: postDate,
      tags: validTags,
      pinned: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json(row, { status: 201 });
}
