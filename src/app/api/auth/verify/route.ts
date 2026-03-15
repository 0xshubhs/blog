import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, signature } = body;

  if (!message || !signature || typeof message !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Validate timestamp to prevent replay attacks
    const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    const timestamp = parseInt(timestampMatch[1], 10);
    const age = Date.now() - timestamp;
    if (age < 0 || age > MAX_MESSAGE_AGE_MS) {
      return NextResponse.json({ error: "Message expired" }, { status: 400 });
    }

    // Recover the wallet address from the signature
    const recoveredAddress = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    const allowedAddress = process.env.WALLET_ADDRESS;

    if (!allowedAddress) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    if (recoveredAddress.toLowerCase() !== allowedAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized wallet" }, { status: 403 });
    }

    const token = createSessionToken(recoveredAddress);

    const response = NextResponse.json({ success: true });
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 400 });
  }
}
