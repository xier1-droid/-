import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) return <AuthPanel />;
  const membership = await prisma.organizationMember.findFirst({ where: { userId }, orderBy: { joinedAt: "asc" }, include: { organization: { include: { stores: { orderBy: { createdAt: "asc" } } } }, storeAccesses: true } });
  if (!membership) redirect("/");
  const stores = membership.role === "OWNER" ? membership.organization.stores : membership.organization.stores.filter((store) => membership.storeAccesses.some((access) => access.storeId === store.id));
  return <Dashboard bootstrap={{ organization: { id: membership.organization.id, name: membership.organization.name }, member: { id: membership.id, role: membership.role }, stores }} />;
}
