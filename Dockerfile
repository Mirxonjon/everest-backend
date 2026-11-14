# Backend — NestJS + Prisma. node:20-slim (glibc) — sharp uchun qulay.
# Bitta bosqich: seed/migratsiya ts-node bilan ishlagani uchun to'liq
# node_modules kerak. Ishlab turgan RAM kam, image hajmi muhim emas.
FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 4050
# Har start'да migratsiya qo'llanadi, keyin server ishga tushadi.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
