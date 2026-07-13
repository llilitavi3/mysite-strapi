/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import process from 'process';
import mysql from 'mysql2/promise';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const HEBREW_RE = /[\u0590-\u05ff]/;

const parseEnv = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
};

const env = { ...parseEnv(ENV_PATH), ...process.env };

const compact = (value) => String(value || '').trim();
const normalizeKey = (value) => compact(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[_/]+/g, ' ')
  .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const unique = (items) => Array.from(new Set(items.map(compact).filter(Boolean)));

const known = {
  afl: 'AFL',
  allsvenskan: 'אלסוונסקאן',
  american: 'אמריקאי',
  arsenal: 'ארסנל',
  athletics: 'אתלטיקס',
  australia: 'אוסטרליה',
  'alex de minaur': 'אלכס דה מינור',
  'alexander bublik': 'אלכסנדר בובליק',
  'alexander zverev': 'אלכסנדר זברב',
  'amanda anisimova': 'אמנדה אניסימובה',
  'atlanta braves': 'אטלנטה ברייבס',
  'aryna sabalenka': 'ארינה סבלנקה',
  'barbora krejcikova': 'ברבורה קרייצ׳יקובה',
  'belinda bencic': 'בלינדה בנצ׳יץ׳',
  'ben shelton': 'בן שלטון',
  austria: 'אוסטריה',
  baseball: 'בייסבול',
  basketball: 'כדורסל',
  belgium: 'בלגיה',
  bournemouth: 'בורנמות',
  boxing: 'אגרוף',
  brazil: 'ברזיל',
  'brazil serie b': 'ברזיל סרייה ב׳',
  'brazil série b': 'ברזיל סרייה ב׳',
  brentford: 'ברנטפורד',
  brighton: 'ברייטון',
  'brighton and hove albion': 'ברייטון אנד הוב אלביון',
  celtic: 'סלטיק',
  ceara: 'סיארה',
  ceará: 'סיארה',
  chelsea: 'צ׳לסי',
  championship: 'צ׳מפיונשיפ',
  china: 'סין',
  cricket: 'קריקט',
  croatia: 'קרואטיה',
  'crystal palace': 'קריסטל פאלאס',
  denmark: 'דנמרק',
  'coco gauff': 'קוקו גוף',
  'daniil medvedev': 'דניל מדבדב',
  'daria kasatkina': 'דריה קסטקינה',
  'elena rybakina': 'אלנה ריבאקינה',
  efl: 'EFL',
  elfsborg: 'אלפסבורג',
  england: 'אנגליה',
  'felix auger-aliassime': 'פליקס אוז׳ה-אליאסים',
  epl: 'פרמייר ליג',
  everton: 'אברטון',
  fifa: 'פיפ״א',
  'fifa world cup': 'מונדיאל',
  finland: 'פינלנד',
  'fc seoul': 'פ.צ. סיאול',
  football: 'פוטבול',
  soccer: 'כדורגל',
  france: 'צרפת',
  fulham: 'פולהאם',
  germany: 'גרמניה',
  goias: 'גויאס',
  goiás: 'גויאס',
  'gwangju fc': 'גוואנגג׳ו פ.צ.',
  golf: 'גולף',
  handball: 'כדוריד',
  hockey: 'הוקי',
  hammarby: 'המארבי',
  'hammarby if': 'המארבי IF',
  'if elfsborg': 'IF אלפסבורג',
  'incheon united': 'אינצ׳ון יונייטד',
  ice: 'קרח',
  'ice hockey': 'הוקי קרח',
  international: 'בינלאומי',
  ipswich: 'איפסוויץ׳',
  israel: 'ישראל',
  italy: 'איטליה',
  'iga swiatek': 'איגה שוויונטק',
  'jannik sinner': 'יאניק סינר',
  'jasmine paolini': 'יסמין פאוליני',
  'jessica pegula': 'ג׳סיקה פגולה',
  japan: 'יפן',
  korea: 'קוריאה',
  'k league 1': 'ליגה קוריאנית 1',
  league: 'ליגה',
  'league 1': 'ליגה 1',
  'league 2': 'ליגה 2',
  leeds: 'לידס',
  'leeds united': 'לידס יונייטד',
  liverpool: 'ליברפול',
  manchester: 'מנצ׳סטר',
  'manchester city': 'מנצ׳סטר סיטי',
  'manchester united': 'מנצ׳סטר יונייטד',
  mma: 'MMA',
  mlb: 'MLB',
  mls: 'MLS',
  morocco: 'מרוקו',
  netherlands: 'הולנד',
  'naomi osaka': 'נעמי אוסקה',
  'newcastle united': 'ניוקאסל יונייטד',
  nfl: 'NFL',
  npb: 'NPB',
  nrl: 'NRL',
  norway: 'נורבגיה',
  'novak djokovic': 'נובאק ג׳וקוביץ׳',
  'nottingham forest': 'נוטינגהאם פורסט',
  paraguay: 'פרגוואי',
  'rafael nadal': 'רפאל נדאל',
  portugal: 'פורטוגל',
  premiership: 'פרמיירשיפ',
  rugby: 'ראגבי',
  scotland: 'סקוטלנד',
  spain: 'ספרד',
  sunderland: 'סנדרלנד',
  superettan: 'סופראטן',
  sweden: 'שבדיה',
  switzerland: 'שווייץ',
  tennis: 'טניס',
  'taylor fritz': 'טיילור פריץ',
  'ulsan hyundai fc': 'אולסן יונדאי פ.צ.',
  'test matches': 'משחקי מבחן',
  tottenham: 'טוטנהאם',
  'tottenham hotspur': 'טוטנהאם הוטספר',
  volleyball: 'כדורעף',
  wimbledon: 'ווימבלדון',
  'world cup': 'מונדיאל',
  wta: 'WTA',
  atp: 'ATP',
};

const tokenKnown = {
  afc: 'AFC',
  athletic: 'אתלטיק',
  atletico: 'אתלטיקו',
  bc: 'ב.ק.',
  bears: 'ברס',
  blue: 'בלו',
  braves: 'ברייבס',
  broncos: 'ברונקוס',
  cardinals: 'קרדינלס',
  city: 'סיטי',
  club: 'קלאב',
  cubs: 'קאבס',
  dodgers: 'דודג׳רס',
  fc: 'פ.צ.',
  giants: 'ג׳איינטס',
  guardians: 'גארדיאנס',
  hotspur: 'הוטספר',
  if: 'IF',
  knights: 'נייטס',
  lions: 'ליונס',
  mets: 'מטס',
  national: 'נשיונל',
  nationals: 'נשיונלס',
  new: 'ניו',
  palace: 'פאלאס',
  pirates: 'פיירטס',
  rangers: 'ריינג׳רס',
  red: 'רד',
  reds: 'רדס',
  rovers: 'רוברס',
  royals: 'רויאלס',
  sc: 'ס.ק.',
  sk: 'ס.ק.',
  sox: 'סוקס',
  sport: 'ספורט',
  sporting: 'ספורטינג',
  super: 'סופר',
  tigers: 'טייגרס',
  town: 'טאון',
  united: 'יונייטד',
  white: 'ווייט',
  world: 'עולם',
  yankees: 'יאנקיז',
};

const transliterateToken = (token) => {
  const original = compact(token);
  const key = normalizeKey(original);
  if (!key) return '';
  if (known[key]) return known[key];
  if (tokenKnown[key]) return tokenKnown[key];
  if (/^[A-Z]{2,6}$/.test(original)) return original;
  if (/^\d+$/.test(original)) return original;

  let value = original
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const replacements = [
    [/sch/g, 'ש'],
    [/tch/g, 'צ׳'],
    [/ch/g, 'צ׳'],
    [/sh/g, 'ש'],
    [/th/g, 'ת'],
    [/ph/g, 'פ'],
    [/ck/g, 'ק'],
    [/qu/g, 'קו'],
    [/kh/g, 'ח'],
    [/zh/g, 'ז׳'],
    [/tion/g, 'שן'],
    [/cia/g, 'שיה'],
    [/ci/g, 'סי'],
    [/ce/g, 'סה'],
    [/cy/g, 'סי'],
    [/gi/g, 'ג׳י'],
    [/ge/g, 'ג׳ה'],
    [/gy/g, 'ג׳י'],
    [/oo/g, 'ו'],
    [/ee/g, 'י'],
  ];
  replacements.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });

  const chars = {
    a: 'א', b: 'ב', c: 'ק', d: 'ד', e: 'ה', f: 'פ', g: 'ג', h: 'ה',
    i: 'י', j: 'ג׳', k: 'ק', l: 'ל', m: 'מ', n: 'נ', o: 'ו', p: 'פ',
    q: 'ק', r: 'ר', s: 'ס', t: 'ט', u: 'ו', v: 'ו', w: 'וו', x: 'קס',
    y: 'י', z: 'ז',
  };

  return value
    .split('')
    .map((char) => chars[char] || char)
    .join('')
    .replace(/א+/g, 'א')
    .replace(/ה+/g, 'ה')
    .replace(/ווו+/g, 'וו')
    .trim() || original;
};

const labelFor = (value) => {
  const original = compact(value);
  const key = normalizeKey(original);
  if (!original || !key) return '';
  if (HEBREW_RE.test(original)) return original;
  if (known[key]) return known[key];

  return original
    .split(/(\s+|\/|\\|\||,|:|\(|\)|\[|\]|\{|\}|-|&|\.)/g)
    .map((part) => {
      if (!part) return '';
      if (/^\s+$/.test(part)) return ' ';
      if (part === '&') return ' ו';
      if (/^[\/\\|,:()[\]{}.-]$/.test(part)) return part === '-' ? ' - ' : part;
      return transliterateToken(part);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .trim();
};

const sportFamily = (fixture) => {
  const combined = normalizeKey(`${fixture.sport_key || ''} ${fixture.sport_title || ''}`);
  if (combined.includes('soccer')) return 'כדורגל';
  if (combined.includes('americanfootball')) return 'פוטבול';
  if (combined.includes('basketball')) return 'כדורסל';
  if (combined.includes('tennis')) return 'טניס';
  if (combined.includes('baseball')) return 'בייסבול';
  if (combined.includes('hockey')) return 'הוקי קרח';
  if (combined.includes('cricket')) return 'קריקט';
  if (combined.includes('rugby')) return 'ראגבי';
  if (combined.includes('boxing')) return 'אגרוף';
  if (combined.includes('mma')) return 'MMA';
  return labelFor(fixture.sport_title || fixture.sport_key);
};

const addTerm = (terms, raw, label = labelFor(raw)) => {
  const key = normalizeKey(raw);
  const value = compact(label);
  if (key && value) terms[key] = value;
};

const makeEntity = (type, name, fixture, aliases = []) => {
  const canonical = compact(name);
  const key = normalizeKey(canonical);
  if (!key) return null;
  const now = new Date().toISOString();
  return {
    key,
    type,
    sport: sportFamily(fixture),
    league: compact(fixture.league_name || fixture.sport_title),
    source: 'mysql-backfill',
    canonical,
    he: labelFor(canonical),
    aliases: unique([canonical, ...aliases]),
    sourceIds: fixture.fixture_id ? { odds: compact(fixture.fixture_id) } : undefined,
    seen: { count: 1, firstSeenAt: now, lastSeenAt: now },
  };
};

const mergeEntity = (map, incoming) => {
  if (!incoming) return;
  const id = `${incoming.type}:${incoming.key}`;
  const current = map.get(id);
  if (!current) {
    map.set(id, incoming);
    return;
  }
  current.aliases = unique([...(current.aliases || []), ...(incoming.aliases || [])]);
  current.seen.count += 1;
  current.seen.lastSeenAt = new Date().toISOString();
};

const defaultTerms = {
  football: 'כדורגל',
  soccer: 'כדורגל',
  basketball: 'כדורסל',
  tennis: 'טניס',
  volleyball: 'כדורעף',
  baseball: 'בייסבול',
  handball: 'כדוריד',
  'ice hockey': 'הוקי קרח',
  boxing: 'אגרוף',
  mma: 'MMA',
  cricket: 'קריקט',
  rugby: 'ראגבי',
  golf: 'גולף',
  darts: 'חיצים',
  winner: 'מנצח',
  draw: 'תיקו',
  home: 'בית',
  away: 'חוץ',
  over: 'מעל',
  under: 'מתחת',
  handicap: 'הנדיקאפ',
  live: 'חי',
  upcoming: 'בקרוב',
};

async function main() {
  const connection = await mysql.createConnection({
    host: env.DATABASE_HOST || '127.0.0.1',
    port: Number(env.DATABASE_PORT || 3306),
    user: env.DATABASE_USERNAME || 'strapi',
    password: env.DATABASE_PASSWORD || '',
    database: env.DATABASE_NAME || 'strapi',
    charset: 'utf8mb4',
  });

  const [fixtures] = await connection.execute(`
    SELECT id, fixture_id, home_team, away_team, sport_key, sport_title, league_name, updated_at
    FROM fixtures
    WHERE (home_team IS NOT NULL AND home_team <> '')
       OR (away_team IS NOT NULL AND away_team <> '')
    ORDER BY updated_at DESC
    LIMIT 10000
  `);

  const [globals] = await connection.execute(`
    SELECT id, locale, sport_glossary
    FROM globals
    WHERE locale IN ('he-IL', 'he')
    ORDER BY locale = 'he-IL' DESC, id ASC
    LIMIT 1
  `);

  if (!globals.length) throw new Error('No Hebrew global row found in globals table.');

  const terms = {};
  Object.entries(defaultTerms).forEach(([key, value]) => addTerm(terms, key, value));
  Object.entries(known).forEach(([key, value]) => addTerm(terms, key, value));

  const entityMap = new Map();
  fixtures.forEach((fixture) => {
    const sportTitle = compact(fixture.sport_title || fixture.sport_key);
    const league = compact(fixture.league_name || sportTitle);

    [
      makeEntity('sport', sportTitle, fixture, [fixture.sport_key, sportFamily(fixture)]),
      makeEntity('league', league, fixture, [fixture.sport_title]),
      makeEntity('team', fixture.home_team, fixture),
      makeEntity('team', fixture.away_team, fixture),
    ].forEach((entity) => mergeEntity(entityMap, entity));
  });

  const entities = Array.from(entityMap.values()).sort((a, b) => {
    const countDiff = (b.seen?.count || 0) - (a.seen?.count || 0);
    return countDiff || a.type.localeCompare(b.type) || a.canonical.localeCompare(b.canonical);
  });

  entities.forEach((entity) => {
    unique([entity.canonical, ...(entity.aliases || [])]).forEach((alias) => addTerm(terms, alias, entity.he));
  });

  const glossary = {
    version: 1,
    updatedAt: new Date().toISOString(),
    generatedBy: 'scripts/backfill-sports-glossary.mjs',
    terms,
    entities,
    pending: entities.filter((entity) => !HEBREW_RE.test(entity.he) && !/^[A-Z0-9 .'-]{2,8}$/.test(entity.he)),
  };

  await connection.execute(
    'UPDATE globals SET sport_glossary = ?, updated_at = NOW(6) WHERE id = ?',
    [JSON.stringify(glossary), globals[0].id],
  );

  await connection.end();

  console.log(JSON.stringify({
    ok: true,
    globalId: globals[0].id,
    locale: globals[0].locale,
    fixtures: fixtures.length,
    terms: Object.keys(terms).length,
    entities: entities.length,
    pending: glossary.pending.length,
    samples: Object.fromEntries(['manchester united', 'france', 'fifa world cup', 'novak djokovic', 'jannik sinner']
      .map((key) => [key, terms[normalizeKey(key)]])
      .filter(([, value]) => value)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
