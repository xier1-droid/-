import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiError } from "@/lib/http";
import { setSession } from "@/lib/session";
import { allowAttempt } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!allowAttempt("register:" + ip, 5)) return apiError("操作过于频繁，请稍后再试", 429, "RATE_LIMITED");
    const input = registerSchema.parse(await request.json());
    if (await prisma.user.findUnique({ where: { email: input.email } })) return apiError("该邮箱已注册，请直接登录", 409, "EMAIL_EXISTS");
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({ data: { email: input.email, passwordHash } });
      const organization = await transaction.organization.create({ data: { name: input.organizationName } });
      await transaction.organizationMember.create({ data: { organizationId: organization.id, userId: created.id, role: MemberRole.OWNER } });
      await transaction.store.create({ data: { organizationId: organization.id, name: input.storeName } });
      return created;
    });
    await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
