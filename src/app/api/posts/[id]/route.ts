import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encryption";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 50000;
const MAX_PHOTOS = 20;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (data.is_private) {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (data.encrypted_data) {
      try {
        const decryptedData = JSON.parse(decrypt(data.encrypted_data));
        return NextResponse.json({
          id: data.id,
          title: decryptedData.title,
          description: decryptedData.description,
          photos: decryptedData.photos,
          date: data.date,
          created_at: data.created_at,
          is_private: data.is_private,
          tags: data.tags,
          pinned: data.pinned,
        });
      } catch {
        return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
      }
    }
  }

  // Strip encrypted_data before returning public post
  const { encrypted_data: _enc, ...publicData } = data;
  const res = NextResponse.json(publicData);
  res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return res;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, photos, is_private, date, tags, pinned } = body;

  // If only toggling pin
  if (pinned !== undefined && title === undefined) {
    const supabase = createClient();
    const { error } = await supabase
      .from("posts")
      .update({ pinned: !!pinned })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!title || !description || typeof title !== "string" || typeof description !== "string") {
    return NextResponse.json({ error: "Title and description required" }, { status: 400 });
  }

  if (title.length > MAX_TITLE_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  // Validate photos
  const validPhotos: { data: string; name: string }[] = [];
  if (Array.isArray(photos)) {
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 });
    }
    for (const photo of photos) {
      if (!photo?.data || typeof photo.data !== "string" || !photo.data.startsWith("data:image/")) {
        continue;
      }
      if (photo.data.length > MAX_PHOTO_SIZE) {
        return NextResponse.json({ error: "Individual photo must be under 5MB" }, { status: 400 });
      }
      validPhotos.push({ data: photo.data, name: String(photo.name || "image.png") });
    }
  }

  const postDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().split("T")[0];

  const validTags = Array.isArray(tags)
    ? tags.filter((t: unknown) => typeof t === "string" && t.length <= 50).slice(0, 10)
    : [];

  const supabase = createClient();

  if (is_private) {
    const encrypted = encrypt(JSON.stringify({ title, description, photos: validPhotos }));
    const { error } = await supabase
      .from("posts")
      .update({
        title: "[Private]",
        description: "[Encrypted]",
        photos: [],
        is_private: true,
        encrypted_data: encrypted,
        date: postDate,
        tags: validTags,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("posts")
    .update({
      title,
      description,
      photos: validPhotos,
      is_private: false,
      encrypted_data: null,
      date: postDate,
      tags: validTags,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
