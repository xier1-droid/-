import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireStoreAccess, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { ledgerEntrySchema } from "@/lib/validators";


export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    const storeId = request.nextUrl.searchParams.get("storeId");
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    if (!storeId) return apiError("请选择摊位", 422);
    const { store, member } = await requireStoreAccess(userId, storeId);
    const where = {
      storeId: store.id,
      deletedAt: null,
      ...(from || to ? { occurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    };
    const entries = await prisma.ledgerEntry.findMany({ where, orderBy: { occurredAt: "desc" }, take: 200 });
    return NextResponse.json({ entries, role: member.role });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const input = ledgerEntrySchema.parse(await request.json());
    await requireStoreAccess(userId, input.storeId, true);
    if (input.clientOperationId) {
      const existing = await prisma.ledgerEntry.findUnique({ where: { storeId_clientOperationId: { storeId: input.storeId, clientOperationId: input.clientOperationId } } });
      if (existing) return NextResponse.json({ entry: existing, idempotent: true });
    }
    const entry = await prisma.$transaction(async (transaction) => {
      const created = await transaction.ledgerEntry.create({
        data: { ...input, note: input.note ?? null, createdById: userId, updatedById: userId },
      });
      if (input.clientOperationId) await transaction.syncOperation.upsert({
        where: { storeId_clientOperationId: { storeId: input.storeId, clientOperationId: input.clientOperationId } },
        create: { storeId: input.storeId, clientOperationId: input.clientOperationId, status: "PROCESSED", processedAt: new Date() },
        update: { status: "PROCESSED", processedAt: new Date() },
      });
      return created;
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
