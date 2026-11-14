/** Do'kon: slug bo'yicha topish, boot (do'kon + kategoriyalar + 1-sahifa). */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Store } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { mapStore } from '../common/mappers';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  async findBySlug(slug: string): Promise<Store> {
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store) throw new NotFoundException({ message: 'Do‘kon topilmadi' });
    return store;
  }

  async categories(storeId: number) {
    const cats = await this.prisma.category.findMany({
      where: { storeId },
      orderBy: { sort: 'asc' },
      select: { id: true, name: true },
    });
    return cats;
  }

  async boot(slug: string, page?: string, perPage?: string) {
    const store = await this.findBySlug(slug);
    const [categories, facets, catalog] = await Promise.all([
      this.categories(store.id),
      this.products.facets(store.id),
      this.products.list(store.id, { page, per_page: perPage }),
    ]);

    return {
      store: mapStore(store, categories),
      categories,
      banners: [],
      facets,
      catalog,
    };
  }

  async items(slug: string, query: Parameters<ProductsService['list']>[1]) {
    const store = await this.findBySlug(slug);
    return this.products.list(store.id, query);
  }
}
