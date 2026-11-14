import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { storageProxy } from './storage/storage-proxy';
import { loadConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Next.js (3100) backend (4000) ga boshqa origin'dan murojaat qiladi
  app.enableCors();

  // DTO validatsiyasi: noto'g'ri so'rov controllerga yetmaydi
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  // Rasm proxy'si (eski qarzapp.uz rasmlari) — Nest routerlaridan oldin
  app.use('/storage', storageProxy);

  // /media/everest/* rasmlari MediaController orqali beriladi (minio yoki disk)

  const { port } = loadConfig();
  await app.listen(port);
  new Logger('Bootstrap').log(`Backend tayyor: http://localhost:${port}`);
}

void bootstrap();
