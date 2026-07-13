const parseCookie = (raw: string | undefined, key: string): string | null => {
  if (!raw) return null;
  const parts = String(raw).split(';');
  for (const part of parts) {
    const item = part.trim();
    if (!item) continue;
    const eqIndex = item.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = item.slice(0, eqIndex).trim();
    if (name !== key) continue;
    const value = item.slice(eqIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
};

export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    const hasAuthHeader = Boolean(ctx?.request?.header?.authorization);
    if (!hasAuthHeader) {
      const cookieName = process.env.AUTH_COOKIE_NAME || 'rb88_at';
      const token = parseCookie(ctx?.request?.header?.cookie, cookieName);
      if (token) {
        ctx.request.header.authorization = `Bearer ${token}`;
      }
    }
    await next();
  };
};
