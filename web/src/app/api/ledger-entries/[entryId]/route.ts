import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireStoreAccess, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { ledgerEntryUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, context: { params: Promise<{ entryId: string }> }) {
  try {
    const userId = await requireUser();
    const { entryId } = await context.params;
    const entry = await prisma.ledgerEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.deletedAt) return apiError("账目不存在", 404);
    await requireStoreAccess(userId, entry.storeId, true);
    const input = ledgerEntryUpdateSchema.parse(await request.json());
    const updated = await prisma.ledgerEntry.update({ where: { id: entryId }, data: { ...input, note: input.note ?? null, updatedById: userId } });
    return NextResponse.json({ entry: updated });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ entryId: string }> }) {
  try {
    const userId = await requireUser();
    const { entryId } = await context.params;
    const entry = await prisma.ledgerEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.deletedAt) return apiError("账目不存在", 404);
    const { member } = await requireStoreAccess(userId, entry.storeId, true);
    if (member.role !== "OWNER" && member.role !== "ADMIN") return apiError("已同步账目仅所有者或管理员可删除", 403, "FORBIDDEN_DELETE");
    await prisma.ledgerEntry.update({ where: { id: entryId }, data: { deletedAt: new Date(), updatedById: userId } });
    return NextResponse.json({ ok: true });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
