import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      // Return same 404 to prevent enumeration of private post IDs
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (data.encrypted_data) {
      try {
        const decryptedData = JSON.parse(decrypt(data.encrypted_data));
        return NextResponse.json({
          ...data,
          title: decryptedData.title,
          description: decryptedData.description,
          photos: decryptedData.photos,
          encrypted_data: undefined,
        });
      } catch {
        return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
      }
    }
  }

  return NextResponse.json(data);
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
