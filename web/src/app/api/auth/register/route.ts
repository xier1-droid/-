import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InvitationStatus, MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiError } from "@/lib/http";
import { normalizeIdentity } from "@/lib/identity";
import { setSession } from "@/lib/session";
import { allowAttempt } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";
import { consumeVerificationCode } from "@/lib/verification";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!allowAttempt("register:" + ip, process.env.NODE_ENV === "production" ? 5 : 100)) return apiError("操作过于频繁，请稍后再试", 429, "RATE_LIMITED");
    const parsed = registerSchema.parse(await request.json());
    const legacy = "email" in parsed;
    const identity = normalizeIdentity(legacy ? parsed.email : parsed.identifier);
    const method = legacy ? "email" : parsed.method;
    if (identity.kind !== method) return apiError("注册方式与账号格式不一致", 422, "IDENTIFIER_METHOD_MISMATCH");
    const existing = await prisma.user.findFirst({ where: identity.kind === "email" ? { email: identity.value } : { phone: identity.value } });
    if (existing) return apiError(identity.kind === "email" ? "该邮箱已注册，请直接登录" : "该手机号已注册，请直接登录", 409, identity.kind === "email" ? "EMAIL_EXISTS" : "PHONE_EXISTS");
    const inviteCode = parsed.inviteCode;
    const invitation = inviteCode ? await prisma.invitation.findUnique({ where: { codeHash: createHash("sha256").update(inviteCode).digest("hex") }, include: { storeMappings: { include: { store: { select: { organizationId: true } } } } } }) : null;
    if (inviteCode && (!invitation || invitation.status !== InvitationStatus.ACTIVE || invitation.expiresAt <= new Date())) return apiError("邀请码无效或已过期", 404, "INVITATION_INVALID");
    if (invitation && (invitation.storeMappings.length === 0 || invitation.storeMappings.some((mapping) => mapping.store.organizationId !== invitation.organizationId))) return apiError("邀请码的摊位授权已失效，请联系所有者重新邀请", 409, "INVITATION_STORES_INVALID");
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const result = await prisma.$transaction(async (tx) => {
      if (identity.kind === "phone") {
        if (legacy || !("verificationCode" in parsed) || !parsed.verificationCode) throw new Error("VERIFICATION_REQUIRED");
        const verification = await consumeVerificationCode(tx, { phone: identity.value, purpose: "REGISTER", code: parsed.verificationCode });
        if (verification !== "VERIFICATION_OK") return { verification };
      }
      const created = await tx.user.create({ data: { email: identity.kind === "email" ? identity.value : null, phone: identity.kind === "phone" ? identity.value : null, passwordHash } });
      if (invitation) {
        const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, status: InvitationStatus.ACTIVE, expiresAt: { gt: new Date() } }, data: { status: InvitationStatus.ACCEPTED, acceptedById: created.id, acceptedAt: new Date() } });
        if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_USED");
        const member = await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: created.id, role: invitation.targetRole } });
        await tx.memberStorePermission.createMany({ data: invitation.storeMappings.map((mapping) => ({ memberId: member.id, storeId: mapping.storeId, accessLevel: invitation.targetRole })) });
      } else {
        const organization = await tx.organization.create({ data: { name: parsed.organizationName } });
        await tx.organizationMember.create({ data: { organizationId: organization.id, userId: created.id, role: MemberRole.OWNER } });
        await tx.store.create({ data: { organizationId: organization.id, name: parsed.storeName } });
      }
      return { user: created };
    });
    if ("verification" in result) return apiError("验证码无效、已过期或尝试次数过多", 422, result.verification);
    const user = result.user; await setSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, phone: user.phone } }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_PHONE" || code === "INVALID_IDENTIFIER") return apiError("请输入正确的手机号或邮箱", 422, code);
    if (code === "VERIFICATION_REQUIRED" || code.startsWith("VERIFICATION_")) return apiError("验证码无效、已过期或尝试次数过多", 422, code);
    if (code === "INVITATION_ALREADY_USED") return apiError("邀请码已被使用，请联系所有者重新邀请", 409, code);
    return handleApiError(error);
  }
}
