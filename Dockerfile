# Backend — NestJS + Prisma. node:20-slim (glibc) — sharp uchun qulay.
# Bitta bosqich: seed/migratsiya ts-node bilan ishlagani uchun to'liq
# node_modules kerak. Ishlab turgan RAM kam, image hajmi muhim emas.
FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# MUHIM: NODE_ENV=production bu yerda EMAS — aks holda `npm ci` devDependencies
# (typescript, @types/*, ts-node) ni o'rnatmaydi va tsc build yiqiladi.
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# Ishga tushganda production (ts-node seed uchun devDeps baribir o'rnatilgan)
ENV NODE_ENV=production
EXPOSE 4055
# Har start'да migratsiya qo'llanadi, keyin server ishga tushadi.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
