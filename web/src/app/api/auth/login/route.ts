import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiError } from "@/lib/http";
import { identityHash, normalizeIdentity } from "@/lib/identity";
import { setSession } from "@/lib/session";
import { allowAttempt } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const identity = normalizeIdentity("email" in input ? input.email : input.identifier);
    if (!allowAttempt("login:" + identityHash(identity.value), 8)) return apiError("登录尝试过多，请稍后再试", 429, "RATE_LIMITED");
    const user = await prisma.user.findFirst({ where: identity.kind === "email" ? { email: identity.value } : { phone: identity.value } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return apiError("手机号、邮箱或密码不正确", 401, "INVALID_CREDENTIALS");
    await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, phone: user.phone } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_PHONE" || code === "INVALID_IDENTIFIER") return apiError("请输入正确的手机号或邮箱", 422, code);
    return handleApiError(error);
  }
}
