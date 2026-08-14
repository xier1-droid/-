import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth";

export async function getCurrentSettings(userId: string, organizationId?: string | null) {
  const membership = organizationId
    ? await requireOrganizationMember(userId, organizationId)
    : await prisma.organizationMember.findFirst({ where: { userId }, orderBy: { joinedAt: "asc" }, include: { storeAccesses: true } });
  if (!membership) throw new Error("MEMBER_REMOVED");
  const [organization, categories, entryCount, closingCount] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: membership.organizationId } }),
    prisma.ledgerCategory.findMany({ where: { organizationId: membership.organizationId }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.ledgerEntry.count({ where: { store: { organizationId: membership.organizationId } } }),
    prisma.dailyClosing.count({ where: { store: { organizationId: membership.organizationId } } }),
  ]);
  return {
    organizationId: organization.id,
    settings: { currency: organization.currency, timezone: organization.timezone, timezoneLocked: entryCount + closingCount > 0 },
    categories,
    permissions: { canManageSettings: membership.role === MemberRole.OWNER },
  };
}
