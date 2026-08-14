import { redirect } from "next/navigation";
import { ManagementPanel } from "@/components/management-panel";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export default async function ManagementPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");
  const membership = await prisma.organizationMember.findFirst({
    where: { userId }, orderBy: { joinedAt: "asc" },
    include: { organization: { include: { stores: { orderBy: { createdAt: "asc" } } } }, storeAccesses: true },
  });
  if (!membership) redirect("/");
  const stores = membership.role === "OWNER" ? membership.organization.stores : membership.organization.stores.filter((store) => membership.storeAccesses.some((access) => access.storeId === store.id));
  return <ManagementPanel organization={{ id: membership.organization.id, name: membership.organization.name }} currentMemberId={membership.id} role={membership.role} initialStores={stores.map(({ id, name }) => ({ id, name }))} />;
}
