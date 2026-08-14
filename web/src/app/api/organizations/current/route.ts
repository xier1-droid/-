import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/http";

export async function GET() {
  try {
    const userId = await requireUser();
    const membership = await prisma.organizationMember.findFirst({
      where: { userId }, orderBy: { joinedAt: "asc" },
      include: { organization: { include: { stores: { orderBy: { createdAt: "asc" } } } }, storeAccesses: true },
    });
    if (!membership) return NextResponse.json({ organization: null, member: null, stores: [] });
    const stores = membership.role === "OWNER" ? membership.organization.stores : membership.organization.stores.filter((store) => membership.storeAccesses.some((access) => access.storeId === store.id));
    return NextResponse.json({ organization: membership.organization, member: { id: membership.id, role: membership.role }, stores });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
