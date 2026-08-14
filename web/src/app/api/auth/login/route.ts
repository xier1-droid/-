import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiError } from "@/lib/http";
import { setSession } from "@/lib/session";
import { allowAttempt } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    if (!allowAttempt("login:" + input.email, 8)) return apiError("登录尝试过多，请稍后再试", 429, "RATE_LIMITED");
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return apiError("邮箱或密码不正确", 401, "INVALID_CREDENTIALS");
    await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) { return handleApiError(error); }
}
