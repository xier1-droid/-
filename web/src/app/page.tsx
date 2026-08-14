import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";

function chinaDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const { removed } = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) return <AuthPanel initialMessage={removed === "1" ? "你已被移出家庭商户，请联系所有者重新邀请。" : ""} />;
  const membership = await prisma.organizationMember.findFirst({ where: { userId }, orderBy: { joinedAt: "asc" }, include: { organization: { include: { stores: { orderBy: { createdAt: "asc" } } } }, storeAccesses: true } });
  if (!membership) redirect("/api/auth/removed");
  const stores = membership.role === "OWNER" ? membership.organization.stores : membership.organization.stores.filter((store) => membership.storeAccesses.some((access) => access.storeId === store.id));
  const rangeEnd = chinaDate(new Date());
  const rangeStartDate = new Date();
  rangeStartDate.setDate(rangeStartDate.getDate() - 6);
  const initialDateRange = { from: chinaDate(rangeStartDate), to: rangeEnd, mode: "近 7 天" };
  return <Dashboard bootstrap={{ organization: { id: membership.organization.id, name: membership.organization.name }, member: { id: membership.id, role: membership.role }, stores }} initialDateRange={initialDateRange} />;
}
