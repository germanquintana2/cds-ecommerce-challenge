ALTER TABLE "product" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "product" ADD CONSTRAINT "product_deleted_inactive" CHECK ("deletedAt" IS NULL OR "active" = false);
CREATE INDEX "product_deletedAt_idx" ON "product"("deletedAt");
ALTER TABLE "product" ALTER COLUMN "categoryId" DROP DEFAULT;
