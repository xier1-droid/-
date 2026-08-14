import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireOwner, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { storeUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, context: { params: Promise<{ storeId: string }> }) {
  try {
    const userId = await requireUser();
    const { storeId } = await context.params;
    const input = storeUpdateSchema.parse(await request.json());
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return apiError("摊位不存在", 404);
    await requireOwner(userId, store.organizationId);
    const updated = await prisma.store.update({ where: { id: storeId }, data: { name: input.name } });
    return NextResponse.json({ store: updated });
  } catch (error) {
    return authorizationError(error) ?? handleApiError(error);
  }
}
