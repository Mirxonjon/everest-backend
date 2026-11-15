/**
 * CLIENT (zakaz oluvchi) bot — @everestcase_bot.
 * /start da xush kelibsiz xabari + "Do'konni ochish" Web App tugmasi
 * (Telegram ichida do'kon Mini App'ini ochadi).
 *
 * CLIENT_BOT_TOKEN bo'sh bo'lsa — o'chiq.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { loadConfig } from '../config/configuration';

@Injectable()
export class ClientBotService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('ClientBot');
  private bot: Bot | null = null;

  onModuleInit(): void {
    const cfg = loadConfig();
    const token = cfg.clientBotToken;
    if (!token) {
      this.log.warn('CLIENT_BOT_TOKEN berilmagan — client bot o‘chiq');
      return;
    }

    this.bot = new Bot(token);
    const shopUrl = cfg.shopUrl;

    const welcome =
      'Assalomu alaykum! 👋\n\n' +
      'Everest Case — telefon aksessuarlari do‘koni 🛍\n' +
      'Zaryadchi, kabel, quloqchin, powerbank, tutqich va boshqalar — sifatli va arzon.\n\n' +
      '🚚 Yetkazib berish bor\n' +
      '📍 O‘rikzor bozori ro‘parasi (tuneldan chiqqanda)\n\n' +
      'Do‘konni ochish uchun 👇';

    const keyboard = () => new InlineKeyboard().webApp('🛍 Do‘konni ochish', shopUrl);

    this.bot.command('start', (ctx) => ctx.reply(welcome, { reply_markup: keyboard() }));

    // Boshqa xabarга ham do'kon tugmasini ko'rsatamiz
    this.bot.on('message:text', (ctx) =>
      ctx.reply('Do‘konni ochish uchun quyidagi tugmani bosing 👇', { reply_markup: keyboard() }),
    );

    this.bot.catch((err) => this.log.error(`Client bot xatosi: ${err.message}`));

    void this.bot.start({
      onStart: (me) => this.log.log(`Client bot ishga tushdi: @${me.username}`),
    });
  }

  onModuleDestroy(): void {
    void this.bot?.stop();
  }
}
