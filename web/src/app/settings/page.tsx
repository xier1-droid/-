import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings-panel";
import { getCurrentUserId } from "@/lib/session";
import { getCurrentSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const userId = await getCurrentUserId(); if (!userId) redirect("/");
  const membership = await prisma.organizationMember.findFirst({ where: { userId }, orderBy: { joinedAt: "asc" }, include: { organization: true } });
  if (!membership) redirect("/api/auth/removed");
  const data = await getCurrentSettings(userId, membership.organizationId);
  return <SettingsPanel organization={{ id: membership.organization.id, name: membership.organization.name }} initial={JSON.parse(JSON.stringify(data))} />;
}
