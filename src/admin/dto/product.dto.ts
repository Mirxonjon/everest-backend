import { IsOptional, IsString } from 'class-validator';

/**
 * Mahsulot forma ma'lumoti. multipart/form-da kelgani uchun hamma maydon
 * matn (string) bo'ladi — xizmatда raqamga o'giriladi.
 */
export class ProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() price?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() stock?: string;
  @IsOptional() @IsString() in_stock?: string;
  @IsOptional() @IsString() discount?: string;
  @IsOptional() @IsString() old_price?: string;
  @IsOptional() @IsString() description?: string;
}

export class LoginDto {
  @IsString() username!: string;
  @IsString() password!: string;
}
