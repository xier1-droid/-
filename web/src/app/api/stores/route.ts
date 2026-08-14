import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireOwner, requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { z } from "zod";

const storeSchema = z.object({ organizationId: z.string().min(1), name: z.string().trim().min(1).max(60) });

export async function GET() {
  try {
    const userId = await requireUser();
    const memberships = await prisma.organizationMember.findMany({ where: { userId }, include: { organization: { include: { stores: true } }, storeAccesses: true } });
    const stores = memberships.flatMap((membership) => membership.role === "OWNER" ? membership.organization.stores : membership.organization.stores.filter((store) => membership.storeAccesses.some((access) => access.storeId === store.id)));
    return NextResponse.json({ stores });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    const input = storeSchema.parse(await request.json());
    await requireOwner(userId, input.organizationId);
    const store = await prisma.store.create({ data: { organizationId: input.organizationId, name: input.name } });
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
