import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const authed = await isAuthenticated();
  const res = NextResponse.json({ authenticated: authed });
  // Cache the auth result briefly so rapid successive calls don't re-run cookie verification
  res.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=5");
  return res;
}
