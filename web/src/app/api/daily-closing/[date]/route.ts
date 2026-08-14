import { NextRequest, NextResponse } from "next/server";
import { EntryType, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireStoreAccess, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { dailyClosingSchema } from "@/lib/validators";
import { calculateExpectedCash } from "@/lib/money";
import { getDayBounds } from "@/lib/analytics";

export async function GET(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  try {
    const userId = await requireUser();
    const { date } = await context.params;
    const storeId = request.nextUrl.searchParams.get("storeId");
    if (!storeId) return apiError("请选择摊位", 422);
    const { store } = await requireStoreAccess(userId, storeId);
    const { start, end } = getDayBounds(date, store.timezone);
    const [closing, entries] = await Promise.all([
      prisma.dailyClosing.findUnique({ where: { storeId_businessDate: { storeId, businessDate: start } } }),
      prisma.ledgerEntry.findMany({ where: { storeId, deletedAt: null, occurredAt: { gte: start, lt: end }, paymentMethod: PaymentMethod.CASH } }),
    ]);
    const cashIncomeFen = entries.filter((entry) => entry.type === EntryType.INCOME).reduce((sum, entry) => sum + entry.amountFen, 0);
    const cashExpenseFen = entries.filter((entry) => entry.type === EntryType.EXPENSE).reduce((sum, entry) => sum + entry.amountFen, 0);
    const openingCashFen = closing?.openingCashFen ?? 0;
    const expectedCashFen = calculateExpectedCash(openingCashFen, cashIncomeFen, cashExpenseFen);
    return NextResponse.json({ closing, cashIncomeFen, cashExpenseFen, expectedCashFen, varianceFen: closing?.actualClosingCashFen == null ? null : closing.actualClosingCashFen - expectedCashFen });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  try {
    const userId = await requireUser();
    const { date } = await context.params;
    const input = dailyClosingSchema.parse(await request.json());
    const { store } = await requireStoreAccess(userId, input.storeId, true);
    const { start } = getDayBounds(date, store.timezone);
    const closing = await prisma.dailyClosing.upsert({
      where: { storeId_businessDate: { storeId: input.storeId, businessDate: start } },
      create: { storeId: input.storeId, businessDate: start, openingCashFen: input.openingCashFen, actualClosingCashFen: input.actualClosingCashFen, note: input.note ?? null },
      update: { openingCashFen: input.openingCashFen, actualClosingCashFen: input.actualClosingCashFen, note: input.note ?? null },
    });
    return NextResponse.json({ closing });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
