import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, MyOrdersDto } from './dto/create-order.dto';

@Controller('api/store')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post(':slug/orders')
  @HttpCode(201)
  create(@Param('slug') slug: string, @Body() dto: CreateOrderDto) {
    return this.orders.create(slug, dto);
  }

  @Post(':slug/my-orders')
  @HttpCode(200)
  mine(@Param('slug') slug: string, @Body() dto: MyOrdersDto) {
    return this.orders.myOrders(slug, dto.tokens || []);
  }
}
