import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireUser, authorizationError } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { memberUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, context: { params: Promise<{ memberId: string }> }) {
  try {
    const userId = await requireUser();
    const { memberId } = await context.params;
    const input = memberUpdateSchema.parse(await request.json());
    const target = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!target) return apiError("成员不存在", 404);
    await requireOwner(userId, target.organizationId);
    if (target.role === "OWNER") return apiError("不能修改所有者权限", 422);
    const stores = await prisma.store.findMany({ where: { id: { in: input.storeIds }, organizationId: target.organizationId }, select: { id: true } });
    if (stores.length !== input.storeIds.length) return apiError("存在不属于该家庭商户的摊位", 422);
    await prisma.$transaction([
      prisma.organizationMember.update({ where: { id: memberId }, data: { role: input.role } }),
      prisma.memberStorePermission.deleteMany({ where: { memberId } }),
      prisma.memberStorePermission.createMany({ data: input.storeIds.map((storeId) => ({ memberId, storeId, accessLevel: input.role })) }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ memberId: string }> }) {
  try {
    const userId = await requireUser();
    const { memberId } = await context.params;
    const target = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!target) return apiError("成员不存在", 404);
    await requireOwner(userId, target.organizationId);
    if (target.role === "OWNER") return apiError("不能移除所有者", 422);
    await prisma.organizationMember.delete({ where: { id: memberId } });
    return NextResponse.json({ ok: true });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
