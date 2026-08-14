import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { getCurrentUserId } from "@/lib/session";

export const writableRoles: MemberRole[] = [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.BOOKKEEPER];
export const managerRoles: MemberRole[] = [MemberRole.OWNER, MemberRole.ADMIN];

export async function requireUser() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}

export async function requireOrganizationMember(userId: string, organizationId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { storeAccesses: true },
  });
  if (!member) throw new Error("FORBIDDEN_ORGANIZATION");
  return member;
}

export async function requireOwner(userId: string, organizationId: string) {
  const member = await requireOrganizationMember(userId, organizationId);
  if (member.role !== MemberRole.OWNER) throw new Error("FORBIDDEN_OWNER");
  return member;
}

export async function requireStoreAccess(userId: string, storeId: string, canWrite = false) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("STORE_NOT_FOUND");
  const member = await requireOrganizationMember(userId, store.organizationId);
  const hasAccess = member.role === MemberRole.OWNER || member.storeAccesses.some((permission) => permission.storeId === storeId);
  if (!hasAccess) throw new Error("FORBIDDEN_STORE");
  if (canWrite && !writableRoles.includes(member.role)) throw new Error("FORBIDDEN_WRITE");
  return { store, member };
}

export function authorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return apiError("请先登录", 401, message);
  if (message.startsWith("FORBIDDEN")) return apiError("你没有访问该数据的权限", 403, message);
  if (message === "STORE_NOT_FOUND") return apiError("摊位不存在", 404, message);
  return null;
}
