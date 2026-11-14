# Everest Case — Backend

NestJS 11 + Prisma (PostgreSQL) + Telegram bot + MinIO. Vitrina API va admin
dashboard backendi. Frontend alohida repo: **everest-frontend**.

## Lokal ishga tushirish

```bash
npm install
cp .env.example .env            # DATABASE_URL ni moslang (MINIO_* bo'sh = disk)
npm run prisma:migrate
npm run db:seed:everest         # 65 mahsulot
npm run brand                   # logo/palitra/aloqa
npm run build && npm start      # http://localhost:4000
```

## Modullar (`src/`)

- `stores`, `products` — katalog (qidiruv/filtr/sort/sahifa)
- `orders` — buyurtma + tarix (token orqali)
- `telegram` — bot (yangi zakaz + status tugmalari)
- `admin` — dashboard API (login, mahsulot CRUD, rasm yuklash)
- `storage` — rasm ombori (MinIO yoki disk) + `/media/everest/*` serve

## Deploy (server: 127.0.0.1 postgres + cos-minio)

```bash
# 0) bir martalik: baza
sudo -u postgres psql -c "CREATE DATABASE everest_case;"

# 1) kod
cd /home/Projects/dev
git clone git@github.com:Mirxonjon/everest-backend.git
cd everest-backend
cp .env.example .env    # to'ldiring: DATABASE_URL, MINIO_ACCESS/SECRET, BOT_TOKEN, ADMIN_*

# 2) build + up (port 4050, host tarmoq)
docker compose up -d --build

# 3) seed (bir marta)
docker compose exec backend npm run db:seed:everest
docker compose exec backend npm run brand
docker compose exec backend npm run media:sync   # rasmlarni MinIO'ga
```

Port: **4050** (host). `.env` dagi `PORT` bilan o'zgartiriladi.
