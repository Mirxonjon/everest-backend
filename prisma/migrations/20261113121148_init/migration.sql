-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('NEW', 'ACCEPTED', 'DELIVERING', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "delivery_type" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateTable
CREATE TABLE "stores" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logo" TEXT,
    "logo_thumb" TEXT,
    "phone" TEXT,
    "telegram" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "delivery_enabled" BOOLEAN NOT NULL DEFAULT true,
    "delivery_price" INTEGER NOT NULL DEFAULT 0,
    "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "min_order_amount" INTEGER NOT NULL DEFAULT 0,
    "welcome_text" TEXT,
    "palette" JSONB NOT NULL,
    "payment_methods" JSONB NOT NULL,
    "telegram_chat_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "old_price" INTEGER,
    "discount" INTEGER,
    "unit" TEXT,
    "min_qty" INTEGER,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "photos" TEXT[],
    "thumbs" TEXT[],
    "images" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "local_id" TEXT,
    "status" "order_status" NOT NULL DEFAULT 'NEW',
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "comment" TEXT,
    "delivery_type" "delivery_type" NOT NULL DEFAULT 'DELIVERY',
    "items_total" INTEGER NOT NULL,
    "delivery_price" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "payment_type" TEXT,
    "payment_title" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "unit" TEXT,
    "photo" TEXT,
    "photo_full" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "categories_store_id_idx" ON "categories"("store_id");

-- CreateIndex
CREATE INDEX "products_store_id_category_id_idx" ON "products"("store_id", "category_id");

-- CreateIndex
CREATE INDEX "products_store_id_in_stock_idx" ON "products"("store_id", "in_stock");

-- CreateIndex
CREATE UNIQUE INDEX "orders_token_key" ON "orders"("token");

-- CreateIndex
CREATE UNIQUE INDEX "orders_local_id_key" ON "orders"("local_id");

-- CreateIndex
CREATE INDEX "orders_store_id_idx" ON "orders"("store_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
