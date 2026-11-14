/**
 * Seed: data/*.json dan PostgreSQL ga.
 *
 * Manba — qarzapp.uz jonli API'dan yig'ilgan haqiqiy katalog (704 mahsulot).
 * Mahsulot va kategoriya id'lari manbadagidek saqlanadi (vitrina shartnomasi
 * o'zgarmasin). Qayta ishga tushsa — avval tozalab, qaytadan to'ldiradi.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const dataDir = path.join(__dirname, '..', 'data');

interface SeedStore {
  store: {
    slug: string;
    title: string;
    logo: string | null;
    logo_thumb: string | null;
    palette: Record<string, string>;
    phone: string | null;
    telegram: string | null;
    address: string | null;
    currency: string;
    is_open: boolean;
    delivery_enabled: boolean;
    delivery_price: number;
    pickup_enabled: boolean;
    min_order_amount: number;
    welcome_text: string | null;
    payment_methods: unknown[];
  };
  categories: { id: number; name: string }[];
}

interface SeedItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  old_price: number | null;
  discount: number | null;
  unit: string | null;
  category_id: number;
  min_qty: number | null;
  in_stock: boolean;
  stock: number | null;
  photos: string[];
  thumbs: string[];
  images: string[];
}

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as T;
}

async function main() {
  const src = read<SeedStore>('store.json');
  const items = read<SeedItem>('items.json') as unknown as SeedItem[];

  console.log(`Seed: ${items.length} ta mahsulot, ${src.categories.length} ta kategoriya`);

  // Tozalash (bog'lanishlar Cascade bilan o'chadi)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();

  // Do'kon
  const store = await prisma.store.create({
    data: {
      slug: src.store.slug,
      title: src.store.title,
      logo: src.store.logo,
      logoThumb: src.store.logo_thumb,
      palette: src.store.palette as Prisma.InputJsonValue,
      phone: src.store.phone,
      telegram: src.store.telegram,
      address: src.store.address,
      currency: src.store.currency || 'UZS',
      isOpen: src.store.is_open,
      deliveryEnabled: src.store.delivery_enabled,
      deliveryPrice: src.store.delivery_price || 0,
      pickupEnabled: src.store.pickup_enabled,
      minOrderAmount: src.store.min_order_amount || 0,
      welcomeText: src.store.welcome_text,
      paymentMethods: src.store.payment_methods as Prisma.InputJsonValue,
    },
  });

  // Kategoriyalar (manbadagi id saqlanadi)
  await prisma.category.createMany({
    data: src.categories.map((c, i) => ({
      id: c.id,
      storeId: store.id,
      name: c.name,
      sort: i,
    })),
  });

  const validCats = new Set(src.categories.map((c) => c.id));

  // Mahsulotlar — partiyalab (createMany bitta so'rovda 704 tasi ham oladi,
  // lekin partiyalash xotira va log uchun qulay)
  const CHUNK = 200;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await prisma.product.createMany({
      data: chunk.map((it) => ({
        id: it.id,
        storeId: store.id,
        // Noma'lum kcategory — null (SetNull FK), «Boshqalar» filtri tutadi
        categoryId: validCats.has(it.category_id) ? it.category_id : null,
        name: it.name,
        description: it.description,
        price: it.price,
        currency: it.currency || 'UZS',
        oldPrice: it.old_price,
        discount: it.discount,
        unit: it.unit,
        minQty: it.min_qty,
        inStock: it.in_stock,
        stock: it.stock,
        photos: it.photos || [],
        thumbs: it.thumbs || [],
        images: it.images || [],
      })),
    });
    console.log(`  ${Math.min(i + CHUNK, items.length)}/${items.length}`);
  }

  // Buyurtma raqamlari 1001 dan boshlansin
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE orders_id_seq RESTART WITH 1001;`,
  );

  const count = await prisma.product.count();
  console.log(`Tayyor: ${count} ta mahsulot bazada, do'kon slug=${store.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
