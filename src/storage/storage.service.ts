/**
 * Rasm ombori: MINIO sozlangan bo'lsa — cos-minio ga yuklaydi/o'qiydi;
 * aks holda (lokal dev) — diskka (backend/media/everest) saqlaydi.
 *
 * DB da faqat yo'l saqlanadi (/media/everest/<nom>); fayllar shu servisда.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { Client as MinioClient } from 'minio';
import { loadConfig } from '../config/configuration';

const DISK_DIR = path.join(__dirname, '..', '..', 'media', 'everest');

export interface StoredObject {
  stream: Readable;
  contentType: string;
  size?: number;
}

function contentTypeOf(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return (
    { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[
      ext
    ] || 'application/octet-stream'
  );
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly log = new Logger('Storage');
  private client: MinioClient | null = null;
  private bucket = '';
  get usingMinio(): boolean {
    return !!this.client;
  }

  async onModuleInit(): Promise<void> {
    const cfg = loadConfig().minio;
    if (!cfg.enabled) {
      this.log.log('MinIO o‘chiq — rasmlar diskka saqlanadi (lokal rejim)');
      fs.mkdirSync(DISK_DIR, { recursive: true });
      return;
    }
    this.client = new MinioClient({
      endPoint: cfg.endpoint,
      port: cfg.port,
      useSSL: cfg.useSSL,
      accessKey: cfg.accessKey,
      secretKey: cfg.secretKey,
    });
    this.bucket = cfg.bucket;
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) await this.client.makeBucket(this.bucket);
      this.log.log(`MinIO ulandi: ${cfg.endpoint}:${cfg.port}/${this.bucket}`);
    } catch (e) {
      this.log.error(`MinIO ulanmadi: ${(e as Error).message} — diskka o‘tiladi`);
      this.client = null;
      fs.mkdirSync(DISK_DIR, { recursive: true });
    }
  }

  /** Rasmni saqlaydi (nom = fayl nomi, masalan "u_abc.jpg"). */
  async put(name: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<void> {
    if (this.client) {
      await this.client.putObject(this.bucket, name, buffer, buffer.length, {
        'Content-Type': contentType,
      });
    } else {
      fs.mkdirSync(DISK_DIR, { recursive: true });
      fs.writeFileSync(path.join(DISK_DIR, name), buffer);
    }
  }

  /** Rasmni o'qiydi (serve uchun). Topilmasa null. */
  async get(name: string): Promise<StoredObject | null> {
    if (this.client) {
      try {
        const stat = await this.client.statObject(this.bucket, name);
        const stream = await this.client.getObject(this.bucket, name);
        return {
          stream,
          contentType: (stat.metaData?.['content-type'] as string) || contentTypeOf(name),
          size: stat.size,
        };
      } catch {
        return null;
      }
    }
    const file = path.join(DISK_DIR, name);
    if (!fs.existsSync(file)) return null;
    return { stream: fs.createReadStream(file), contentType: contentTypeOf(name), size: fs.statSync(file).size };
  }
}
