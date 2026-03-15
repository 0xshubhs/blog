import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
