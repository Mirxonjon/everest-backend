import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoresService } from './stores.service';
import { QueryProductsDto } from '../products/dto/query-products.dto';

@Controller('api/store')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  /** Boot: do'kon + kategoriyalar + katalog 1-sahifa. */
  @Get(':slug')
  boot(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.stores.boot(slug, page, perPage);
  }

  /** Katalog: qidiruv/filtr/sort/sahifalash. */
  @Get(':slug/items')
  items(@Param('slug') slug: string, @Query() query: QueryProductsDto) {
    return this.stores.items(slug, query);
  }
}
