/**
 * Telegram bot: har yangi buyurtma do'kon egasining chatiga tushadi.
 *
 * Xabar ostidagi status tugmalari (Tasdiqlash / Yo'lda / Yakunlandi /
 * Bekor) bosilganda buyurtma holati bazada o'zgaradi va xabar yangilanadi.
 * Xaridor vitrinadagi «Buyurtmalar» bo'limida shu holatni ko'radi.
 *
 * Statusni Prisma orqali to'g'ridan-to'g'ri o'zgartiradi — OrdersService'ga
 * bog'lanmaydi (aylanma bog'liqlik bo'lmasin).
 *
 * Sozlash (.env): BOT_TOKEN, ADMIN_CHAT_ID. Token bo'sh bo'lsa bot o'chiq —
 * buyurtmalar faqat bazaga yoziladi.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Bot, InlineKeyboard, InputFile } from 'grammy';
import type { InputMediaPhoto } from 'grammy/types';
import type { Order, OrderItem, OrderStatus, Store } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { loadConfig } from '../config/configuration';

type OrderWithItems = Order & { items: OrderItem[] };

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: '🆕 Yangi',
  ACCEPTED: '✅ Tasdiqlandi',
  DELIVERING: '🚚 Yo‘lda',
  DONE: '✔️ Yakunlandi',
  CANCELED: '❌ Bekor qilindi',
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Telegram');
  private bot: Bot | null = null;
  private defaultChat: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const cfg = loadConfig();
    this.defaultChat = cfg.bot.adminChatId;

    if (!cfg.bot.token) {
      this.log.warn('BOT_TOKEN berilmagan — bot o‘chiq, buyurtmalar faqat bazaga yoziladi');
      return;
    }

    this.bot = new Bot(cfg.bot.token);

    // /start — admin xush kelibsiz + boshqaruv tugmasi. Bir vaqtda chatni
    // avtomatik do'konga ulaydi (zakazlar shu chatga kelsin).
    this.bot.command('start', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const linked = await this.prisma.store.updateMany({
        where: { telegramChatId: null },
        data: { telegramChatId: chatId },
      });
      this.log.log(`/start chat=${chatId}, ulangan do‘kon: ${linked.count}`);

      const text =
        'Assalomu alaykum! 👋\n\n' +
        'Bu — Everest Case KASSA (admin) boti.\n\n' +
        '🧾 Yangi zakazlar shu yerga matn ko‘rinishida keladi — rasm, tafsilotlar va status tugmalari bilan.\n\n' +
        '⚙️ Mahsulot qo‘shish va boshqaruv uchun pastdagi tugmani bosing 👇' +
        (linked.count > 0 ? '\n\n✅ Zakazlar shu chatga ulandi.' : '');

      await ctx.reply(text, {
        reply_markup: new InlineKeyboard().webApp(
          '📋 Boshqaruv panel',
          loadConfig().shopUrl + '/dashboard',
        ),
      });
    });

    // /id — chat raqamini qo'lda olish (zaxira yo'l).
    this.bot.command('id', (ctx) =>
      ctx.reply(`Chat ID: ${ctx.chat.id}`),
    );

    this.bot.on('callback_query:data', async (ctx) => {
      const m = /^st:(\d+):(NEW|ACCEPTED|DELIVERING|DONE|CANCELED)$/.exec(
        ctx.callbackQuery.data,
      );
      if (!m) return ctx.answerCallbackQuery();

      const order = await this.prisma.order
        .update({
          where: { id: Number(m[1]) },
          data: { status: m[2] as OrderStatus },
          include: { items: true, store: true },
        })
        .catch(() => null);

      if (!order) return ctx.answerCallbackQuery({ text: 'Buyurtma topilmadi' });

      await ctx.answerCallbackQuery({ text: STATUS_LABEL[order.status] });
      try {
        await ctx.editMessageText(this.orderText(order.store, order), {
          parse_mode: 'HTML',
          reply_markup: this.keyboard(order),
        });
      } catch {
        /* matn o'zgarmagan bo'lsa Telegram xato beradi — e'tiborsiz */
      }
      this.log.log(`№${order.number} → ${order.status}`);
    });

    this.bot.catch((err) => this.log.error(`Bot xatosi: ${err.message}`));

    void this.bot.start({
      onStart: (me) => this.log.log(`Bot ishga tushdi: @${me.username}`),
    });
  }

  onModuleDestroy(): void {
    void this.bot?.stop();
  }

  /** Yangi buyurtmani do'kon chatiga yuborish. */
  async notifyOrder(store: Store, order: OrderWithItems): Promise<void> {
    const chat = store.telegramChatId || this.defaultChat;
    if (!this.bot || !chat) {
      this.log.warn(`Bot sozlanmagan — №${order.number} xabari yuborilmadi`);
      return;
    }

    // Avval mahsulot rasmlarini albom qilib tashlaymiz (10 tagacha), keyin
    // tugmali xabar — shunda boshqaruv tugmalari chatning tagida qoladi.
    const media: InputMediaPhoto[] = [];
    const seen = new Set<string>();
    for (const it of order.items) {
      const src = it.photoFull || it.photo;
      if (!src || seen.has(src)) continue;
      seen.add(src);
      const m = this.photoMedia(src);
      if (m) media.push({ type: 'photo', media: m });
      if (media.length >= 10) break;
    }

    if (media.length) {
      try {
        await this.bot.api.sendMediaGroup(chat, media);
      } catch (e) {
        // Rasm yuborilmasa — zakaz baribir matn bilan boradi
        this.log.warn(`Rasmlar yuborilmadi: ${(e as Error).message}`);
      }
    }

    await this.bot.api.sendMessage(chat, this.orderText(store, order), {
      parse_mode: 'HTML',
      reply_markup: this.keyboard(order),
    });
  }

  /**
   * Buyurtma qatori rasmini Telegram'ga yuboriladigan ko'rinishga o'giradi:
   *  - to'liq URL (https://…)  -> o'sha URL (Telegram o'zi yuklab oladi)
   *  - /storage/… (eski demo)  -> qarzapp.uz URL
   *  - /media/…  (lokal fayl)  -> InputFile (fayl baytlari yuboriladi)
   * Telegram serveri localhost'ga kira olmaydi, shuning uchun lokal rasmlar
   * fayl sifatida yuklanadi.
   */
  private photoMedia(src: string): string | InputFile | null {
    if (/^https?:\/\//.test(src)) return src;
    if (src.startsWith('/storage/')) return 'https://qarzapp.uz' + src;
    if (src.startsWith('/media/')) {
      const local = path.join(__dirname, '..', '..', src.replace(/^\//, ''));
      return fs.existsSync(local) ? new InputFile(local) : null;
    }
    return null;
  }

  private money(v: number, currency: string): string {
    const n = Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ');
    return `${n} ${currency === 'UZS' ? 'so‘m' : currency}`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private orderText(store: Store, order: OrderWithItems): string {
    const esc = (s: string) => this.esc(s);
    const cur = store.currency;

    const lines = order.items
      .map(
        (l, i) =>
          `${i + 1}. ${esc(l.name)} × ${l.quantity} — ${this.money(l.price * l.quantity, l.currency)}`,
      )
      .join('\n');

    const head =
      order.status === 'NEW'
        ? `🔔 <b>YANGI ZAKAZ KELDI! №${order.number}</b>`
        : `🛒 <b>Buyurtma №${order.number}</b>`;

    return [
      head,
      `📌 Holat: <b>${STATUS_LABEL[order.status]}</b>`,
      '',
      `👤 ${esc(order.customerName)}`,
      `📞 ${esc(order.phone)}`,
      order.deliveryType === 'PICKUP'
        ? '🏪 Olib ketish'
        : `🚚 Yetkazish: ${esc(order.address || '—')}`,
      order.comment ? `💬 ${esc(order.comment)}` : null,
      order.paymentTitle ? `💳 ${esc(order.paymentTitle)}` : null,
      '',
      lines,
      '',
      order.deliveryPrice ? `Yetkazish: ${this.money(order.deliveryPrice, cur)}` : null,
      `<b>Jami: ${this.money(order.total, cur)}</b>`,
    ]
      .filter((p) => p !== null)
      .join('\n');
  }

  private keyboard(order: Order): InlineKeyboard {
    const kb = new InlineKeyboard();
    const btn = (status: OrderStatus, label: string) =>
      kb.text(
        order.status === status ? `• ${label} •` : label,
        `st:${order.id}:${status}`,
      );

    btn('ACCEPTED', '✅ Tasdiqlash');
    btn('DELIVERING', '🚚 Yo‘lda');
    kb.row();
    btn('DONE', '✔️ Yakunlandi');
    btn('CANCELED', '❌ Bekor');
    return kb;
  }
}
