/**
 * EVEREST katalogini yuklash: demo (qarzapp.uz) mahsulotlarini o'chirib,
 * o'rniga EVEREST_MOBIL kanalidan olingan, tozalangan mahsulotlarni qo'yadi.
 *
 * Do'kon yozuvi SAQLANADI (palitra, to'lov usullari, Telegram bot ulanishi
 * telegramChatId) — faqat kategoriyalar va mahsulotlar almashadi.
 * Buyurtmalar o'chirilmaydi (OrderItem.productId SetNull bilan uziladi).
 *
 * Manba: backend/data/everest-products.json + backend/media/everest/*.jpg
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const SLUG = '506724';

interface Src {
  name: string;
  price: number;
  category: string;
  image: string;
}

async function main() {
  const file = path.join(__dirname, '..', 'data', 'everest-products.json');
  const items = JSON.parse(fs.readFileSync(file, 'utf8')) as Src[];
  console.log(`EVEREST: ${items.length} ta mahsulot yuklanmoqda`);

  const store = await prisma.store.findUnique({ where: { slug: SLUG } });
  if (!store) throw new Error(`Do'kon topilmadi: ${SLUG}. Avval asosiy seed'ni ishga tushiring.`);

  // Eski katalogni tozalash (buyurtmalar qoladi)
  await prisma.product.deleteMany({ where: { storeId: store.id } });
  await prisma.category.deleteMany({ where: { storeId: store.id } });

  // Do'kon nomini EVEREST qilib yangilaymiz (bot ulanishi o'zgarmaydi)
  await prisma.store.update({
    where: { id: store.id },
    data: { title: 'EVEREST MOBIL', address: 'Aksessuarlar do‘koni' },
  });

  // Kategoriyalar — birinchi uchragan tartibda id beramiz
  const catOrder: string[] = [];
  for (const it of items) if (!catOrder.includes(it.category)) catOrder.push(it.category);

  const catId = new Map<string, number>();
  await Promise.all(
    catOrder.map((name, i) => {
      catId.set(name, i + 1);
      return prisma.category.create({
        data: { id: i + 1, storeId: store.id, name, sort: i },
      });
    }),
  );

  // Mahsulotlar
  await prisma.product.createMany({
    data: items.map((it, i) => ({
      id: i + 1,
      storeId: store.id,
      categoryId: catId.get(it.category) ?? null,
      name: it.name,
      description: null,
      price: it.price,
      currency: 'UZS',
      unit: 'dona',
      inStock: true,
      photos: [it.image],
      thumbs: [it.image],
      images: [it.image],
    })),
  });

  const count = await prisma.product.count({ where: { storeId: store.id } });
  console.log(`Tayyor: ${count} ta mahsulot, ${catOrder.length} ta kategoriya`);
  console.log(`Kategoriyalar: ${catOrder.join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
