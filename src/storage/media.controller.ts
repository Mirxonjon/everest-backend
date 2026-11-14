/** Rasmlarni berish: GET /media/everest/<nom> -> minio yoki diskdan stream. */
import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('media/everest')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get(':name')
  async serve(@Param('name') name: string, @Res() res: Response): Promise<void> {
    // Yo'l xavfsizligi: faqat fayl nomi
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '');
    const obj = await this.storage.get(safe);
    if (!obj) throw new NotFoundException();

    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (obj.size) res.setHeader('Content-Length', String(obj.size));
    obj.stream.pipe(res);
  }
}
