/** Prisma Client — Nest hayot sikliga ulangan yagona ulanish. */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Prisma');

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.log.log('PostgreSQL ulanishi ochildi');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
