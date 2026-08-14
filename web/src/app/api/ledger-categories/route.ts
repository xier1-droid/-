import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireOwner, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { getCurrentSettings } from "@/lib/settings";
import { categoryCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getCurrentSettings(await requireUser(), request.nextUrl.searchParams.get("organizationId"))); }
  catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser(); const input = categoryCreateSchema.parse(await request.json()); await requireOwner(userId, input.organizationId);
    const max = await prisma.ledgerCategory.aggregate({ where: { organizationId: input.organizationId, type: input.type }, _max: { sortOrder: true } });
    const category = await prisma.ledgerCategory.create({ data: { ...input, sortOrder: (max._max.sortOrder ?? 0) + 10 } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError("这个分类已经存在。", 409, "CATEGORY_DUPLICATE");
    return authorizationError(error) ?? handleApiError(error);
  }
}
