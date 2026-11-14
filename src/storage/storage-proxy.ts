/**
 * Rasm proxy'si: /storage/* so'rovlari asl manbadan (qarzapp.uz) olinadi va
 * diskda keshlanadi — ikkinchi so'rovdan boshlab lokaldan ketadi.
 *
 * Express middleware sifatida main.ts da ulanadi (Nest routerlaridan oldin).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import type { Request, Response } from 'express';
import { loadConfig } from '../config/configuration';

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

export function storageProxy(req: Request, res: Response): void {
  const origin = loadConfig().imageOrigin;
  // req.url bu yerda /storage prefiksisiz keladi (app.use('/storage', ...))
  const urlPath = '/storage' + decodeURIComponent(req.url.split('?')[0]);
  const safe = path.normalize(urlPath).replace(/^([.\\/])+/, '');

  if (safe.includes('..')) {
    res.status(400).end();
    return;
  }

  const cached = path.join(CACHE_DIR, safe);
  if (fs.existsSync(cached)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(cached);
    return;
  }

  https
    .get(origin + urlPath, (upstream) => {
      if (upstream.statusCode !== 200) {
        res.status(upstream.statusCode || 502).end();
        upstream.resume();
        return;
      }

      fs.mkdirSync(path.dirname(cached), { recursive: true });
      const tmp = cached + '.part';
      const out = fs.createWriteStream(tmp);

      res.status(200);
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      upstream.on('data', (chunk: Buffer) => {
        out.write(chunk);
        res.write(chunk);
      });
      upstream.on('end', () => {
        out.end(() => {
          try {
            fs.renameSync(tmp, cached);
          } catch {
            /* band bo'lsa keyingi safar */
          }
        });
        res.end();
      });
      upstream.on('error', () => {
        out.destroy();
        res.end();
      });
    })
    .on('error', () => res.status(502).end());
}
