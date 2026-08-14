import { redirect } from "next/navigation";
import { RecordsManager } from "@/components/records-manager";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export default async function RecordsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");
  const membership = await prisma.organizationMember.findFirst({ where: { userId }, orderBy: { joinedAt: "asc" }, include: { organization: { include: { stores: { orderBy: { createdAt: "asc" } } } }, storeAccesses: true } });
  if (!membership) redirect("/");
  const stores = membership.role === "OWNER" ? membership.organization.stores : membership.organization.stores.filter((store) => membership.storeAccesses.some((access) => access.storeId === store.id));
  return <RecordsManager bootstrap={{ organization: { id: membership.organization.id, name: membership.organization.name }, member: { role: membership.role }, stores }} />;
}
