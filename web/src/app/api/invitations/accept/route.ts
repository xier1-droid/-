import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, authorizationError } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { acceptInvitationSchema } from "@/lib/validators";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const { code } = acceptInvitationSchema.parse(await request.json());
    const invitation = await prisma.invitation.findUnique({ where: { codeHash: hashCode(code) }, include: { storeMappings: true } });
    if (!invitation || invitation.status !== InvitationStatus.ACTIVE || invitation.expiresAt <= new Date()) return apiError("邀请码无效或已过期", 404, "INVITATION_INVALID");
    const exists = await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId } } });
    if (exists) return apiError("你已是该家庭商户的成员", 409, "ALREADY_MEMBER");
    await prisma.$transaction(async (transaction) => {
      const member = await transaction.organizationMember.create({ data: { organizationId: invitation.organizationId, userId, role: invitation.targetRole } });
      await transaction.memberStorePermission.createMany({ data: invitation.storeMappings.map((mapping) => ({ memberId: member.id, storeId: mapping.storeId, accessLevel: invitation.targetRole })) });
      await transaction.invitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.ACCEPTED, acceptedById: userId, acceptedAt: new Date() } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
