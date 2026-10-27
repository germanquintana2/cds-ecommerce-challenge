-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "imageKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "cartVersion" INTEGER NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_item" (
    "id" TEXT NOT NULL,
    "checkoutAttemptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "checkout_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkoutAttemptId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_active_createdAt_idx" ON "product"("active", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cart_userId_key" ON "cart"("userId");

-- CreateIndex
CREATE INDEX "cart_item_productId_idx" ON "cart_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cartId_productId_key" ON "cart_item"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempt_stripeSessionId_key" ON "checkout_attempt"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempt_stripePaymentIntentId_key" ON "checkout_attempt"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "checkout_attempt_userId_createdAt_idx" ON "checkout_attempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "checkout_attempt_cartId_idx" ON "checkout_attempt"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempt_userId_requestKey_key" ON "checkout_attempt"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "checkout_item_productId_idx" ON "checkout_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_item_checkoutAttemptId_productId_key" ON "checkout_item"("checkoutAttemptId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "order_checkoutAttemptId_key" ON "order"("checkoutAttemptId");

-- CreateIndex
CREATE INDEX "order_userId_createdAt_idx" ON "order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "order_item_productId_idx" ON "order_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_orderId_productId_key" ON "order_item"("orderId", "productId");

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempt" ADD CONSTRAINT "checkout_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempt" ADD CONSTRAINT "checkout_attempt_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_item" ADD CONSTRAINT "checkout_item_checkoutAttemptId_fkey" FOREIGN KEY ("checkoutAttemptId") REFERENCES "checkout_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_item" ADD CONSTRAINT "checkout_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_checkoutAttemptId_fkey" FOREIGN KEY ("checkoutAttemptId") REFERENCES "checkout_attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants also hold for writes made outside the application.
ALTER TABLE "product"
  ADD CONSTRAINT "product_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 120),
  ADD CONSTRAINT "product_description_check" CHECK (length(btrim("description")) BETWEEN 1 AND 5000),
  ADD CONSTRAINT "product_price_check" CHECK ("priceCents" BETWEEN 1 AND 99999999),
  ADD CONSTRAINT "product_image_key_check" CHECK ("imageKey" IS NULL OR ("imageKey" LIKE 'products/%' AND length("imageKey") > 9)),
  ADD CONSTRAINT "product_active_image_check" CHECK (NOT "active" OR "imageKey" IS NOT NULL);

ALTER TABLE "cart" ADD CONSTRAINT "cart_version_check" CHECK ("version" >= 0);
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);

ALTER TABLE "checkout_attempt"
  ADD CONSTRAINT "checkout_total_check" CHECK ("totalCents" BETWEEN 1 AND 99999999),
  ADD CONSTRAINT "checkout_currency_check" CHECK ("currency" = 'USD'),
  ADD CONSTRAINT "checkout_cart_version_check" CHECK ("cartVersion" >= 0),
  ADD CONSTRAINT "checkout_request_key_check" CHECK (length(btrim("requestKey")) BETWEEN 1 AND 255),
  ADD CONSTRAINT "checkout_paid_reference_check" CHECK ("status" <> 'PAID' OR ("stripeSessionId" IS NOT NULL AND "stripePaymentIntentId" IS NOT NULL));

ALTER TABLE "checkout_item"
  ADD CONSTRAINT "checkout_item_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99),
  ADD CONSTRAINT "checkout_item_price_check" CHECK ("unitPriceCents" BETWEEN 1 AND 99999999 AND "unitPriceCents"::bigint * "quantity" <= 99999999),
  ADD CONSTRAINT "checkout_item_name_check" CHECK (length(btrim("productName")) BETWEEN 1 AND 120);

ALTER TABLE "order"
  ADD CONSTRAINT "order_total_check" CHECK ("totalCents" BETWEEN 1 AND 99999999),
  ADD CONSTRAINT "order_currency_check" CHECK ("currency" = 'USD');

ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99),
  ADD CONSTRAINT "order_item_price_check" CHECK ("unitPriceCents" BETWEEN 1 AND 99999999 AND "unitPriceCents"::bigint * "quantity" <= 99999999),
  ADD CONSTRAINT "order_item_name_check" CHECK (length(btrim("productName")) BETWEEN 1 AND 120);
