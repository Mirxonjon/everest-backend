import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { ProductsModule } from './products/products.module';
import { StoresModule } from './stores/stores.module';
import { OrdersModule } from './orders/orders.module';
import { TelegramModule } from './telegram/telegram.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    ProductsModule,
    StoresModule,
    OrdersModule,
    TelegramModule,
    AdminModule,
  ],
})
export class AppModule {}
