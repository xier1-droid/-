"use client";
import Dexie, { type EntityTable } from "dexie";

export type PendingOperation = { id: string; url: string; method: "POST" | "PATCH"; body: string; createdAt: number; error?: string };
export type DashboardSnapshot = { key: string; payload: string; updatedAt: number };

class StallLedgerDb extends Dexie {
  pendingOperations!: EntityTable<PendingOperation, "id">;
  dashboardSnapshots!: EntityTable<DashboardSnapshot, "key">;
  constructor() {
    super("stall-ledger");
    this.version(1).stores({ pendingOperations: "id, createdAt", dashboardSnapshots: "key, updatedAt" });
  }
}

export const offlineDb = new StallLedgerDb();

export async function queueOperation(operation: Omit<PendingOperation, "createdAt">) {
  await offlineDb.pendingOperations.put({ ...operation, createdAt: Date.now() });
}

export async function flushPendingOperations() {
  const operations = await offlineDb.pendingOperations.orderBy("createdAt").toArray();
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
