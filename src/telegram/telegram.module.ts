import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ClientBotService } from './client-bot.service';

@Module({
  providers: [TelegramService, ClientBotService],
  exports: [TelegramService],
})
export class TelegramModule {}
