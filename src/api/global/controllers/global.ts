/**
 *  global controller
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { factories } from '@strapi/strapi';
import {
  ensureSportsGlossaryGlobalEntry,
  findSportsGlossaryGlobalEntry,
  sportsGlossaryTermsFromStore,
} from '../../fixture/services/sports-glossary';

const DEFAULT_SPORT_GLOSSARY: Record<string, string> = {
  football: 'כדורגל',
  soccer: 'כדורגל',
  basketball: 'כדורסל',
  tennis: 'טניס',
  volleyball: 'כדורעף',
  baseball: 'בייסבול',
  handball: 'כדוריד',
  'table tennis': 'טניס שולחן',
  'ice hockey': 'הוקי קרח',
  boxing: 'אגרוף',
  mma: 'MMA',
  cricket: 'קריקט',
  rugby: 'ראגבי',
  golf: 'גולף',
  darts: 'חיצים',
  motorsport: 'מוטורספורט',
  cycling: 'אופניים',
  swimming: 'שחייה',
  athletics: 'אתלטיקה',
  badminton: 'בדמינטון',
  triathlon: 'טריאתלון',
  'world cup': 'מונדיאל',
  'fifa world cup': 'מונדיאל',
  premier: 'פרמייר',
  league: 'ליגה',
  championship: 'אליפות',
  live: 'חי',
  upcoming: 'בקרוב',
  winner: 'מנצח',
  draw: 'תיקו',
  home: 'בית',
  away: 'חוץ',
  handicap: 'הנדיקאפ',
  over: 'מעל',
  under: 'מתחת',
  points: 'נקודות',
  goals: 'שערים',
  sets: 'מערכות',
  games: 'משחקונים',
  quarters: 'רבעים',
  'both teams to score': 'שתי הקבוצות יבקיעו',
  yes: 'כן',
  no: 'לא',
};

const normalizeTerm = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/\s+/g, ' ');

const normalizeTermsMap = (input: unknown) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim())
    .map(([k, v]) => [normalizeTerm(k), String(v).trim()]);
  return Object.fromEntries(entries);
};

const resolveGlossaryFromGlobal = (globalEntry: any) => {
  const glossary = globalEntry?.sportGlossary;
  if (!glossary || typeof glossary !== 'object') return {};
  const derived = sportsGlossaryTermsFromStore(glossary);
  const explicit = normalizeTermsMap(glossary.terms && typeof glossary.terms === 'object' ? glossary.terms : glossary);
  return {
    ...derived,
    ...explicit,
  };
};
const reverseGlossaryCandidates = (globalEntry: any, label: string) => {
  const wanted = normalizeLookupKey(label);
  if (!wanted) return [];
  const terms = resolveGlossaryFromGlobal(globalEntry);
  const out = new Set<string>();
  Object.entries(terms || {}).forEach(([rawKey, rawValue]) => {
    const value = normalizeLookupKey(rawValue);
    if (!value || value !== wanted) return;
    const original = compact(rawKey);
    if (original) out.add(original);
  });
  return Array.from(out);
};

const resolveEntitiesFromGlobal = (globalEntry: any) => {
  const glossary = globalEntry?.sportGlossary;
  if (!glossary || typeof glossary !== 'object' || !Array.isArray(glossary.entities)) return [];
  return glossary.entities;
};

const sanitizeEntityLabelForPublic = (entity: any) => {
  const text = String(entity?.he || '').trim();
  if (!text) return '';
  const hasHebrew = /[\u0590-\u05ff]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasHebrew && hasLatin) return '';
  return text;
};

const sanitizeEntitiesForPublic = (entities: any[]) => {
  const source = Array.isArray(entities) ? entities : [];
  return source.map((entity: any) => ({
    ...entity,
    he: sanitizeEntityLabelForPublic(entity),
  }));
};

const SPORTS_DB_API_BASES = [
  'https://www.thesportsdb.com/api/v1/json/3',
  'https://www.thesportsdb.com/api/v1/json/123',
];

type TeamLogoIndexEntry = {
  teamKey: string;
  teamName: string;
  fileName?: string;
  country?: string;
  url?: string;
  updatedAt: string;
  nextRetryAt?: number;
  source?: string;
  sportsDbId?: string;
  aliases?: string[];
};

type TeamLogoIndexStore = {
  version: number;
  updatedAt: string;
  aliases: Record<string, string>;
  teams: Record<string, TeamLogoIndexEntry>;
};

const normalizeLookupKey = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[_/]+/g, ' ')
  .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const TEAM_SUFFIX_TOKENS = new Set([
  'fc', 'cf', 'sc', 'ac', 'afc', 'cfc', 'sfc', 'if', 'fk', 'sv', 'cd', 'rc', 'ud', 'de', 'club'
]);
const aliasVariants = (value: unknown) => {
  const base = normalizeLookupKey(value);
  if (!base) return [];
  const out = new Set<string>([base]);
  const noDots = base.replace(/[.']/g, ' ').replace(/\s+/g, ' ').trim();
  if (noDots) out.add(noDots);
  const andForm = noDots.replace(/\s*&\s*/g, ' and ').replace(/\s+/g, ' ').trim();
  if (andForm) out.add(andForm);
  const cleanTokens = andForm
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !TEAM_SUFFIX_TOKENS.has(token));
  if (cleanTokens.length) out.add(cleanTokens.join(' '));
  const saint = andForm.replace(/\bst\b/g, 'saint').replace(/\s+/g, ' ').trim();
  if (saint) out.add(saint);
  const noHyphen = andForm.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (noHyphen) out.add(noHyphen);
  const tokenForms = noHyphen.split(' ').filter(Boolean);
  if (tokenForms.length) {
    const last = tokenForms[tokenForms.length - 1];
    if (last.length > 3 && /s$/.test(last) && !/ss$/.test(last)) {
      const singular = [...tokenForms.slice(0, -1), last.replace(/s$/, '')].join(' ');
      if (singular) out.add(singular);
    } else if (last.length > 2 && !/s$/.test(last)) {
      const plural = [...tokenForms.slice(0, -1), `${last}s`].join(' ');
      if (plural) out.add(plural);
    }
    if (!TEAM_SUFFIX_TOKENS.has(last)) {
      out.add([...tokenForms, 'fc'].join(' '));
    }
  }
  return Array.from(out).filter(Boolean);
};

const compact = (value: unknown) => String(value || '').trim();

const logoDirPath = () => path.resolve(process.cwd(), '..', 'public', 'assets', 'images', 'sportteamlogos');
const logoIndexPath = () => path.resolve(logoDirPath(), 'index.json');
const encodePathSegment = (value: string) => encodeURIComponent(String(value || '').trim()).replace(/%2F/gi, '/');
const publicLogoUrl = (fileName: string) => {
  const normalized = String(fileName || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalized) return '';
  const encoded = normalized
    .split('/')
    .filter(Boolean)
    .map((part) => encodePathSegment(part))
    .join('/');
  return `/assets/images/sportteamlogos/${encoded}`;
};
const safeCountrySlug = (value: unknown) => {
  const key = normalizeLookupKey(value);
  if (!key) return 'global';
  return key
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    || 'global';
};

const safeFileSlug = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 80)
  .trim();
const alphaSuffix = (index: number) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let n = Math.max(0, Number(index || 0));
  let out = '';
  do {
    out = chars[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out || 'a';
};
const pickCleanFileName = async (
  store: TeamLogoIndexStore,
  country: string,
  teamKey: string,
  baseSlug: string,
  ext: string,
) => {
  const current = compact(store?.teams?.[teamKey]?.fileName).replace(/\\/g, '/');
  if (current && !/\d/.test(current)) {
    const currentAbs = path.resolve(logoDirPath(), current);
    if (await fileExists(currentAbs)) return current;
  }
  const usedByOther = new Set(
    Object.entries(store?.teams || {})
      .filter(([key]) => key !== teamKey)
      .map(([, value]) => compact((value as any)?.fileName).replace(/\\/g, '/'))
      .filter(Boolean),
  );
  const safeExt = compact(ext || 'png').replace(/^\./, '') || 'png';
  for (let i = 0; i < 200; i += 1) {
    const suffix = i === 0 ? '' : `-${alphaSuffix(i - 1)}`;
    const rel = `${country}/${baseSlug}${suffix}.${safeExt}`;
    if (usedByOther.has(rel)) continue;
    const abs = path.resolve(logoDirPath(), rel);
    if (await fileExists(abs)) continue;
    return rel;
  }
  return `${country}/${baseSlug}-alt.png`;
};

const ensureLogoStore = async () => {
  await fs.mkdir(logoDirPath(), { recursive: true });
};

const readLogoIndex = async (): Promise<TeamLogoIndexStore> => {
  try {
    const raw = await fs.readFile(logoIndexPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: Number(parsed?.version || 1),
      updatedAt: compact(parsed?.updatedAt) || new Date().toISOString(),
      aliases: parsed?.aliases && typeof parsed.aliases === 'object' ? parsed.aliases : {},
      teams: parsed?.teams && typeof parsed.teams === 'object' ? parsed.teams : {},
    };
  } catch (_) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      aliases: {},
      teams: {},
    };
  }
};

const writeLogoIndex = async (store: TeamLogoIndexStore) => {
  const next = {
    version: 1,
    updatedAt: new Date().toISOString(),
    aliases: store.aliases || {},
    teams: store.teams || {},
  };
  await fs.writeFile(logoIndexPath(), JSON.stringify(next, null, 2), 'utf8');
};

const fileExists = async (filePath: string) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch (_) {
    return false;
  }
};

const buildTeamLookupKeys = (entity: any) => {
  const keys = new Set<string>();
  [
    entity?.canonical,
    entity?.he,
    ...(Array.isArray(entity?.aliases) ? entity.aliases : []),
  ].forEach((value) => {
    aliasVariants(value).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
};

const findTeamEntityByDictionary = (entities: any[], teamName: string) => {
  const wantedVariants = aliasVariants(teamName);
  if (!wantedVariants.length) return null;
  const wantedSet = new Set(wantedVariants);
  const source = Array.isArray(entities) ? entities : [];
  for (const entity of source) {
    if (compact(entity?.type) !== 'team') continue;
    const keys = buildTeamLookupKeys(entity);
    if (keys.some((key) => wantedSet.has(key))) return entity;
  }
  return null;
};

const resetLogoStore = async () => {
  const dir = logoDirPath();
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  await ensureLogoStore();
  await writeLogoIndex({ version: 1, updatedAt: new Date().toISOString(), aliases: {}, teams: {} });
};

const resolveEntryFromIndex = async (store: TeamLogoIndexStore, lookupKeys: string[]) => {
  const candidates = new Set<string>();
  (Array.isArray(lookupKeys) ? lookupKeys : []).forEach((key) => {
    aliasVariants(key).forEach((variant) => candidates.add(variant));
  });
  for (const key of candidates) {
    const teamKey = compact(store.aliases?.[key]);
    if (!teamKey) continue;
    const entry = store.teams?.[teamKey];
    if (!entry) continue;
    const fileName = compact(entry.fileName);
    if (!fileName) continue;
    const absFile = path.resolve(logoDirPath(), fileName);
    if (!(await fileExists(absFile))) continue;
    return entry;
  }
  // Fuzzy fallback against existing index entries when alias is missing.
  const wanted = Array.from(candidates);
  if (!wanted.length) return null;
  let bestEntry: any = null;
  let bestScore = 0;
  for (const entry of Object.values(store.teams || {})) {
    const fileName = compact((entry as any)?.fileName);
    if (!fileName) continue;
    const absFile = path.resolve(logoDirPath(), fileName);
    if (!(await fileExists(absFile))) continue;
    const aliases = [
      compact((entry as any)?.teamName),
      ...((entry as any)?.aliases || []),
    ].map((v) => normalizeLookupKey(v)).filter(Boolean);
    if (!aliases.length) continue;
    let localBest = 0;
    for (const query of wanted) {
      for (const candidate of aliases) {
        const qTokens = new Set(query.split(' ').filter(Boolean));
        const cTokens = new Set(candidate.split(' ').filter(Boolean));
        const overlap = Array.from(qTokens).filter((token) => cTokens.has(token)).length;
        if (query === candidate) {
          localBest = Math.max(localBest, 300);
          continue;
        }
        if (overlap <= 0) continue;
        const ratioQ = overlap / Math.max(qTokens.size, 1);
        const ratioC = overlap / Math.max(cTokens.size, 1);
        const balanced = Math.min(ratioQ, ratioC);
        localBest = Math.max(localBest, Math.round(balanced * 220));
      }
    }
    if (localBest > bestScore) {
      bestScore = localBest;
      bestEntry = entry;
    }
  }
  if (bestEntry && bestScore >= 180) return bestEntry as any;
  return null;
};

const fetchWithTimeout = async (url: string, timeoutMs = 7000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const tokenSet = (value: string) => new Set(
  normalizeLookupKey(value).split(' ').map((token) => token.trim()).filter(Boolean),
);

const compareNameScore = (candidateName: string, queryName: string, lookupKeys: Set<string>) => {
  const cand = normalizeLookupKey(candidateName);
  const query = normalizeLookupKey(queryName);
  if (!cand || !query) return 0;
  if (cand === query) return 320;
  if (lookupKeys.has(cand)) return 280;
  const cNoFc = cand.replace(/\bfc\b/g, '').replace(/\s+/g, ' ').trim();
  const qNoFc = query.replace(/\bfc\b/g, '').replace(/\s+/g, ' ').trim();
  if (cNoFc && qNoFc && cNoFc === qNoFc) return 260;
  if (cand.startsWith(query) || query.startsWith(cand)) return 210;
  const cTokens = tokenSet(cand);
  const qTokens = tokenSet(query);
  const overlap = Array.from(cTokens).filter((token) => qTokens.has(token)).length;
  if (!overlap) return 0;
  const ratio = overlap / Math.max(qTokens.size, 1);
  return Math.round(60 + (ratio * 120));
};

const pickSportsDbTeam = (teams: any[], lookupKeys: Set<string>, teamName: string, entity: any) => {
  if (!Array.isArray(teams) || !teams.length) return null;
  const teamQueryRaw = compact(teamName);
  const leagueNeedle = normalizeLookupKey(entity?.league || '');
  const scored = teams
    .map((team) => {
      const names = [
        team?.strTeam,
        team?.strAlternate,
        team?.strTeamShort,
      ].map((value) => normalizeLookupKey(value)).filter(Boolean);
      const bestNameScore = Math.max(
        0,
        ...[
          compact(team?.strTeam || ''),
          compact(team?.strAlternate || ''),
          compact(team?.strTeamShort || ''),
        ].map((candidate) => compareNameScore(candidate, teamQueryRaw, lookupKeys)),
      );
      const hasBadge = Boolean(compact(team?.strBadge || team?.strTeamBadge || team?.strLogo));
      const leagueText = normalizeLookupKey(`${compact(team?.strLeague)} ${compact(team?.strLeague2)} ${compact(team?.strLeague3)}`);
      const reserveHint = normalizeLookupKey(`${compact(team?.strTeam)} ${compact(team?.strAlternate)}`);
      let score = 0;
      score += bestNameScore;
      if (hasBadge) score += 20;
      if (leagueNeedle && leagueText) {
        if (leagueNeedle.includes('mls') || leagueNeedle.includes('major league soccer')) {
          if (leagueText.includes('major league soccer') || leagueText.includes('mls')) score += 90;
          else score -= 35;
        }
        if (leagueNeedle && leagueText.includes(leagueNeedle)) score += 30;
      }
      if (!/\bii\b|\bb\b|reserve|u\d+|\b2\b/i.test(teamQueryRaw) && /\bii\b|\bb\b|reserve|u\d+|\b2\b/i.test(reserveHint)) score -= 60;
      return { team, score };
    })
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const best = scored[0];
  if (Number(best.score || 0) < 90) return null;
  const query = normalizeLookupKey(teamName);
  const qNoFc = query.replace(/\bfc\b/g, '').replace(/\s+/g, ' ').trim();
  const queryTokens = query.split(' ').filter(Boolean);
  const candidateNames = [
    compact(best.team?.strTeam || ''),
    compact(best.team?.strAlternate || ''),
    compact(best.team?.strTeamShort || ''),
  ].map((name) => normalizeLookupKey(name)).filter(Boolean);
  const exact = candidateNames.some((name) => name === query);
  const exactNoFc = candidateNames.some((name) => name.replace(/\bfc\b/g, '').replace(/\s+/g, ' ').trim() === qNoFc);
  if (!exact && !exactNoFc && queryTokens.length >= 2 && Number(best.score || 0) < 280) return null;
  return best.team || null;
};

const imageExtFromResponse = (url: string, contentType: string) => {
  const ctype = compact(contentType).toLowerCase();
  if (ctype.includes('image/png')) return 'png';
  if (ctype.includes('image/svg')) return 'svg';
  if (ctype.includes('image/webp')) return 'webp';
  if (ctype.includes('image/jpeg') || ctype.includes('image/jpg')) return 'jpg';
  const lowerUrl = compact(url).toLowerCase();
  if (lowerUrl.endsWith('.svg')) return 'svg';
  if (lowerUrl.endsWith('.webp')) return 'webp';
  if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) return 'jpg';
  return 'png';
};

const downloadTeamLogo = async (url: string) => {
  const response = await fetchWithTimeout(url, 10000);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) return null;
  const ext = imageExtFromResponse(url, response.headers.get('content-type') || '');
  return { buffer, ext };
};

const buildSportsDbQueries = (entity: any, teamName: string) => {
  const queries = new Set<string>();
  [teamName, entity?.canonical, ...(Array.isArray(entity?.aliases) ? entity.aliases : [])]
    .map((value) => compact(value))
    .filter(Boolean)
    .forEach((value) => queries.add(value));
  return Array.from(queries).slice(0, 5);
};
const isAthleteSportHint = (sportHint: unknown) => {
  const safe = normalizeLookupKey(sportHint);
  if (!safe) return false;
  return [
    'tennis', 'atp', 'wta', 'mma', 'boxing', 'golf', 'darts',
    'snooker', 'table tennis', 'badminton', 'cycling', 'swimming', 'athletics'
  ].some((token) => safe.includes(token));
};
const pickSportsDbPlayer = (players: any[], lookupKeys: Set<string>, playerName: string, sportHint: string) => {
  if (!Array.isArray(players) || !players.length) return null;
  const safeSport = normalizeLookupKey(sportHint);
  const scored = players
    .map((player) => {
      const names = [
        compact(player?.strPlayer),
        compact(player?.strPlayerAlternate),
      ];
      const bestNameScore = Math.max(
        0,
        ...names.map((name) => compareNameScore(name, playerName, lookupKeys)),
      );
      const hasImage = Boolean(compact(player?.strCutout || player?.strThumb || player?.strRender || player?.strFanart1));
      const playerSport = normalizeLookupKey(`${compact(player?.strSport)} ${compact(player?.strPosition)}`);
      let score = bestNameScore + (hasImage ? 20 : 0);
      if (safeSport && playerSport) {
        if (playerSport.includes(safeSport) || safeSport.includes(playerSport)) score += 35;
      }
      return { player, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || Number(best.score || 0) < 100) return null;
  return best.player;
};
const fetchSportsDbPlayerAndImage = async (
  entity: any,
  playerName: string,
  lookupKeys: Set<string>,
  sportHint: string,
  extraNames: string[] = [],
) => {
  const queries = Array.from(new Set([
    ...extraNames,
    ...buildSportsDbQueries(entity, playerName),
  ])).slice(0, 8);
  for (const query of queries) {
    for (const base of SPORTS_DB_API_BASES) {
      const endpoint = `${base}/searchplayers.php?p=${encodeURIComponent(query)}`;
      const response = await fetchWithTimeout(endpoint, 7000);
      if (response.status === 429) return { blocked: true, player: null, imageUrl: '' };
      if (!response.ok) continue;
      const payload: any = await response.json().catch(() => ({}));
      const picked = pickSportsDbPlayer(payload?.player || [], lookupKeys, playerName, sportHint);
      const imageUrl = compact(
        picked?.strCutout
        || picked?.strThumb
        || picked?.strRender
        || picked?.strFanart1
      );
      if (picked && imageUrl) return { blocked: false, player: picked, imageUrl };
    }
  }
  return { blocked: false, player: null, imageUrl: '' };
};

const fetchSportsDbTeamAndBadge = async (entity: any, teamName: string, lookupKeys: Set<string>) => {
  const queries = buildSportsDbQueries(entity, teamName);
  for (const query of queries) {
    for (const base of SPORTS_DB_API_BASES) {
      const endpoint = `${base}/searchteams.php?t=${encodeURIComponent(query)}`;
      const searchResponse = await fetchWithTimeout(endpoint, 7000);
      if (searchResponse.status === 429) return { blocked: true, team: null, badgeUrl: '' };
      if (!searchResponse.ok) continue;
      const payload: any = await searchResponse.json().catch(() => ({}));
      const picked = pickSportsDbTeam(payload?.teams || [], lookupKeys, teamName, entity);
      const badgeUrl = compact(picked?.strBadge || picked?.strTeamBadge || picked?.strLogo);
      if (picked && badgeUrl) return { blocked: false, team: picked, badgeUrl };
    }
  }
  return { blocked: false, team: null, badgeUrl: '' };
};

type ResolveTeamLogoResult = {
  ok: boolean;
  url: string;
  cached?: boolean;
  blocked?: boolean;
  retryAt?: number;
  reason?: string;
  teamKey?: string;
  teamName?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));

const parseTeamNamesList = (value: unknown) => String(value || '')
  .split(/[,\n\r;|]+/g)
  .map((item) => compact(item))
  .filter(Boolean);

const parseTeamNamesFromText = (value: unknown) => {
  const text = String(value || '');
  if (!text.trim()) return [];
  const out = new Set<string>();
  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  let match: RegExpExecArray | null = null;
  while ((match = markdownLinkPattern.exec(text)) !== null) {
    const label = compact(match[1]);
    if (label) out.add(label);
  }
  parseTeamNamesList(text).forEach((name) => {
    if (!/^https?:\/\//i.test(name) && !name.includes('tiny ') && !name.includes('badge icon')) out.add(name);
  });
  return Array.from(out);
};
const parseLeagueIdsFromText = (value: unknown) => {
  const text = String(value || '');
  if (!text.trim()) return [];
  const out = new Set<string>();
  const urlPattern = /https?:\/\/www\.thesportsdb\.com\/league\/(\d+)-[^\s)]+/gi;
  let match: RegExpExecArray | null = null;
  while ((match = urlPattern.exec(text)) !== null) {
    const id = compact(match[1]);
    if (/^\d{3,8}$/.test(id)) out.add(id);
  }
  return Array.from(out);
};
const parseLeagueHintsFromText = (value: unknown) => {
  const text = String(value || '');
  const lines = text.split(/\r?\n/).map((line) => compact(line));
  const out: Record<string, string> = {};
  let currentHint = '';
  lines.forEach((line) => {
    if (!line) return;
    if (!/^https?:\/\//i.test(line) && line.length <= 40 && !line.toLowerCase().startsWith('division') && !line.toLowerCase().startsWith('cup')) {
      currentHint = normalizeLookupKey(line);
      return;
    }
    const match = line.match(/https?:\/\/www\.thesportsdb\.com\/league\/(\d+)-/i);
    if (!match) return;
    const leagueId = compact(match[1]);
    if (!leagueId) return;
    if (currentHint) out[leagueId] = currentHint;
  });
  return out;
};

const fetchLeagueParticipants = async (leagueId: string, sportHint = '') => {
  const names = new Set<string>();
  const mergedSportHints = new Set<string>([normalizeLookupKey(sportHint)].filter(Boolean));
  const addName = (value: unknown) => {
    const safe = compact(value);
    if (!safe) return;
    names.add(safe);
  };
  const addSportHint = (value: unknown) => {
    const safe = normalizeLookupKey(value);
    if (!safe) return;
    mergedSportHints.add(safe);
  };

  for (const base of SPORTS_DB_API_BASES) {
    const leagueTeamsEndpoint = `${base}/lookup_all_teams.php?id=${encodeURIComponent(leagueId)}`;
    const teamsResponse = await fetchWithTimeout(leagueTeamsEndpoint, 9000).catch(() => null as any);
    if (teamsResponse?.status === 429) return { blocked: true, names: [], sportHint: sportHint || '' };
    if (teamsResponse?.ok) {
      const teamsPayload: any = await teamsResponse.json().catch(() => ({}));
      (teamsPayload?.teams || []).forEach((team: any) => {
        addName(team?.strTeam);
        addName(team?.strAlternate);
        addSportHint(team?.strSport);
        addSportHint(team?.strLeague);
      });
    }

    const eventEndpoints = [
      `${base}/eventsnextleague.php?id=${encodeURIComponent(leagueId)}`,
      `${base}/eventspastleague.php?id=${encodeURIComponent(leagueId)}`,
    ];
    for (const endpoint of eventEndpoints) {
      const response = await fetchWithTimeout(endpoint, 9000).catch(() => null as any);
      if (response?.status === 429) return { blocked: true, names: [], sportHint: sportHint || '' };
      if (!response?.ok) continue;
      const payload: any = await response.json().catch(() => ({}));
      (payload?.events || []).forEach((event: any) => {
        addName(event?.strHomeTeam);
        addName(event?.strAwayTeam);
        addName(event?.strPlayer);
        addName(event?.strPlayer2);
        addSportHint(event?.strSport);
        addSportHint(event?.strLeague);
      });
    }
  }

  if (!names.size) {
    const leaguePageUrl = `https://www.thesportsdb.com/league/${encodeURIComponent(leagueId)}`;
    const pageResponse = await fetchWithTimeout(leaguePageUrl, 10000).catch(() => null as any);
    if (pageResponse?.status === 429) return { blocked: true, names: [], sportHint: sportHint || '' };
    if (pageResponse?.ok) {
      const html = await pageResponse.text().catch(() => '');
      if (html) {
        const labelPattern = /\/event\/\d+-[^"]*"[^>]*>([^<]+)<\/a>/gimu;
        let match: RegExpExecArray | null = null;
        while ((match = labelPattern.exec(html)) !== null) {
          addName(match[1]);
        }
        const versusPattern = /([\p{L}\p{N} .'\-]{3,})\s+vs\s+([\p{L}\p{N} .'\-]{3,})/gimu;
        while ((match = versusPattern.exec(html)) !== null) {
          addName(match[1]);
          addName(match[2]);
        }
      }
    }
  }

  const safeSportHint = Array.from(mergedSportHints).find(Boolean) || normalizeLookupKey(sportHint) || '';
  return { blocked: false, names: Array.from(names), sportHint: safeSportHint };
};

const uniqueTeamNames = (names: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  (Array.isArray(names) ? names : []).forEach((name) => {
    const key = normalizeLookupKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(compact(name));
  });
  return out;
};

const resolveAndPersistTeamLogo = async (
  strapi: any,
  teamRaw: string,
  locale = 'he',
  options: { force?: boolean; country?: string; sport?: string } = {},
): Promise<ResolveTeamLogoResult> => {
  const safeTeam = compact(teamRaw);
  if (!safeTeam) return { ok: false, url: '', reason: 'missing-team' };
  const force = Boolean(options?.force);

  await ensureLogoStore();
  const index = await readLogoIndex();

  let single = await ensureSportsGlossaryGlobalEntry(strapi, locale);
  if (!single?.id) single = await findSportsGlossaryGlobalEntry(strapi, locale);
  const entities = sanitizeEntitiesForPublic(resolveEntitiesFromGlobal(single));
  const glossaryCandidates = reverseGlossaryCandidates(single, safeTeam);
  const candidateNames = Array.from(new Set([safeTeam, ...glossaryCandidates]));
  const teamEntity = candidateNames.map((name) => findTeamEntityByDictionary(entities, name)).find(Boolean) || null;
  const teamKey = normalizeLookupKey(teamEntity?.canonical || candidateNames[0] || safeTeam);
  const lookupKeys = Array.from(new Set([
    ...candidateNames.flatMap((name) => aliasVariants(name)),
    ...buildTeamLookupKeys(teamEntity),
  ].filter(Boolean)));
  const lookupKeySet = new Set(lookupKeys);

  const cached = force ? null : await resolveEntryFromIndex(index, lookupKeys);
  if (!force && cached?.url) {
    return { ok: true, url: cached.url, cached: true, teamKey, teamName: cached.teamName || safeTeam };
  }

  const existingForKey = index.teams?.[teamKey];
  const now = Date.now();
  if (!force && Number(existingForKey?.nextRetryAt || 0) > now) {
    return {
      ok: false,
      url: '',
      blocked: true,
      retryAt: Number(existingForKey?.nextRetryAt || 0),
      teamKey,
      teamName: existingForKey?.teamName || safeTeam,
    };
  }

  const sportHint = compact(options?.sport || teamEntity?.sport || '');
  const shouldPreferAthlete = isAthleteSportHint(sportHint);
  const teamLookup = shouldPreferAthlete
    ? { blocked: false, team: null, badgeUrl: '' }
    : await fetchSportsDbTeamAndBadge(teamEntity, safeTeam, lookupKeySet).catch(() => ({
      blocked: false,
      team: null,
      badgeUrl: '',
    }));
  const athleteLookup = teamLookup?.badgeUrl
    ? { blocked: false, player: null, imageUrl: '' }
    : await fetchSportsDbPlayerAndImage(teamEntity, safeTeam, lookupKeySet, sportHint, candidateNames).catch(() => ({
      blocked: false,
      player: null,
      imageUrl: '',
    }));
  const sportsDbResult = {
    blocked: Boolean(teamLookup?.blocked || athleteLookup?.blocked),
    team: teamLookup?.team || null,
    badgeUrl: compact(teamLookup?.badgeUrl || ''),
    player: athleteLookup?.player || null,
    imageUrl: compact(athleteLookup?.imageUrl || ''),
  };

  if (sportsDbResult.blocked) {
    index.teams[teamKey] = {
      ...(index.teams[teamKey] || { teamKey, teamName: teamEntity?.canonical || safeTeam }),
      teamKey,
      teamName: teamEntity?.canonical || safeTeam,
      updatedAt: new Date().toISOString(),
      nextRetryAt: Date.now() + (30 * 60 * 1000),
    };
    lookupKeys.forEach((key) => { index.aliases[key] = teamKey; });
    await writeLogoIndex(index);
    return { ok: false, url: '', blocked: true, teamKey, teamName: teamEntity?.canonical || safeTeam };
  }

  const badgeUrl = compact(sportsDbResult.badgeUrl || sportsDbResult.imageUrl);
  if (!badgeUrl) {
    index.teams[teamKey] = {
      ...(index.teams[teamKey] || { teamKey, teamName: teamEntity?.canonical || safeTeam }),
      teamKey,
      teamName: teamEntity?.canonical || safeTeam,
      updatedAt: new Date().toISOString(),
      nextRetryAt: Date.now() + (6 * 60 * 60 * 1000),
    };
    lookupKeys.forEach((key) => { index.aliases[key] = teamKey; });
    await writeLogoIndex(index);
    return { ok: false, url: '', teamKey, teamName: teamEntity?.canonical || safeTeam };
  }

  const filePayload = await downloadTeamLogo(badgeUrl).catch(() => null);
  if (!filePayload) {
    index.teams[teamKey] = {
      ...(index.teams[teamKey] || { teamKey, teamName: teamEntity?.canonical || safeTeam }),
      teamKey,
      teamName: teamEntity?.canonical || safeTeam,
      updatedAt: new Date().toISOString(),
      nextRetryAt: Date.now() + (60 * 60 * 1000),
    };
    lookupKeys.forEach((key) => { index.aliases[key] = teamKey; });
    await writeLogoIndex(index);
    return { ok: false, url: '', teamKey, teamName: teamEntity?.canonical || safeTeam };
  }

  const sourceName = compact(
    sportsDbResult.team?.strTeam
    || sportsDbResult.team?.strAlternate
    || sportsDbResult.player?.strPlayer
    || sportsDbResult.player?.strPlayerAlternate
    || teamEntity?.canonical
    || candidateNames[0]
    || safeTeam,
  );
  const countrySlug = safeCountrySlug(
    options.country
    || sportsDbResult.team?.strCountry
    || sportsDbResult.player?.strNationality
    || teamEntity?.country
    || '',
  );
  const slugBase = safeFileSlug(sourceName) || safeFileSlug(safeTeam) || 'team-logo';
  const fileName = await pickCleanFileName(index, countrySlug, teamKey, slugBase, filePayload.ext);
  const absFilePath = path.resolve(logoDirPath(), fileName);
  await fs.mkdir(path.dirname(absFilePath), { recursive: true });
  await fs.writeFile(absFilePath, filePayload.buffer);

  const url = publicLogoUrl(fileName);
  index.teams[teamKey] = {
    teamKey,
    teamName: sourceName,
    fileName,
    country: countrySlug,
    url,
    updatedAt: new Date().toISOString(),
    nextRetryAt: 0,
    source: 'thesportsdb',
    sportsDbId: compact(sportsDbResult.team?.idTeam || sportsDbResult.player?.idPlayer),
    aliases: lookupKeys,
  };
  lookupKeys.forEach((key) => { index.aliases[key] = teamKey; });
  await writeLogoIndex(index);
  return { ok: true, url, cached: false, teamKey, teamName: sourceName };
};

export default factories.createCoreController('api::global.global', ({ strapi }) => ({
  async publicGlossary(ctx) {
    const locale = String(ctx.query?.locale || 'he').trim() || 'he';
    try {
      let single = await ensureSportsGlossaryGlobalEntry(strapi, locale);
      if (!single?.id) {
        single = await findSportsGlossaryGlobalEntry(strapi, locale);
      }
      const customTerms = resolveGlossaryFromGlobal(single);
      const entities = sanitizeEntitiesForPublic(resolveEntitiesFromGlobal(single));
      const pending = Array.isArray(single?.sportGlossary?.pending) ? single.sportGlossary.pending : [];
      const terms = {
        ...Object.fromEntries(Object.entries(DEFAULT_SPORT_GLOSSARY).map(([k, v]) => [normalizeTerm(k), v])),
        ...customTerms,
      };

      ctx.body = {
        data: {
          locale,
          terms,
          entities,
          count: Object.keys(terms).length,
          entityCount: entities.length,
          pendingCount: pending.length,
        },
      };
    } catch (error: any) {
      ctx.status = 200;
      ctx.body = {
        data: {
          locale,
          terms: Object.fromEntries(Object.entries(DEFAULT_SPORT_GLOSSARY).map(([k, v]) => [normalizeTerm(k), v])),
          count: Object.keys(DEFAULT_SPORT_GLOSSARY).length,
        },
        meta: {
          fallback: true,
          error: error?.message || 'glossary-unavailable',
        },
      };
    }
  },
  async publicTeamLogo(ctx) {
    const teamRaw = compact(ctx.query?.team || ctx.request?.body?.team);
    const locale = compact(ctx.query?.locale || ctx.request?.body?.locale) || 'he';
    const country = compact(ctx.query?.country || ctx.request?.body?.country);
    const sport = compact(ctx.query?.sport || ctx.request?.body?.sport);
    const force = ['1', 'true', 'yes', 'on'].includes(String(ctx.query?.force || ctx.request?.body?.force || '').toLowerCase());
    const result = await resolveAndPersistTeamLogo(strapi, teamRaw, locale, { force, country, sport });
    ctx.status = 200;
    ctx.body = { data: result };
  },
  async publicTeamLogosSync(ctx) {
    const locale = compact(ctx.query?.locale || ctx.request?.body?.locale) || 'he';
    const leagueFilter = normalizeLookupKey(ctx.query?.league || ctx.request?.body?.league || '');
    const limitRaw = Number(ctx.query?.limit || ctx.request?.body?.limit || 180);
    const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 180, 600));
    const sleepMsRaw = Number(ctx.query?.sleepMs || ctx.request?.body?.sleepMs || 220);
    const sleepMs = Math.max(0, Math.min(Number.isFinite(sleepMsRaw) ? sleepMsRaw : 220, 1500));
    const country = compact(ctx.query?.country || ctx.request?.body?.country);
    const sport = compact(ctx.query?.sport || ctx.request?.body?.sport);
    const force = ['1', 'true', 'yes', 'on'].includes(String(ctx.query?.force || ctx.request?.body?.force || '').toLowerCase());
    const reset = String(ctx.query?.reset || ctx.request?.body?.reset || '').toLowerCase();
    try {
      if (['1', 'true', 'yes', 'on'].includes(reset)) {
        await resetLogoStore();
      }

      let single = await ensureSportsGlossaryGlobalEntry(strapi, locale);
      if (!single?.id) single = await findSportsGlossaryGlobalEntry(strapi, locale);
      const entities = sanitizeEntitiesForPublic(resolveEntitiesFromGlobal(single));

    const explicit = uniqueTeamNames([
      ...parseTeamNamesList(ctx.query?.teams),
      ...parseTeamNamesList(ctx.request?.body?.teams),
      ...parseTeamNamesFromText(ctx.query?.text),
      ...parseTeamNamesFromText(ctx.request?.body?.text),
    ]);
    const explicitLeagueIds = Array.from(new Set([
      ...parseTeamNamesList(ctx.query?.leagues),
      ...parseTeamNamesList(ctx.request?.body?.leagues),
      ...parseLeagueIdsFromText(ctx.query?.text),
      ...parseLeagueIdsFromText(ctx.request?.body?.text),
    ].map((id) => compact(id)).filter((id) => /^\d{3,8}$/.test(id))));
    const leagueHintMap = {
      ...parseLeagueHintsFromText(ctx.query?.text),
      ...parseLeagueHintsFromText(ctx.request?.body?.text),
    } as Record<string, string>;

    const glossaryTeams = uniqueTeamNames(
      entities
        .filter((entity: any) => compact(entity?.type) === 'team')
        .filter((entity: any) => {
          if (!leagueFilter) return true;
          const hay = normalizeLookupKey(`${compact(entity?.league)} ${compact(entity?.sport)} ${compact(entity?.canonical)}`);
          return hay.includes(leagueFilter);
        })
        .map((entity: any) => compact(entity?.canonical))
        .filter(Boolean),
    );

    let blocked = false;
    const targetRows: Array<{ team: string; sport: string }> = [];
    if (explicitLeagueIds.length) {
      for (const leagueId of explicitLeagueIds) {
        const sportHintForLeague = normalizeLookupKey(leagueHintMap?.[leagueId] || sport || '');
        const leagueResult = await fetchLeagueParticipants(leagueId, sportHintForLeague);
        if (leagueResult.blocked) {
          blocked = true;
          break;
        }
        uniqueTeamNames(leagueResult.names).forEach((teamName) => {
          targetRows.push({
            team: teamName,
            sport: normalizeLookupKey(leagueResult.sportHint || sportHintForLeague || sport || ''),
          });
        });
        if (sleepMs > 0) await sleep(sleepMs);
        if (targetRows.length >= limit) break;
      }
    }
    if (!targetRows.length && !explicitLeagueIds.length) {
      uniqueTeamNames(explicit.length ? explicit : glossaryTeams).forEach((team) => {
        targetRows.push({ team, sport: normalizeLookupKey(sport || '') });
      });
    }
    const dedupeRows = new Set<string>();
    const scopedTargets = targetRows
      .map((row) => ({ team: compact(row.team), sport: normalizeLookupKey(row.sport || sport || '') }))
      .filter((row) => row.team)
      .filter((row) => {
        const key = `${normalizeLookupKey(row.team)}|||${row.sport}`;
        if (!key || dedupeRows.has(key)) return false;
        dedupeRows.add(key);
        return true;
      })
      .slice(0, limit);

    const failures: Array<{ team: string; reason: string }> = [];
    const successes: Array<{ team: string; url: string; cached: boolean }> = [];
    let processed = 0;

    for (const row of scopedTargets) {
      const result = await resolveAndPersistTeamLogo(strapi, row.team, locale, { force, country, sport: row.sport || sport });
      processed += 1;
      if (result.ok && result.url) {
        successes.push({ team: row.team, url: result.url, cached: Boolean(result.cached) });
      } else {
        failures.push({ team: row.team, reason: result.reason || (result.blocked ? 'rate-limited' : 'not-found') });
      }
      if (result.blocked) {
        blocked = true;
        break;
      }
      if (sleepMs > 0) await sleep(sleepMs);
    }

      ctx.status = 200;
      ctx.body = {
        data: {
          ok: true,
          locale,
          leagueFilter: leagueFilter || '',
          source: explicitLeagueIds.length ? 'leagues' : (explicit.length ? 'explicit' : 'glossary'),
          requested: scopedTargets.length,
          processed,
          imported: successes.filter((row) => !row.cached).length,
          cached: successes.filter((row) => row.cached).length,
          failed: failures.length,
          blocked,
          successes: successes.slice(0, 40),
          failures: failures.slice(0, 40),
        },
      };
    } catch (error: any) {
      ctx.status = 200;
      ctx.body = {
        data: {
          ok: false,
          locale,
          error: compact(error?.message || 'sync-failed') || 'sync-failed',
        },
      };
    }
  },
}));
