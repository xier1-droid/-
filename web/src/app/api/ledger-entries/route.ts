import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireStoreAccess, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { ledgerPermissions, parseLedgerQuery } from "@/lib/ledger-query";
import { resolveStoreScope } from "@/lib/store-scope";
import { ledgerEntrySchema } from "@/lib/validators";


export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const storeId = request.nextUrl.searchParams.get("storeId");
    if (!organizationId || !storeId) return apiError("缺少家庭商户或摊位信息", 422);
    const { member, storeIds } = await resolveStoreScope(userId, organizationId, storeId);
    const query = parseLedgerQuery(request.nextUrl.searchParams);
    const entries = await prisma.ledgerEntry.findMany({
      where: { storeId: { in: storeIds }, deletedAt: null, occurredAt: query.occurredAt, ...(query.type ? { type: query.type } : {}), ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}) },
      include: { store: { select: { id: true, name: true } } },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = entries.length > query.limit;
    const page = hasMore ? entries.slice(0, query.limit) : entries;
    return NextResponse.json({ entries: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null, permissions: ledgerPermissions(member.role) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("INVALID_")) return apiError("筛选条件不正确，请检查日期、收支类型和收付款方式。", 422, code);
    return authorizationError(error) ?? handleApiError(error);
  }
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
