/**
 * Buyurtmalar: yaratish (validatsiya + idempotentlik), tarix (token orqali).
 * Har yangi buyurtma TelegramService orqali do'kon egasiga yuboriladi.
 */
import { HttpException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { TelegramService } from '../telegram/telegram.service';
import { mapOrder } from '../common/mappers';
import { CreateOrderDto } from './dto/create-order.dto';

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

@Injectable()
export class OrdersService {
  private readonly log = new Logger('Orders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly telegram: TelegramService,
  ) {}

  async create(slug: string, dto: CreateOrderDto) {
    const store = await this.stores.findBySlug(slug);

    if (!store.isOpen) {
      throw new HttpException({ code: 'store_closed', message: 'Do‘kon yopiq' }, 422);
    }

    // Idempotentlik: aloqa javobda uzilsa, qayta bosish o'sha buyurtmani
    // qaytaradi — ikkinchisi ochilmaydi.
    if (dto.local_id) {
      const dup = await this.prisma.order.findUnique({
        where: { localId: dto.local_id },
        include: { items: true },
      });
      if (dup) return { order: mapOrder(dup) };
    }

    const type = dto.delivery_type === 'pickup' ? 'PICKUP' : 'DELIVERY';
    const address = (dto.address || '').trim();
    if (type === 'DELIVERY' && !address) {
      throw new HttpException({ message: 'Manzilni yozing' }, 422);
    }

    // Narx va qoldiqni bazadagi haqiqiy qiymatdan olamiz (frontend'ga
    // ishonmaymiz): faqat bor va mavjud tovarlar hisobga kiradi.
    const ids = dto.items.map((i) => i.item_id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, storeId: store.id },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    for (const row of dto.items) {
      const p = byId.get(row.item_id);
      if (!p || !p.inStock) continue; // vitrinadan olingan — jimgina tashlanadi

      const quantity = Math.max(0, Number(row.quantity) || 0);
      if (!quantity) continue;

      if (p.minQty && quantity < p.minQty) {
        throw new HttpException(
          { code: 'min_qty', item_name: p.name, min_qty: p.minQty },
          422,
        );
      }

      lines.push({
        product: { connect: { id: p.id } },
        name: p.name,
        quantity,
        price: p.price,
        currency: p.currency,
        unit: p.unit,
        photo: p.thumbs[0] || p.photos[0] || null,
        photoFull: p.photos[0] || null,
      });
    }

    if (!lines.length) throw new HttpException({ message: 'Savat bo‘sh' }, 422);

    const itemsTotal = lines.reduce((s, l) => s + (l.price as number) * (l.quantity as number), 0);
    if (store.minOrderAmount && itemsTotal < store.minOrderAmount) {
      throw new HttpException(
        { code: 'min_order', min_order_amount: store.minOrderAmount },
        422,
      );
    }

    const delivery = type === 'DELIVERY' ? store.deliveryPrice : 0;
    const methods = (store.paymentMethods as { type: string; title: string }[]) || [];
    const method = methods.find((m) => m.type === dto.payment_method) || methods[0] || null;

    // Raqam — ketma-ket id (seed 1001 dan boshlagan). Avval yozib, keyin
    // number ni id ga tenglashtiramiz.
    const created = await this.prisma.order.create({
      data: {
        store: { connect: { id: store.id } },
        number: '0',
        token: crypto.randomBytes(16).toString('hex'),
        localId: dto.local_id || null,
        status: 'NEW',
        customerName: dto.name.trim(),
        phone: dto.phone.trim(),
        address: address || null,
        comment: (dto.comment || '').trim() || null,
        deliveryType: type,
        itemsTotal,
        deliveryPrice: delivery,
        total: itemsTotal + delivery,
        paymentType: method?.type || null,
        paymentTitle: method?.title || null,
        paymentStatus: 'unpaid',
        items: { create: lines },
      },
      include: { items: true },
    });

    const order = await this.prisma.order.update({
      where: { id: created.id },
      data: { number: String(created.id) },
      include: { items: true },
    });

    this.log.log(`№${order.number} · ${order.customerName} · ${order.total} ${store.currency}`);

    // Bot xabari buyurtmani to'xtatmasin
    this.telegram
      .notifyOrder(store, order)
      .catch((e) => this.log.error(`Bot xabari ketmadi: ${(e as Error).message}`));

    return { order: mapOrder(order) };
  }

  async myOrders(slug: string, tokens: string[] = []) {
    const store = await this.stores.findBySlug(slug);
    if (!tokens.length) return { data: [] };

    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id, token: { in: tokens } },
      include: { items: true },
      orderBy: { id: 'desc' },
    });

    return { data: orders.map(mapOrder) };
  }

  /** Telegram botidan status o'zgartirish. */
  async setStatus(
    orderId: number,
    status: 'NEW' | 'ACCEPTED' | 'DELIVERING' | 'DONE' | 'CANCELED',
  ): Promise<OrderWithItems | null> {
    try {
      return await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    } catch {
      return null;
    }
  }
}
