import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StoresModule } from '../stores/stores.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [StoresModule, TelegramModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
