import { factories } from '@strapi/strapi';
import crypto from 'crypto';
import {
  findSportsGlossaryGlobalEntry,
  sportsGlossaryTermsFromStore,
} from '../services/sports-glossary';

const hasValidSyncToken = (ctx: any) => {
  const expected = String(process.env.ODDS_SYNC_TOKEN || '');
  if (!expected) return false;
  const headerToken = ctx.request.headers['x-odds-sync-token'];
  const provided = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const providedToken = String(provided || '');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(providedToken, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

const mlbTeamHints = [
  'orioles', 'white sox', 'phillies', 'pirates', 'yankees', 'tigers', 'blue jays', 'mets',
  'red sox', 'nationals', 'guardians', 'rangers', 'brewers', 'reds', 'dodgers', 'cubs',
  'padres', 'mariners', 'astros', 'twins', 'rockies', 'marlins', 'diamondbacks', 'giants',
  'athletics', 'angels', 'בולטימור', 'אוריולס', 'שיקגו ווייט', 'פילדלפיה', 'פיטסבורג',
];

const nationalTeamHints = [
  'netherlands', 'morocco', 'france', 'sweden', 'mexico', 'ecuador', 'england', 'belgium',
  'senegal', 'spain', 'austria', 'portugal', 'croatia', 'switzerland', 'algeria', 'germany',
  'paraguay', 'brazil', 'japan', 'ghana', 'argentina',
];
const tennisHints = [
  'tennis', 'atp', 'wta', 'itf', 'challenger',
  'wimbledon', 'roland garros', 'french open', 'us open', 'australian open',
];

const inferSportForPublicFixture = (item: any) => {
  const existing = String(item.sport_key || '').trim();
  if (existing) return existing;

  const combined = [
    item.home_team,
    item.away_team,
    item.league_name,
    item.sport_title,
    item.fixture_id,
  ].filter(Boolean).join(' ').toLowerCase();

  if (tennisHints.some((hint) => combined.includes(hint))) return 'tennis';
  if (mlbTeamHints.some((hint) => combined.includes(hint))) return 'baseball_mlb';
  if (nationalTeamHints.some((hint) => combined.includes(hint))) return 'soccer_international';
  return '';
};

const titleFromSportKey = (sportKey = '') => {
  const value = String(sportKey || '');
  if (value.startsWith('baseball')) return 'Baseball';
  if (value.startsWith('soccer')) return 'Soccer';
  if (value.startsWith('americanfootball')) return 'American Football';
  if (value.startsWith('basketball')) return 'Basketball';
  if (value.startsWith('tennis')) return 'Tennis';
  if (value.startsWith('cricket')) return 'Cricket';
  if (value.startsWith('rugby')) return 'Rugby';
  if (value.startsWith('boxing')) return 'Boxing';
  if (value.startsWith('mma')) return 'MMA';
  return '';
};

const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();
const isLiveStatus = (value: unknown) => {
  const key = normalizeStatus(value);
  return (
    key === 'live'
    || key === 'in_progress'
    || key === 'in progress'
    || key === 'inplay'
    || key === 'in_play'
    || key === 'running'
  );
};
const isFinalStatus = (value: unknown) => {
  const key = normalizeStatus(value);
  if (!key) return false;
  return [
    'final',
    'finished',
    'ended',
    'full time',
    'ft',
    'aet',
    'after extra time',
    'complete',
    'completed',
    'closed',
    'settled',
    'cancelled',
    'canceled',
    'abandoned',
    'suspended',
    'הסתיים',
    'נגמר',
    'סיום',
    'סגור'
  ].some((token) => key.includes(token));
};
const toBooleanLike = (value: unknown) => {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const text = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'live', 'inplay', 'in-play'].includes(text);
};
const readLiveMinute = (item: any) => {
  const n = Number(item?.live_minute ?? item?.minute ?? item?.elapsed);
  return Number.isFinite(n) ? n : 0;
};
const parseTimestamp = (value: unknown): number => {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : NaN;
};
const hasExplicitLiveSignal = (item: any) => {
  const status = item?.status;
  return isLiveStatus(status)
    || toBooleanLike(item?.is_live ?? item?.live ?? item?.inplay ?? item?.in_play)
    || readLiveMinute(item) > 0;
};

const inferredLiveDurationMinutesBySport = (sportKey: unknown) => {
  const key = String(sportKey || '').trim().toLowerCase();
  if (key.startsWith('baseball')) return 300;
  if (key.startsWith('cricket')) return 420;
  if (key.startsWith('tennis')) return 300;
  if (key.startsWith('basketball')) return 180;
  if (key.startsWith('americanfootball')) return 240;
  if (key.startsWith('rugbyleague') || key.startsWith('rugbyunion') || key.startsWith('rugby')) return 170;
  if (key.startsWith('mma') || key.startsWith('boxing')) return 120;
  if (key.startsWith('soccer')) return 180;
  return 240;
};

const inferLiveFromKickoffWindow = (item: any) => {
  const ts = parseTimestamp(item?.commence_time);
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  const defaultAgeMinutes = inferredLiveDurationMinutesBySport(item?.sport_key);
  const maxAgeMinutes = Number(process.env.PUBLIC_LIVE_INFER_MAX_AGE_MINUTES || defaultAgeMinutes);
  const maxFutureMinutes = Number(process.env.PUBLIC_LIVE_INFER_INCLUDE_UPCOMING_MINUTES || 0);
  const minTs = now - (Math.max(1, maxAgeMinutes) * 60 * 1000);
  const maxTs = now + (Math.max(0, maxFutureMinutes) * 60 * 1000);
  return ts >= minTs && ts <= maxTs;
};

const hasLiveLineSignal = (item: any) => {
  if (hasStaleLiveSignal(item)) return false;
  if (hasExplicitLiveSignal(item)) return true;
  const allowKickoffInference = String(process.env.PUBLIC_LIVE_ALLOW_KICKOFF_INFERENCE || 'false').toLowerCase() === 'true';
  if (!allowKickoffInference) return false;
  if (isFinalStatus(item?.status) || item?.finished === true || item?.completed === true) return false;
  return inferLiveFromKickoffWindow(item);
};

const isEffectivelyFinishedForPublic = (item: any, now = Date.now()) => {
  if (isFinalStatus(item?.status) || item?.finished === true || item?.completed === true) return true;
  const kickoffTs = parseTimestamp(item?.commence_time);
  if (!Number.isFinite(kickoffTs)) return false;
  if (kickoffTs > now) return false;
  if (hasStaleLiveSignal(item, now)) return true;
  if (hasLiveLineSignal(item)) return false;
  const defaultMinutes = inferredLiveDurationMinutesBySport(item?.sport_key) + 120;
  const maxAgeMinutes = Number(process.env.PUBLIC_INFER_FINISHED_MAX_MINUTES || defaultMinutes);
  const elapsedMs = now - kickoffTs;
  return elapsedMs > (Math.max(1, maxAgeMinutes) * 60 * 1000);
};

const hasRealOdds = (item: any) => (
  Number.isFinite(Number(item?.odds_home))
  || Number.isFinite(Number(item?.odds_away))
  || Number.isFinite(Number(item?.odds_draw))
);

const fixtureLastOddsUpdateTs = (item: any) => {
  const candidates = [
    item?.odds_updated_at,
    item?.oddsUpdatedAt,
    item?.last_odds_update,
    item?.lastOddsUpdate,
    item?.market_updated_at,
    item?.marketUpdatedAt,
    item?.updated_at,
    item?.updatedAt,
  ];
  for (const value of candidates) {
    const ts = parseTimestamp(value);
    if (Number.isFinite(ts)) return ts;
  }
  return NaN;
};

const hasFreshOddsSignal = (item: any, now = Date.now()) => {
  if (!hasRealOdds(item)) return false;
  const kickoffTs = parseTimestamp(item?.commence_time);
  const hasStarted = Number.isFinite(kickoffTs) && kickoffTs <= now;
  if (!hasStarted) return true;
  const ts = fixtureLastOddsUpdateTs(item);
  if (!Number.isFinite(ts)) return false;
  const silenceMinutes = Number(process.env.PUBLIC_ODDS_SILENCE_HIDE_MINUTES || 5);
  const maxSilenceMs = Math.max(1, silenceMinutes) * 60 * 1000;
  return (now - ts) <= maxSilenceMs;
};

const oddsAgeSeconds = (item: any, now = Date.now()) => {
  const ts = fixtureLastOddsUpdateTs(item);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((now - ts) / 1000));
};

const classifyPublicOddsState = (item: any, now = Date.now()) => {
  const hasOdds = hasRealOdds(item);
  const kickoffTs = parseTimestamp(item?.commence_time);
  const hasStarted = Number.isFinite(kickoffTs) && kickoffTs <= now;
  const updatedTs = fixtureLastOddsUpdateTs(item);
  const ageSeconds = oddsAgeSeconds(item, now);
  const activeSeconds = Number(process.env.PUBLIC_ACTIVE_ODDS_MAX_SECONDS || 60);
  const staleSeconds = Number(process.env.PUBLIC_STALE_ODDS_MAX_SECONDS || 180);
  const explicitLive = hasExplicitLiveSignal(item);
  const freshStartedOdds = hasStarted && hasOdds && Number.isFinite(updatedTs) && (now - updatedTs) <= Math.max(1, staleSeconds) * 1000;
  const liveSignal = explicitLive || freshStartedOdds;

  let oddsState: 'active' | 'stale' | 'suspended' | 'unavailable' = 'unavailable';
  if (hasOdds && Number.isFinite(updatedTs)) {
    const ageMs = now - updatedTs;
    if (ageMs <= Math.max(1, activeSeconds) * 1000) oddsState = 'active';
    else if (ageMs <= Math.max(1, staleSeconds) * 1000) oddsState = 'stale';
    else oddsState = 'suspended';
  } else if (hasOdds && !hasStarted) {
    oddsState = 'active';
  } else if (hasOdds) {
    oddsState = 'suspended';
  }

  const displayState = liveSignal
    ? (oddsState === 'active' ? 'live_active' : oddsState === 'stale' ? 'live_stale' : 'live_suspended')
    : (oddsState === 'active' ? 'upcoming_active' : oddsState === 'stale' ? 'upcoming_stale' : oddsState);
  const liveSource = explicitLive ? 'provider_status' : freshStartedOdds ? 'fresh_inplay_odds' : 'none';

  return {
    odds_state: oddsState,
    display_state: displayState,
    live_source: liveSource,
    odds_age_seconds: ageSeconds,
    is_live: liveSignal,
    inplay: liveSignal,
  };
};

const hasStaleLiveSignal = (item: any, now = Date.now()) => {
  if (!hasExplicitLiveSignal(item)) return false;
  const kickoffTs = parseTimestamp(item?.commence_time);
  if (!Number.isFinite(kickoffTs) || kickoffTs > now) return false;
  const defaultMinutes = inferredLiveDurationMinutesBySport(item?.sport_key) + 90;
  const maxAgeMinutes = Number(process.env.PUBLIC_STALE_LIVE_MAX_MINUTES || defaultMinutes);
  const elapsedMs = now - kickoffTs;
  if (elapsedMs <= Math.max(1, maxAgeMinutes) * 60 * 1000) return false;
  return !hasFreshOddsSignal(item, now);
};

type VisibilityReason = 'visible' | 'final' | 'stale_odds' | 'post_kickoff_no_live';

const fixtureVisibilityReason = (item: any, now = Date.now()): VisibilityReason => {
  const hideStaleOdds = String(process.env.PUBLIC_HIDE_STALE_ODDS || 'false').toLowerCase() === 'true';
  if (isFinalStatus(item?.status) || item?.finished === true || item?.completed === true) return 'final';
  if (hasStaleLiveSignal(item, now)) return 'final';
  if (hideStaleOdds && !hasFreshOddsSignal(item, now)) return 'stale_odds';
  const ts = parseTimestamp(item?.commence_time);
  if (!Number.isFinite(ts) || ts >= now) return 'visible';
  return hasExplicitLiveSignal(item) ? 'visible' : 'post_kickoff_no_live';
};

const oddsFilterLogState = new Map<string, { at: number; signature: string }>();
const maybeLogOddsFilterStats = (
  strapi: any,
  scope: string,
  stats: {
    total: number;
    visible: number;
    hiddenFinal: number;
    hiddenStaleOdds: number;
    hiddenPostKickoffNoLive: number;
  }
) => {
  const enabled = String(process.env.PUBLIC_ODDS_HIDE_LOG || 'true').toLowerCase() !== 'false';
  if (!enabled || !strapi?.log?.info) return;
  const now = Date.now();
  const throttleMs = Number(process.env.PUBLIC_ODDS_HIDE_LOG_THROTTLE_MS || 30000);
  const signature = [
    stats.total,
    stats.visible,
    stats.hiddenFinal,
    stats.hiddenStaleOdds,
    stats.hiddenPostKickoffNoLive,
  ].join('|');
  const prev = oddsFilterLogState.get(scope);
  if (prev && prev.signature === signature && (now - prev.at) < Math.max(1000, throttleMs)) return;
  oddsFilterLogState.set(scope, { at: now, signature });
  strapi.log.info(
    `[odds-visibility:${scope}] total=${stats.total} visible=${stats.visible} hidden_final=${stats.hiddenFinal} hidden_stale_odds=${stats.hiddenStaleOdds} hidden_post_kickoff_no_live=${stats.hiddenPostKickoffNoLive}`
  );
};

const pickPublicAsset = (item: any, paths: string[]) => {
  for (const path of paths) {
    const parts = String(path || '').split('.');
    let cursor: any = item;
    let ok = true;
    for (const part of parts) {
      if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) {
        cursor = cursor[part];
      } else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const value = String(cursor || '').trim();
    if (value) return value;
  }
  return '';
};

const PUBLIC_FIXTURE_LIST_SELECT_FIELDS = [
  'id',
  'fixture_id',
  'home_team',
  'away_team',
  'sport_key',
  'sport_title',
  'league_name',
  'commence_time',
  'odds_home',
  'odds_draw',
  'odds_away',
  'odds_updated_at',
  'odds_bookmaker',
  'odds_provider',
  'is_live',
  'inplay',
  'markets',
  'home_score',
  'away_score',
  'live_minute',
  'ball_position',
  'ball_position_x',
  'ball_position_y',
  'status',
  'updatedAt',
];

const formatFixtureForPublic = (item: any) => {
  const sportKey = inferSportForPublicFixture(item);
  const oddsClassification = classifyPublicOddsState(item);
  const homeLogo = pickPublicAsset(item, [
    'home_team_logo',
    'home_logo',
    'home_badge',
    'home_badge_url',
    'teams.home.logo',
    'participants.home.logo',
  ]);
  const awayLogo = pickPublicAsset(item, [
    'away_team_logo',
    'away_logo',
    'away_badge',
    'away_badge_url',
    'teams.away.logo',
    'participants.away.logo',
  ]);
  return {
    id: item.id,
    fixture_id: item.fixture_id,
    home_team: item.home_team,
    away_team: item.away_team,
    home_logo: homeLogo || undefined,
    away_logo: awayLogo || undefined,
    sport_key: sportKey,
    sport_title: item.sport_title || titleFromSportKey(sportKey),
    league_name: item.league_name || titleFromSportKey(sportKey),
    commence_time: item.commence_time,
    odds_home: item.odds_home,
    odds_away: item.odds_away,
    odds_draw: item.odds_draw,
    markets: item.markets,
    odds_updated_at: item.odds_updated_at || item.oddsUpdatedAt || item.last_odds_update || item.lastOddsUpdate || item.updatedAt,
    odds_bookmaker: item.odds_bookmaker || item.oddsBookmaker,
    odds_provider: item.odds_provider || item.oddsProvider,
    home_score: item.home_score,
    away_score: item.away_score,
    live_minute: item.live_minute,
    is_live: oddsClassification.is_live,
    inplay: oddsClassification.inplay,
    odds_state: oddsClassification.odds_state,
    display_state: oddsClassification.display_state,
    live_source: oddsClassification.live_source,
    odds_age_seconds: oddsClassification.odds_age_seconds,
    ball_position: item.ball_position,
    ball_position_x: item.ball_position_x,
    ball_position_y: item.ball_position_y,
    stats: item.live_stats,
    timeline: item.live_events,
    status: item.status,
  };
};

const normalizeIdentityToken = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const fixtureIdentityKey = (item: any, index = 0) => {
  const fixtureId = String(item?.fixture_id || '').trim();
  if (fixtureId) return `id:${fixtureId}`;
  const home = normalizeIdentityToken(item?.home_team) || 'home';
  const away = normalizeIdentityToken(item?.away_team) || 'away';
  const sport = normalizeIdentityToken(item?.sport_key || item?.sport_title) || 'sport';
  const league = normalizeIdentityToken(item?.league_name) || 'league';
  const ts = parseTimestamp(item?.commence_time);
  const bucket = Number.isFinite(ts) ? Math.floor(ts / 60000) : index;
  return `${sport}|${league}|${[home, away].sort().join('|')}|${bucket}`;
};

const fixtureQualityScore = (item: any) => {
  let score = 0;
  const hasLogo = Boolean(String(item?.home_team_logo || item?.home_logo || item?.away_team_logo || item?.away_logo || '').trim());
  if (hasExplicitLiveSignal(item)) score += 8;
  if (hasLogo) score += 3;
  if (String(item?.status || '').trim()) score += 3;
  if (Number.isFinite(parseTimestamp(item?.commence_time))) score += 2;
  if (
    Number.isFinite(Number(item?.odds_home))
    || Number.isFinite(Number(item?.odds_away))
    || Number.isFinite(Number(item?.odds_draw))
  ) score += 2;
  if (!isFinalStatus(item?.status)) score += 1;
  return score;
};

const dedupeFixturesForPublic = (rows: any[]) => {
  const source = Array.isArray(rows) ? rows : [];
  const deduped = new Map<string, any>();
  source.forEach((item, index) => {
    const key = fixtureIdentityKey(item, index);
    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, item);
      return;
    }
    if (fixtureQualityScore(item) >= fixtureQualityScore(current)) deduped.set(key, item);
  });
  return Array.from(deduped.values());
};

const normalizeGlossaryKey = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[_/]+/g, ' ')
  .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildGlossaryTranslator = (terms: Record<string, string>) => {
  const map = new Map<string, string>();
  Object.entries(terms || {}).forEach(([rawKey, rawValue]) => {
    const key = normalizeGlossaryKey(rawKey);
    const value = String(rawValue || '').trim();
    if (key && value) map.set(key, value);
  });

  return (value: unknown) => {
    const source = String(value || '').trim();
    if (!source) return source;
    const direct = map.get(normalizeGlossaryKey(source));
    if (direct) return direct;
    const parts = source.split(/(\s+|\/|\\|\||,|:|\(|\)|\[|\]|\{|\}|-)/g);
    let replaced = 0;
    const merged = parts.map((part) => {
      const key = normalizeGlossaryKey(part);
      if (!key) return part;
      const hit = map.get(key);
      if (!hit) return part;
      replaced += 1;
      return hit;
    }).join('');
    return replaced > 0 ? merged : source;
  };
};

const normalizeTermsMap = (input: unknown) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && String(v).trim())
    .map(([k, v]) => [normalizeGlossaryKey(k), String(v).trim()]);
  return Object.fromEntries(entries);
};

const resolveGlossaryTermsForPublic = (entry: any) => {
  const glossary = entry?.sportGlossary;
  if (!glossary || typeof glossary !== 'object') return {};
  const derived = sportsGlossaryTermsFromStore(glossary);
  const explicit = normalizeTermsMap(
    glossary.terms && typeof glossary.terms === 'object' ? glossary.terms : glossary,
  );
  return {
    ...derived,
    ...explicit,
  };
};

const findLocaleCandidates = (locale: unknown, acceptLanguage: unknown) => {
  const direct = String(locale || '').trim();
  const header = String(acceptLanguage || '').trim();
  const firstHeaderLang = header.split(',')[0]?.split(';')[0]?.trim() || '';
  const lower = (value: string) => value.toLowerCase();
  const candidates = [
    direct,
    lower(direct) === 'he-il' ? 'he' : '',
    lower(direct) === 'he' ? 'he-IL' : '',
    firstHeaderLang,
    lower(firstHeaderLang).startsWith('he') ? 'he' : '',
    lower(firstHeaderLang).startsWith('en') ? 'en' : '',
    'he',
    'he-IL',
    'en',
    'en-US',
  ].filter(Boolean);
  return Array.from(new Set(candidates));
};

const loadPublicGlossaryTerms = async (strapi: any, locale: unknown, acceptLanguage?: unknown) => {
  const candidates = findLocaleCandidates(locale, acceptLanguage);
  for (const candidate of candidates) {
    const entry = await findSportsGlossaryGlobalEntry(strapi, candidate);
    const terms = resolveGlossaryTermsForPublic(entry);
    if (terms && Object.keys(terms).length) return terms;
  }
  return {};
};

const translateFixtureForPublic = (fixture: any, translate: (value: unknown) => string) => ({
  ...fixture,
  home_team_original: String(fixture?.home_team || '').trim(),
  away_team_original: String(fixture?.away_team || '').trim(),
  league_name_original: String(fixture?.league_name || '').trim(),
  sport_title_original: String(fixture?.sport_title || '').trim(),
  status_original: String(fixture?.status || '').trim(),
  home_team: translate(fixture.home_team),
  away_team: translate(fixture.away_team),
  league_name: translate(fixture.league_name),
  sport_title: translate(fixture.sport_title),
  status: translate(fixture.status),
});

const runOddsSyncWithQueryOverrides = async (strapi: any, ctx: any) => {
  const mode = String(ctx.query?.mode || '').trim().toLowerCase();
  if (mode !== 'live') return strapi.service('api::fixture.fixture').syncFromTheOddsApi();

  const previousMode = process.env.ODDS_API_SYNC_MODE;
  const previousSportsList = process.env.ODDS_API_SPORTS_LIST;
  const previousIncludeInactive = process.env.ODDS_API_INCLUDE_INACTIVE_SPORTS;
  try {
    process.env.ODDS_API_SYNC_MODE = process.env.ODDS_LIVE_SYNC_MODE || 'sports';
    process.env.ODDS_API_SPORTS_LIST = String(ctx.query?.sports || process.env.ODDS_LIVE_SYNC_SPORTS_LIST || 'cricket_odi,tennis_wta_wimbledon,baseball_mlb,aussierules_afl,basketball_wnba,rugbyleague_nrl,soccer_brazil_campeonato,soccer_brazil_serie_b,soccer_china_superleague,soccer_conmebol_copa_sudamericana,soccer_denmark_superliga,soccer_efl_champ,soccer_england_efl_cup,soccer_england_league1,soccer_england_league2,soccer_epl,soccer_fifa_world_cup,soccer_finland_veikkausliiga,soccer_mexico_ligamx,soccer_spl,soccer_sweden_allsvenskan,soccer_sweden_superettan,soccer_switzerland_superleague,soccer_usa_mls');
    if (String(ctx.query?.includeInactive || '').toLowerCase() === 'true') process.env.ODDS_API_INCLUDE_INACTIVE_SPORTS = 'true';
    return await strapi.service('api::fixture.fixture').syncFromTheOddsApi();
  } finally {
    if (previousMode === undefined) delete process.env.ODDS_API_SYNC_MODE;
    else process.env.ODDS_API_SYNC_MODE = previousMode;
    if (previousSportsList === undefined) delete process.env.ODDS_API_SPORTS_LIST;
    else process.env.ODDS_API_SPORTS_LIST = previousSportsList;
    if (previousIncludeInactive === undefined) delete process.env.ODDS_API_INCLUDE_INACTIVE_SPORTS;
    else process.env.ODDS_API_INCLUDE_INACTIVE_SPORTS = previousIncludeInactive;
  }
};

export default factories.createCoreController('api::fixture.fixture', ({ strapi }) => ({
  async sync(ctx) {
    if (!hasValidSyncToken(ctx)) return ctx.unauthorized('Invalid sync token');
    try {
      const result = await runOddsSyncWithQueryOverrides(strapi, ctx);
      return ctx.send(result);
    } catch (error: any) {
      return ctx.badRequest(error.message);
    }
  },

  async syncSecond(ctx) {
    if (!hasValidSyncToken(ctx)) return ctx.unauthorized('Invalid sync token');
    try {
      const result = await runOddsSyncWithQueryOverrides(strapi, ctx);
      return ctx.send(result);
    } catch (error: any) {
      return ctx.badRequest(error.message);
    }
  },

  async syncAll(ctx) {
    if (!hasValidSyncToken(ctx)) return ctx.unauthorized('Invalid sync token');
    try {
      const result = await strapi.service('api::fixture.fixture').syncAllProviders();
      return ctx.send(result);
    } catch (error: any) {
      return ctx.badRequest(error.message);
    }
  },

  async publicList(ctx) {
    try {
      // 1. קריאת שפת הגולש ישירות מתוך ה-Header של הדפדפן שלו (הגנה מפני קריסות)
      const acceptLanguage = ctx.request.headers['accept-language'] || 'he';
      let detectedLocale = 'he-IL'; // שפת ברירת מחדל

      // זיהוי אוטומטי של שפת המשתמש ללא צורך בגוגל טרנסלייט
      if (acceptLanguage.toLowerCase().includes('en')) {
        detectedLocale = 'en-US';
      }

      // 2. משיכת המשחקים ממסד הנתונים
      const fixtures = await strapi.db.query('api::fixture.fixture').findMany({
        select: PUBLIC_FIXTURE_LIST_SELECT_FIELDS,
        where: {},
        orderBy: { commence_time: 'asc' },
        limit: Number(process.env.PUBLIC_FIXTURES_LIMIT || 5000),
      });
      const dedupedFixtures = dedupeFixturesForPublic(fixtures || []);
      const stats = {
        total: dedupedFixtures.length,
        visible: 0,
        hiddenFinal: 0,
        hiddenStaleOdds: 0,
        hiddenPostKickoffNoLive: 0,
      };
      const now = Date.now();
      const uniqueFixtures = dedupedFixtures.filter((item: any) => {
        if (isEffectivelyFinishedForPublic(item, now)) {
          stats.hiddenFinal += 1;
          return false;
        }
        stats.visible += 1;
        return true;
      });
      maybeLogOddsFilterStats(strapi, 'public-list', stats);

      // 3. המרה והשטחה של השדות עבור קוד הפרונט-אנד הישן
      const formattedData = uniqueFixtures.map((item: any) => formatFixtureForPublic(item));
      const glossaryTerms = await loadPublicGlossaryTerms(
        strapi,
        ctx.query?.locale || detectedLocale,
        acceptLanguage,
      );
      const translate = buildGlossaryTranslator(glossaryTerms);
      const translatedData = formattedData.map((item: any) => translateFixtureForPublic(item, translate));

      // 4. בניית אובייקט ה-Meta המלא שה-Header והבורר שפות של האתר מחפשים!
      const meta = {
        pagination: { page: 1, pageSize: Number(process.env.PUBLIC_FIXTURES_LIMIT || 5000), pageCount: 1, total: fixtures.length },
        locale: detectedLocale, // הזרקת השפה המזוהה אוטומטית לאתר
        languages: [
          { code: 'he-IL', name: 'עברית', dir: 'rtl' },
          { code: 'en-US', name: 'English', dir: 'ltr' }
        ],
        header: {
          logo_url: 'favicon.png',
          show_language_switcher: true
        }
      };

      // החזרת המבנה המושלם שמעיר את ה-Header והבורר שפות באתר!
      return ctx.send({ data: translatedData, meta });
    } catch (error: any) {
      return ctx.badRequest(error.message);
    }
  },

    async publicLiveLine(ctx) {
    try {
      const limit = Number(process.env.PUBLIC_FIXTURES_LIMIT || process.env.PUBLIC_LIVE_LIMIT || 5000);

      // 1. הגנת ביצועים מוחלטת: מסננים משחקים גמורים/מתים ברמת ה-MySQL ולא בזיכרון של Node
      const fixtures = await strapi.db.query('api::fixture.fixture').findMany({
        select: PUBLIC_FIXTURE_LIST_SELECT_FIELDS,
        where: {
          completed: { $ne: true },
          finished: { $ne: true },
          status: { $notIn: ['final', 'finished', 'complete', 'completed', 'ended', 'closed', 'settled'] }
        },
        orderBy: { updatedAt: 'desc' },
        limit,
      });
      
      const uniqueFixtures = dedupeFixturesForPublic(fixtures || []);

      const liveStats = {
        total: uniqueFixtures.length,
        visible: 0,
        hiddenFinal: 0,
        hiddenStaleOdds: 0,
        hiddenPostKickoffNoLive: 0,
      };
      
      const now = Date.now();
      const liveOnly = uniqueFixtures
        .filter((item: any) => {
          if (isEffectivelyFinishedForPublic(item, now)) {
            liveStats.hiddenFinal += 1;
            return false;
          }
          const oddsClassification = classifyPublicOddsState(item, now);
          if (oddsClassification.live_source === 'none') {
            liveStats.hiddenPostKickoffNoLive += 1;
            return false;
          }
          if (oddsClassification.odds_state === 'suspended' || oddsClassification.odds_state === 'unavailable') {
            liveStats.hiddenStaleOdds += 1;
            return false;
          }
          liveStats.visible += 1;
          return true;
        })
        .map((item: any) => formatFixtureForPublic(item));
      
      // 2. הגנת הצפת דיסק: כותבים לוגים של פולינג רק בסביבת פיתוח (Development)
      if (process.env.NODE_ENV === 'development') {
        maybeLogOddsFilterStats(strapi, 'public-live-line', liveStats);
      }
      
      // 3. אבטחת תרגומים: מנקים ומגבילים את ה-Locale לטקסט קצר ונקי (עד 5 תווים, אותיות ומקף בלבד)
      // זה מונע התקפות הזרקת קוד זדוני דרך מערכת השפות של האתר הסטטי
      const safeLocale = String(ctx.query?.locale || ctx.request.headers['accept-language'] || 'he')
        .replace(/[^a-zA-Z-]/g, '')
        .substring(0, 5);

      const glossaryTerms = await loadPublicGlossaryTerms(strapi, safeLocale);
      const translate = buildGlossaryTranslator(glossaryTerms);
      const translatedLive = liveOnly.map((item: any) => translateFixtureForPublic(item, translate));

      return ctx.send({
        data: translatedLive,
        meta: {
          total: translatedLive.length,
          generatedAt: new Date().toISOString(),
          pollSeconds: Number(process.env.PUBLIC_LIVE_POLL_SECONDS || 8),
        },
      });
    } catch (error: any) {
      // 4. אבטחת מידע: רושמים את השגיאה הגולמית בלוג הפנימי המאובטח, ולא חושפים אותה לגולשים
      strapi.log.error(`[publicLiveLine Controller Error the]: ${error.message}`);
      return ctx.badRequest('Unable to fetch live fixtures.');
    }
  },
}));

