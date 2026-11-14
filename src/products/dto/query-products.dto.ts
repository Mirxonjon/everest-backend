import { IsOptional, IsString } from 'class-validator';

/**
 * Katalog so'rovi parametrlari (query string).
 * Dekoratorlar shart: ValidationPipe({whitelist:true}) dekoratorsiz
 * maydonlarni o'chirib tashlaydi.
 */
export class QueryProductsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsString() ids?: string;
  @IsOptional() @IsString() in_stock?: string;
  @IsOptional() @IsString() discount?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() per_page?: string;
}
