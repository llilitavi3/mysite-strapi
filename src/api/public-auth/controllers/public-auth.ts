import { factories } from '@strapi/strapi';

const USER_UID = 'plugin::users-permissions.user';
const AGENT_ROLE_MARKERS = ['agent', 'admin', 'master', 'super', 'manager', 'authenticated'];

// ?????? ???: ????? ????? ????? ????? ?? ?????? (Record<string, any>) ??? ?-TS ?? ????? ?? jwt
const readJson = async (response: Response): Promise<Record<string, any>> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getCookieOptions = (ctx: any) => {
  const maxAgeSec = Number(process.env.AUTH_COOKIE_MAX_AGE_SEC || 43200);
  const sameSiteRaw = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
  const sameSite = sameSiteRaw === 'strict' || sameSiteRaw === 'none' ? sameSiteRaw : 'lax';
  const secure = String(process.env.AUTH_COOKIE_SECURE || '').toLowerCase() === 'true'
    ? true
    : String(ctx.protocol || '').toLowerCase() === 'https';
  const domain = String(process.env.AUTH_COOKIE_DOMAIN || '').trim();

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    domain: domain || undefined,
    maxAge: Math.max(1, maxAgeSec) * 1000,
    overwrite: true,
  };
};

const setAuthCookie = (ctx: any, jwt: string) => {
  const cookieName = process.env.AUTH_COOKIE_NAME || 'rb88_at';
  ctx.cookies.set(cookieName, jwt, getCookieOptions(ctx));
};
const shouldExposeJwt = (ctx?: any) => {
  if (String(process.env.AUTH_EXPOSE_JWT || '').toLowerCase() === 'true') return true;
  const origin = String(ctx?.request?.headers?.origin || '').toLowerCase();
  return origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
};

const clearAuthCookie = (ctx: any) => {
  const cookieName = process.env.AUTH_COOKIE_NAME || 'rb88_at';
  const opts = getCookieOptions(ctx);
  ctx.cookies.set(cookieName, '', { ...opts, maxAge: 0 });
};

const normalizeRoleValue = (value: unknown) => String(value || '').trim().toLowerCase();

const getRoleMarker = (user: any) => {
  const candidates = [
    user?.role?.type,
    user?.role?.name,
    user?.role?.code,
    user?.role,
    user?.user_type,
    user?.type,
  ];
  const normalized = candidates.map(normalizeRoleValue);
  return normalized.find((role) => AGENT_ROLE_MARKERS.some((marker) => role.includes(marker)))
    || normalized.find(Boolean)
    || '';
};

const roleLooksAgent = (role: string) => AGENT_ROLE_MARKERS.some((marker) => role.includes(marker));

const enrichAuthUser = async (userId: unknown, fallback: any = null) => {
  if (!userId) return fallback || null;

  const user = (await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
    populate: {
      role: true,
      agent: {
        select: ['id', 'username', 'email'],
      },
      players: {
        select: ['id'],
      },
    },
  })) as any;

  if (!user) return fallback || null;

  const playersCount = Array.isArray(user.players) ? user.players.length : 0;
  const roleType = user.role?.type || null;
  const roleName = user.role?.name || null;
  const roleCode = user.role?.code || null;
  const roleMarker = getRoleMarker(user);
  const isAgent = roleLooksAgent(roleMarker) || Boolean(user.invite_code) || playersCount > 0;

  return {
    ...(fallback && typeof fallback === 'object' ? fallback : {}),
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance || 0,
    invite_code: user.invite_code || null,
    role: isAgent ? 'agent' : (roleType || roleName || roleCode || null),
    role_type: roleType,
    role_name: roleName,
    role_code: roleCode,
    role_details: user.role || null,
    agent: user.agent || null,
    is_agent: isAgent,
    players_count: playersCount,
  };
};

export default factories.createCoreController('api::global.global', ({ strapi }) => ({
  async login(ctx) {
    const baseUrl = `${ctx.protocol}://${ctx.host}`;
    const response = await fetch(`${baseUrl}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctx.request.body || {}),
    });

    const body = await readJson(response);
    if (!response.ok || !body?.jwt) {
      ctx.status = response.status;
      ctx.body = body;
      return;
    }

    setAuthCookie(ctx, String(body.jwt));
    const user = await enrichAuthUser(body.user?.id, body.user || null);
    ctx.body = {
      jwt: shouldExposeJwt(ctx) ? body.jwt : undefined,
      user,
      mode: 'cookie',
    };
  },

  async register(ctx) {
    const baseUrl = `${ctx.protocol}://${ctx.host}`;
    const response = await fetch(`${baseUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctx.request.body || {}),
    });

    const body = await readJson(response);
    if (!response.ok || !body?.jwt) {
      ctx.status = response.status;
      ctx.body = body;
      return;
    }

    setAuthCookie(ctx, String(body.jwt));
    const user = await enrichAuthUser(body.user?.id, body.user || null);
    ctx.body = {
      jwt: shouldExposeJwt(ctx) ? body.jwt : undefined,
      user,
      mode: 'cookie',
    };
  },

  async logout(ctx) {
    clearAuthCookie(ctx);
    ctx.body = { ok: true };
  },

  async me(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const user = await enrichAuthUser(authUserId);

    ctx.body = { user: user || null };
  },
}));
