import { isFixtureSuspended } from '../../../utils/live-match-simulation';

const USER_UID = 'plugin::users-permissions.user';
const BET_UID = 'api::bet.bet';
const FIXTURE_UID = 'api::fixture.fixture';

const MARKET_TO_ODDS_FIELD: Record<string, string> = {
  home: 'odds_home',
  draw: 'odds_draw',
  away: 'odds_away',
};

const MARKET_TO_PREDICTION: Record<string, string> = {
  home: '1',
  draw: 'X',
  away: '2',
};

const isResultMarket = (market: string) => Boolean(MARKET_TO_ODDS_FIELD[market]);
const isCustomLiveMarket = (market: string) =>
  market.startsWith('player_score_first_half:')
  || market.startsWith('player_score_anytime:');

const toAmount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};
const roundMoney = (value: unknown) => Number((Number(value || 0)).toFixed(2));
const getUserTable = () => strapi.db.metadata.get(USER_UID)?.tableName || 'up_users';

const parseTimestamp = (value: unknown) => {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : NaN;
};

const fixtureLastOddsUpdateTs = (fixture: any) => {
  const candidates = [
    fixture?.odds_updated_at,
    fixture?.oddsUpdatedAt,
    fixture?.last_odds_update,
    fixture?.lastOddsUpdate,
    fixture?.market_updated_at,
    fixture?.marketUpdatedAt,
    fixture?.updated_at,
    fixture?.updatedAt,
  ];
  for (const value of candidates) {
    const ts = parseTimestamp(value);
    if (Number.isFinite(ts)) return ts;
  }
  return NaN;
};

const hasFreshBettableOdds = (fixture: any, now = Date.now()) => {
  const kickoffTs = parseTimestamp(fixture?.commence_time);
  const hasStarted = Number.isFinite(kickoffTs) && kickoffTs <= now;
  if (!hasStarted) return true;
  const updatedTs = fixtureLastOddsUpdateTs(fixture);
  if (!Number.isFinite(updatedTs)) return false;
  const maxAgeSeconds = Number(process.env.BET_ODDS_MAX_AGE_SECONDS || process.env.PUBLIC_ACTIVE_ODDS_MAX_SECONDS || 60);
  return (now - updatedTs) <= Math.max(1, maxAgeSeconds) * 1000;
};

const sendConflict = (ctx: any, message: string) => {
  ctx.status = 409;
  return ctx.send({ error: message });
};

export default {
  async place(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const body = (ctx.request.body || {}) as any;
    const payload = body.data || body;
    const fixtureId = String(payload.fixture_id || '').trim();
    const market = String(payload.market || payload.selection || payload.predictionKey || '').trim().toLowerCase();
    const stake = Math.floor(toAmount(payload.stake));
    const maxStake = Math.max(1, Number(process.env.MAX_BET_STAKE || 100000));

    if (!fixtureId) return ctx.badRequest('fixture_id is required');
    if (!isResultMarket(market) && !isCustomLiveMarket(market)) return ctx.badRequest('market is not supported');
    if (!Number.isFinite(stake) || stake <= 0) return ctx.badRequest('stake must be a positive number');
    if (stake > maxStake) return ctx.badRequest(`stake exceeds max allowed (${maxStake})`);

    const user = (await strapi.db.query(USER_UID).findOne({
      where: { id: authUserId },
      populate: ['role'],
    })) as any;

    if (!user) return ctx.unauthorized('User not found');
    if (user.blocked) return ctx.forbidden('User is blocked');

    const fixture = (await strapi.db.query(FIXTURE_UID).findOne({
      where: { fixture_id: fixtureId },
    })) as any;

    if (!fixture) return ctx.notFound('Fixture not found');
    if (isFixtureSuspended(String(fixture.fixture_id || ''))) {
      return ctx.badRequest('Fixture is temporarily suspended due to a critical live event');
    }
    const status = String(fixture.status || 'open').toLowerCase();
    if (!['open', 'פתוח'].includes(status)) return ctx.badRequest('Fixture is not open for betting');
    if (!hasFreshBettableOdds(fixture)) return sendConflict(ctx, 'Odds are stale. Please refresh and try again.');

    const serverOddsUpdatedTs = fixtureLastOddsUpdateTs(fixture);
    const clientOddsUpdatedTs = parseTimestamp(payload.odds_updated_at || payload.oddsUpdatedAt || payload.last_odds_update);
    if (Number.isFinite(clientOddsUpdatedTs) && Number.isFinite(serverOddsUpdatedTs) && serverOddsUpdatedTs > clientOddsUpdatedTs + 1000) {
      return sendConflict(ctx, 'Odds changed. Please refresh and try again.');
    }

    if (!isResultMarket(market)) {
      return ctx.badRequest('Live custom markets require server-side provider validation before betting');
    }

    const odds = isResultMarket(market)
      ? toAmount(fixture[MARKET_TO_ODDS_FIELD[market]])
      : toAmount(payload.odd || payload.odds || payload.price);
    if (!Number.isFinite(odds) || odds <= 1 || odds > 100) return ctx.badRequest('Selected market is not available');
    const clientOdds = toAmount(payload.odd ?? payload.odds ?? payload.price);
    if (Number.isFinite(clientOdds) && Math.abs(clientOdds - odds) > 0.001) {
      return sendConflict(ctx, 'Odds changed. Please refresh and try again.');
    }

    const balanceBefore = toAmount(user.balance || 0);
    if (balanceBefore < stake) return ctx.badRequest('Insufficient balance');

    const potentialReturn = roundMoney(stake * odds);
    let balanceAfter = roundMoney(balanceBefore - stake);
    let bet;

    try {
      const userTable = getUserTable();
      const debited = await strapi.db.connection(userTable)
        .where({ id: user.id })
        .andWhere('balance', '>=', stake)
        .update({
          balance: strapi.db.connection.raw('ROUND(COALESCE(balance, 0) - ?, 2)', [stake]),
        });

      if (!debited) return ctx.badRequest('Insufficient balance');

      try {
        bet = await strapi.db.query(BET_UID).create({
          data: {
            fixture_id: fixture.fixture_id,
            home_team: fixture.home_team,
            away_team: fixture.away_team,
            prediction: MARKET_TO_PREDICTION[market] || String(payload.marketLabel || payload.prediction || payload.market || market).slice(0, 160),
            predictionKey: market,
            odds,
            stake,
            potential_return: potentialReturn,
            status: 'pending',
            user: user.id,
          },
        });
      } catch (createError) {
        await strapi.db.connection(userTable)
          .where({ id: user.id })
          .update({
            balance: strapi.db.connection.raw('ROUND(COALESCE(balance, 0) + ?, 2)', [stake]),
          });
        throw createError;
      }

      const [updatedUser] = await strapi.db.connection(userTable).where({ id: user.id }).select(['balance']).limit(1);
      balanceAfter = roundMoney(updatedUser?.balance);
    } catch (error) {
      strapi.log.error('place bet failed', error);
      return ctx.internalServerError('Could not place bet');
    }

    ctx.body = {
      data: {
        bet,
        user: {
          id: user.id,
          username: user.username,
          balance: balanceAfter,
          role: user.role?.type || null,
        },
      },
    };
  },

  async mine(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const bets = await strapi.db.query(BET_UID).findMany({
      where: { user: { id: authUserId } },
      orderBy: { createdAt: 'desc' },
      limit: 50,
    });

    ctx.body = { data: bets };
  },
};
