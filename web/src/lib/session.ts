import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const cookieName = "stall-ledger-session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "development-only-secret-change-me-123456789");


export async function createSessionToken(userId: string, sessionVersion: number) {
  return new SignJWT({ userId, sessionVersion })
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
    if (typeof payload.userId !== "string") return null;
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { sessionVersion: true } });
    const tokenVersion = typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0;
    return user?.sessionVersion === tokenVersion ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { sessionVersion: true } });
  const token = await createSessionToken(userId, user.sessionVersion);
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
