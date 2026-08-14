import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth";

export async function getAuthorizedStoreIds(userId: string, organizationId: string) {
  const member = await requireOrganizationMember(userId, organizationId);
  if (member.role === "OWNER") {
    const stores = await prisma.store.findMany({ where: { organizationId }, select: { id: true } });
    return { member, storeIds: stores.map((store) => store.id) };
  }
  return { member, storeIds: member.storeAccesses.map((access) => access.storeId) };
}

export async function resolveStoreScope(userId: string, organizationId: string, requestedStoreId: string | null) {
  const { member, storeIds } = await getAuthorizedStoreIds(userId, organizationId);
  if (!requestedStoreId || requestedStoreId === "all") return { member, storeIds };
  if (!storeIds.includes(requestedStoreId)) throw new Error("FORBIDDEN_STORE");
  return { member, storeIds: [requestedStoreId] };
}
