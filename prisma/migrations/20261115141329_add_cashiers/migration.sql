-- CreateTable
CREATE TABLE "cashiers" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "chat_id" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashiers_store_id_chat_id_key" ON "cashiers"("store_id", "chat_id");

-- AddForeignKey
ALTER TABLE "cashiers" ADD CONSTRAINT "cashiers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
