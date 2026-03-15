import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "__Host-blog_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error("SESSION_SECRET env var is required");
  return key;
}

export function createSessionToken(walletAddress: string): string {
  const payload = JSON.stringify({
    address: walletAddress.toLowerCase(),
    exp: Date.now() + SESSION_DURATION,
  });

  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  const encoded = Buffer.from(payload).toString("base64");
  return `${encoded}.${hmac}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const [encoded, hmac] = token.split(".");
    if (!encoded || !hmac) return null;

    const payload = Buffer.from(encoded, "base64").toString("utf8");

    const expectedHmac = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const hmacBuf = Buffer.from(hmac, "hex");
    const expectedBuf = Buffer.from(expectedHmac, "hex");
    if (hmacBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(hmacBuf, expectedBuf)) return null;

    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return null;

    return data.address;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) return false;

  const address = verifySessionToken(session.value);
  if (!address) return false;

  const allowedAddress = process.env.WALLET_ADDRESS?.toLowerCase();
  return address === allowedAddress;
}

export { SESSION_COOKIE };
