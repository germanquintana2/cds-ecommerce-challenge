-- CreateTable
CREATE TABLE "to_do_item" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "to_do_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "to_do_item_createdBy_idx" ON "to_do_item"("createdBy");

-- AddForeignKey
ALTER TABLE "to_do_item" ADD CONSTRAINT "to_do_item_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
