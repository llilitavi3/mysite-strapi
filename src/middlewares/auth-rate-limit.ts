import type { Core } from '@strapi/strapi';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const PROTECTED_PATHS = [
  '/api/auth/local',
  '/api/auth/local/register',
  '/api/public-auth/login',
  '/api/public-auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/agents/register-player',
  '/api/agents/transfer-balance',
];

const isProtectedPath = (path: string) => {
  const p = String(path || '').toLowerCase();
  return PROTECTED_PATHS.some((entry) => p.startsWith(entry));
};

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const settings = {
      enabled: String(process.env.AUTH_RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false',
      windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60000),
      max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    };

    if (!settings.enabled || !isProtectedPath(ctx.path)) {
      await next();
      return;
    }

    const now = Date.now();
    const windowMs = Math.max(1000, Number(settings.windowMs || 60000));
    const max = Math.max(1, Number(settings.max || 10));
    const ip = String(ctx.request.ip || ctx.ip || 'unknown');
    const key = `${ip}:${String(ctx.path || '').toLowerCase()}`;

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
    } else if (current.count >= max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      ctx.set('Retry-After', String(Math.max(1, retryAfter)));
      ctx.status = 429;
      ctx.body = {
        error: {
          status: 429,
          name: 'RateLimitError',
          message: 'Too many attempts. Please wait and try again.',
        },
      };
      return;
    } else {
      current.count += 1;
      buckets.set(key, current);
    }

    if (buckets.size > 5000) {
      for (const [k, entry] of buckets.entries()) {
        if (entry.resetAt <= now) buckets.delete(k);
      }
    }

    await next();
  };
};
