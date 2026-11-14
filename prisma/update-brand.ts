/**
 * Do'kon brendini yangilash: Everest Case logosi, qora palitra (logoga mos),
 * Instagram havolasi. Katalog va buyurtmalarga tegmaydi.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const SLUG = '506724';

// Qora/monoxrom palitra — Everest Case logosiga mos
const PALETTE = {
  key: 'black',
  from: '#2c2c2e',        // hero gradient tepa
  to: '#000000',          // hero gradient past
  primary: '#1a1a1a',     // tugmalar, «+», urg'u
  on_primary: '#ffffff',
  soft: '#f3f3f4',        // yorliq/tint fon
  dark_primary: '#000000',
};

async function main() {
  const store = await prisma.store.update({
    where: { slug: SLUG },
    data: {
      title: 'Everest Case',
      address: 'O‘rikzor bozori ro‘parasi, tuneldan chiqqanda — Everest Case do‘koni',
      phone: '+998770169090',
      // Telegram'da raqam bo'yicha chat ochiladi (t.me/+998770169090)
      telegram: '+998770169090',
      logo: '/media/everest/logo.png',
      logoThumb: '/media/everest/logo.png',
      palette: PALETTE as Prisma.InputJsonValue,
      instagram: 'https://www.instagram.com/everest.case/',
    },
  });
  console.log('Yangilandi:', store.title);
  console.log('  logo:', store.logo);
  console.log('  instagram:', store.instagram);
  console.log('  palette:', JSON.stringify(store.palette));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
