CREATE TABLE "LedgerCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LedgerCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LedgerCategory_organizationId_type_name_key" ON "LedgerCategory"("organizationId", "type", "name");
CREATE INDEX "LedgerCategory_organizationId_type_isActive_sortOrder_idx" ON "LedgerCategory"("organizationId", "type", "isActive", "sortOrder");

INSERT INTO "LedgerCategory" ("id", "organizationId", "type", "name", "sortOrder", "updatedAt")
SELECT md5(o.id || d.type::text || d.name), o.id, d.type::"EntryType", d.name, d.position, CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (VALUES ('INCOME', '销售收入', 100), ('INCOME', '其他收入', 110), ('EXPENSE', '进货', 100), ('EXPENSE', '摊位费', 110), ('EXPENSE', '交通', 120), ('EXPENSE', '其他支出', 130)) AS d(type, name, position);

WITH historical AS (
  SELECT s."organizationId", e.type, e.category, COUNT(*) AS uses
  FROM "LedgerEntry" e JOIN "Store" s ON s.id = e."storeId"
  WHERE e."deletedAt" IS NULL
  GROUP BY s."organizationId", e.type, e.category
)
INSERT INTO "LedgerCategory" ("id", "organizationId", "type", "name", "sortOrder", "updatedAt")
SELECT md5(h."organizationId" || h.type::text || h.category), h."organizationId", h.type, h.category,
       ROW_NUMBER() OVER (PARTITION BY h."organizationId", h.type ORDER BY h.uses DESC, h.category) - 1, CURRENT_TIMESTAMP
FROM historical h
ON CONFLICT ("organizationId", "type", "name") DO NOTHING;
