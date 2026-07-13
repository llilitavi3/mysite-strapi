type SportsGlossaryEntityType = 'team' | 'league' | 'sport' | 'athlete';

type SportsGlossaryEntity = {
  key: string;
  type: SportsGlossaryEntityType;
  sport?: string;
  league?: string;
  source?: string;
  canonical: string;
  he?: string;
  aliases: string[];
  assets?: Record<string, string>;
  sourceIds?: Record<string, string>;
  seen?: {
    count: number;
    firstSeenAt: string;
    lastSeenAt: string;
  };
};

type SportsGlossaryStore = {
  version: number;
  updatedAt: string;
  terms: Record<string, string>;
  entities: SportsGlossaryEntity[];
  pending: SportsGlossaryEntity[];
};

const GLOSSARY_VERSION = 1;

const normalizeEntityKey = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[_/]+/g, ' ')
  .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactString = (value: unknown) => String(value || '').trim();

const uniqueStrings = (items: unknown[]) => Array.from(
  new Set(items.map(compactString).filter(Boolean)),
);

const hasHebrew = (value: unknown) => /[\u0590-\u05ff]/.test(String(value || ''));

const KNOWN_HEBREW_LABELS: Record<string, string> = {
  afl: 'AFL',
  allsvenskan: 'אלסוונסקאן',
  arsenal: 'ארסנל',
  athletics: 'אתלטיקס',
  australia: 'אוסטרליה',
  austria: 'אוסטריה',
  'alex de minaur': 'אלכס דה מינור',
  'alexander bublik': 'אלכסנדר בובליק',
  'alexander zverev': 'אלכסנדר זברב',
  'amanda anisimova': 'אמנדה אניסימובה',
  'atlanta braves': 'אטלנטה ברייבס',
  'aryna sabalenka': 'ארינה סבלנקה',
  'barbora krejcikova': 'ברבורה קרייצ׳יקובה',
  'belinda bencic': 'בלינדה בנצ׳יץ׳',
  'ben shelton': 'בן שלטון',
  baseball: 'בייסבול',
  basketball: 'כדורסל',
  belgium: 'בלגיה',
  bournemouth: 'בורנמות׳',
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
  crystal: 'קריסטל',
  'crystal palace': 'קריסטל פאלאס',
  denmark: 'דנמרק',
  'coco gauff': 'קוקו גוף',
  'daniil medvedev': 'דניל מדבדב',
  'daria kasatkina': 'דריה קסטקינה',
  'elena rybakina': 'אלנה ריבאקינה',
  draw: 'תיקו',
  england: 'אנגליה',
  elfsborg: 'אלפסבורג',
  'felix auger-aliassime': 'פליקס אוז׳ה-אליאסים',
  epl: 'פרמייר ליג',
  everton: 'אברטון',
  fifa: 'פיפ״א',
  'fifa world cup': 'מונדיאל',
  finland: 'פינלנד',
  'fc seoul': 'פ.צ. סיאול',
  football: 'כדורגל',
  france: 'צרפת',
  fulham: 'פולהאם',
  germany: 'גרמניה',
  goias: 'גויאס',
  goiás: 'גויאס',
  'gwangju fc': 'גוואנגג׳ו פ.צ.',
  golf: 'גולף',
  handball: 'כדוריד',
  hockey: 'הוקי',
  ice: 'קרח',
  'ice hockey': 'הוקי קרח',
  international: 'בינלאומי',
  hammarby: 'המארבי',
  'hammarby if': 'המארבי IF',
  'if elfsborg': 'IF אלפסבורג',
  'incheon united': 'אינצ׳ון יונייטד',
  ipswich: 'איפסוויץ׳',
  israel: 'ישראל',
  italy: 'איטליה',
  'iga swiatek': 'איגה שוויונטק',
  'jannik sinner': 'יאניק סינר',
  'jasmine paolini': 'יסמין פאוליני',
  'jessica pegula': 'ג׳סיקה פגולה',
  japan: 'יפן',
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
  nrl: 'NRL',
  norway: 'נורבגיה',
  'novak djokovic': 'נובאק ג׳וקוביץ׳',
  nottingham: 'נוטינגהאם',
  'nottingham forest': 'נוטינגהאם פורסט',
  paraguay: 'פרגוואי',
  portugal: 'פורטוגל',
  'rafael nadal': 'רפאל נדאל',
  premiership: 'פרמיירשיפ',
  rugby: 'ראגבי',
  scotland: 'סקוטלנד',
  soccer: 'כדורגל',
  spain: 'ספרד',
  sunderland: 'סנדרלנד',
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

const TOKEN_HEBREW_LABELS: Record<string, string> = {
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
  league: 'ליגה',
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
  socks: 'סוקס',
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

const transliterateToken = (token: string) => {
  const normalized = normalizeEntityKey(token);
  if (!normalized) return '';
  if (KNOWN_HEBREW_LABELS[normalized]) return KNOWN_HEBREW_LABELS[normalized];
  if (TOKEN_HEBREW_LABELS[normalized]) return TOKEN_HEBREW_LABELS[normalized];
  if (/^[A-Z]{2,5}$/.test(token)) return token;
  if (/^\d+$/.test(token)) return token;

  let value = String(token || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!value) return token;

  const replacements: Array<[RegExp, string]> = [
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
  ];

  replacements.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });

  const chars: Record<string, string> = {
    a: 'א',
    b: 'ב',
    c: 'ק',
    d: 'ד',
    e: 'ה',
    f: 'פ',
    g: 'ג',
    h: 'ה',
    i: 'י',
    j: 'ג׳',
    k: 'ק',
    l: 'ל',
    m: 'מ',
    n: 'נ',
    o: 'ו',
    p: 'פ',
    q: 'ק',
    r: 'ר',
    s: 'ס',
    t: 'ט',
    u: 'ו',
    v: 'ו',
    w: 'וו',
    x: 'קס',
    y: 'י',
    z: 'ז',
  };

  return value
    .split('')
    .map((char) => chars[char] || char)
    .join('')
    .replace(/א+/g, 'א')
    .replace(/ה+/g, 'ה')
    .replace(/ווו+/g, 'וו')
    .trim() || token;
};

const hebrewLabelForEntity = (name: unknown, type?: SportsGlossaryEntityType) => {
  const canonical = compactString(name);
  const key = normalizeEntityKey(canonical);
  if (!canonical || !key) return '';
  if (hasHebrew(canonical)) return canonical;
  if (KNOWN_HEBREW_LABELS[key]) return KNOWN_HEBREW_LABELS[key];

  const separators = /(\s+|\/|\\|\||,|:|\(|\)|\[|\]|\{|\}|-|&|\.)/g;
  let hasUnknownToken = false;
  const label = canonical
    .split(separators)
    .map((part) => {
      if (!part) return '';
      if (/^\s+$/.test(part)) return ' ';
      if (part === '&') return ' ו';
      if (/^[\/\\|,:()[\]{}.-]$/.test(part)) return part === '-' ? ' - ' : part;
      const normalizedPart = normalizeEntityKey(part);
      if (!normalizedPart) return part;
      if (KNOWN_HEBREW_LABELS[normalizedPart]) return KNOWN_HEBREW_LABELS[normalizedPart];
      if (TOKEN_HEBREW_LABELS[normalizedPart]) return TOKEN_HEBREW_LABELS[normalizedPart];
      if (/^[A-Z0-9 .'-]{2,8}$/.test(part)) return part;
      hasUnknownToken = true;
      return part;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .trim();

  if (hasUnknownToken && !hasHebrew(label)) return '';

  if (type === 'league') {
    return label
      .replace(/\bATP\b/g, 'ATP')
      .replace(/\bWTA\b/g, 'WTA')
      .replace(/\bMLB\b/g, 'MLB')
      .replace(/\bNFL\b/g, 'NFL')
      .replace(/\bNBA\b/g, 'NBA');
  }
  return label || '';
};

const shouldReplaceHebrewLabel = (entity: SportsGlossaryEntity, label: unknown) => {
  const text = compactString(label);
  if (!text) return true;
  if (!hasHebrew(text) && !/^[A-Z0-9 .'-]{2,8}$/.test(text)) return true;
  return normalizeEntityKey(text) === entity.key;
};

const pickAsset = (fixture: any, keys: string[]) => {
  for (const key of keys) {
    const value = key.includes('.')
      ? key.split('.').reduce((acc, part) => acc?.[part], fixture)
      : fixture?.[key];
    const text = compactString(value);
    if (/^https?:\/\//i.test(text) || text.startsWith('/')) return text;
  }
  return '';
};

const sportFamilyFromKey = (sportKey: unknown, sportTitle: unknown) => {
  const key = normalizeEntityKey(sportKey);
  const title = normalizeEntityKey(sportTitle);
  const combined = `${key} ${title}`;
  if (combined.includes('soccer') || combined.includes('football')) return 'football';
  if (combined.includes('basketball')) return 'basketball';
  if (combined.includes('tennis')) return 'tennis';
  if (combined.includes('baseball')) return 'baseball';
  if (combined.includes('hockey')) return 'ice hockey';
  if (combined.includes('cricket')) return 'cricket';
  if (combined.includes('rugby')) return 'rugby';
  if (combined.includes('mma')) return 'mma';
  if (combined.includes('boxing')) return 'boxing';
  return compactString(sportTitle || sportKey);
};

const createEntity = (input: {
  type: SportsGlossaryEntityType;
  name: unknown;
  sport?: unknown;
  league?: unknown;
  aliases?: unknown[];
  assets?: Record<string, string>;
  sourceIds?: Record<string, string>;
  seenAt?: string;
}): SportsGlossaryEntity | null => {
  const canonical = compactString(input.name);
  const key = normalizeEntityKey(canonical);
  if (!canonical || !key) return null;
  const seenAt = input.seenAt || new Date().toISOString();
  const aliases = uniqueStrings([canonical, ...(input.aliases || [])]);
  const assets = Object.fromEntries(
    Object.entries(input.assets || {}).filter(([, value]) => compactString(value)),
  );
  const sourceIds = Object.fromEntries(
    Object.entries(input.sourceIds || {}).filter(([, value]) => compactString(value)),
  );
  return {
    key,
    type: input.type,
    sport: compactString(input.sport),
    league: compactString(input.league),
    source: 'odds-sync',
    canonical,
    he: hebrewLabelForEntity(canonical, input.type),
    aliases,
    assets: Object.keys(assets).length ? assets : undefined,
    sourceIds: Object.keys(sourceIds).length ? sourceIds : undefined,
    seen: {
      count: 1,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
    },
  };
};

const normalizeStore = (raw: unknown): SportsGlossaryStore => {
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as any : {};
  const termsSource = base.terms && typeof base.terms === 'object' && !Array.isArray(base.terms)
    ? base.terms
    : base;
  const terms = Object.fromEntries(
    Object.entries(termsSource || {})
      .filter(([key, value]) => typeof key === 'string' && typeof value === 'string' && key.trim() && String(value).trim())
      .map(([key, value]) => [normalizeEntityKey(key), String(value).trim()]),
  );
  const entities = Array.isArray(base.entities)
    ? base.entities
      .map((entity: any) => createEntity({
        type: entity?.type || 'team',
        name: entity?.canonical || entity?.name || entity?.source,
        sport: entity?.sport,
        league: entity?.league,
        aliases: entity?.aliases,
        assets: entity?.assets,
        sourceIds: entity?.sourceIds,
        seenAt: entity?.seen?.lastSeenAt,
      }))
      .filter(Boolean) as SportsGlossaryEntity[]
    : [];

  entities.forEach((entity: any, index) => {
    const original = Array.isArray((base as any).entities) ? (base as any).entities[index] : null;
    const existingLabel = compactString(original?.he || original?.labels?.he || entity.he || entity.canonical);
    entity.he = shouldReplaceHebrewLabel(entity, existingLabel)
      ? hebrewLabelForEntity(entity.canonical, entity.type)
      : existingLabel;
    entity.seen = {
      count: Number(original?.seen?.count || 1),
      firstSeenAt: compactString(original?.seen?.firstSeenAt || entity.seen?.firstSeenAt || entity.seen?.lastSeenAt),
      lastSeenAt: compactString(original?.seen?.lastSeenAt || entity.seen?.lastSeenAt || entity.seen?.firstSeenAt),
    };
  });

  return {
    version: Number(base.version || GLOSSARY_VERSION),
    updatedAt: compactString(base.updatedAt) || new Date().toISOString(),
    terms,
    entities,
    pending: Array.isArray(base.pending) ? base.pending : [],
  };
};

const mergeEntity = (store: SportsGlossaryStore, incoming: SportsGlossaryEntity) => {
  const index = store.entities.findIndex((entity) => entity.key === incoming.key && entity.type === incoming.type);
  if (index === -1) {
    store.entities.push(incoming);
    store.pending.push(incoming);
    return;
  }

  const current = store.entities[index];
  const lastSeenAt = incoming.seen?.lastSeenAt || new Date().toISOString();
  const currentHe = shouldReplaceHebrewLabel(current, current.he) ? '' : current.he;
  const incomingHe = shouldReplaceHebrewLabel(incoming, incoming.he) ? hebrewLabelForEntity(incoming.canonical, incoming.type) : incoming.he;
  store.entities[index] = {
    ...current,
    sport: current.sport || incoming.sport,
    league: current.league || incoming.league,
    canonical: current.canonical || incoming.canonical,
    he: currentHe || incomingHe || hebrewLabelForEntity(current.canonical || incoming.canonical, current.type),
    aliases: uniqueStrings([...(current.aliases || []), ...(incoming.aliases || [])]),
    assets: { ...(incoming.assets || {}), ...(current.assets || {}) },
    sourceIds: { ...(incoming.sourceIds || {}), ...(current.sourceIds || {}) },
    seen: {
      count: Number(current.seen?.count || 0) + 1,
      firstSeenAt: current.seen?.firstSeenAt || incoming.seen?.firstSeenAt || lastSeenAt,
      lastSeenAt,
    },
  };
};

export const sportsGlossaryTermsFromStore = (raw: unknown) => {
  const store = normalizeStore(raw);
  const terms: Record<string, string> = {};
  const protectedKeys = new Set([
    'football', 'soccer', 'basketball', 'tennis', 'volleyball', 'baseball', 'handball',
    'table tennis', 'ice hockey', 'boxing', 'mma', 'cricket', 'rugby', 'golf', 'darts',
    'motorsport', 'cycling', 'swimming', 'athletics', 'badminton', 'triathlon',
    'world cup', 'fifa world cup', 'premier', 'league', 'championship', 'live', 'upcoming',
    'winner', 'draw', 'home', 'away', 'handicap', 'over', 'under', 'points', 'goals', 'sets',
    'games', 'quarters', 'both teams to score', 'yes', 'no'
  ]);
  Object.entries(store.terms || {}).forEach(([rawKey, rawValue]) => {
    const key = normalizeEntityKey(rawKey);
    const value = compactString(rawValue);
    if (!key || !value || protectedKeys.has(key)) return;
    terms[key] = value;
  });
  store.entities.forEach((entity) => {
    const storedLabel = compactString(entity.he);
    const label = compactString(
      storedLabel
      || hebrewLabelForEntity(entity.canonical, entity.type)
      || (hasHebrew(entity.canonical) ? entity.canonical : ''),
    );
    if (!label) return;
    const hasLatin = /[A-Za-z]/.test(label);
    const validLabel = (!hasLatin && hasHebrew(label)) || /^[A-Z0-9 .'-]{2,8}$/.test(label);
    if (!validLabel) return;
    uniqueStrings([entity.canonical, ...(entity.aliases || [])]).forEach((alias) => {
      const key = normalizeEntityKey(alias);
      if (!key || protectedKeys.has(key)) return;
      terms[key] = label;
    });
  });
  return terms;
};

export const sportsGlossaryEntitiesFromFixtures = (fixtures: any[]) => {
  const seenAt = new Date().toISOString();
  const entities: SportsGlossaryEntity[] = [];

  fixtures.forEach((fixture) => {
    const sport = sportFamilyFromKey(fixture?.sport_key, fixture?.sport_title);
    const league = compactString(fixture?.league_name || fixture?.league || fixture?.sport_title);
    const fixtureId = compactString(fixture?.id || fixture?.fixture_id);
    const sportTitle = compactString(fixture?.sport_title || sport);

    [
      { type: 'sport' as const, name: sportTitle, aliases: [fixture?.sport_key, sport] },
      { type: 'league' as const, name: league, aliases: [fixture?.sport_title, fixture?.league] },
      {
        type: 'team' as const,
        name: fixture?.home_team,
        assets: {
          badge: pickAsset(fixture, ['home_team_logo', 'home_logo', 'home_badge', 'home_badge_url', 'teams.home.logo', 'participants.home.logo']),
          image: pickAsset(fixture, ['home_team_image', 'home_image', 'home_hero', 'teams.home.image', 'participants.home.image']),
        },
      },
      {
        type: 'team' as const,
        name: fixture?.away_team,
        assets: {
          badge: pickAsset(fixture, ['away_team_logo', 'away_logo', 'away_badge', 'away_badge_url', 'teams.away.logo', 'participants.away.logo']),
          image: pickAsset(fixture, ['away_team_image', 'away_image', 'away_hero', 'teams.away.image', 'participants.away.image']),
        },
      },
    ].forEach((item) => {
      const entity = createEntity({
        ...item,
        sport,
        league,
        sourceIds: fixtureId ? { odds: fixtureId } : {},
        seenAt,
      });
      if (entity) entities.push(entity);
    });
  });

  return entities;
};

export const mergeSportsGlossary = (raw: unknown, incomingEntities: SportsGlossaryEntity[]) => {
  const store = normalizeStore(raw);
  incomingEntities.forEach((entity) => mergeEntity(store, entity));
  store.updatedAt = new Date().toISOString();
  store.pending = store.entities.filter((entity) => {
    const label = compactString(entity.he);
    return !label || (!hasHebrew(label) && !/^[A-Z0-9 .'-]{2,8}$/.test(label));
  });
  store.terms = sportsGlossaryTermsFromStore(store);
  return store;
};

const glossaryLocaleCandidates = (locale: unknown) => {
  const requested = compactString(locale);
  const normalized = requested.toLowerCase();
  const aliases = [
    requested,
    normalized === 'he' ? 'he-IL' : '',
    normalized === 'he-il' ? 'he' : '',
    normalized === 'en' ? 'en-US' : '',
    normalized === 'en-us' ? 'en' : '',
    'he-IL',
    'he',
  ];
  return uniqueStrings(aliases);
};

const preferredGlossaryLocale = (locale: unknown) => {
  const requested = compactString(locale);
  const normalized = requested.toLowerCase();
  if (normalized === 'he-il') return 'he';
  if (normalized === 'en-us') return 'en';
  return requested || normalized || 'he';
};

export const findSportsGlossaryGlobalEntry = async (strapi: any, locale: unknown = 'he') => {
  for (const candidate of glossaryLocaleCandidates(locale)) {
    const entry = await strapi.db.query('api::global.global').findOne({
      where: { locale: candidate },
      select: ['id', 'sportGlossary', 'locale', 'siteName', 'siteDescription'],
    });
    if (entry?.id) return entry;
  }

  return strapi.db.query('api::global.global').findOne({
    select: ['id', 'sportGlossary', 'locale', 'siteName', 'siteDescription'],
  });
};

export const ensureSportsGlossaryGlobalEntry = async (strapi: any, locale: unknown = 'he') => {
  const existing = await findSportsGlossaryGlobalEntry(strapi, locale);
  if (existing?.id) return existing;

  const seed = await strapi.db.query('api::global.global').findOne({
    select: ['siteName', 'siteDescription'],
  });

  try {
    const created = await strapi.db.query('api::global.global').create({
      data: {
        locale: preferredGlossaryLocale(locale),
        siteName: compactString(seed?.siteName) || 'RoyalBet',
        siteDescription: compactString(seed?.siteDescription) || 'RoyalBet global settings',
        sportGlossary: mergeSportsGlossary({}, []),
      },
      select: ['id', 'sportGlossary', 'locale', 'siteName', 'siteDescription'],
    });
    return created;
  } catch (error: any) {
    strapi.log.warn(`[sports-glossary] Failed to create global entry: ${error?.message || error}`);
    return null;
  }
};

export const persistSportsGlossaryEntities = async (strapi: any, fixtures: any[], locale: unknown = 'he') => {
  const entities = sportsGlossaryEntitiesFromFixtures(fixtures);
  if (!entities.length) return { added: 0, total: 0, skipped: true };

  const globalEntry = await ensureSportsGlossaryGlobalEntry(strapi, locale);
  if (!globalEntry?.id) {
    strapi.log.warn('[sports-glossary] Global entry not found. Skipping glossary persistence.');
    return { added: entities.length, total: 0, skipped: true };
  }

  const previous = normalizeStore(globalEntry.sportGlossary);
  const merged = mergeSportsGlossary(globalEntry.sportGlossary, entities);
  await strapi.db.query('api::global.global').update({
    where: { id: globalEntry.id },
    data: { sportGlossary: merged },
  });

  return {
    added: Math.max(0, merged.entities.length - previous.entities.length),
    total: merged.entities.length,
    pending: merged.pending.length,
    skipped: false,
  };
};

export const persistSportsGlossaryFromExistingFixtures = async (strapi: any, options: { locale?: string; limit?: number } = {}) => {
  const limit = Math.max(1, Math.min(Number(options.limit || 5000), 10000));
  const fixtures = await strapi.db.query('api::fixture.fixture').findMany({
    select: [
      'id',
      'fixture_id',
      'home_team',
      'away_team',
      'sport_key',
      'sport_title',
      'league_name',
      'commence_time',
      'status',
    ],
    orderBy: { updatedAt: 'desc' },
    limit,
  });

  return persistSportsGlossaryEntities(strapi, fixtures || [], options.locale || 'he');
};
