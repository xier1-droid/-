import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InvitationStatus, MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiError } from "@/lib/http";
import { setSession } from "@/lib/session";
import { allowAttempt } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const registrationLimit = process.env.NODE_ENV === "production" ? 5 : 100;
    if (!allowAttempt("register:" + ip, registrationLimit)) return apiError("操作过于频繁，请稍后再试", 429, "RATE_LIMITED");
    const input = registerSchema.parse(await request.json());
    if (await prisma.user.findUnique({ where: { email: input.email } })) return apiError("该邮箱已注册，请直接登录", 409, "EMAIL_EXISTS");
    const invitation = input.inviteCode ? await prisma.invitation.findUnique({
      where: { codeHash: createHash("sha256").update(input.inviteCode).digest("hex") },
      include: { storeMappings: { include: { store: { select: { organizationId: true } } } } },
    }) : null;
    if (input.inviteCode && (!invitation || invitation.status !== InvitationStatus.ACTIVE || invitation.expiresAt <= new Date())) return apiError("邀请码无效或已过期", 404, "INVITATION_INVALID");
    if (invitation && (invitation.storeMappings.length === 0 || invitation.storeMappings.some((mapping) => mapping.store.organizationId !== invitation.organizationId))) return apiError("邀请码的摊位授权已失效，请联系所有者重新邀请", 409, "INVITATION_STORES_INVALID");
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({ data: { email: input.email, passwordHash } });
      if (invitation) {
        const claimed = await transaction.invitation.updateMany({ where: { id: invitation.id, status: InvitationStatus.ACTIVE, expiresAt: { gt: new Date() } }, data: { status: InvitationStatus.ACCEPTED, acceptedById: created.id, acceptedAt: new Date() } });
        if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_USED");
        const member = await transaction.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: created.id, role: invitation.targetRole } });
        await transaction.memberStorePermission.createMany({ data: invitation.storeMappings.map((mapping) => ({ memberId: member.id, storeId: mapping.storeId, accessLevel: invitation.targetRole })) });
      } else {
        const organization = await transaction.organization.create({ data: { name: input.organizationName } });
        await transaction.organizationMember.create({ data: { organizationId: organization.id, userId: created.id, role: MemberRole.OWNER } });
        await transaction.store.create({ data: { organizationId: organization.id, name: input.storeName } });
      }
      return created;
    });
    await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_ALREADY_USED") return apiError("邀请码已被使用，请联系所有者重新邀请", 409, error.message);
    return handleApiError(error);
  }
}
