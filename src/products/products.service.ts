/**
 * Katalog: qidiruv, kategoriya, filtr, saralash, sahifalash — PostgreSQL'da
 * (Prisma where/orderBy/skip/take). Natija vitrina shaklida qaytadi.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapProduct } from '../common/mappers';
import { QueryProductsDto } from './dto/query-products.dto';

const PER_PAGE_MAX = 200;

export interface PageResult {
  data: ReturnType<typeof mapProduct>[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(storeId: number, q: QueryProductsDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { storeId };

    if (q.ids) {
      const ids = String(q.ids).split(',').map(Number).filter(Boolean);
      where.id = { in: ids };
    }

    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    if (q.category != null && q.category !== '') {
      const cat = Number(q.category);
      // 0 — «Boshqalar»: kategoriyasiz qolgan mahsulotlar
      where.categoryId = cat === 0 ? null : cat;
    }

    if (String(q.in_stock) === '1') where.inStock = true;
    if (String(q.discount) === '1') where.discount = { not: null };

    return where;
  }

  private buildOrder(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { id: 'asc' }];
      case 'new':
        return [{ id: 'desc' }];
      default:
        // Do'kon joylashtirgan tartib (manba id bo'yicha)
        return [{ id: 'asc' }];
    }
  }

  async list(storeId: number, q: QueryProductsDto): Promise<PageResult> {
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(PER_PAGE_MAX, Math.max(1, Number(q.per_page) || 24));
    const where = this.buildWhere(storeId, q);

    // ids bo'yicha — so'ralgan tartibda qaytarish uchun alohida yo'l
    if (q.ids) {
      const wanted = String(q.ids).split(',').map(Number).filter(Boolean);
      const rows = await this.prisma.product.findMany({ where });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const ordered = wanted.map((id) => byId.get(id)).filter(Boolean);
      const slice = ordered.slice((page - 1) * perPage, page * perPage);
      return {
        data: slice.map((p) => mapProduct(p!)),
        current_page: page,
        last_page: Math.max(1, Math.ceil(ordered.length / perPage)),
        per_page: perPage,
        total: ordered.length,
      };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: this.buildOrder(q.sort),
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      data: rows.map(mapProduct),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
    };
  }

  async facets(storeId: number) {
    const [total, discounts, outOfStock] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { storeId } }),
      this.prisma.product.count({ where: { storeId, discount: { not: null } } }),
      this.prisma.product.count({ where: { storeId, inStock: false } }),
    ]);
    return { total, discounts, out_of_stock: outOfStock };
  }
}
