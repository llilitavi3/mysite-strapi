import type { Core } from '@strapi/strapi';
import { Server as SocketIOServer } from 'socket.io';

type Possession = 'TEAM_A' | 'TEAM_B';
type MatchState =
  | 'MIDFIELD'
  | 'ATTACK_A'
  | 'ATTACK_B'
  | 'DANGEROUS_ATTACK_A'
  | 'DANGEROUS_ATTACK_B'
  | 'GOAL_A'
  | 'GOAL_B'
  | 'SUSPENDED';

type RuntimeMatchState = {
  minute: number;
  homeScore: number;
  awayScore: number;
  suspendedUntilMs: number;
  momentum: number;
  lastState: MatchState;
  possession: Possession;
};

const runtimeByFixture = new Map<string, RuntimeMatchState>();
const betSuspensionByFixture = new Map<string, number>();

const isLiveStatus = (value: unknown) => {
  const status = String(value || '').trim().toLowerCase();
  return ['live', 'in_progress', 'in progress', 'inplay', 'in_play', 'running'].includes(status);
};
const isFinalStatus = (value: unknown) => {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return false;
  return [
    'final',
    'finished',
    'ended',
    'full time',
    'ft',
    'aet',
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
  ].some((token) => status.includes(token));
};
const toBooleanLike = (value: unknown) => {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const text = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'live', 'inplay', 'in-play'].includes(text);
};
const readLiveMinute = (fixture: any) => {
  const n = Number(fixture?.live_minute ?? fixture?.minute ?? fixture?.elapsed);
  return Number.isFinite(n) ? n : 0;
};
const isWithinLiveAgeWindow = (commenceTime: unknown) => {
  const ts = Date.parse(String(commenceTime || ''));
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  const maxAgeMinutes = Number(process.env.LIVE_SIM_MAX_AGE_MINUTES || 220);
  const minTs = now - (Math.max(1, maxAgeMinutes) * 60 * 1000);
  return ts >= minTs && ts <= now;
};
const hasExplicitLiveSignal = (fixture: any) => {
  if (!isWithinLiveAgeWindow(fixture?.commence_time)) return false;
  return isLiveStatus(fixture?.status)
    || toBooleanLike(fixture?.is_live ?? fixture?.live ?? fixture?.inplay ?? fixture?.in_play)
    || readLiveMinute(fixture) > 0;
};

const inferLiveNow = (commenceTime: unknown) => {
  const ts = Date.parse(String(commenceTime || ''));
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  const matchDurationMinutes = Number(process.env.PUBLIC_LIVE_MATCH_DURATION_MINUTES || 180);
  const durationMs = Math.max(1, matchDurationMinutes) * 60 * 1000;
  return ts <= now && ts >= (now - durationMs);
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const implied = (odd: unknown) => {
  const value = toNumber(odd, 2);
  if (value <= 1) return 0.5;
  return 1 / value;
};

const getStrengths = (fixture: any) => {
  const home = implied(fixture.home_odds ?? fixture.odds_home);
  const away = implied(fixture.away_odds ?? fixture.odds_away);
  const total = home + away || 1;
  const homeOdd = toNumber(fixture.home_odds ?? fixture.odds_home, 2);
  const awayOdd = toNumber(fixture.away_odds ?? fixture.odds_away, 2);
  const clearHomeFavorite = homeOdd > 1 && awayOdd > 1 && homeOdd <= (awayOdd * 0.82);
  const clearAwayFavorite = homeOdd > 1 && awayOdd > 1 && awayOdd <= (homeOdd * 0.82);

  let possessionHomeBias = home / total;
  if (clearHomeFavorite) possessionHomeBias = Math.max(possessionHomeBias, 0.65);
  if (clearAwayFavorite) possessionHomeBias = Math.min(possessionHomeBias, 0.35);

  return {
    home: home / total,
    away: away / total,
    possessionHomeBias,
  };
};

const pickPossession = (homeBiasSeed: number, momentum: number): Possession => {
  const homeBias = clamp(homeBiasSeed + momentum, 0.2, 0.8);
  return Math.random() < homeBias ? 'TEAM_A' : 'TEAM_B';
};

const teamLabel = (fixture: any, possession: Possession) =>
  possession === 'TEAM_A' ? String(fixture.home_team || 'TEAM_A') : String(fixture.away_team || 'TEAM_B');

const opponentLabel = (fixture: any, possession: Possession) =>
  possession === 'TEAM_A' ? String(fixture.away_team || 'TEAM_B') : String(fixture.home_team || 'TEAM_A');

const DEFAULT_PLAYERS: Record<Possession, string[]> = {
  TEAM_A: ['שוער', 'שחקן 2', 'שחקן 4', 'שחקן 5', 'שחקן 7', 'שחקן 10'],
  TEAM_B: ['שוער', 'שחקן 12', 'שחקן 14', 'שחקן 15', 'שחקן 17', 'שחקן 20'],
};

const asNameList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const name = String((item as any).name || (item as any).player || '').trim();
        return name;
      }
      return '';
    })
    .filter(Boolean);
};

const getTeamPlayers = (fixture: any, possession: Possession) => {
  const side = possession === 'TEAM_A' ? 'home' : 'away';
  const liveStats = fixture?.live_stats || {};
  const candidates = [
    asNameList(liveStats?.players?.[side]),
    asNameList(liveStats?.lineups?.[side]),
    asNameList(liveStats?.squads?.[side]),
  ];
  const resolved = candidates.find((list) => list.length >= 4) || [];
  return resolved.length >= 4 ? resolved.slice(0, 8) : DEFAULT_PLAYERS[possession];
};

const pick = (arr: string[], indexFallback = 0) => arr[Math.floor(Math.random() * arr.length)] || arr[indexFallback] || 'שחקן';

const composePlayText = (
  fixture: any,
  possession: Possession,
  state: MatchState,
  event: 'FLOW' | 'TURNOVER' | 'GOAL' | 'PENALTY' | 'SUSPENDED' = 'FLOW'
) => {
  const team = teamLabel(fixture, possession);
  const opponent = opponentLabel(fixture, possession);
  const players = getTeamPlayers(fixture, possession);
  const p1 = players[0] || 'שוער';
  const p2 = pick(players, 1);
  const p3 = pick(players, 2);

  if (event === 'SUSPENDED') return `${team}: אירוע קריטי, השוק מושהה זמנית`;
  if (event === 'PENALTY') return `${team}: ${p2} ➔ ${p3} ברחבה, חשד לפנדל`;
  if (event === 'GOAL') return `${team}: ${p1} ➔ ${p2} ➔ ${p3} ברחבת ה-16, שער`;
  if (event === 'TURNOVER') return `${team}: ${p2} מאבד, ${opponent} משתלטת וחוזרת למרכז`;
  if (state === 'DANGEROUS_ATTACK_A' || state === 'DANGEROUS_ATTACK_B') {
    return `${team}: ${p2} ➔ ${p3} פורץ מימין לרחבת ה-16`;
  }
  if (state === 'ATTACK_A' || state === 'ATTACK_B') {
    return `${team}: ${p1} ➔ ${p2} ➔ ${p3} בחצי היריב`;
  }
  return `${team}: ${p1} ➔ ${p2} ➔ ${p3} במרכז המגרש`;
};

const applyCriticalEvent = (
  fixture: any,
  runtime: RuntimeMatchState,
  possession: Possession,
  state: MatchState
): { state: MatchState; text: string } | null => {
  const strengths = getStrengths(fixture);
  const attackStrength = possession === 'TEAM_A' ? strengths.home : strengths.away;
  const baseGoal = state === 'DANGEROUS_ATTACK_A' || state === 'DANGEROUS_ATTACK_B' ? 0.14 : 0.05;
  const goalChance = clamp(baseGoal + (attackStrength - 0.5) * 0.16, 0.03, 0.28);
  const penaltyChance = clamp(0.03 + (attackStrength - 0.5) * 0.08, 0.015, 0.09);
  const roll = Math.random();

  if (roll < goalChance) {
    const scoredByHome = possession === 'TEAM_A';
    if (scoredByHome) runtime.homeScore += 1;
    else runtime.awayScore += 1;

    runtime.suspendedUntilMs = Date.now() + Number(process.env.LIVE_SIM_SUSPEND_MS || 9000);
    betSuspensionByFixture.set(String(fixture.fixture_id), runtime.suspendedUntilMs);

    const goalState: MatchState = scoredByHome ? 'GOAL_A' : 'GOAL_B';
    return {
      state: goalState,
      text: composePlayText(fixture, possession, goalState, 'GOAL'),
    };
  }

  if (roll < goalChance + penaltyChance) {
    runtime.suspendedUntilMs = Date.now() + Number(process.env.LIVE_SIM_SUSPEND_MS || 9000);
    betSuspensionByFixture.set(String(fixture.fixture_id), runtime.suspendedUntilMs);
    return {
      state: 'SUSPENDED',
      text: composePlayText(fixture, possession, 'SUSPENDED', 'PENALTY'),
    };
  }

  return null;
};

const positionFromState = (state: MatchState, possession: Possession) => {
  if (state === 'ATTACK_A') return 66;
  if (state === 'ATTACK_B') return 34;
  if (state === 'DANGEROUS_ATTACK_A') return 78;
  if (state === 'DANGEROUS_ATTACK_B') return 22;
  if (state === 'GOAL_A') return 90;
  if (state === 'GOAL_B') return 10;
  if (state === 'SUSPENDED') return 50;
  return possession === 'TEAM_A' ? 58 : 42;
};

const emitAndPersist = async (
  strapi: Core.Strapi,
  io: SocketIOServer,
  fixture: any,
  runtime: RuntimeMatchState,
  payload: { state: MatchState; possession: Possession; text: string }
) => {
  const ballPosition = positionFromState(payload.state, payload.possession);

  await strapi.db.query('api::fixture.fixture').update({
    where: { id: fixture.id },
    data: {
      home_score: runtime.homeScore,
      away_score: runtime.awayScore,
      live_minute: runtime.minute,
      ball_position: ballPosition,
      ball_position_x: ballPosition,
      ball_position_y: 50,
      status: payload.state === 'SUSPENDED' ? 'suspended' : 'live',
      live_events: [{ t: new Date().toISOString(), state: payload.state, text: payload.text }],
    },
  });

  io.emit('matchUpdate', {
    fixture_id: fixture.fixture_id,
    state: payload.state,
    possession: payload.possession,
    text: payload.text,
    minute: runtime.minute,
    score: {
      home: runtime.homeScore,
      away: runtime.awayScore,
    },
    updatedAt: new Date().toISOString(),
  });
};

const tickFixture = async (strapi: Core.Strapi, io: SocketIOServer, fixture: any) => {
  const fixtureId = String(fixture.fixture_id || '');
  if (!fixtureId) return;

  const current = runtimeByFixture.get(fixtureId) || {
    minute: Math.max(0, toNumber(fixture.live_minute, 0)),
    homeScore: Math.max(0, toNumber(fixture.home_score, 0)),
    awayScore: Math.max(0, toNumber(fixture.away_score, 0)),
    suspendedUntilMs: 0,
    momentum: 0,
    lastState: 'MIDFIELD' as MatchState,
    possession: Math.random() < 0.5 ? 'TEAM_A' as Possession : 'TEAM_B' as Possession,
  };

  current.minute = clamp(current.minute + (Math.random() < 0.7 ? 1 : 2), 1, 95);

  if (Date.now() < current.suspendedUntilMs) {
    await emitAndPersist(strapi, io, fixture, current, {
      state: 'SUSPENDED',
      possession: current.possession,
      text: composePlayText(fixture, current.possession, 'SUSPENDED', 'SUSPENDED'),
    });
    current.lastState = 'SUSPENDED';
    runtimeByFixture.set(fixtureId, current);
    return;
  }

  const strengths = getStrengths(fixture);
  const possessionKeepChance = current.possession === 'TEAM_A'
    ? clamp(strengths.possessionHomeBias + current.momentum * 0.45, 0.3, 0.85)
    : clamp((1 - strengths.possessionHomeBias) - current.momentum * 0.45, 0.3, 0.85);

  const keepPossession = Math.random() < possessionKeepChance;
  const possession = keepPossession
    ? current.possession
    : pickPossession(strengths.possessionHomeBias, current.momentum);

  if (!keepPossession) current.lastState = 'MIDFIELD';

  const sideStrength = possession === 'TEAM_A' ? strengths.home : strengths.away;
  const attackProgressChance = clamp(0.42 + (sideStrength - 0.5) * 0.26, 0.3, 0.72);
  const dangerProgressChance = clamp(0.28 + (sideStrength - 0.5) * 0.22, 0.18, 0.6);
  const turnoverChance = clamp(0.2 - (sideStrength - 0.5) * 0.16, 0.08, 0.32);

  current.momentum = clamp(
    current.momentum + (possession === 'TEAM_A' ? 0.03 : -0.03),
    -0.15,
    0.15
  );

  let state: MatchState = 'MIDFIELD';
  if (current.lastState === 'MIDFIELD') {
    state = Math.random() < attackProgressChance
      ? (possession === 'TEAM_A' ? 'ATTACK_A' : 'ATTACK_B')
      : 'MIDFIELD';
  } else if (current.lastState === 'ATTACK_A' || current.lastState === 'ATTACK_B') {
    if (Math.random() < dangerProgressChance) {
      state = possession === 'TEAM_A' ? 'DANGEROUS_ATTACK_A' : 'DANGEROUS_ATTACK_B';
    } else if (Math.random() < turnoverChance) {
      current.possession = possession === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
      state = 'MIDFIELD';
      await emitAndPersist(strapi, io, fixture, current, {
        state,
        possession: current.possession,
        text: composePlayText(fixture, possession, state, 'TURNOVER'),
      });
      current.lastState = state;
      runtimeByFixture.set(fixtureId, current);
      return;
    } else {
      state = possession === 'TEAM_A' ? 'ATTACK_A' : 'ATTACK_B';
    }
  } else if (current.lastState === 'DANGEROUS_ATTACK_A' || current.lastState === 'DANGEROUS_ATTACK_B') {
    const critical = applyCriticalEvent(fixture, current, possession, current.lastState);
    if (critical) {
      const criticalState = critical.state === 'SUSPENDED' ? 'SUSPENDED' : critical.state;
      await emitAndPersist(strapi, io, fixture, current, {
        state: criticalState,
        possession,
        text: critical.text,
      });
      current.possession = possession;
      current.lastState = criticalState;
      runtimeByFixture.set(fixtureId, current);
      return;
    }
    current.possession = possession === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
    state = 'MIDFIELD';
  } else {
    state = 'MIDFIELD';
  }

  if (state === 'DANGEROUS_ATTACK_A' || state === 'DANGEROUS_ATTACK_B') {
    const critical = applyCriticalEvent(fixture, current, possession, state);
    if (critical) {
      const criticalState = critical.state === 'SUSPENDED' ? 'SUSPENDED' : critical.state;
      await emitAndPersist(strapi, io, fixture, current, {
        state: criticalState,
        possession,
        text: critical.text,
      });
      current.possession = possession;
      current.lastState = criticalState;
      runtimeByFixture.set(fixtureId, current);
      return;
    }
  }

  await emitAndPersist(strapi, io, fixture, current, {
    state,
    possession: state === 'MIDFIELD' ? current.possession : possession,
    text: composePlayText(fixture, possession, state),
  });

  current.possession = state === 'MIDFIELD' ? current.possession : possession;
  current.lastState = state;
  runtimeByFixture.set(fixtureId, current);
};

const cleanupSuspensions = () => {
  const now = Date.now();
  for (const [fixtureId, until] of betSuspensionByFixture.entries()) {
    if (until <= now) betSuspensionByFixture.delete(fixtureId);
  }
};

const fetchLiveSoccerFixtures = async (strapi: Core.Strapi) => {
  const windowHours = Number(process.env.PUBLIC_LIVE_WINDOW_HOURS || 30);
  const fromIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const fixtures = await strapi.db.query('api::fixture.fixture').findMany({
    where: {
      sport_key: { $containsi: 'soccer' },
      commence_time: { $gte: fromIso, $lte: nowIso },
    },
    orderBy: { updatedAt: 'desc' },
    limit: Number(process.env.LIVE_SIM_LIMIT || 40),
  });

  const allowKickoffInference = String(process.env.LIVE_SIM_ALLOW_KICKOFF_INFERENCE || '').toLowerCase() === 'true';
  return fixtures.filter((fixture: any) => {
    if (isFinalStatus(fixture?.status) || fixture?.finished === true || fixture?.completed === true) return false;
    if (hasExplicitLiveSignal(fixture)) return true;
    return allowKickoffInference && inferLiveNow(fixture?.commence_time);
  });
};

export const isFixtureSuspended = (fixtureId: string) => {
  if (!fixtureId) return false;
  const until = betSuspensionByFixture.get(String(fixtureId)) || 0;
  return until > Date.now();
};

export const startLiveMatchSimulation = ({ strapi }: { strapi: Core.Strapi }) => {
  const existing = (globalThis as any).__rb88LiveSimStarted;
  if (existing) return;

  const httpServer = (strapi.server as any)?.httpServer;
  if (!httpServer) {
    strapi.log.warn('[live-sim] httpServer not found, simulation is disabled');
    return;
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const tickMs = Number(process.env.LIVE_SIM_TICK_MS || 2500);
  const timer = setInterval(async () => {
    cleanupSuspensions();
    try {
      const fixtures = await fetchLiveSoccerFixtures(strapi);
      for (const fixture of fixtures) {
        await tickFixture(strapi, io, fixture);
      }
    } catch (error: any) {
      strapi.log.error(`[live-sim] tick failed: ${error?.message || error}`);
    }
  }, tickMs);

  if (typeof (timer as any).unref === 'function') (timer as any).unref();
  (globalThis as any).__rb88LiveSimStarted = true;
  strapi.log.info(`[live-sim] started with tick ${tickMs}ms`);
};
