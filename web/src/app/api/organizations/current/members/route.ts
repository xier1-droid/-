import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireOrganizationMember, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return apiError("缺少家庭商户标识", 422);
    await requireOrganizationMember(userId, organizationId);
    const members = await prisma.organizationMember.findMany({ where: { organizationId }, include: { user: { select: { email: true } }, storeAccesses: true }, orderBy: { joinedAt: "asc" } });
    return NextResponse.json({ members: members.map((member) => ({ id: member.id, email: member.user.email, role: member.role, storeIds: member.storeAccesses.map((access) => access.storeId) })) });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
