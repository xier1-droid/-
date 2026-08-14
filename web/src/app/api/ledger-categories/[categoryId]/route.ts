import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireOwner, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { categoryUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, context: { params: Promise<{ categoryId: string }> }) {
  try {
    const userId = await requireUser(); const { categoryId } = await context.params; const input = categoryUpdateSchema.parse(await request.json());
    const existing = await prisma.ledgerCategory.findUnique({ where: { id: categoryId } });
    if (!existing) return apiError("分类不存在。", 404, "CATEGORY_NOT_FOUND");
    await requireOwner(userId, existing.organizationId);
    if (input.isActive === false && existing.isActive) {
      const activeCount = await prisma.ledgerCategory.count({ where: { organizationId: existing.organizationId, type: existing.type, isActive: true } });
      if (activeCount <= 1) return apiError("收入和支出至少各保留一个启用分类。", 409, "LAST_ACTIVE_CATEGORY");
    }
    const category = await prisma.ledgerCategory.update({ where: { id: categoryId }, data: input });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError("这个分类已经存在。", 409, "CATEGORY_DUPLICATE");
    return authorizationError(error) ?? handleApiError(error);
  }
}
