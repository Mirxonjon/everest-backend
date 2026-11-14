import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { MediaController } from './media.controller';

/** Global — admin va media controller StorageService'dan foydalanadi. */
@Global()
@Module({
  controllers: [MediaController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
