/**
 * Admin xizmati: login tekshirish, mahsulot CRUD, rasm saqlash (sharp),
 * kategoriya va buyurtmalar ro'yxati. Bitta do'kon (defaultSlug) ustida.
 */
import { HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { loadConfig } from '../config/configuration';
import { signToken } from './token';
import { mapOrder, mapProduct } from '../common/mappers';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class AdminService {
  private readonly log = new Logger('Admin');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /* ---------- Auth ---------- */

  login(username: string, password: string): { token: string } {
    const cfg = loadConfig();
    const ok =
      username === cfg.admin.user && password === cfg.admin.pass;
    if (!ok) throw new HttpException({ message: 'Login yoki parol xato' }, 401);
    // 7 kunlik token
    const token = signToken({ sub: username, role: 'admin' }, cfg.admin.secret, 7 * 24 * 3600);
    return { token };
  }

  /* ---------- Do'kon ---------- */

  private async store() {
    const slug = loadConfig().defaultSlug;
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store) throw new NotFoundException({ message: `Do'kon topilmadi: ${slug}` });
    return store;
  }

  /* ---------- Rasm ---------- */

  /** Yuklangan rasmni kvadratga tekislaб ombога (minio yoki disk) saqlaydi. */
  private async saveImage(file: Express.Multer.File): Promise<string> {
    const name = `u_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const buf = await sharp(file.buffer)
      .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 88 })
      .toBuffer();
    await this.storage.put(name, buf, 'image/jpeg');
    return `/media/everest/${name}`;
  }

  /* ---------- Kategoriya ---------- */

  async categories() {
    const store = await this.store();
    return this.prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { sort: 'asc' },
      select: { id: true, name: true },
    });
  }

  /** Nom bo'yicha kategoriya topadi, bo'lmasa yaratadi. */
  private async categoryId(storeId: number, name?: string): Promise<number | null> {
    const clean = (name || '').trim();
    if (!clean) return null;
    const found = await this.prisma.category.findFirst({ where: { storeId, name: clean } });
    if (found) return found.id;
    const max = await this.prisma.category.aggregate({ _max: { id: true }, where: { storeId } });
    const sortMax = await this.prisma.category.count({ where: { storeId } });
    const created = await this.prisma.category.create({
      data: { id: (max._max.id || 0) + 1, storeId, name: clean, sort: sortMax },
    });
    return created.id;
  }

  /* ---------- Mahsulot ---------- */

  async listProducts() {
    const store = await this.store();
    const rows = await this.prisma.product.findMany({
      where: { storeId: store.id },
      orderBy: { id: 'asc' },
    });
    return { data: rows.map(mapProduct) };
  }

  private parse(dto: ProductDto) {
    const num = (v?: string) => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      name: (dto.name || '').trim(),
      price: num(dto.price),
      stock: num(dto.stock),
      oldPrice: num(dto.old_price),
      discount: num(dto.discount),
      unit: (dto.unit || '').trim() || 'dona',
      description: (dto.description || '').trim() || null,
      inStock: dto.in_stock == null ? true : dto.in_stock === '1' || dto.in_stock === 'true',
    };
  }

  async createProduct(dto: ProductDto, file?: Express.Multer.File) {
    const store = await this.store();
    const p = this.parse(dto);
    if (!p.name) throw new HttpException({ message: 'Mahsulot nomini yozing' }, 422);
    if (p.price == null) throw new HttpException({ message: 'Narxini yozing' }, 422);

    const categoryId = await this.categoryId(store.id, dto.category);
    const image = file ? await this.saveImage(file) : null;
    const photos = image ? [image] : [];

    const max = await this.prisma.product.aggregate({ _max: { id: true }, where: { storeId: store.id } });
    const product = await this.prisma.product.create({
      data: {
        id: (max._max.id || 0) + 1,
        storeId: store.id,
        categoryId,
        name: p.name,
        price: p.price,
        currency: store.currency,
        oldPrice: p.oldPrice,
        discount: p.discount,
        unit: p.unit,
        stock: p.stock,
        inStock: p.inStock,
        description: p.description,
        photos,
        thumbs: photos,
        images: photos,
      },
    });
    this.log.log(`+ mahsulot №${product.id}: ${product.name}`);
    return { product: mapProduct(product) };
  }

  async updateProduct(id: number, dto: ProductDto, file?: Express.Multer.File) {
    const store = await this.store();
    const existing = await this.prisma.product.findFirst({ where: { id, storeId: store.id } });
    if (!existing) throw new NotFoundException({ message: 'Mahsulot topilmadi' });

    const p = this.parse(dto);
    const data: Record<string, unknown> = {};
    if (dto.name != null) data.name = p.name || existing.name;
    if (dto.price != null && p.price != null) data.price = p.price;
    if (dto.unit != null) data.unit = p.unit;
    if (dto.stock != null) data.stock = p.stock;
    if (dto.old_price != null) data.oldPrice = p.oldPrice;
    if (dto.discount != null) data.discount = p.discount;
    if (dto.description != null) data.description = p.description;
    if (dto.in_stock != null) data.inStock = p.inStock;
    if (dto.category != null) data.categoryId = await this.categoryId(store.id, dto.category);

    if (file) {
      const image = await this.saveImage(file);
      data.photos = [image];
      data.thumbs = [image];
      data.images = [image];
    }

    const product = await this.prisma.product.update({ where: { id }, data });
    this.log.log(`~ mahsulot №${id} yangilandi`);
    return { product: mapProduct(product) };
  }

  async deleteProduct(id: number) {
    const store = await this.store();
    const existing = await this.prisma.product.findFirst({ where: { id, storeId: store.id } });
    if (!existing) throw new NotFoundException({ message: 'Mahsulot topilmadi' });
    await this.prisma.product.delete({ where: { id } });
    this.log.log(`- mahsulot №${id} o'chirildi`);
    return { ok: true };
  }

  /* ---------- Buyurtmalar ---------- */

  async listOrders() {
    const store = await this.store();
    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id },
      include: { items: true },
      orderBy: { id: 'desc' },
      take: 200,
    });
    return { data: orders.map(mapOrder) };
  }
}
