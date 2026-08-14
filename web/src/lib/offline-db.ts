"use client";
import Dexie, { type EntityTable } from "dexie";

export type PendingOperation = { id: string; userId: string; organizationId: string; url: string; method: "POST" | "PATCH"; body: string; createdAt: number; error?: string };
export type DashboardSnapshot = { key: string; payload: string; updatedAt: number };

class StallLedgerDb extends Dexie {
  pendingOperations!: EntityTable<PendingOperation, "id">;
  dashboardSnapshots!: EntityTable<DashboardSnapshot, "key">;
  constructor() {
    super("stall-ledger");
    this.version(1).stores({ pendingOperations: "id, createdAt", dashboardSnapshots: "key, updatedAt" });
    this.version(2).stores({ pendingOperations: "id, [userId+organizationId], createdAt", dashboardSnapshots: "key, updatedAt" });
  }
}

export const offlineDb = new StallLedgerDb();

export async function queueOperation(operation: Omit<PendingOperation, "createdAt">) {
  await offlineDb.pendingOperations.put({ ...operation, createdAt: Date.now() });
}

export async function pendingCount(userId: string, organizationId: string) { return offlineDb.pendingOperations.where("[userId+organizationId]").equals([userId, organizationId]).count(); }
export async function flushPendingOperations(userId: string, organizationId: string) {
  const operations = await offlineDb.pendingOperations.where("[userId+organizationId]").equals([userId, organizationId]).sortBy("createdAt");
  for (const operation of operations) {
    try {
      const response = await fetch(operation.url, { method: operation.method, headers: { "Content-Type": "application/json" }, body: operation.body });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error?.message ?? "同步失败");
      await offlineDb.pendingOperations.delete(operation.id);
    } catch (error) {
      await offlineDb.pendingOperations.update(operation.id, { error: error instanceof Error ? error.message : "同步失败" });
      break;
    }
  }
}
