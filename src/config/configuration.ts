/** Muhit o'zgaruvchilari bir joyda — tiplangan konfiguratsiya. */
export interface AppConfig {
  port: number;
  imageOrigin: string;
  defaultSlug: string;
  bot: {
    token: string | null;
    adminChatId: string | null;
  };
  // Client (zakaz oluvchi) bot — /start da do'kon tugmasini ko'rsatadi
  clientBotToken: string | null;
  shopUrl: string;
  admin: {
    user: string;
    pass: string;
    secret: string;
  };
  minio: {
    enabled: boolean;
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT) || 4000,
    // Rasmlar hali qarzapp.uz dan proxy qilinadi (keyin lokalga ko'chiriladi)
    imageOrigin: process.env.IMAGE_ORIGIN || 'https://qarzapp.uz',
    // Bitta do'kon rejimi: admin shu do'kon ustида ishlaydi
    defaultSlug: process.env.DEFAULT_SLUG || '506724',
    bot: {
      token: (process.env.BOT_TOKEN || '').trim() || null,
      adminChatId: (process.env.ADMIN_CHAT_ID || '').trim() || null,
    },
    clientBotToken: (process.env.CLIENT_BOT_TOKEN || '').trim() || null,
    shopUrl: (process.env.SHOP_URL || 'https://everestcase.coachingzona.uz').trim(),
    admin: {
      user: process.env.ADMIN_USER || 'admin',
      pass: process.env.ADMIN_PASS || 'everest2026',
      secret: process.env.ADMIN_SECRET || 'change-me-secret-key-everest',
    },
    // MinIO bo'sh bo'lsa (lokal dev) — rasmlar diskka saqlanadi (fallback).
    // Serverда MINIO_* to'ldirilsa — cos-minio ga yuklanadi.
    minio: {
      enabled: !!(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY),
      endpoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
      port: Number(process.env.MINIO_PORT) || 9010,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
      bucket: process.env.MINIO_BUCKET || 'everest',
    },
  };
}
