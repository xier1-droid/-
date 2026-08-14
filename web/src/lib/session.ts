import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const cookieName = "stall-ledger-session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "development-only-secret-change-me-123456789");


export async function createSessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const token = await createSessionToken(userId);
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
}
