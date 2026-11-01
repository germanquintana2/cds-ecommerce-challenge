CREATE TABLE "category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "category_name_not_blank" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");
CREATE UNIQUE INDEX "category_name_lower_key" ON "category"(lower("name"));
INSERT INTO "category" ("id", "name", "updatedAt") VALUES ('category-general', 'General', CURRENT_TIMESTAMP);
ALTER TABLE "product" ADD COLUMN "categoryId" TEXT NOT NULL DEFAULT 'category-general';
CREATE INDEX "product_categoryId_active_createdAt_idx" ON "product"("categoryId", "active", "createdAt");
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
