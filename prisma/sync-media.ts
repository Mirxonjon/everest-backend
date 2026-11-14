/**
 * backend/media/everest/ dagi rasmlarni MinIO bucket'ga yuklaydi.
 * Deploy'da bir marta ishlatiladi (seed'dan keyin). MinIO o'chiq bo'lsa —
 * hech narsa qilmaydi (lokalда rasmlar diskдан beriladi).
 */
import * as fs from 'fs';
import * as path from 'path';
import { Client as MinioClient } from 'minio';
import { loadConfig } from '../src/config/configuration';

const DIR = path.join(__dirname, '..', 'media', 'everest');

function contentType(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
}

async function main() {
  const cfg = loadConfig().minio;
  if (!cfg.enabled) {
    console.log('MinIO o‘chiq — sync kerak emas (lokal rejim).');
    return;
  }
  if (!fs.existsSync(DIR)) {
    console.log('media/everest papkasi yo‘q — yuklanadigan rasm yo‘q.');
    return;
  }

  const client = new MinioClient({
    endPoint: cfg.endpoint,
    port: cfg.port,
    useSSL: cfg.useSSL,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
  });

  if (!(await client.bucketExists(cfg.bucket))) {
    await client.makeBucket(cfg.bucket);
    console.log(`Bucket yaratildi: ${cfg.bucket}`);
  }

  const files = fs.readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  let up = 0;
  for (const f of files) {
    const buf = fs.readFileSync(path.join(DIR, f));
    await client.putObject(cfg.bucket, f, buf, buf.length, { 'Content-Type': contentType(f) });
    up++;
    if (up % 20 === 0) process.stdout.write(`\r${up}/${files.length}`);
  }
  console.log(`\nMinIO'ga yuklandi: ${up} ta rasm -> ${cfg.bucket}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
