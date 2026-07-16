import { factories } from '@strapi/strapi';
import axios from 'axios';
import { persistSportsGlossaryEntities } from './sports-glossary';

type OddsApiOutcome = { name: string; price: number };
type OddsApiMarket = { key: string; outcomes: OddsApiOutcome[] };
type OddsApiBookmaker = { key: string; markets: OddsApiMarket[] };

const DEFAULT_ODD = 1;

const toDecimalOrDefault = (value: unknown, fallback = DEFAULT_ODD) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTimestamp = (value: unknown): number => {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : NaN;
};

const nowTimestamp = (): number => Date.now();

const parseList = (value = '') =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueList = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
const normalizeListLower = (items: string[]) => uniqueList(items.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
const FALLBACK_ODDS_SPORT_KEYS = [
  'upcoming',
  'soccer_fifa_world_cup',
  'soccer_uefa_champs_league_qualification',
  'baseball_mlb',
  'tennis_atp_wimbledon',
  'tennis_wta_wimbledon'
];
const PRIORITY_ODDS_SPORT_KEYS = [
  'aussierules_afl',
  'tennis_atp_wimbledon',
  'tennis_wta_wimbledon'
];
const prioritizeSports = (sports: string[], priorities: string[]) => {
  const normalized = uniqueList((sports || []).map((value) => String(value || '').trim()).filter(Boolean));
  const prio = uniqueList((priorities || []).map((value) => String(value || '').trim()).filter(Boolean));
  const tail = normalized.filter((key) => !prio.includes(key));
  return uniqueList([...prio, ...tail]);
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

const shouldKeepFixtureTime = (value: unknown, sportKey: unknown = ''): boolean => {
  const ts = parseTimestamp(value);
  if (!Number.isFinite(ts)) return false;
  if (String(process.env.ODDS_SYNC_INCLUDE_PAST || '').toLowerCase() === 'true') return true;
  const bySportDefault =
    String(sportKey || '').toLowerCase().startsWith('baseball') ? 360
      : String(sportKey || '').toLowerCase().startsWith('cricket') ? 480
        : 240;
  const allowPastMinutes = Number(
    process.env.ODDS_SYNC_ALLOW_PAST_MINUTES
    || process.env.PUBLIC_LIVE_MATCH_DURATION_MINUTES
    || bySportDefault
  );
  const threshold = nowTimestamp() - (Math.max(0, allowPastMinutes) * 60 * 1000);
  return ts >= threshold;
};

const isFinishedStatus = (value: unknown): boolean => {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return false;
  return ['final', 'finished', 'complete', 'completed', 'ended', 'closed', 'settled'].includes(status);
};
const FINISHED_STATUS_VALUES = [
  'final',
  'finished',
  'full time',
  'ft',
  'aet',
  'after extra time',
  'complete',
  'completed',
  'ended',
  'closed',
  'settled',
  'cancelled',
  'canceled',
  'abandoned',
  'הסתיים',
  'נגמר',
  'סיום',
  'סגור',
];

const shouldKeepByStatus = (fixture: any): boolean => {
  if (!fixture || typeof fixture !== 'object') return true;
  if (fixture.completed === true) return false;
  if (fixture.finished === true) return false;
  if (isFinishedStatus(fixture.status)) return false;
  return true;
};

const DEFAULT_PROVIDER_BOOKMAKER_PRIORITY = [
  'bet365',
  'sport888',
  'winamax_de',
  'winamax_fr',
  'unibet',
  'unibet_uk',
  'unibet_fr',
  'unibet_se',
  'pinnacle',
  'betfair_ex_uk',
  'betfair_ex_eu',
  'betfair_ex_au',
  'betfair_sb_uk',
  'sportsbet',
  'paddypower',
  'williamhill',
  'williamhill_us',
  'betvictor',
  'betsson',
  'betway',
  'betclic_fr',
  'fanduel',
  'draftkings',
  'betmgm',
  'betrivers',
  'pointsbetus',
  'pointsbetau',
  'marathonbet',
  'betonlineag',
  'bovada',
];

const bookmakerHasMarket = (bookmaker: any, marketKey = 'h2h') => (
  Array.isArray(bookmaker?.markets)
  && bookmaker.markets.some((market: any) => String(market?.key || '').toLowerCase() === marketKey)
);

const chooseBookmaker = (bookmakers: any[], preferredBookmakers: string[]) => {
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) return null;
  const withH2h = bookmakers.filter((bookmaker: any) => bookmakerHasMarket(bookmaker, 'h2h'));
  const candidates = withH2h.length ? withH2h : bookmakers;
  const normalizedPreferred = Array.from(new Set([
    ...preferredBookmakers.map((item) => item.toLowerCase()),
    ...DEFAULT_PROVIDER_BOOKMAKER_PRIORITY,
  ]));
  return normalizedPreferred
    .map((key) => candidates.find((bookmaker: any) => String(bookmaker?.key || '').toLowerCase() === key))
    .find(Boolean)
    || candidates[0]
    || null;
};

const pickH2hOdds = (bookmakers: any, homeTeam: string, awayTeam: string, preferredBookmakers: string[] = []) => {
  const firstBookmaker = chooseBookmaker(bookmakers, preferredBookmakers);
  const h2h = firstBookmaker?.markets?.find((market: any) => market.key === 'h2h');
  const outcomes = h2h?.outcomes || [];

  const home = outcomes.find((item) => item.name === homeTeam);
  const away = outcomes.find((item) => item.name === awayTeam);
  const draw =
    outcomes.find((item) => String(item.name || '').toLowerCase() === 'draw') ||
    outcomes.find((item) => String(item.name || '').toLowerCase() === 'tie');

  return {
    odds_home: toDecimalOrDefault(home?.price),
    odds_away: toDecimalOrDefault(away?.price),
    odds_draw: toDecimalOrDefault(draw?.price),
  };
};

const normalizeProviderMarkets = (bookmakers: any[], preferredBookmakers: string[] = []) => {
  const bookmaker = chooseBookmaker(bookmakers, preferredBookmakers);
  const markets = Array.isArray(bookmaker?.markets) ? bookmaker.markets : [];
  return markets
    .map((market: any) => {
      const key = String(market?.key || market?.id || '').trim();
      const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
      if (!key || !outcomes.length) return null;
      const mappedOutcomes = outcomes
        .map((outcome: any) => {
          const name = String(outcome?.name || outcome?.label || outcome?.description || '').trim();
          const price = Number(outcome?.price);
          if (!name || !Number.isFinite(price) || price <= 1) return null;
          return {
            name,
            price,
            point: Number.isFinite(Number(outcome?.point)) ? Number(outcome.point) : undefined,
            description: String(outcome?.description || '').trim() || undefined,
          };
        })
        .filter(Boolean);
      if (!mappedOutcomes.length) return null;
      return {
        key,
        title: String(market?.title || key).trim(),
        last_update: market?.last_update || bookmaker?.last_update || undefined,
        bookmaker: String(bookmaker?.key || bookmaker?.title || '').trim() || undefined,
        outcomes: mappedOutcomes,
      };
    })
    .filter(Boolean);
};

const providerOddsUpdatedAt = (bookmakers: any[], preferredBookmakers: string[] = []): string | undefined => {
  const bookmaker = chooseBookmaker(bookmakers, preferredBookmakers);
  const markets = Array.isArray(bookmaker?.markets) ? bookmaker.markets : [];
  const timestamps = [
    bookmaker?.last_update,
    ...markets.map((market: any) => market?.last_update),
  ]
    .map((value) => parseTimestamp(value))
    .filter((ts) => Number.isFinite(ts));
  if (!timestamps.length) return undefined;
  return new Date(Math.max(...timestamps)).toISOString();
};

const providerOddsBookmaker = (bookmakers: any[], preferredBookmakers: string[] = []): string | undefined => {
  const bookmaker = chooseBookmaker(bookmakers, preferredBookmakers);
  return String(bookmaker?.key || bookmaker?.title || '').trim() || undefined;
};

const normalizeFixtureStatus = (value: unknown, fallback = 'open') => {
  const status = String(value || '').trim().toLowerCase();
  return status || fallback;
};

const readFixtureMinute = (fixture: any): number => {
  const minute = Number(fixture?.live_minute ?? fixture?.minute ?? fixture?.elapsed);
  if (!Number.isFinite(minute)) return 0;
  return Math.max(0, Math.floor(minute));
};

const normalizeTeamName = (value: unknown): string => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const findScoreRowByTeamName = (scores: any[], teamName: unknown): any | null => {
  if (!Array.isArray(scores) || !scores.length) return null;
  const target = normalizeTeamName(teamName);
  if (!target) return null;
  const withKeys = scores.map((row: any) => ({ row, key: normalizeTeamName(row?.name) }));
  const exact = withKeys.find((entry) => entry.key && entry.key === target);
  if (exact) return exact.row;
  const partial = withKeys.find((entry) => entry.key && (entry.key.includes(target) || target.includes(entry.key)));
  return partial?.row || null;
};

const readFixtureScores = (fixture: any, homeTeam: string, awayTeam: string): { home: number; away: number } | null => {
  const directHome = Number(fixture?.home_score);
  const directAway = Number(fixture?.away_score);
  if (Number.isFinite(directHome) && Number.isFinite(directAway)) {
    return {
      home: Math.max(0, Math.floor(directHome)),
      away: Math.max(0, Math.floor(directAway)),
    };
  }

  const scores = Array.isArray(fixture?.scores) ? fixture.scores : [];
  if (!scores.length) return null;
  const home = findScoreRowByTeamName(scores, homeTeam);
  const away = findScoreRowByTeamName(scores, awayTeam);
  const homeScore = Number(home?.score);
  const awayScore = Number(away?.score);
  if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    return {
      home: Math.max(0, Math.floor(homeScore)),
      away: Math.max(0, Math.floor(awayScore)),
    };
  }

  const [first, second] = scores;
  const firstScore = Number(first?.score);
  const secondScore = Number(second?.score);
  if (Number.isFinite(firstScore) && Number.isFinite(secondScore)) {
    return {
      home: Math.max(0, Math.floor(firstScore)),
      away: Math.max(0, Math.floor(secondScore)),
    };
  }

  return null;
};

const hasAnyScoreValue = (fixture: any): boolean => {
  const scores = Array.isArray(fixture?.scores) ? fixture.scores : [];
  return scores.some((row: any) => Number.isFinite(Number(row?.score)));
};

const resolveLiveStatusFromOddsAndScores = (oddsFixture: any, scoreFixture: any) => {
  const fromOdds = normalizeFixtureStatus(oddsFixture?.status, 'open');
  if (!scoreFixture || typeof scoreFixture !== 'object') return fromOdds;
  if (scoreFixture?.completed === true || scoreFixture?.finished === true || isFinishedStatus(scoreFixture?.status)) return 'final';

  const scoreStatus = normalizeFixtureStatus(scoreFixture?.status, '');
  if (scoreStatus) return scoreStatus;

  const commenceTs = parseTimestamp(oddsFixture?.commence_time);
  const started = Number.isFinite(commenceTs) && commenceTs <= nowTimestamp();
  if (started && hasAnyScoreValue(scoreFixture)) return 'live';
  return fromOdds;
};

const resolveScoreFixtureTeams = (scoreFixture: any) => {
  const rows = Array.isArray(scoreFixture?.scores) ? scoreFixture.scores : [];
  const [home, away] = rows;
  return {
    homeTeam: String(home?.name || scoreFixture?.home_team || '').trim(),
    awayTeam: String(away?.name || scoreFixture?.away_team || '').trim(),
  };
};

const upsertFixture = async (strapi: any, fixtureId: string, data: Record<string, any>) => {
  const existing = await strapi.db.query('api::fixture.fixture').findOne({
    where: { fixture_id: fixtureId },
    select: ['id'],
  });

  const payload = { data };
  if (existing) {
    await strapi.db.query('api::fixture.fixture').update({ where: { id: existing.id }, ...payload });
    return 'updated';
  }

  await strapi.db.query('api::fixture.fixture').create(payload);
  return 'created';
};

export default factories.createCoreService('api::fixture.fixture', ({ strapi }) => ({
  async purgeFinishedFixtures() {
    const staleHours = Number(process.env.FIXTURE_STALE_RETENTION_HOURS || 72);
    const staleIso = new Date(Date.now() - (Math.max(1, staleHours) * 60 * 60 * 1000)).toISOString();
    let removed = 0;

    const byFlags = await strapi.db.query('api::fixture.fixture').deleteMany({
      where: {
        $or: [
          { completed: true },
          { finished: true },
        ],
      },
    });
    removed += Number((byFlags as any)?.count || 0);

    const byStatus = await strapi.db.query('api::fixture.fixture').deleteMany({
      where: {
        $or: FINISHED_STATUS_VALUES.map((value) => ({ status: { $eqi: value } })),
      },
    });
    removed += Number((byStatus as any)?.count || 0);

    const byStaleTime = await strapi.db.query('api::fixture.fixture').deleteMany({
      where: {
        commence_time: { $lt: staleIso },
      },
    });
    removed += Number((byStaleTime as any)?.count || 0);

    return { removed };
  },

    async syncFromTheOddsApi() {
    const apiKey = process.env.THE_ODDS_API_KEY || '';
    const baseUrl = (process.env.THE_ODDS_API_BASE_URL || 'https://api.the-odds-api.com').replace(/\/+$/, '');
    const regions = process.env.ODDS_API_REGIONS || 'eu';
    const markets = process.env.ODDS_API_MARKETS || 'h2h';
    const marketsList = normalizeListLower(parseList(markets));
    const requestsH2hOnly = marketsList.length > 0 && marketsList.every((market) => market === 'h2h');
    const oddsFormat = process.env.ODDS_API_ODDS_FORMAT || 'decimal';
    const syncMode = String(process.env.ODDS_API_SYNC_MODE || 'upcoming').trim().toLowerCase();
    const preferredBookmakers = parseList(process.env.ODDS_API_BOOKMAKERS || 'bet365');
    const maxSports = Number(process.env.ODDS_SYNC_MAX_SPORTS || 0);
    const maxEvents = Number(process.env.ODDS_SYNC_MAX_EVENTS || 0);
    const includeOutrights = String(process.env.ODDS_API_INCLUDE_OUTRIGHTS || 'true').toLowerCase() === 'true';
    const includeInactiveSports = String(process.env.ODDS_API_INCLUDE_INACTIVE_SPORTS || 'false').toLowerCase() === 'true';

    let created = 0;
    let updated = 0;
    let totalFetched = 0;
    const seenFixtureIds = new Set<string>();
    const sportTitleByKey = new Map<string, string>();
    const glossaryFixtures: any[] = [];

        if (!apiKey) {
      strapi.log.warn('[the-odds-api-sync] THE_ODDS_API_KEY is missing. Skipping sync.');
      return { success: false, provider: 'api.the-odds-api.com', fetched: 0, created: 0, updated: 0, sports: 0 };
    }

    const configuredSports = parseList(process.env.ODDS_API_SPORTS_LIST || '');
    const configuredWantsAll = configuredSports.length === 0 || configuredSports.some((sport) => sport.toLowerCase() === 'all');
    const configuredSportsLower = normalizeListLower(configuredSports);


	  const isLiveRequest = configuredSportsLower.includes('live');

    if (syncMode === 'upcoming') {
      let limitedFixtures: any[] = [];
      try {

		  const url = isLiveRequest
          ? `${baseUrl}/v4/sports/all/odds/?all=true&apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=${oddsFormat}&dateFormat=iso`
          : `${baseUrl}/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=${oddsFormat}&dateFormat=iso`;

        const response = await axios.get(url, { headers: { Accept: 'application/json' }, timeout: 60000 });
        const fixturesArray = Array.isArray(response.data) ? response.data : [];


		    const filteredBySport = (isLiveRequest || configuredWantsAll)
            ? fixturesArray
            : fixturesArray.filter((fixture: any) => configuredSportsLower.includes(String(fixture?.sport_key || '').toLowerCase()));

        limitedFixtures = maxEvents > 0 ? filteredBySport.slice(0, maxEvents) : filteredBySport;
        totalFetched += limitedFixtures.length;

        for (const fixture of limitedFixtures) {
          const fixtureId = String(fixture?.id || '').trim();
          if (!fixtureId) continue;
          if (seenFixtureIds.has(fixtureId)) continue;
          if (!shouldKeepByStatus(fixture)) continue;
          if (!shouldKeepFixtureTime(fixture?.commence_time, fixture?.sport_key)) continue;
          seenFixtureIds.add(fixtureId);

          const sportKey = String(fixture?.sport_key || '').trim();
          const fallbackSportTitle = sportTitleByKey.get(sportKey) || titleFromSportKey(sportKey) || sportKey;
          const odds = pickH2hOdds(fixture.bookmakers || [], fixture.home_team, fixture.away_team, preferredBookmakers);
          const providerMarkets = normalizeProviderMarkets(fixture.bookmakers || [], preferredBookmakers);
          const oddsUpdatedAt = providerOddsUpdatedAt(fixture.bookmakers || [], preferredBookmakers);
          const oddsBookmaker = providerOddsBookmaker(fixture.bookmakers || [], preferredBookmakers);
          const score = readFixtureScores(fixture, fixture.home_team, fixture.away_team);
          const liveMinute = readFixtureMinute(fixture);
          const status = normalizeFixtureStatus(fixture?.status, 'open');
          const isLive = ['live', 'inplay', 'in_play', 'in-play', 'running', 'in progress'].includes(status) || fixture?.inplay === true || fixture?.is_live === true || liveMinute > 0;
          const fixtureData = {
            fixture_id: fixtureId,
            home_team: String(fixture.home_team || ''),
            away_team: String(fixture.away_team || ''),
            sport_key: sportKey,
            sport_title: String(fixture.sport_title || fallbackSportTitle || ''),
            league_name: String(fixture.sport_title || fixture.league || fallbackSportTitle || ''),
            commence_time: new Date(fixture.commence_time).toISOString(),
            odds_home: odds.odds_home,
            odds_away: odds.odds_away,
            odds_draw: odds.odds_draw,
            odds_updated_at: oddsUpdatedAt,
            odds_bookmaker: oddsBookmaker,
            odds_provider: 'the-odds-api',
            is_live: isLive,
            inplay: isLive,
            markets: providerMarkets,
            ...(score ? {
              home_score: score.home,
              away_score: score.away,
            } : {}),
            live_minute: liveMinute,
            status,
            publishedAt: new Date().toISOString(),
          };

          const result = await upsertFixture(strapi, fixtureId, fixtureData);
          glossaryFixtures.push({ ...fixture, ...fixtureData });

          if (result === 'created') created += 1;
          else updated += 1;
        }
      } catch (error: any) {
        strapi.log.error(`[the-odds-api-sync] Upcoming sync failed: ${error.message}`);
        return {
          success: false,
          provider: 'api.the-odds-api.com',
          mode: 'upcoming',
          fetched: totalFetched,
          created,
          updated,
          sports: 0,
          uniqueFixtures: seenFixtureIds.size,
        };
      }

      if (isLiveRequest) {
        return {
          success: true,
          provider: 'api.the-odds-api.com',
          mode: 'live-odds-only',
          fetched: totalFetched,
          created,
          updated,
          sports: 1,
          uniqueFixtures: seenFixtureIds.size,
        };
      }

      const scoreSportsToRefresh = uniqueList([
        ...(limitedFixtures || []).map((fixture: any) => String(fixture?.sport_key || '').trim()).filter(Boolean),
        ...(configuredWantsAll ? PRIORITY_ODDS_SPORT_KEYS : configuredSports),
      ]);

      for (const sport of scoreSportsToRefresh) {
        try {
          const scoreDaysFrom = Math.max(1, Number(process.env.ODDS_API_SCORES_DAYS_FROM || 2));
          const scoresUrl = `${baseUrl}v4/sports/${sport}/scores/?apiKey=${apiKey}&daysFrom=${scoreDaysFrom}`;
          const scoresResponse = await axios.get(scoresUrl, { headers: { Accept: 'application/json' }, timeout: 60000 });
          const scoreRows = Array.isArray(scoresResponse.data) ? scoresResponse.data : [];

          for (const scoreFixture of scoreRows) {
            const scoreFixtureId = String(scoreFixture?.id || '').trim();
            if (!scoreFixtureId) continue;

            const { homeTeam, awayTeam } = resolveScoreFixtureTeams(scoreFixture);
            const score = readFixtureScores(scoreFixture, homeTeam, awayTeam);
            const existing = await strapi.db.query('api::fixture.fixture').findOne({
              where: { fixture_id: scoreFixtureId },
              select: ['id', 'status', 'commence_time', 'home_team', 'away_team'],
            });

            if (!existing?.id) {
              if (!homeTeam || !awayTeam) continue;
              if (!shouldKeepByStatus(scoreFixture)) continue;
              if (!shouldKeepFixtureTime(scoreFixture?.commence_time, sport)) continue;

              const fallbackSportTitle = sportTitleByKey.get(sport) || titleFromSportKey(sport) || sport;
              const fixtureData = {
                fixture_id: scoreFixtureId,
                home_team: homeTeam,
                away_team: awayTeam,
                sport_key: String(scoreFixture?.sport_key || sport || ''),
                sport_title: String(scoreFixture?.sport_title || fallbackSportTitle || ''),
                league_name: String(scoreFixture?.sport_title || scoreFixture?.league || fallbackSportTitle || ''),
                commence_time: new Date(scoreFixture.commence_time).toISOString(),
                ...(score ? {
                  home_score: score.home,
                  away_score: score.away,
                } : {}),
                live_minute: readFixtureMinute(scoreFixture),
                status: resolveLiveStatusFromOddsAndScores(
                  {
                    status: scoreFixture?.status,
                    commence_time: scoreFixture?.commence_time,
                  },
                  scoreFixture,
                ),
                publishedAt: new Date().toISOString(),
              };
              const createdFromScores = await upsertFixture(strapi, scoreFixtureId, fixtureData);
              glossaryFixtures.push({ ...scoreFixture, ...fixtureData });
              if (createdFromScores === 'created') created += 1;
              else updated += 1;
              continue;
            }

	            const scores = new Map();
              for (const scoreFixture of scores.values()) {
              const scoreFixtureId = String(scoreFixture?.id || '').trim();
          if (!scoreFixtureId) continue;

          const existing = await strapi.db.query('api::fixture.fixture').findOne({
            where: { fixture_id: scoreFixtureId },
            select: ['id', 'home_team', 'away_team'],
          });
          if (!existing?.id) continue;

          const { homeTeam, awayTeam } = resolveScoreFixtureTeams(scoreFixture);
          const score = readFixtureScores(
            scoreFixture,
            String(existing.home_team || homeTeam || ''),
            String(existing.away_team || awayTeam || ''),
          );
          const scoreStatus = resolveLiveStatusFromOddsAndScores(
            {
              status: scoreFixture?.status,
              commence_time: scoreFixture?.commence_time,
            },
            scoreFixture,
          );
          const scoreMinute = readFixtureMinute(scoreFixture);
        const scoreIsLive = ['live', 'inplay', 'in_play', 'in-play', 'running', 'in progress'].includes(scoreStatus) || scoreMinute > 0;
          const updatePayload: Record<string, any> = {
            status: scoreStatus,
            live_minute: scoreMinute,
            is_live: scoreIsLive,
            inplay: scoreIsLive,
            ...(score ? {
              home_score: score.home,
              away_score: score.away,
            } : {}),
            publishedAt: new Date().toISOString(),
          };
          if (scoreFixture?.commence_time && shouldKeepFixtureTime(scoreFixture?.commence_time, sport)) {
            updatePayload.commence_time = new Date(scoreFixture.commence_time).toISOString();
          }

          await strapi.db.query('api::fixture.fixture').update({
            where: { id: existing.id },
            data: updatePayload,
          });
          updated += 1;
        }
        }
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          if (status === 422) {
          strapi.log.warn(`[the-odds-api-sync] Skipping incompatible sport "${sport}" for markets=${markets}: HTTP 422`);
          continue;
        }
        strapi.log.error(`[the-odds-api-sync] Error fetching ${sport}: ${error.message}`);
      }
    }

    const glossary = await persistSportsGlossaryEntities(strapi, glossaryFixtures).catch((error: any) => {
      strapi.log.warn(`[sports-glossary] Sync persistence failed: ${error?.message || error}`);
      return { skipped: true, error: error?.message || 'glossary-persist-failed' };
        });
    const purged = await this.purgeFinishedFixtures().catch(() => ({ removed: 0 }));

    return {
      success: true,
      provider: 'api.the-odds-api.com',
      fetched: totalFetched,
      created,
      updated,
      sports: scoreSportsToRefresh.length,
      uniqueFixtures: seenFixtureIds.size,
      glossary,
      purged,
    };
  }
},

  async syncAllProviders() {
    const theOdds = await this.syncFromTheOddsApi();

    return {
      providers: { theOdds },
      fetched: Number(theOdds?.fetched || 0),
      created: Number(theOdds?.created || 0),
      updated: Number(theOdds?.updated || 0),
    };
  },
}));
