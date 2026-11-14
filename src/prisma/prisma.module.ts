import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Global — har modulda qayta import qilmasdan PrismaService ishlatiladi. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
