import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireUser, authorizationError } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { invitationSchema } from "@/lib/validators";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const body = invitationSchema.parse(await request.json());
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return apiError("缺少家庭商户标识", 422);
    await requireOwner(userId, organizationId);
    const ownedStores = await prisma.store.findMany({ where: { id: { in: body.storeIds }, organizationId }, select: { id: true } });
    if (ownedStores.length !== body.storeIds.length) return apiError("包含不属于该家庭商户的摊位", 422);
    const code = randomBytes(18).toString("base64url");
    const invitation = await prisma.invitation.create({
      data: {
        organizationId,
        codeHash: hashCode(code),
        targetRole: body.targetRole,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        storeMappings: { create: body.storeIds.map((storeId) => ({ storeId })) },
      },
      include: { storeMappings: true },
    });
    return NextResponse.json({ invitation: { id: invitation.id, code, targetRole: invitation.targetRole, expiresAt: invitation.expiresAt, storeIds: body.storeIds } }, { status: 201 });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUser();
    const invitationId = request.nextUrl.searchParams.get("invitationId");
    if (!invitationId) return apiError("缺少邀请码标识", 422);
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) return apiError("邀请码不存在", 404);
    await requireOwner(userId, invitation.organizationId);
    await prisma.invitation.update({ where: { id: invitationId }, data: { status: InvitationStatus.REVOKED } });
    return NextResponse.json({ ok: true });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
