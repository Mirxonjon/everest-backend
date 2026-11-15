import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { LoginDto, ProductDto } from './dto/product.dto';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.admin.login(dto.username, dto.password);
  }

  // Token amal qilishini tekshirish (dashboard yuklanganда)
  @Get('me')
  @UseGuards(AdminGuard)
  me() {
    return { ok: true };
  }

  @Get('categories')
  @UseGuards(AdminGuard)
  categories() {
    return this.admin.categories();
  }

  @Get('products')
  @UseGuards(AdminGuard)
  products() {
    return this.admin.listProducts();
  }

  @Post('products')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  create(@Body() dto: ProductDto, @UploadedFile() file?: Express.Multer.File) {
    return this.admin.createProduct(dto, file);
  }

  @Patch('products/:id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.admin.updateProduct(id, dto, file);
  }

  @Delete('products/:id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteProduct(id);
  }

  @Get('orders')
  @UseGuards(AdminGuard)
  orders() {
    return this.admin.listOrders();
  }

  @Get('cashiers')
  @UseGuards(AdminGuard)
  cashiers() {
    return this.admin.cashiers();
  }

  @Post('cashiers')
  @UseGuards(AdminGuard)
  @HttpCode(200)
  addCashier(@Body() body: { chat_id?: string; name?: string }) {
    return this.admin.addCashier(body?.chat_id || '', body?.name);
  }

  @Delete('cashiers/:id')
  @UseGuards(AdminGuard)
  removeCashier(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteCashier(id);
  }
}
