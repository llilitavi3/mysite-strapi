(function () {
  'use strict';
  const blockExternalTranslationRequests = () => {
    if (window.__rbTranslationHostsBlocked === '1') return;
    window.__rbTranslationHostsBlocked = '1';
    const isBlockedUrl = (value) => {
      try {
        const url = new URL(String(value || ''), window.location.origin);
        const path = String(url.pathname || '').toLowerCase();
        return path.includes('/translate_a/single');
      } catch (_) {
        return false;
      }
    };
    const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    if (nativeFetch) {
      window.fetch = (input, init) => {
        const candidate = typeof input === 'string' ? input : input?.url;
        if (isBlockedUrl(candidate)) return Promise.reject(new Error('Blocked external translation host'));
        return nativeFetch(input, init);
      };
    }
    const xhrOpen = window.XMLHttpRequest && window.XMLHttpRequest.prototype
      ? window.XMLHttpRequest.prototype.open
      : null;
    if (xhrOpen) {
      window.XMLHttpRequest.prototype.open = function openPatched(method, url, ...rest) {
        if (isBlockedUrl(url)) throw new Error('Blocked external translation host');
        return xhrOpen.call(this, method, url, ...rest);
      };
    }
  };
  blockExternalTranslationRequests();

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const normalizedPath = String(path || '').toLowerCase();
  const isLiveLineRoute =
    normalizedPath === '/sport/live-line'
    || normalizedPath === '/live-line'
    || normalizedPath.startsWith('/sport/live-line/')
    || normalizedPath.endsWith('/sport/live-line/index.html')
    || normalizedPath.endsWith('/live-line/index.html');
  if (!isLiveLineRoute) return;
  document.documentElement.classList.add('rb-route-live-line');

  const LIVE_LINE_TAB_BG = '#56090989';
  const LIVE_LINE_MAX_VISIBLE_GAMES = 1000;
  const PLAYER_BETS_KEY = 'royalbet_player_bets';
  const LIVE_LINE_SYNC_KEY = 'royalbet_live_line_sync_state';
  const PLAYER_DASHBOARD_URL = '/player-dashboard.html';
  const LANGUAGE_KEY = 'royalbet_site_language';
  const TRANSLATION_BASE_PATH = '/assets/i18n/site';
  const TRANSLATION_VERSION = '20260704a';
  const PLACEHOLDER_BADGE = '/assets/images/fifa-world-cup-2026/team-badges/placeholder-team.svg';
  const LOCAL_TEAM_LOGO_INDEX_URL = '/assets/images/sportteamlogos/index.json?v=20260708a';
  const SPORTS_DB_CACHE_KEY = 'royalbet_sportsdb_team_badges_v2';
  const SPORTS_DB_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
  const SPORTS_DB_API_BASES = [
    'https://www.thesportsdb.com/api/v1/json/3',
    'https://www.thesportsdb.com/api/v1/json/123'
  ];
  const SPORTS_DB_CLIENT_FETCH_ENABLED = String(window.ROYALBET_ENABLE_SPORTSDB_CLIENT || '').trim().toLowerCase() === 'true';
  const LOCAL_TEAM_BADGE_SLUGS = new Set([
    'algeria', 'argentina', 'australia', 'austria', 'belgium', 'bosnia-herzegovina', 'brazil',
    'canada', 'cape-verde', 'colombia', 'croatia', 'dr-congo', 'ecuador', 'egypt', 'england',
    'france', 'germany', 'ghana', 'ivory-coast', 'japan', 'jordan', 'mexico', 'morocco',
    'netherlands', 'norway', 'paraguay', 'portugal', 'senegal', 'south-africa', 'spain',
    'sweden', 'switzerland', 'usa', 'uzbekistan'
  ]);
  const LIVE_LINE_LANGS = new Set(['he', 'en', 'es', 'fr', 'ar']);
  const LIVE_LINE_CORE_SPORT_LABELS_HE = {
    'sport.football': 'כדורגל',
    'sport.basketball': 'כדורסל',
    'sport.tennis': 'טניס',
    'sport.baseball': 'בייסבול',
    'sport.handball': 'כדוריד',
    'sport.table-tennis': 'טניס שולחן',
    'sport.rugby': 'ראגבי',
    'sport.american-football': 'פוטבול',
    'sport.basketball3x3': 'כדורסל 3x3',
    'sport.beach-volleyball': 'כדורעף חופים',
    'sport.water-polo': 'כדורמים'
  };
  const liveLineTranslations = new Map();
  const liveLineTranslationPending = new Map();

  const getSiteLanguage = () => {
    const saved = String(localStorage.getItem(LANGUAGE_KEY) || '').trim();
    return LIVE_LINE_LANGS.has(saved) ? saved : 'he';
  };

  const ensureLiveLineTranslations = async (lang = getSiteLanguage()) => {
    const safeLang = LIVE_LINE_LANGS.has(lang) ? lang : 'he';
    if (liveLineTranslations.has(safeLang)) return liveLineTranslations.get(safeLang);
    if (liveLineTranslationPending.has(safeLang)) return liveLineTranslationPending.get(safeLang);
    const source = `${TRANSLATION_BASE_PATH}/${safeLang}.json?v=${TRANSLATION_VERSION}`;
    const pending = fetch(source, { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : {}))
      .then((payload) => {
        const parsed = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
        if (safeLang === 'he') {
          Object.entries(LIVE_LINE_CORE_SPORT_LABELS_HE).forEach(([key, value]) => {
            parsed[key] = value;
          });
        }
        liveLineTranslations.set(safeLang, parsed);
        return parsed;
      })
      .catch(() => {
        liveLineTranslations.set(safeLang, {});
        return {};
      })
      .finally(() => {
        liveLineTranslationPending.delete(safeLang);
      });
    liveLineTranslationPending.set(safeLang, pending);
    return pending;
  };

  const t = (key, fallback = '') => {
    const lang = getSiteLanguage();
    const bag = liveLineTranslations.get(lang) || liveLineTranslations.get('he') || {};
    const value = bag?.[key];
    return (value == null || value === '') ? fallback : String(value);
  };

  const PRIMARY_SPORT_TABS = [
    { key: 'ball-games', label: '\u05de\u05e9\u05d7\u05e7\u05d9 \u05db\u05d3\u05d5\u05e8', labelKey: 'menuGroupBall', image: '/assets/images/footer-menu/footbal.jpeg' },
    { key: 'water-sport', label: '\u05e1\u05e4\u05d5\u05e8\u05d8 \u05d9\u05de\u05d9', labelKey: 'menuGroupWater', image: '/assets/images/footer-menu/water-pold.jpeg' },
    { key: 'motorsport', label: '\u05de\u05d9\u05e8\u05d5\u05e6\u05d9\u05dd', labelKey: 'menuGroupMotor', image: '/assets/images/footer-menu/motorsport.jpeg' },
    { key: 'martial-arts', label: '\u05d0-\u05dc\u05d7\u05d9\u05de\u05d4', labelKey: 'menuGroupCombat', image: '/assets/images/footer-menu/boxing.jpeg' },
    { key: 'darts-leisure', label: '\u05d3\u05d9\u05d5\u05e7 \u05d5\u05e4\u05e0\u05d0\u05d9', labelKey: 'menuGroupPrecision', image: '/assets/images/footer-menu/darts.jpeg' }
  ];

  const SECONDARY_SPORT_TABS = [
    { key: 'football', label: '\u05db\u05d3\u05d5\u05e8\u05d2\u05dc', labelKey: 'sport.football', image: '/assets/images/footer-menu/footbal.jpeg' },
    { key: 'basketball', label: '\u05db\u05d3\u05d5\u05e8\u05e1\u05dc', labelKey: 'sport.basketball', image: '/assets/images/footer-menu/basketball.jpeg' },
    { key: 'tennis', label: '\u05d8\u05e0\u05d9\u05e1', labelKey: 'sport.tennis', image: '/assets/images/footer-menu/tennis.jpeg' },
    { key: 'cricket', label: '\u05e7\u05e8\u05d9\u05e7\u05d8', labelKey: 'sport.cricket', image: '/assets/images/footer-menu/cricket.jpeg' },
    { key: 'baseball', label: '\u05d1\u05d9\u05d9\u05e1\u05d1\u05d5\u05dc', labelKey: 'sport.baseball', image: '/assets/images/footer-menu/baseball.jpeg' },
    { key: 'handball', label: '\u05db\u05d3\u05d5\u05e8\u05d9\u05d3', labelKey: 'sport.handball', image: '/assets/images/footer-menu/handball.jpeg' },
    { key: 'table-tennis', label: '\u05d8\u05e0\u05d9\u05e1 \u05e9\u05d5\u05dc\u05d7\u05df', labelKey: 'sport.table-tennis', image: '/assets/images/footer-menu/table-tennis.jpeg' },
    { key: 'rugby', label: '\u05e8\u05d0\u05d2\u05d1\u05d9', labelKey: 'sport.rugby', image: '/assets/images/footer-menu/rugby.jpeg' },
    { key: 'american-football', label: '\u05e4\u05d5\u05d8\u05d1\u05d5\u05dc', labelKey: 'sport.american-football', image: '/assets/images/footer-menu/am-football.jpeg' },
    { key: 'basketball3x3', label: '\u05db\u05d3\u05d5\u05e8\u05e1\u05dc 3x3', labelKey: 'sport.basketball3x3', image: '/assets/images/footer-menu/basketball3x3.jpeg' },
    { key: 'beach-volleyball', label: '\u05db\u05d3\u05d5\u05e8\u05e2\u05e3 \u05d7\u05d5\u05e4\u05d9\u05dd', labelKey: 'sport.beach-volleyball', image: '/assets/images/footer-menu/beach%20voleyball.jpeg' },
    { key: 'water-polo', label: '\u05db\u05d3\u05d5\u05e8\u05de\u05d9\u05dd', labelKey: 'sport.water-polo', image: '/assets/images/footer-menu/water-pold.jpeg' }
  ];

  const SECONDARY_BY_PRIMARY = {
    'ball-games': SECONDARY_SPORT_TABS,
    'water-sport': [
      { key: 'water-polo', label: '\u05db\u05d3\u05d5\u05e8\u05de\u05d9\u05dd', labelKey: 'sport.water-polo', image: '/assets/images/footer-menu/water-pold.jpeg' },
      { key: 'beach-volleyball', label: '\u05db\u05d3\u05d5\u05e8\u05e2\u05e3 \u05d7\u05d5\u05e4\u05d9\u05dd', labelKey: 'sport.beach-volleyball', image: '/assets/images/footer-menu/beach%20voleyball.jpeg' },
      { key: 'swimming', label: '\u05e9\u05d7\u05d9\u05d9\u05d4', labelKey: 'sport.swimming', image: '/assets/images/footer-menu/swimming.jpeg' },
      { key: 'surfing', label: '\u05d2\u05dc\u05d9\u05e9\u05d4', labelKey: 'sport.surfing', image: '/assets/images/footer-menu/surfing.jpeg' },
      { key: 'sailing', label: '\u05e9\u05d9\u05d9\u05d8', labelKey: 'sport.sailing', image: '/assets/images/footer-menu/saling.jpeg' }
    ],
    motorsport: [
      { key: 'motorsport', label: '\u05de\u05d9\u05e8\u05d5\u05e6\u05d9\u05dd', labelKey: 'sport.motorsport', image: '/assets/images/footer-menu/motorsport.jpeg' },
      { key: 'cycling', label: '\u05d0\u05d5\u05e4\u05e0\u05d9\u05d9\u05dd', labelKey: 'sport.cycling', image: '/assets/images/footer-menu/cycling.jpeg' }
    ],
    'martial-arts': [
      { key: 'boxing', label: '\u05d0-\u05dc\u05d7\u05d9\u05de\u05d4', labelKey: 'sport.boxing', image: '/assets/images/footer-menu/boxing.jpeg' },
      { key: 'mma', label: 'MMA', labelKey: 'sport.mma', image: '/assets/images/footer-menu/mma.jpeg' },
      { key: 'wrestling', label: '\u05d4\u05d9\u05d0\u05d1\u05e7\u05d5\u05ea', labelKey: 'sport.wrestling', image: '/assets/images/footer-menu/wresling.jpeg' },
      { key: 'judo', label: "\u05d2'\u05d5\u05d3\u05d5", labelKey: 'sport.judo', image: '/assets/images/footer-menu/judo.jpeg' }
    ],
    'darts-leisure': [
      { key: 'darts', label: '\u05d7\u05d9\u05e6\u05d9\u05dd', labelKey: 'sport.darts', image: '/assets/images/footer-menu/darts.jpeg' },
      { key: 'golf', label: '\u05d2\u05d5\u05dc\u05e3', labelKey: 'sport.golf', image: '/assets/images/footer-menu/golf.jpeg' },
      { key: 'snooker', label: '\u05e1\u05e0\u05d5\u05e7\u05e8', labelKey: 'liveLine.sport.snooker', image: '/assets/images/footer-menu/darts.jpeg' },
      { key: 'bowling', label: '\u05d1\u05d0\u05d5\u05dc\u05d9\u05e0\u05d2', labelKey: 'sport.bowling', image: '/assets/images/footer-menu/bowling.jpeg' }
    ]
  };

  const COUNTRY_TABS = [
    { key: 'global', label: '\u05e2\u05d5\u05dc\u05de\u05d9', labelKey: 'liveLine.country.global', emoji: '\ud83c\udf0d' },
    { key: 'il', label: '\u05d9\u05e9\u05e8\u05d0\u05dc', labelKey: 'liveLine.country.il', flagCode: 'il' },
    { key: 'cl', label: "\u05e6'\u05d9\u05dc\u05d4", labelKey: 'liveLine.country.cl', flagCode: 'cl' },
    { key: 'ec', label: '\u05d0\u05e7\u05d5\u05d5\u05d3\u05d5\u05e8', labelKey: 'liveLine.country.ec', flagCode: 'ec' },
    { key: 'br', label: '\u05d1\u05e8\u05d6\u05d9\u05dc', labelKey: 'liveLine.country.br', flagCode: 'br' },
    { key: 'us', label: '\u05d0\u05e8\u05e6\u05d5\u05ea \u05d4\u05d1\u05e8\u05d9\u05ea', labelKey: 'liveLine.country.us', flagCode: 'us' },
    { key: 'dm', label: '\u05d3\u05d5\u05de\u05d9\u05e0\u05d9\u05e7\u05d4', labelKey: 'liveLine.country.dm', flagCode: 'dm' },
    { key: 'ni', label: '\u05e0\u05d9\u05e7\u05e8\u05d2\u05d5\u05d5\u05d0\u05d4', labelKey: 'liveLine.country.ni', flagCode: 'ni' },
    { key: 'au', label: '\u05d0\u05d5\u05e1\u05d8\u05e8\u05dc\u05d9\u05d4', labelKey: 'liveLine.country.au', flagCode: 'au' },
    { key: 'jp', label: '\u05d9\u05e4\u05df', labelKey: 'liveLine.country.jp', flagCode: 'jp' },
    { key: 'indoor', label: '\u05d0\u05d9\u05e0\u05d3\u05d5\u05e8', labelKey: 'liveLine.country.indoor', emoji: '\ud83c\udf0d' }
  ];

  const COUNTRY_FILTER_TERMS = {
    global: [],
    il: ['israel', '\u05d9\u05e9\u05e8\u05d0\u05dc'],
    cl: ['chile', "\u05e6'\u05d9\u05dc\u05d4", '\u05e6\u05d9\u05dc\u05d4'],
    ec: ['ecuador', '\u05d0\u05e7\u05d5\u05d5\u05d3\u05d5\u05e8'],
    br: ['brazil', '\u05d1\u05e8\u05d6\u05d9\u05dc'],
    us: ['usa', 'u.s', 'united states', '\u05d0\u05e8\u05e6\u05d5\u05ea \u05d4\u05d1\u05e8\u05d9\u05ea', '\u05d0\u05de\u05e8\u05d9\u05e7\u05d4'],
    dm: ['dominica', '\u05d3\u05d5\u05de\u05d9\u05e0\u05d9\u05e7\u05d4'],
    ni: ['nicaragua', '\u05e0\u05d9\u05e7\u05e8\u05d2\u05d5\u05d5\u05d0\u05d4'],
    au: ['australia', '\u05d0\u05d5\u05e1\u05d8\u05e8\u05dc\u05d9\u05d4'],
    jp: ['japan', '\u05d9\u05e4\u05df'],
    indoor: ['indoor', '\u05d0\u05d9\u05e0\u05d3\u05d5\u05e8']
  };
  const LOCAL_FLAG_BY_COUNTRY_KEY = {
    global: '/assets/images/flags/small-flags/world.png',
    il: '/assets/images/flags/small-flags/israel.png',
    cl: '/assets/images/flags/small-flags/chile.png',
    ec: '/assets/images/flags/small-flags/ecuador.png',
    br: '/assets/images/flags/small-flags/Brazil.png',
    us: '/assets/images/flags/small-flags/United-States.png',
    au: '/assets/images/flags/small-flags/australia.png',
    jp: '/assets/images/flags/small-flags/japan.png',
    gb: '/assets/images/flags/small-flags/GB.png',
    uk: '/assets/images/flags/small-flags/United-Kingdom.png',
    england: '/assets/images/flags/small-flags/England.png',
    scotland: '/assets/images/flags/small-flags/scotland.png',
    de: '/assets/images/flags/small-flags/Germany.png',
    it: '/assets/images/flags/small-flags/Italy.png',
    es: '/assets/images/flags/small-flags/Spain.png',
    fr: '/assets/images/flags/small-flags/France.png',
    nl: '/assets/images/flags/small-flags/the-netherlands.png',
    no: '/assets/images/flags/small-flags/norway.png',
    se: '/assets/images/flags/small-flags/sweden.png',
    pl: '/assets/images/flags/small-flags/poland.png',
    pt: '/assets/images/flags/small-flags/portugal.png',
    cn: '/assets/images/flags/small-flags/china.png',
    ca: '/assets/images/flags/small-flags/Canada.png',
    nz: '/assets/images/flags/small-flags/new-zealand.png',
    kr: '/assets/images/flags/small-flags/south-korea.png',
    za: '/assets/images/flags/small-flags/south-africa.png',
    dk: '/assets/images/flags/small-flags/denmark.png'
  };
  const localFlagForCountryKey = (key) => LOCAL_FLAG_BY_COUNTRY_KEY[String(key || '').trim().toLowerCase()] || '';
  const WORLD_CUP_MENU_ITEMS = [
    { key: 'all', labelKey: 'liveLine.worldCup.all', fallback: '\u05d4\u05db\u05dc' },
    { key: 'worldcup', labelKey: 'liveLine.worldCup.main', fallback: '\u05de\u05d5\u05e0\u05d3\u05d9\u05d0\u05dc' },
    { key: 'qualifiers', labelKey: 'liveLine.worldCup.qualifiers', fallback: '\u05de\u05d5\u05e7\u05d3\u05de\u05d5\u05ea' },
    { key: 'groups', labelKey: 'liveLine.worldCup.groups', fallback: '\u05d1\u05ea\u05d9\u05dd' },
    { key: 'knockout', labelKey: 'liveLine.worldCup.knockout', fallback: '\u05e0\u05d5\u05e7\u05d0\u05d0\u05d5\u05d8' }
  ];
  const WORLD_CUP_TIME_ITEMS = [
    { key: 'all', labelKey: 'liveLine.worldCupTime.all', fallback: '\u05d4\u05db\u05dc' },
    { key: 'live_now', labelKey: 'liveLine.worldCupTime.liveNow', fallback: '\u05de\u05ea\u05e7\u05d9\u05d9\u05dd \u05e2\u05db\u05e9\u05d9\u05d5' },
    { key: 'today', labelKey: 'liveLine.worldCupTime.today', fallback: '\u05d4\u05d9\u05d5\u05dd' },
    { key: 'week', labelKey: 'liveLine.worldCupTime.week', fallback: '\u05e9\u05d1\u05d5\u05e2 \u05e7\u05e8\u05d5\u05d1' }
  ];

 const liveLineApiBase = () => {
  if (window.ROYALBET_API_BASE) return String(window.ROYALBET_API_BASE || '').replace(/\/+$/, '');
  const host = String(window.location.hostname || '').toLowerCase();
  
  // תיקון קריטי: אם אנחנו על המחשב המקומי (Localhost), תמיד לפנות ל-Strapi בפורט 1337 ולא ל-8080
  if (['localhost'].includes(host)) return 'http://localhost:1337';
  
  return `https://addapi.${host.replace(/^www\./, '')}`;
};

  const buildLiveLineApiEndpoints = (path) => {
    const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = ['localhost'].includes(host);
    const base = liveLineApiBase();
    const endpoints = [];

    if (isLocalHost) {
      endpoints.push(`http://localhost:1337${normalizedPath}`);
    } else {
      if (base) endpoints.push(`${base}${normalizedPath}`);
      endpoints.push(normalizedPath);
      endpoints.push(`${window.location.origin}${normalizedPath}`);
    }
    return endpoints;
  };
  const buildLiveLineGlossaryEndpoints = (locale = getSiteLanguage()) => {
    const safeLocale = LIVE_LINE_LANGS.has(locale) ? locale : 'he';
    return buildLiveLineApiEndpoints(`/api/public-glossary?locale=${encodeURIComponent(safeLocale)}`);
  };

  const buildLiveLineApiEndpointGroups = (path) => {
    const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = ['localhost'].includes(host);
    const configuredBase = String(window.ROYALBET_API_BASE || '').replace(/\/+$/, '');

    if (configuredBase) {
      return [
        [
          `${configuredBase}${normalizedPath}`
        ]
      ];
    }

    if (isLocalHost && !configuredBase) {
      return [
        [
          `http://localhost:1337${normalizedPath}`,
        ]
      ];
    }

    return [
      buildLiveLineApiEndpoints(normalizedPath)
    ];
  };

  const liveLineFixtureEndpoints = (locale = getSiteLanguage()) => {
    const safeLocale = LIVE_LINE_LANGS.has(locale) ? locale : 'he';
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = ['localhost'].includes(host);
    const configuredBase = String(window.ROYALBET_API_BASE || '').replace(/\/+$/, '');
    if (isLocalHost && !configuredBase) {
      return [
        `http://localhost:1337/api/public-fixtures?locale=${encodeURIComponent(safeLocale)}`,
        `http://localhost:1337/api/public-live-line?locale=${encodeURIComponent(safeLocale)}`
      ];
    }
    const paths = [
      `/api/public-fixtures?locale=${encodeURIComponent(safeLocale)}`,
      '/api/public-fixtures',
      `/api/public-live-line?locale=${encodeURIComponent(safeLocale)}`,
      '/api/public-live-line'
    ];
    return Array.from(new Set(paths.flatMap((endpoint) => buildLiveLineApiEndpoints(endpoint))));
  };

  const liveLineFixtureEndpointGroups = (locale = getSiteLanguage()) => {
    const safeLocale = LIVE_LINE_LANGS.has(locale) ? locale : 'he';
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = ['localhost'].includes(host);
    const configuredBase = String(window.ROYALBET_API_BASE || '').replace(/\/+$/, '');
    if (isLocalHost && !configuredBase) {
      return [[
        `http://localhost:1337/api/public-fixtures?locale=${encodeURIComponent(safeLocale)}`,
      ], [
        `http://localhost:1337/api/public-live-line?locale=${encodeURIComponent(safeLocale)}`,
      ]];
    }
    const paths = [
      `/api/public-fixtures?locale=${encodeURIComponent(safeLocale)}`,
      '/api/public-fixtures',
      `/api/public-live-line?locale=${encodeURIComponent(safeLocale)}`,
      '/api/public-live-line'
    ];
    const groups = [];
    paths.forEach((endpoint) => {
      buildLiveLineApiEndpointGroups(endpoint).forEach((group, index) => {
        groups[index] = groups[index] || [];
        groups[index].push(...group);
      });
    });
    return groups.map((group) => Array.from(new Set(group))).filter((group) => group.length);
  };

  const COUNTRIES_BY_SECONDARY = {
    football: ['global', 'il', 'cl', 'ec', 'br', 'us', 'dm', 'ni', 'au', 'jp', 'indoor'],
    basketball: ['global', 'us', 'br', 'au', 'jp', 'il'],
    tennis: ['global', 'au', 'jp', 'us', 'br', 'il'],
    cricket: ['global', 'au', 'us'],
    baseball: ['global', 'us', 'jp'],
    handball: ['global', 'il'],
    'table-tennis': ['global', 'jp', 'il'],
    rugby: ['global', 'au'],
    'american-football': ['global', 'us'],
    basketball3x3: ['global', 'us', 'br', 'il'],
    'beach-volleyball': ['global', 'br', 'au', 'us'],
    'water-polo': ['global', 'il', 'us'],
    swimming: ['global', 'au', 'us'],
    surfing: ['global', 'au', 'br', 'us'],
    sailing: ['global', 'au', 'us'],
    motorsport: ['global', 'us', 'br', 'jp'],
    cycling: ['global', 'au'],
    boxing: ['global', 'us', 'br'],
    mma: ['global', 'us', 'br'],
    wrestling: ['global', 'us', 'jp'],
    judo: ['global', 'jp'],
    darts: ['global'],
    golf: ['global', 'us', 'jp'],
    snooker: ['global'],
    bowling: ['global', 'us', 'jp']
  };

  const COUNTRY_BY_KEY = new Map(COUNTRY_TABS.map((row) => [row.key, row]));
  const SPORT_BY_KEY = new Map(
    Array.from(new Set(Object.values(SECONDARY_BY_PRIMARY).flat().map((row) => row.key)))
      .map((key) => {
        const row = Object.values(SECONDARY_BY_PRIMARY).flat().find((item) => item.key === key);
        return [key, row || { key, label: key, labelKey: '' }];
      })
  );
  const LIVE_LINE_SYNTHETIC_MARKETS_ENABLED = false;
  const LIVE_LINE_SYNTHETIC_MARKETS_LIVE_ONLY = false;
  const LIVE_LINE_EXTERNAL_ANIMATION_ENABLED = false;
  const LIVE_LINE_TIMELINE_PREVIEW = (() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const value = String(params.get('rbPreviewLiveTimeline') || '').trim().toLowerCase();
      if (!value) return false;
      if (value === '0' || value === 'false' || value === 'no') return false;
      return value === '1' || value === 'true' || value === 'yes';
    } catch (_) {
      return false;
    }
  })();
  const LIVE_LINE_FIXTURES_CACHE_KEY = 'rb_live_line_fixtures_v3';
  const LIVE_LINE_FIXTURES_CACHE_TTL_MS = 120000;
  const LIVE_LINE_STALE_FIXTURE_MAX_AGE_MS = 8 * 60 * 60 * 1000;
  const EXTERNAL_ANIMATION_SPORTS = new Set(['football', 'basketball', 'tennis', 'table-tennis']);
  const SC_ANIMATION_ENGINE_SOURCES = {
    football: '/assets/js/sport/live-line/engines/football/animation-engine.js?v=20260706a',
    basketball: '/assets/js/sport/live-line/engines/basketball/animation-engine.js?v=20260706a',
    tennis: '/assets/js/sport/live-line/engines/tennis/animation-engine.js?v=20260706a',
    'table-tennis': '/assets/js/sport/live-line/engines/tennis/animation-engine.js?v=20260706a',
    default: '/sport/live-line/main.6cceff07.js?v=20260706b'
  };
  const SC_ANIMATION_CLIENT_ID = '1876222';
  const SC_ANIMATION_SCRIPT_ID = 'rb-live-line-animation-engine';
  let scAnimationEnginePromise = null;
  let scAnimationEngineSource = '';
  const LIVE_BET_ENDPOINTS = ['/api/bets/place-live', '/api/bets/place', '/api/bets'];
  const PLAYER_STAKE_KEY = 'royalbet_player_stake';

  const PRUNE_SELECTORS = [
    '.rb-sport-page-slider',
    '.rb-sport-page-hero',
    '.rb-home-sports-head',
    '.rb-home-sports-slider',
    '.rb-home-betting-board',
    '.rb-sport-page-layout',
    '.rb-sport-page-side',
    '.rb-sport-page-events',
    '.rb-sport-page-events-head',
    '.rb-sport-page-event',
    '[data-rb-sport-page-bet-slip]'
  ];

  const state = {
    language: getSiteLanguage(),
    primary: 'ball-games',
    secondary: 'football',
    country: 'global',
    selectedGameId: '',
    pinnedGameId: '',
    pendingLiveJumpKey: '',
    lastUpdatedAt: 0,
    prevOddsByKey: Object.create(null),
    oddChangeByKey: Object.create(null),
    lastUserScrollTs: 0,
    suppressScrollTrackingUntil: 0,
    openMarketKey: '',
    marketQuery: '',
    worldCupMenuOpen: false,
    worldCupMenuKey: 'all',
    worldCupTimeKey: 'all',
    openInfoPanelKey: 'overview',
    fixtures: [],
    fixturesLoaded: false,
    fixturesLoadedAt: 0,
    fixturesSignature: '',
    cacheHydrated: false,
    autoSelectedSportForData: false,
    syncInFlight: false,
    placingInFlightByButton: Object.create(null),
    teamLogoRefreshTimer: 0
  };
  const LIVE_LINE_FIXTURES_CACHE_MS = 30000;
  const LIVE_LINE_ODDS_REFRESH_MS = 4000;
  const localTeamLogoCache = new Map();
  let localTeamLogoIndexPromise = null;
  let localTeamLogoIndexLoaded = false;
  const sportsDbTeamBadgeCache = new Map();
  const sportsDbTeamBadgeInflight = new Map();
  let sportsDbBadgeCacheLoaded = false;

  const readLiveLineFixturesCache = () => {
    try {
      const raw = window.sessionStorage?.getItem(LIVE_LINE_FIXTURES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const loadedAt = Number(parsed?.loadedAt || 0);
      const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
      if (!rows.length || !loadedAt) return null;
      if ((Date.now() - loadedAt) > LIVE_LINE_FIXTURES_CACHE_TTL_MS) return null;
      return {
        rows,
        loadedAt,
        signature: String(parsed?.signature || fixtureRowsSignature(rows))
      };
    } catch (_) {
      return null;
    }
  };

  const writeLiveLineFixturesCache = (rows, signature, loadedAt) => {
    try {
      const normalizedRows = Array.isArray(rows) ? rows : [];
      if (!normalizedRows.length) return;
      const payload = {
        loadedAt: Number(loadedAt || Date.now()),
        signature: String(signature || fixtureRowsSignature(normalizedRows)),
        rows: normalizedRows
      };
      window.sessionStorage?.setItem(LIVE_LINE_FIXTURES_CACHE_KEY, JSON.stringify(payload));
    } catch (_) {
      // best-effort cache only
    }
  };
  const clearLiveLineFixturesCache = () => {
    try {
      window.sessionStorage?.removeItem(LIVE_LINE_FIXTURES_CACHE_KEY);
    } catch (_) {
      // best-effort cache only
    }
  };

  const getLiveLineMount = () => {
    const prepareMount = (node) => {
      if (!node) return null;
      node.setAttribute('data-rb-sport-page-betting', '1');
      if (!node.querySelector('[data-rb-live-line-primary-groups]') && !node.querySelector('[data-rb-home-sport-groups]')) {
        const primary = document.createElement('div');
        primary.className = 'rb-home-sport-groups';
        primary.setAttribute('data-rb-live-line-primary-groups', '1');
        node.insertBefore(primary, node.firstChild);
      }
      if (!node.querySelector('[data-rb-live-line-sub-sports]') && !node.querySelector('[data-rb-home-sub-sports]')) {
        const secondary = document.createElement('div');
        secondary.className = 'rb-home-sub-sports';
        secondary.setAttribute('data-rb-live-line-sub-sports', '1');
        const primary = node.querySelector('[data-rb-live-line-primary-groups]') || node.firstChild;
        if (primary?.nextSibling) node.insertBefore(secondary, primary.nextSibling);
        else node.appendChild(secondary);
      }
      return node;
    };
    let mount = document.querySelector('[data-rb-sport-page-betting]');
    if (mount) return prepareMount(mount);
    mount = document.querySelector('[data-rb-live-line-page]');
    if (mount) return prepareMount(mount);
    mount = document.querySelector('[data-rb-live-line-fallback-root]');
    if (mount) return prepareMount(mount);

    const host = document.querySelector('.app-main-content') || document.body;
    if (!host) return null;
    mount = document.createElement('section');
    mount.className = 'rb-live-line-fallback-root';
    mount.setAttribute('data-rb-live-line-fallback-root', '1');
    host.appendChild(mount);
    return prepareMount(mount);
  };

  const getLiveLinePrimaryRow = (mount) => {
    if (!mount) return null;
    const liveRow = mount.querySelector('[data-rb-live-line-primary-groups]');
    if (liveRow) return liveRow;
    const legacyRow = mount.querySelector('[data-rb-home-sport-groups]');
    if (!legacyRow) return null;
    legacyRow.setAttribute('data-rb-live-line-primary-groups', '1');
    legacyRow.removeAttribute('data-rb-home-sport-groups');
    return legacyRow;
  };

  const getLiveLineSecondaryRow = (mount) => {
    if (!mount) return null;
    const liveRow = mount.querySelector('[data-rb-live-line-sub-sports]');
    if (liveRow) return liveRow;
    const legacyRow = mount.querySelector('[data-rb-home-sub-sports]');
    if (!legacyRow) return null;
    legacyRow.setAttribute('data-rb-live-line-sub-sports', '1');
    legacyRow.removeAttribute('data-rb-home-sub-sports');
    return legacyRow;
  };
  const scrubLegacySportsSelectors = (mount) => {
    if (!mount) return;
    const legacyPrimary = mount.querySelector('[data-rb-home-sport-groups]');
    if (legacyPrimary && !legacyPrimary.hasAttribute('data-rb-live-line-primary-groups')) {
      legacyPrimary.setAttribute('data-rb-live-line-primary-groups', '1');
    }
    if (legacyPrimary) legacyPrimary.removeAttribute('data-rb-home-sport-groups');
    const legacySecondary = mount.querySelector('[data-rb-home-sub-sports]');
    if (legacySecondary && !legacySecondary.hasAttribute('data-rb-live-line-sub-sports')) {
      legacySecondary.setAttribute('data-rb-live-line-sub-sports', '1');
    }
    if (legacySecondary) legacySecondary.removeAttribute('data-rb-home-sub-sports');
  };

  const baseSecondariesForPrimary = (primaryKey) => SECONDARY_BY_PRIMARY[primaryKey] || SECONDARY_SPORT_TABS;
  const availableSportCountsFromFixtures = (rows = state.fixtures) => {
    const counts = new Map();
    (Array.isArray(rows) ? rows : []).forEach((fixture) => {
      if (fixtureHasFinalStatus(fixture) || fixture?.finished === true || fixture?.completed === true) return;
      const sport = inferFixtureSportSlug(fixture);
      if (!sport) return;
      counts.set(sport, (counts.get(sport) || 0) + 1);
    });
    return counts;
  };
  const activeFixtureRowsForCounts = () => (Array.isArray(state.fixtures) ? state.fixtures : [])
    .filter((fixture) => !fixtureHasFinalStatus(fixture))
    .filter((fixture) => fixture?.finished !== true && fixture?.completed !== true);
  const countFixturesForPrimary = (primaryKey) => {
    const secondaryKeys = new Set(baseSecondariesForPrimary(primaryKey).map((tab) => tab.key));
    if (!secondaryKeys.size) return 0;
    return activeFixtureRowsForCounts().reduce((count, fixture) => {
      const sport = inferFixtureSportSlug(fixture);
      return sport && secondaryKeys.has(sport) ? count + 1 : count;
    }, 0);
  };
  const countFixturesForSecondary = (secondaryKey) => activeFixtureRowsForCounts()
    .reduce((count, fixture) => fixtureMatchesSecondarySport(fixture, secondaryKey) ? count + 1 : count, 0);
  const countFixturesForCountry = (secondaryKey, countryKey) => activeFixtureRowsForCounts()
    .reduce((count, fixture) => (
      fixtureMatchesSecondarySport(fixture, secondaryKey) && fixtureCountryMatch(fixture, countryKey)
        ? count + 1
        : count
    ), 0);
  const menuCountBadge = (count) => (
    `<em class="rb-live-line-filter-count" aria-label="${escapeHtml(t('liveLine.matchCount', 'מספר משחקים'))}: ${Number(count || 0)}">${Number(count || 0)}</em>`
  );
  const secondariesForPrimary = (primaryKey) => {
    return baseSecondariesForPrimary(primaryKey);
  };
  const primaryTabsForCurrentData = () => {
    return PRIMARY_SPORT_TABS;
  };
  const firstSecondaryForPrimary = (primaryKey) => secondariesForPrimary(primaryKey)[0] || SECONDARY_SPORT_TABS[0];
  const primaryForSecondary = (secondaryKey) => {
    const wanted = String(secondaryKey || '').trim();
    if (!wanted) return state.primary || 'ball-games';
    const hit = Object.entries(SECONDARY_BY_PRIMARY).find(([, tabs]) => (
      Array.isArray(tabs) && tabs.some((tab) => tab.key === wanted)
    ));
    return hit?.[0] || 'ball-games';
  };

  const countriesForSecondary = (secondaryKey) => {
    const list = COUNTRIES_BY_SECONDARY[secondaryKey] || COUNTRIES_BY_SECONDARY.football;
    return list.map((key) => COUNTRY_BY_KEY.get(key)).filter(Boolean);
  };
  const canonicalSportKey = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
  const LIVE_LINE_ODDS_SILENCE_HIDE_MS = 5 * 60 * 1000;
  const liveLineExpectedDurationMs = (fixture) => {
    const key = canonicalSportKey(
      fixture?.sport_key || fixture?.sport || fixture?.sport_title || fixture?.league_name || ''
    );
    if (key.startsWith('baseball')) return 5 * 60 * 60 * 1000;
    if (key.startsWith('cricket')) return 7 * 60 * 60 * 1000;
    if (key.startsWith('tennis')) return 5 * 60 * 60 * 1000;
    if (key.startsWith('basketball')) return 3 * 60 * 60 * 1000;
    if (key.startsWith('american-football')) return 4 * 60 * 60 * 1000;
    if (key.startsWith('rugby')) return 3 * 60 * 60 * 1000;
    if (key.startsWith('soccer') || key === 'football') return 3 * 60 * 60 * 1000;
    return 4 * 60 * 60 * 1000;
  };
  const fixtureLastOddsUpdateTs = (fixture) => {
    const values = [
      fixture?.odds_updated_at,
      fixture?.oddsUpdatedAt,
      fixture?.last_odds_update,
      fixture?.lastOddsUpdate,
      fixture?.market_updated_at,
      fixture?.marketUpdatedAt,
      fixture?.updated_at,
      fixture?.updatedAt,
    ];
    for (const value of values) {
      if (value == null || value === '') continue;
      const ts = Date.parse(String(value));
      if (Number.isFinite(ts)) return ts;
    }
    return NaN;
  };
  const fixtureHasFreshOddsSignal = (fixture, now = Date.now()) => {
    const hasOdds = [fixture?.odds_home, fixture?.odds_draw, fixture?.odds_away]
      .some((value) => Number.isFinite(Number(value)) && Number(value) > 1);
    if (!hasOdds) return false;
    const kickoffTs = parseFixtureTs(fixture);
    const hasStarted = Number.isFinite(kickoffTs) && kickoffTs > 0 && kickoffTs <= now;
    if (!hasStarted) return true;
    const updatedTs = fixtureLastOddsUpdateTs(fixture);
    if (!Number.isFinite(updatedTs)) return false;
    return (now - updatedTs) <= LIVE_LINE_ODDS_SILENCE_HIDE_MS;
  };
  const fixtureOddsState = (fixture) => String(fixture?.odds_state || fixture?.oddsState || '').trim().toLowerCase();
  const fixtureHasActiveOdds = (fixture) => {
    const state = fixtureOddsState(fixture);
    if (state) return state === 'active';
    return fixtureHasFreshOddsSignal(fixture);
  };
  const fixtureOddsUpdatedAt = (fixture) => (
    fixture?.odds_updated_at || fixture?.oddsUpdatedAt || fixture?.last_odds_update || fixture?.lastOddsUpdate || fixture?.updatedAt || ''
  );
  const fixtureHasStaleLiveSignal = (fixture, now = Date.now()) => {
    const kickoffTs = parseFixtureTs(fixture);
    if (!Number.isFinite(kickoffTs) || kickoffTs <= 0 || kickoffTs > now) return false;
    const staleAfterMs = liveLineExpectedDurationMs(fixture) + (90 * 60 * 1000);
    if ((now - kickoffTs) <= staleAfterMs) return false;
    return !fixtureHasFreshOddsSignal(fixture, now);
  };

  const normalizeIncomingFixtures = (rows) => {
    const source = Array.isArray(rows) ? rows : [];
    const now = Date.now();
    const deduped = new Map();
    source.forEach((rawRow, index) => {
      const row = normalizeFixture(rawRow);
      if (!row || typeof row !== 'object') return;
      const home = String(row?.__rbSourceHomeTeam || row?.home_team || '').trim();
      const away = String(row?.__rbSourceAwayTeam || row?.away_team || '').trim();
      if (!home || !away) return;
      if (fixtureHasFinalStatus(row) || row?.finished === true || row?.completed === true) return;
      if (fixtureHasStaleLiveSignal(row, now)) return;
      const kickoffTs = parseFixtureTs(row);
      const liveNow = fixtureIsLiveNow(row, providerFixtureKey(row, index));
      if (
        Number.isFinite(kickoffTs)
        && kickoffTs > 0
        && !liveNow
        && kickoffTs < now
        && !fixtureHasFreshOddsSignal(row, now)
        && (now - kickoffTs) > LIVE_LINE_STALE_FIXTURE_MAX_AGE_MS
      ) {
        return;
      }
      const sport = canonicalSportKey(row?.sport_key || row?.sport || row?.sport_title || row?.league_name || '');
      const league = normalizeText(row?.league_name || row?.league || '');
      const kickoffBucket = Number.isFinite(kickoffTs) ? Math.floor(kickoffTs / 60000) : '';
      const pair = [normalizeText(home), normalizeText(away)].sort().join('|');
      const dedupeKey = `${sport || 'sport'}|${league || 'league'}|${pair}|${kickoffBucket || index}`;
      const existing = deduped.get(dedupeKey);
      if (!existing) {
        deduped.set(dedupeKey, row);
        return;
      }
      const existingLive = fixtureIsLiveNow(existing, providerFixtureKey(existing, index));
      if (!existingLive && liveNow) {
        deduped.set(dedupeKey, row);
        return;
      }
      if (!existingLive && !liveNow && isFixtureFromLiveLineFeed(row) && !isFixtureFromLiveLineFeed(existing)) {
        deduped.set(dedupeKey, row);
      }
    });
    return Array.from(deduped.values()).sort((a, b) => {
      const aTs = parseFixtureTs(a) || Number.MAX_SAFE_INTEGER;
      const bTs = parseFixtureTs(b) || Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    });
  };

  const fetchJsonWithTimeout = async (url, timeoutMs) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), Number(timeoutMs || 4500));
    try {
      const isCrossOrigin = /^https?:/i.test(url) && !url.startsWith(window.location.origin);
      const response = await fetch(url, {
        credentials: isCrossOrigin ? 'omit' : 'same-origin',
        signal: controller.signal
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      const payload = await response.json();
      return { ok: true, payload };
    } catch (error) {
      return { ok: false, error: error?.name === 'AbortError' ? 'timeout' : (error?.message || 'fetch-failed') };
    } finally {
      window.clearTimeout(timer);
    }
  };

  const fixtureRowsFromPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.fixtures)) return payload.fixtures;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const providerFixtureKey = (fixture, index = 0) => {
    const directId = String(fixture?.fixture_id || fixture?.id || '').trim();
    if (directId) return directId;
    const sourceHome = String(fixture?.__rbSourceHomeTeam || fixture?.home_team || '').trim();
    const sourceAway = String(fixture?.__rbSourceAwayTeam || fixture?.away_team || '').trim();
    const sport = String(fixture?.sport_key || fixture?.sport || '').trim();
    const kickoff = String(
      fixture?.commence_time
      || fixture?.start_time
      || fixture?.kickoff
      || fixture?.timestamp
      || ''
    ).trim();
    return `${sport || 'sport'}|${sourceHome || 'home'}|${sourceAway || 'away'}|${kickoff || index}`;
  };

  const freezeNonLiveRows = (nextRows, previousRows) => {
    const incoming = Array.isArray(nextRows) ? nextRows : [];
    if (!incoming.length) return [];
    const prev = Array.isArray(previousRows) ? previousRows : [];
    if (!prev.length) return incoming;

    const previousByKey = new Map();
    prev.forEach((row, index) => {
      previousByKey.set(providerFixtureKey(row, index), row);
    });

    return incoming.map((row, index) => {
      const key = providerFixtureKey(row, index);
      const previous = previousByKey.get(key);
      if (!previous) return row;
      if (fixtureIsLiveNow(row, key)) return row;
      if (fixtureHasFinalStatus(row)) return row;
      if (fixtureIsLiveNow(previous, key)) return row;
      return previous;
    });
  };

  const normalizeFixture = (fixture) => fixture?.attributes || fixture || {};
  const liveGlossaryState = {
    cacheByLocale: new Map(),
    loadedAtByLocale: new Map(),
    inflightByLocale: new Map()
  };

  const normalizeLiveGlossaryKey = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const extractLiveGlossaryTerms = (payload) => {
    const candidates = [
      payload?.data?.terms,
      payload?.terms,
      payload?.data?.sportGlossary?.terms,
      payload?.data?.sportGlossary,
      payload?.sportGlossary
    ];
    const match = candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    return match || {};
  };

  const loadLiveGlossaryForLocale = async (locale = getSiteLanguage()) => {
    const safeLocale = LIVE_LINE_LANGS.has(locale) ? locale : 'he';
    const now = Date.now();
    const cached = liveGlossaryState.cacheByLocale.get(safeLocale);
    const cachedAt = Number(liveGlossaryState.loadedAtByLocale.get(safeLocale) || 0);
    if (cached && (now - cachedAt) < 20000) return cached;
    if (liveGlossaryState.inflightByLocale.has(safeLocale)) return liveGlossaryState.inflightByLocale.get(safeLocale);
    const pending = (async () => {
      const endpoints = buildLiveLineGlossaryEndpoints(safeLocale);
      const glossary = new Map();
      for (const endpoint of endpoints) {
        const result = await fetchJsonWithTimeout(endpoint, 3500);
        if (!result.ok) continue;
        const terms = extractLiveGlossaryTerms(result.payload);
        Object.entries(terms || {}).forEach(([rawKey, rawValue]) => {
          const key = normalizeLiveGlossaryKey(rawKey);
          const value = String(rawValue || '').trim();
          if (key && value) glossary.set(key, value);
        });
        if (glossary.size) break;
      }
      liveGlossaryState.cacheByLocale.set(safeLocale, glossary);
      liveGlossaryState.loadedAtByLocale.set(safeLocale, Date.now());
      return glossary;
    })().finally(() => {
      liveGlossaryState.inflightByLocale.delete(safeLocale);
    });
    liveGlossaryState.inflightByLocale.set(safeLocale, pending);
    return pending;
  };

  const translateLiveEntityTerm = (value, glossary) => {
    const original = String(value || '').trim();
    if (!original) return value;
    const direct = glossary?.get(normalizeLiveGlossaryKey(original));
    return direct || original;
  };

  const liveTranslationTarget = (locale) => {
    if (locale === 'he') return 'he';
    if (locale === 'ar') return 'ar';
    if (locale === 'fr') return 'fr';
    if (locale === 'es') return 'es';
    return 'en';
  };

  const translateFixtureRowsLive = async (rows, locale = getSiteLanguage()) => {
    const source = Array.isArray(rows) ? rows : [];
    if (!source.length) return source;
    const safeLocale = LIVE_LINE_LANGS.has(locale) ? locale : 'he';
    if (liveTranslationTarget(safeLocale) === 'en') return source;
    const glossary = await loadLiveGlossaryForLocale(safeLocale).catch(() => new Map());

    return source.map((item) => {
      const next = { ...item };
      ['home_team', 'away_team', 'league_name', 'league', 'sport_title', 'status'].forEach((key) => {
        const original = String(item?.[`${key}_original`] || item?.[key] || '').trim();
        if (!original) return;
        const originalKey = `${key}_original`;
        if (!String(next?.[originalKey] || '').trim()) next[originalKey] = original;
        next[key] = translateLiveEntityTerm(original, glossary);
      });
      next.__rbSourceHomeTeam = String(item?.__rbSourceHomeTeam || item?.home_team_original || item?.home_team || '').trim();
      next.__rbSourceAwayTeam = String(item?.__rbSourceAwayTeam || item?.away_team_original || item?.away_team || '').trim();
      next.__rbSourceLeague = String(item?.__rbSourceLeague || item?.league_name_original || item?.league_original || item?.league_name || item?.league || '').trim();
      next.__rbSourceStatus = String(item?.__rbSourceStatus || item?.status_original || item?.status || '').trim();
      return next;
    });
  };


  const parseFixtureTs = (fixture) => {
    const datePart = String(fixture?.date || fixture?.match_date || fixture?.fixture_date || '').trim();
    const timePart = String(fixture?.time || fixture?.match_time || fixture?.fixture_time || '').trim();
    if (datePart && timePart) {
      const combinedRaw = `${datePart}T${timePart}`;
      const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(combinedRaw);
      const localTs = new Date(combinedRaw).getTime();
      if (Number.isFinite(localTs)) return localTs;
      if (!hasTimezone) {
        const utcTs = new Date(`${combinedRaw}Z`).getTime();
        if (Number.isFinite(utcTs)) return utcTs;
      }
    }

    const values = [
      fixture?.commence_time,
      fixture?.commenceAt,
      fixture?.commence_at,
      fixture?.kickoff,
      fixture?.kickoff_at,
      fixture?.kickoffAt,
      fixture?.start_time,
      fixture?.start_at,
      fixture?.starts_at,
      fixture?.datetime,
      fixture?.date_time,
      fixture?.timestamp,
      fixture?.ts
    ];
    for (const value of values) {
      if (value == null || value === '') continue;
      const raw = String(value).trim();
      if (/^\d+(?:\.\d+)?$/.test(raw)) {
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric > 0) {
          if (numeric >= 1e12) return Math.floor(numeric);
          if (numeric >= 1e9) return Math.floor(numeric * 1000);
          if (numeric >= 1e6) return Math.floor(numeric);
        }
      }
      if (/^\d{13}$/.test(raw)) return Number(raw);
      if (/^\d{10}$/.test(raw)) return Number(raw) * 1000;
      if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)) continue;
      const ts = new Date(raw).getTime();
      if (Number.isFinite(ts)) return ts;
    }
    return 0;
  };

  const formatDateTime = (ts) => {
    if (!Number.isFinite(ts) || ts <= 0) return '';
    const date = new Date(ts);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${mi}`;
  };

  const formatClock = (ts) => {
    if (!Number.isFinite(ts) || ts <= 0) return '--:--:--';
    const date = new Date(ts);
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mi}:${ss}`;
  };

  const getLogicalScrollLeft = (row) => {
    if (!row) return 0;
    const max = Math.max(0, Number(row.scrollWidth || 0) - Number(row.clientWidth || 0));
    if (max <= 0) return 0;
    const dir = String(window.getComputedStyle(row).direction || '').toLowerCase();
    const raw = Number(row.scrollLeft || 0);
    if (dir !== 'rtl') return Math.max(0, Math.min(max, raw));
    if (raw < 0) return Math.max(0, Math.min(max, -raw)); // Firefox RTL model
    return Math.max(0, Math.min(max, max - raw)); // Chromium/WebKit RTL model
  };

  const setLogicalScrollLeft = (row, logical) => {
    if (!row) return;
    const max = Math.max(0, Number(row.scrollWidth || 0) - Number(row.clientWidth || 0));
    if (max <= 0) {
      row.scrollLeft = 0;
      return;
    }
    const value = Math.max(0, Math.min(max, Number(logical || 0)));
    const dir = String(window.getComputedStyle(row).direction || '').toLowerCase();
    if (dir !== 'rtl') {
      row.scrollLeft = value;
      return;
    }
    const currentRaw = Number(row.scrollLeft || 0);
    row.scrollLeft = currentRaw < 0 ? -value : (max - value);
  };

  const snapshotRowsScroll = () => {
    const mount = document.querySelector('[data-rb-sport-page-betting]');
    if (!mount) return null;
    const primaryRow = getLiveLinePrimaryRow(mount);
    const secondaryRow = getLiveLineSecondaryRow(mount);
    const countriesRow = mount.querySelector('[data-rb-live-line-countries]');
    const gamesList = mount.querySelector('.rb-live-line-games-list');
    return {
      primary: getLogicalScrollLeft(primaryRow),
      secondary: getLogicalScrollLeft(secondaryRow),
      countries: getLogicalScrollLeft(countriesRow),
      gamesTop: Number(gamesList?.scrollTop || 0)
    };
  };

  const restoreRowsScroll = (snapshot) => {
    if (!snapshot) return;
    const mount = document.querySelector('[data-rb-sport-page-betting]');
    if (!mount) return;
    const primaryRow = getLiveLinePrimaryRow(mount);
    const secondaryRow = getLiveLineSecondaryRow(mount);
    const countriesRow = mount.querySelector('[data-rb-live-line-countries]');
    const gamesList = mount.querySelector('.rb-live-line-games-list');
    setLogicalScrollLeft(primaryRow, snapshot.primary);
    setLogicalScrollLeft(secondaryRow, snapshot.secondary);
    setLogicalScrollLeft(countriesRow, snapshot.countries);
    if (gamesList) gamesList.scrollTop = Number(snapshot.gamesTop || 0);
  };

  const escapeHtml = (value) => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const normalizeText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const fixtureId = (fixture, index) => String(
    fixture?.fixture_id ||
    fixture?.id ||
    `${fixture?.home_team || 'home'}-${fixture?.away_team || 'away'}-${parseFixtureTs(fixture) || index || 0}`
  );

  const fixtureRowsSignature = (rows) => {
    if (!Array.isArray(rows) || !rows.length) return 'empty';
    const marketSignature = (row) => {
      const sourceMarkets = []
        .concat(Array.isArray(row?.markets) ? row.markets : [])
        .concat(Array.isArray(row?.bookmakers?.[0]?.markets) ? row.bookmakers[0].markets : [])
        .concat(Array.isArray(row?.odds?.markets) ? row.odds.markets : []);
      if (!sourceMarkets.length) return '';
      return sourceMarkets.map((market) => {
        const outcomes = []
          .concat(Array.isArray(market?.outcomes) ? market.outcomes : [])
          .concat(Array.isArray(market?.selections) ? market.selections : [])
          .concat(Array.isArray(market?.values) ? market.values : [])
          .concat(Array.isArray(market?.odds) ? market.odds : []);
        return [
          market?.key || market?.id || market?.market_id || market?.marketId || market?.label || market?.name || market?.title || '',
          outcomes.map((outcome) => [
            outcome?.selection_id || outcome?.selectionId || outcome?.outcome_id || outcome?.outcomeId || outcome?.id || outcome?.label || outcome?.name || outcome?.title || '',
            outcome?.odd ?? outcome?.price ?? outcome?.value ?? ''
          ].map((item) => String(item ?? '').trim()).join(':')).join(',')
        ].map((item) => String(item ?? '').trim()).join('=');
      }).join(';');
    };
    return rows.map((row, index) => [
      fixtureId(row, index),
      row?.home_team,
      row?.away_team,
      row?.league_name || row?.league,
      row?.sport_title,
      row?.status,
      row?.home_score,
      row?.away_score,
      row?.live_minute,
      row?.ball_position,
      row?.ball_position_x,
      row?.ball_position_y,
      row?.odds_home,
      row?.odds_draw,
      row?.odds_away,
      marketSignature(row)
    ].map((item) => String(item ?? '').trim()).join('~')).join('|');
  };

  const hashSeed = (text) => {
    const input = String(text || '');
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };
  const normalizedTeamSlug = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
  const normalizeSportsDbQuery = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .,'&()_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const isSportsDbQueryEligible = (value) => {
    const safe = normalizeSportsDbQuery(value);
    if (safe.length < 3) return false;
    return /[A-Za-z0-9]/.test(safe);
  };
  const sportsDbTeamCacheKey = (name) => normalizedTeamSlug(name);
  const fixtureSourceTeamName = (fixture, side) => {
    const prefix = side === 'away' ? 'Away' : 'Home';
    const direct = String(
      fixture?.[`__rbSource${prefix}Team`]
      || fixture?.[`${side}_team_original`]
      || fixture?.[`${side}_team_source`]
      || fixture?.[`${side}_team`]
      || ''
    ).trim();
    return direct;
  };
  const localTeamLogoKey = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rememberLocalTeamLogo = (key, url) => {
    const safeKey = localTeamLogoKey(key);
    const safeUrl = String(url || '').trim();
    if (!safeKey || !safeUrl) return;
    localTeamLogoCache.set(safeKey, safeUrl);
  };
  const ingestLocalTeamLogoIndex = (payload) => {
    const aliases = payload?.aliases && typeof payload.aliases === 'object' ? payload.aliases : {};
    const teams = payload?.teams && typeof payload.teams === 'object' ? payload.teams : {};

    Object.entries(teams).forEach(([teamKey, row]) => {
      const item = row && typeof row === 'object' ? row : {};
      const url = String(item.url || '').trim();
      if (!url) return;
      rememberLocalTeamLogo(teamKey, url);
      rememberLocalTeamLogo(item.teamKey, url);
      rememberLocalTeamLogo(item.teamName, url);
      (Array.isArray(item.aliases) ? item.aliases : []).forEach((alias) => rememberLocalTeamLogo(alias, url));
    });

    Object.entries(aliases).forEach(([alias, target]) => {
      const targetRow = teams?.[String(target || '')];
      const url = String(targetRow?.url || localTeamLogoCache.get(localTeamLogoKey(target)) || '').trim();
      if (url) rememberLocalTeamLogo(alias, url);
    });
  };
  const loadLocalTeamLogoIndex = () => {
    if (localTeamLogoIndexLoaded) return Promise.resolve(localTeamLogoCache);
    if (localTeamLogoIndexPromise) return localTeamLogoIndexPromise;
    localTeamLogoIndexPromise = fetchJsonWithTimeout(LOCAL_TEAM_LOGO_INDEX_URL, 4500)
      .then((result) => {
        if (result.ok) ingestLocalTeamLogoIndex(result.payload);
        localTeamLogoIndexLoaded = true;
        queueTeamLogoRefresh();
        return localTeamLogoCache;
      })
      .catch(() => {
        localTeamLogoIndexLoaded = true;
        return localTeamLogoCache;
      })
      .finally(() => {
        localTeamLogoIndexPromise = null;
      });
    return localTeamLogoIndexPromise;
  };
  const localTeamLogoFromIndex = (teamName) => {
    const key = localTeamLogoKey(teamName);
    if (!key) return '';
    const direct = String(localTeamLogoCache.get(key) || '').trim();
    if (direct) return direct;
    if (!localTeamLogoIndexLoaded) loadLocalTeamLogoIndex().catch(() => {});
    return '';
  };
  const loadSportsDbBadgeCache = () => {
    if (sportsDbBadgeCacheLoaded) return;
    sportsDbBadgeCacheLoaded = true;
    try {
      const raw = localStorage.getItem(SPORTS_DB_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      Object.entries(parsed || {}).forEach(([key, value]) => {
        const safeKey = sportsDbTeamCacheKey(key);
        if (!safeKey) return;
        const badge = typeof value === 'string'
          ? value.trim()
          : String(value?.badge || value?.url || '').trim();
        const ts = Number(typeof value === 'object' ? (value?.ts || value?.updatedAt) : now);
        if (!badge) return;
        if (Number.isFinite(ts) && (now - ts) > SPORTS_DB_CACHE_TTL_MS) return;
        sportsDbTeamBadgeCache.set(safeKey, badge);
      });
    } catch (_) {
      // ignore bad cache
    }
  };
  const persistSportsDbBadgeCache = () => {
    try {
      const now = Date.now();
      const next = {};
      sportsDbTeamBadgeCache.forEach((badge, key) => {
        if (!key || !badge) return;
        next[key] = { badge: String(badge), ts: now };
      });
      localStorage.setItem(SPORTS_DB_CACHE_KEY, JSON.stringify(next));
    } catch (_) {
      // ignore storage failures
    }
  };
  const sportsDbBadgeFromCache = (teamName) => {
    loadSportsDbBadgeCache();
    const key = sportsDbTeamCacheKey(teamName);
    if (!key) return '';
    return String(sportsDbTeamBadgeCache.get(key) || '').trim();
  };
  const pickSportsDbBadge = (list, teamName) => {
    if (!Array.isArray(list) || !list.length) return '';
    const withBadge = list.filter((row) => Boolean(String(row?.strBadge || row?.strTeamBadge || row?.strLogo || '').trim()));
    if (!withBadge.length) return '';
    const wanted = sportsDbTeamCacheKey(teamName);
    const exact = withBadge.find((row) => sportsDbTeamCacheKey(row?.strTeam || row?.strAlternate || '') === wanted) || withBadge[0];
    return String(exact?.strBadge || exact?.strTeamBadge || exact?.strLogo || '').trim();
  };
  const queueTeamLogoRefresh = () => {
    if (state.teamLogoRefreshTimer) return;
    state.teamLogoRefreshTimer = window.setTimeout(() => {
      state.teamLogoRefreshTimer = 0;
      renderGamesPanelPreservingViewport();
    }, 120);
  };
  const fetchSportsDbTeamBadge = async (teamName) => {
    if (!SPORTS_DB_CLIENT_FETCH_ENABLED) return '';
    const safeQuery = normalizeSportsDbQuery(teamName);
    if (!isSportsDbQueryEligible(safeQuery)) return '';
    const key = sportsDbTeamCacheKey(teamName);
    if (!key) return '';
    const cached = sportsDbBadgeFromCache(teamName);
    if (cached) return cached;
    if (sportsDbTeamBadgeInflight.has(key)) return sportsDbTeamBadgeInflight.get(key);
    const pending = (async () => {
      for (let i = 0; i < SPORTS_DB_API_BASES.length; i += 1) {
        const endpoint = `${SPORTS_DB_API_BASES[i]}/searchteams.php?t=${encodeURIComponent(safeQuery)}`;
        const result = await fetchJsonWithTimeout(endpoint, 3500);
        if (!result.ok) continue;
        const badge = pickSportsDbBadge(result.payload?.teams, teamName);
        if (!badge) continue;
        sportsDbTeamBadgeCache.set(key, badge);
        persistSportsDbBadgeCache();
        queueTeamLogoRefresh();
        return badge;
      }
      return '';
    })().finally(() => {
      sportsDbTeamBadgeInflight.delete(key);
    });
    sportsDbTeamBadgeInflight.set(key, pending);
    return pending;
  };
  const prefetchTeamBadgesForRows = (rows) => {
    loadLocalTeamLogoIndex().catch(() => {});
    if (!SPORTS_DB_CLIENT_FETCH_ENABLED) return;
    if (!Array.isArray(rows) || !rows.length) return;
    const unique = new Set();
    rows.forEach((fixture) => {
      const home = fixtureSourceTeamName(fixture, 'home');
      const away = fixtureSourceTeamName(fixture, 'away');
      if (home) unique.add(home);
      if (away) unique.add(away);
    });
    Array.from(unique)
      .filter((teamName) => !sportsDbBadgeFromCache(teamName))
      .slice(0, 20)
      .forEach((teamName) => {
        fetchSportsDbTeamBadge(teamName).catch(() => {});
      });
  };

  const statusContainsAny = (statusText, tokens) => {
    const normalizedStatus = ` ${String(statusText || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
    return tokens.some((token) => {
      const normalizedToken = String(token || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      if (!normalizedToken) return false;
      if (normalizedToken.length <= 3) return normalizedStatus.includes(` ${normalizedToken} `);
      return normalizedStatus.includes(normalizedToken);
    });
  };
  const LIVE_STATUS_TOKENS = [
    'live',
    'inplay',
    'in-play',
    'in progress',
    'started',
    'playing',
    'running',
    '1h',
    '2h',
    '1st half',
    '2nd half',
    'q1',
    'q2',
    'q3',
    'q4',
    'half',
    'overtime',
    'et',
    'pen',
    'live now',
    'חי',
    'במשחק',
    'מחצית',
    'הארכה',
    'פנדלים'
  ];
  const FINAL_STATUS_TOKENS = [
    'final',
    'finished',
    'complete',
    'completed',
    'closed',
    'settled',
    'ended',
    'full time',
    'ft',
    'aet',
    'after extra time',
    'postponed',
    'cancelled',
    'canceled',
    'abandoned',
    'suspended',
    'הסתיים',
    'נגמר',
    'סיום',
    'הושלם'
  ];
  const PREMATCH_STATUS_TOKENS = [
    'open',
    'not started',
    'not-started',
    'ns',
    'scheduled',
    'upcoming',
    'pending',
    'pre',
    'pregame',
    'pre-game',
    'fixture',
    'טרם התחיל',
    'לפני משחק',
    'מוקדם'
  ];
  const toBooleanLike = (value) => {
    if (value === true) return true;
    if (value === false || value == null) return false;
    const text = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'live', 'inplay', 'in-play'].includes(text);
  };

  const makeLiveSim = (fixture, id) => {
    const statusText = String(
      fixture?.status ||
      fixture?.live_status ||
      fixture?.state ||
      ''
    ).trim().toLowerCase();
    const statusSignalsLive = statusContainsAny(statusText, LIVE_STATUS_TOKENS);
    const statusSignalsPreMatch = statusContainsAny(statusText, PREMATCH_STATUS_TOKENS);
    const explicitLiveFlag = toBooleanLike(
      fixture?.is_live ?? fixture?.live ?? fixture?.inplay ?? fixture?.in_play
    );
    const minuteHint = toFiniteNumber(fixture?.live_minute ?? fixture?.minute);
    const kickoffTs = parseFixtureTs(fixture);
    const kickoffInFuture = Number.isFinite(kickoffTs) && kickoffTs > Date.now();
    const hasLiveSignal = explicitLiveFlag || statusSignalsLive || (minuteHint != null && minuteHint > 0);
    const preGame = kickoffInFuture || !hasLiveSignal || statusSignalsPreMatch;
    const minute = !kickoffInFuture && minuteHint != null && minuteHint > 0
      ? Math.max(0, Math.min(130, Math.floor(minuteHint)))
      : 0;

    return {
      preGame,
      minute,
      homeScore: 0,
      awayScore: 0,
      shotsHome: 0,
      shotsAway: 0,
      cornersHome: 0,
      cornersAway: 0,
      possessionHome: 50,
      possessionAway: 50,
      attacksHome: 0,
    attacksAway: 0,
    ballPosition: null,
    ballPositionX: null,
    ballPositionY: null,
    hasBallCoordinates: false,
    hasRealStats: false,
    hasRealScore: false
  };
  };

  const isFixtureFromLiveLineFeed = (fixture) => String(fixture?.__rbFeed || '').toLowerCase() === 'live-line';

  const toFiniteNumber = (value) => {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const pickFixtureValue = (fixture, paths) => {
    const root = fixture || {};
    for (const path of paths) {
      const parts = String(path || '').split('.');
      let cursor = root;
      let ok = true;
      for (const part of parts) {
        if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) {
          cursor = cursor[part];
        } else {
          ok = false;
          break;
        }
      }
      if (ok && cursor != null && cursor !== '') return cursor;
    }
    return null;
  };

  const readFixtureMinute = (fixture) => {
    const value = pickFixtureValue(fixture, [
      'minute',
      'live_minute',
      'liveMinute',
      'elapsed',
      'elapsed_minute',
      'timer.minute',
      'clock.minute'
    ]);
    const parsed = toFiniteNumber(value);
    if (parsed == null) return null;
    return Math.max(0, Math.min(130, Math.floor(parsed)));
  };

  const readFixtureScores = (fixture) => {
    const homeDirect = toFiniteNumber(pickFixtureValue(fixture, ['home_score', 'score_home', 'scores.home', 'result.home', 'live.home']));
    const awayDirect = toFiniteNumber(pickFixtureValue(fixture, ['away_score', 'score_away', 'scores.away', 'result.away', 'live.away']));
    if (homeDirect != null && awayDirect != null) return { home: Math.max(0, Math.floor(homeDirect)), away: Math.max(0, Math.floor(awayDirect)) };

    const resultText = String(pickFixtureValue(fixture, ['score', 'result_text', 'ft_score', 'live_score']) || '').trim();
    const match = resultText.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!match) return null;
    return { home: Number(match[1]), away: Number(match[2]) };
  };

  const readFixtureStats = (fixture) => {
    const direct = {
      shotsHome: toFiniteNumber(pickFixtureValue(fixture, ['shots_home', 'stats.shots.home', 'statistics.shots.home'])),
      shotsAway: toFiniteNumber(pickFixtureValue(fixture, ['shots_away', 'stats.shots.away', 'statistics.shots.away'])),
      cornersHome: toFiniteNumber(pickFixtureValue(fixture, ['corners_home', 'stats.corners.home', 'statistics.corners.home'])),
      cornersAway: toFiniteNumber(pickFixtureValue(fixture, ['corners_away', 'stats.corners.away', 'statistics.corners.away'])),
      possessionHome: toFiniteNumber(pickFixtureValue(fixture, ['possession_home', 'stats.possession.home', 'statistics.possession.home'])),
      possessionAway: toFiniteNumber(pickFixtureValue(fixture, ['possession_away', 'stats.possession.away', 'statistics.possession.away'])),
      attacksHome: toFiniteNumber(pickFixtureValue(fixture, ['attacks_home', 'stats.attacks.home', 'statistics.attacks.home'])),
      attacksAway: toFiniteNumber(pickFixtureValue(fixture, ['attacks_away', 'stats.attacks.away', 'statistics.attacks.away']))
    };
    const hasAny = Object.values(direct).some((v) => v != null);
    return hasAny ? direct : null;
  };

  const clampPitchCoordinate = (value, fallback = null) => {
    const parsed = toFiniteNumber(value);
    if (parsed == null) return fallback;
    return Math.max(0, Math.min(100, parsed));
  };

  const readFixtureBallCoordinates = (fixture) => {
    const xValue = pickFixtureValue(fixture, [
      'ball_position_x',
      'ball_position',
      'ballPositionX',
      'ballPosition',
      'ball.x',
      'ball.position.x',
      'ball.x_percentage',
      'live.ball_position_x',
      'live.ball_position',
      'live.ballPositionX',
      'live.ballPosition',
      'live.ball.x',
      'live.ball.position.x',
      'stats.ball_position_x',
      'stats.ball_position',
      'stats.ballPositionX',
      'stats.ballPosition',
      'stats.ball.x',
      'stats.ball.position.x',
      'statistics.ball_position_x',
      'statistics.ball_position',
      'statistics.ball.x',
      'tracker.ball_position_x',
      'tracker.ball_position',
      'tracker.ballPositionX',
      'tracker.ballPosition'
    ]);
    const yValue = pickFixtureValue(fixture, [
      'ball_position_y',
      'ballPositionY',
      'ball.y',
      'ball.position.y',
      'ball.y_percentage',
      'live.ball_position_y',
      'live.ballPositionY',
      'live.ball.y',
      'live.ball.position.y',
      'stats.ball_position_y',
      'stats.ballPositionY',
      'stats.ball.y',
      'stats.ball.position.y',
      'statistics.ball_position_y',
      'statistics.ball.y',
      'tracker.ball_position_y',
      'tracker.ballPositionY',
      'tracker.ball.y'
    ]);
    const x = clampPitchCoordinate(xValue);
    if (x == null) return null;
    return {
      x,
      y: clampPitchCoordinate(yValue, 50)
    };
  };

  const mergeRealLiveData = (fixture, sim) => {
    const minute = readFixtureMinute(fixture);
    const scores = readFixtureScores(fixture);
    const stats = readFixtureStats(fixture);
    const ballCoordinates = readFixtureBallCoordinates(fixture);
    const next = { ...sim };
    const statusText = String(
      fixture?.status ||
      fixture?.live_status ||
      fixture?.state ||
      ''
    ).trim().toLowerCase();
    const statusSignalsLive = statusContainsAny(statusText, LIVE_STATUS_TOKENS);
    const explicitLiveFlag = toBooleanLike(
      fixture?.is_live ?? fixture?.live ?? fixture?.inplay ?? fixture?.in_play
    );
    const kickoffTs = parseFixtureTs(fixture);
    const kickoffInFuture = Number.isFinite(kickoffTs) && kickoffTs > Date.now();
    if (kickoffInFuture) {
      next.preGame = true;
      next.minute = 0;
    }
    if (isFixtureFromLiveLineFeed(fixture)) {
      const hasLiveSignal = explicitLiveFlag || statusSignalsLive || (minute != null && minute > 0);
      next.preGame = !hasLiveSignal;
      if (!hasLiveSignal) {
        next.minute = 0;
      }
    }

    if (!kickoffInFuture && minute != null && minute > 0) {
      next.preGame = false;
      next.minute = minute;
    } else if (!kickoffInFuture && (statusSignalsLive || explicitLiveFlag)) {
      next.preGame = false;
      next.minute = 0;
    }
    if (scores) {
      next.homeScore = scores.home;
      next.awayScore = scores.away;
      next.hasRealScore = true;
    }
    if (stats) {
      next.hasRealStats = true;
      if (stats.shotsHome != null) next.shotsHome = Math.max(0, Math.floor(stats.shotsHome));
      if (stats.shotsAway != null) next.shotsAway = Math.max(0, Math.floor(stats.shotsAway));
      if (stats.cornersHome != null) next.cornersHome = Math.max(0, Math.floor(stats.cornersHome));
      if (stats.cornersAway != null) next.cornersAway = Math.max(0, Math.floor(stats.cornersAway));
      if (stats.attacksHome != null) next.attacksHome = Math.max(0, Math.floor(stats.attacksHome));
      if (stats.attacksAway != null) next.attacksAway = Math.max(0, Math.floor(stats.attacksAway));
      if (stats.possessionHome != null) {
        next.possessionHome = Math.max(0, Math.min(100, Math.floor(stats.possessionHome)));
        next.possessionAway = 100 - next.possessionHome;
      } else if (stats.possessionAway != null) {
        next.possessionAway = Math.max(0, Math.min(100, Math.floor(stats.possessionAway)));
        next.possessionHome = 100 - next.possessionAway;
      }
    }
    if (!kickoffInFuture && ballCoordinates) {
      next.ballPosition = ballCoordinates.x;
      next.ballPositionX = ballCoordinates.x;
      next.ballPositionY = ballCoordinates.y;
      next.hasBallCoordinates = true;
    } else if (isFixtureFromLiveLineFeed(fixture) || kickoffInFuture) {
      next.ballPosition = null;
      next.ballPositionX = null;
      next.ballPositionY = null;
      next.hasBallCoordinates = false;
    } else if (next.hasBallCoordinates !== true) {
      next.hasBallCoordinates = false;
    }
    return next;
  };

  const fixtureStatusText = (fixture) => String(
    fixture?.__rbSourceStatus
    || fixture?.status_raw
    || fixture?.statusRaw
    || fixture?.status_text
    || fixture?.status
    || fixture?.live_status
    || fixture?.state
    || ''
  ).trim().toLowerCase();

  const fixtureHasFinalStatus = (fixture) => statusContainsAny(fixtureStatusText(fixture), FINAL_STATUS_TOKENS);

  const fixtureIsLiveNow = (fixture, id = '') => {
    if (!fixture || typeof fixture !== 'object') return false;
    if (fixture?.finished === true || fixture?.completed === true) return false;
    if (fixtureHasFinalStatus(fixture)) return false;
    if (fixtureHasStaleLiveSignal(fixture)) return false;

    const statusText = fixtureStatusText(fixture);
    const statusSignalsLive = statusContainsAny(statusText, LIVE_STATUS_TOKENS);
    const explicitLiveFlag = toBooleanLike(
      fixture?.is_live ?? fixture?.live ?? fixture?.inplay ?? fixture?.in_play
    );
    const minute = toFiniteNumber(fixture?.live_minute ?? fixture?.minute ?? fixture?.elapsed);

    const kickoffTs = parseFixtureTs(fixture);
    if (Number.isFinite(kickoffTs) && kickoffTs > Date.now() && !explicitLiveFlag && !statusSignalsLive && !(minute != null && minute > 0)) {
      return false;
    }

    const sim = mergeRealLiveData(fixture, makeLiveSim(fixture, id || fixtureId(fixture, 0)));
    if (sim.preGame) return false;
    const hasRuntimeLive = explicitLiveFlag || statusSignalsLive || (minute != null && minute > 0) || Number(sim.minute) > 0;
    if (!hasRuntimeLive) return false;
    return true;
  };

  const formatLiveLabel = (sim, fixture) => {
    if (sim.preGame) {
      const kickoff = formatDateTime(parseFixtureTs(fixture));
      return kickoff
        ? `${t('liveLine.startsAt', 'מתחיל')} ${kickoff}`
        : t('liveLine.notStarted', 'טרם התחיל');
    }
    if (!Number.isFinite(sim.minute) || sim.minute <= 0) {
      return t('liveLine.liveLabel', 'Live');
    }
    if (sim.minute >= 46 && sim.minute <= 49) return t('liveLine.halfTime', 'מחצית');
    return `${t('liveLine.minute', 'דקה')} ${sim.minute}`;
  };

  const liveScoreParts = (sim) => {
    if (!sim?.hasRealScore) return null;
    return {
      home: String(Math.max(0, Math.floor(Number(sim.homeScore || 0)))),
      away: String(Math.max(0, Math.floor(Number(sim.awayScore || 0))))
    };
  };

  const teamInitials = (name) => {
    const words = String(name || '')
      .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return 'RB';
    const initials = words.length === 1
      ? words[0].slice(0, 3)
      : words.slice(0, 3).map((word) => word[0]).join('');
    return initials.toUpperCase();
  };

  const teamLogoUrl = (fixture, side) => {
    const prefix = side === 'away' ? 'away' : 'home';
    const value = pickFixtureValue(fixture, [
      `${prefix}_logo`,
      `${prefix}_team_logo`,
      `${prefix}_badge`,
      `${prefix}_badge_url`,
      `${prefix}_logo_url`,
      `${prefix}_team_image`,
      `${prefix}.logo`,
      `${prefix}.badge`,
      `${prefix}.image`,
      `teams.${prefix}.logo`,
      `teams.${prefix}.badge`,
      `teams.${prefix}.image`,
      `participants.${prefix}.logo`,
      `participants.${prefix}.badge`,
      `participants.${prefix}.image`
    ]);
    const url = String(value || '').trim().replace(/^http:\/\//i, 'https://');
    if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
    if (url.startsWith('assets/')) return `/${url}`;
    const teamName = fixtureSourceTeamName(fixture, side);
    const localLogo = localTeamLogoFromIndex(teamName);
    if (localLogo) return localLogo;
    const cachedBadge = sportsDbBadgeFromCache(teamName);
    if (cachedBadge) return cachedBadge;
    if (teamName) fetchSportsDbTeamBadge(teamName).catch(() => {});
    const slug = normalizedTeamSlug(teamName || (side === 'away' ? fixture?.away_team : fixture?.home_team));
    if (slug && LOCAL_TEAM_BADGE_SLUGS.has(slug)) {
      return `/assets/images/fifa-world-cup-2026/team-badges/${slug}.png`;
    }
    const flagFallback = fixtureFlagFallbackUrl(fixture, side);
    if (flagFallback) return flagFallback;
    return PLACEHOLDER_BADGE;
  };

  const nationalTeamFlagByName = (teamName) => {
    const normalized = normalizeText(teamName);
    if (!normalized) return '';
    const countryMatches = [
      ['us', ['usa', 'united states', 'america']],
      ['gb', ['great britain', 'united kingdom', 'england']],
      ['scotland', ['scotland']],
      ['il', ['israel']],
      ['br', ['brazil']],
      ['au', ['australia']],
      ['jp', ['japan']],
      ['kr', ['south korea', 'korea']],
      ['ca', ['canada']],
      ['nz', ['new zealand']],
      ['za', ['south africa']],
      ['dk', ['denmark']],
      ['it', ['italy']],
      ['de', ['germany']],
      ['fr', ['france']],
      ['nl', ['netherlands', 'the netherlands']],
      ['es', ['spain']],
      ['pt', ['portugal']],
      ['pl', ['poland']],
      ['se', ['sweden']],
      ['no', ['norway']],
      ['cn', ['china']],
      ['cl', ['chile']],
      ['ec', ['ecuador']],
      ['mx', ['mexico']],
      ['uy', ['uruguay']],
      ['ve', ['venezuela']],
      ['ma', ['morocco']],
      ['eg', ['egypt']],
      ['in', ['india']],
      ['pk', ['pakistan']],
      ['lk', ['sri lanka']]
    ];
    const match = countryMatches.find(([, names]) => names.some((name) => normalized === normalizeText(name)));
    return match ? localFlagForCountryKey(match[0]) : '';
  };

  const fixtureFlagFallbackUrl = (fixture, side = 'home') => {
    const teamName = fixtureSourceTeamName(fixture, side) || (side === 'away' ? fixture?.away_team : fixture?.home_team);
    const nationalFlag = nationalTeamFlagByName(teamName);
    if (nationalFlag) return nationalFlag;

    // Do not use league/country flags as club/team avatars. Otherwise every club
    // in the same domestic league receives the same flag, which looks misleading.
    return '';
  };

  const teamAvatarMarkup = (fixture, side, name, size = 'regular') => {
    const logo = teamLogoUrl(fixture, side);
    const seed = hashSeed(`${side}:${name}`);
    const hue = 12 + (seed % 210);
    const style = `--rb-team-hue:${hue}`;
    const label = escapeHtml(name || side);
    const cls = `rb-live-line-team-avatar rb-live-line-team-avatar--${escapeHtml(size)} ${String(logo || '').includes('/flags/small-flags/') ? 'rb-live-line-team-avatar--flag' : ''}`;
    if (logo) {
      return `<span class="${cls}" style="${style}" aria-label="${label}"><img src="${escapeHtml(logo)}" alt="${label}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_BADGE}'"></span>`;
    }
    return `<span class="${cls}" style="${style}" aria-label="${label}"><img src="${PLACEHOLDER_BADGE}" alt="${label}" loading="lazy"></span>`;
  };

  const matchStatusTone = (sim) => {
    if (sim.preGame) return { key: 'pregame', label: t('liveLine.status.pre', 'לפני משחק') };
    if (sim.minute >= 46 && sim.minute <= 49) return { key: 'half', label: t('liveLine.status.half', 'מחצית') };
    if (sim.minute >= 90) return { key: 'late', label: t('liveLine.status.late', 'דקות סיום') };
    return { key: 'live', label: t('liveLine.status.live', 'חי') };
  };

  const estimatedRemainingLabel = (sim, sportKey) => {
    const key = canonicalSportKey(sportKey);
    if (sim.preGame) return t('liveLine.remaining.pre', 'טרם התחיל');
    if (!Number.isFinite(sim.minute) || sim.minute <= 0) return t('liveLine.liveNow', 'חי עכשיו');
    if (key === 'basketball' || key === 'basketball3x3') {
      const quarter = Math.max(1, Math.min(4, Math.ceil((sim.minute || 1) / 10)));
      const left = Math.max(0, 40 - (sim.minute || 0));
      return `${t('liveLine.quarter', 'רבע')} ${quarter} · ${t('liveLine.remaining.approx', 'נותרו כ-')}${left} ${t('liveLine.minutesShort', 'דק׳')}`;
    }
    if (key === 'tennis' || key === 'table-tennis') {
      return `${t('liveLine.set', 'מערכה')} ${Math.max(1, Math.ceil((sim.minute || 1) / 28))}`;
    }
    if (['boxing', 'mma', 'wrestling', 'judo'].includes(key)) {
      return `${t('liveLine.round', 'סיבוב')} ${Math.max(1, Math.ceil((sim.minute || 1) / 5))}`;
    }
    if (['motorsport', 'cycling'].includes(key)) {
      return `${t('liveLine.raceClock', 'שעון מירוץ')} ${sim.minute}'`;
    }
    const left = Math.max(0, 90 - (sim.minute || 0));
    return left ? `${t('liveLine.remaining.approx', 'נותרו כ-')}${left} ${t('liveLine.minutesShort', 'דק׳')}` : t('liveLine.remaining.extra', 'תוספת זמן');
  };

  const regulationMinutesForSport = (sportKey) => {
    const key = canonicalSportKey(sportKey);
    if (key === 'basketball' || key === 'basketball3x3') return 40;
    if (key === 'tennis' || key === 'table-tennis') return 84;
    if (['boxing', 'mma', 'wrestling', 'judo'].includes(key)) return 15;
    if (['motorsport', 'cycling'].includes(key)) return 60;
    return 90;
  };

  const liveTimelineProgress = (sim, sportKey, fixture = null) => {
    if (!sim) return null;
    let minute = Math.max(0, Math.floor(Number(sim.minute || 0)));
    if (sim.preGame) {
      if (!LIVE_LINE_TIMELINE_PREVIEW) return null;
      const kickoffTs = parseFixtureTs(fixture || {});
      if (Number.isFinite(kickoffTs) && kickoffTs > 0) {
        const minsToKickoff = Math.max(0, Math.floor((kickoffTs - Date.now()) / 60000));
        minute = Math.max(1, Math.min(12, 12 - Math.min(12, minsToKickoff)));
      } else {
        minute = 8;
      }
    }
    if (!sim.preGame && (!Number.isFinite(minute) || minute <= 0)) return null;
    const total = Math.max(1, regulationMinutesForSport(sportKey));
    const percent = Math.max(0, Math.min(100, (minute / total) * 100));
    return {
      minute,
      total,
      percent,
      label: `${minute}'`
    };
  };

  const momentumInfo = (sim, homeName, awayName) => {
    const attackDiff = Number(sim.attacksHome || 0) - Number(sim.attacksAway || 0);
    const possessionDiff = Number(sim.possessionHome || 50) - Number(sim.possessionAway || 50);
    const score = attackDiff * 0.7 + possessionDiff * 0.6 + (Number(sim.shotsHome || 0) - Number(sim.shotsAway || 0)) * 1.5;
    const homeShare = Math.max(12, Math.min(88, 50 + score));
    if (Math.abs(score) < 8) {
      return {
        key: 'balanced',
        label: t('liveLine.momentum.balanced', 'משחק מאוזן'),
        share: 50
      };
    }
    return {
      key: score > 0 ? 'home' : 'away',
      label: score > 0
        ? `${t('liveLine.momentum.pressure', 'לחץ')} ${homeName}`
        : `${t('liveLine.momentum.pressure', 'לחץ')} ${awayName}`,
      share: homeShare
    };
  };

  const compactStatsForMatch = (sim, sportKey) => {
    if (!sim?.hasRealStats) return [];
    const key = canonicalSportKey(sportKey);
    if (key === 'tennis' || key === 'table-tennis') {
      return [
        { icon: 'A', label: t('liveLine.stats.aces', 'אייסים'), value: `${Math.max(0, Math.floor((sim.shotsHome || 0) / 2))}-${Math.max(0, Math.floor((sim.shotsAway || 0) / 2))}` },
        { icon: '%', label: t('liveLine.stats.firstServe', 'הגשה'), value: `${sim.possessionHome}%` },
        { icon: 'W', label: t('liveLine.stats.winners', 'ווינרים'), value: `${sim.attacksHome}-${sim.attacksAway}` }
      ];
    }
    if (key === 'basketball' || key === 'basketball3x3') {
      return [
        { icon: '2P', label: t('liveLine.stats.fieldGoalPct', 'קליעה'), value: `${sim.possessionHome}%` },
        { icon: 'A', label: t('liveLine.stats.assists', 'אסיסטים'), value: `${Math.floor((sim.attacksHome || 0) / 4)}-${Math.floor((sim.attacksAway || 0) / 4)}` },
        { icon: 'R', label: t('liveLine.stats.rebounds', 'ריב׳'), value: `${Math.floor((sim.shotsHome || 0) * 1.4)}-${Math.floor((sim.shotsAway || 0) * 1.4)}` }
      ];
    }
    return [
      { icon: 'S', label: t('liveLine.stats.shots', 'בעיטות'), value: `${sim.shotsHome}-${sim.shotsAway}` },
      { icon: 'C', label: t('liveLine.stats.corners', 'קרנות'), value: `${sim.cornersHome}-${sim.cornersAway}` },
      { icon: '%', label: t('liveLine.stats.possession', 'שליטה'), value: `${sim.possessionHome}%` }
    ];
  };

  const compactStatsForMatchResolved = (sim, sportKey) => {
    if (!sim?.hasRealStats) return [];
    const key = canonicalSportKey(sportKey);
    if (['boxing', 'mma', 'wrestling', 'judo'].includes(key)) {
      return [
        { icon: 'H', label: t('liveLine.stats.significantHits', 'מכות משמעותיות'), value: `${Math.max(0, Math.floor((sim.shotsHome || 0) * 0.8))}-${Math.max(0, Math.floor((sim.shotsAway || 0) * 0.8))}` },
        { icon: 'C', label: t('liveLine.stats.controlTime', 'זמן שליטה'), value: `${sim.possessionHome}%` },
        { icon: 'A', label: t('liveLine.stats.attempts', 'ניסיונות'), value: `${sim.attacksHome}-${sim.attacksAway}` }
      ];
    }
    if (key === 'baseball' || key === 'cricket') {
      return [
        { icon: 'H', label: t('liveLine.stats.hits', 'חבטות'), value: `${Math.max(0, Math.floor((sim.shotsHome || 0) / 1.5))}-${Math.max(0, Math.floor((sim.shotsAway || 0) / 1.5))}` },
        { icon: 'K', label: t('liveLine.stats.strikeouts', 'סטרייקאאוטים'), value: `${sim.attacksHome}-${sim.attacksAway}` },
        { icon: '%', label: t('liveLine.stats.control', 'שליטה'), value: `${sim.possessionHome}%` }
      ];
    }
    if (['motorsport', 'cycling'].includes(key)) {
      return [
        { icon: 'L', label: t('liveLine.stats.laps', 'הקפות'), value: `${Math.max(1, Math.floor((sim.minute || 0) / 2))}` },
        { icon: 'S', label: t('liveLine.stats.topSpeed', 'מהירות שיא'), value: `${120 + (sim.shotsHome || 0)}` },
        { icon: 'P', label: t('liveLine.stats.pitStops', 'עצירות פיט'), value: `${sim.cornersHome}-${sim.cornersAway}` }
      ];
    }
    return compactStatsForMatch(sim, sportKey);
  };

  const UPDATE_ICON_SCORE = '/assets/images/updates/Updated_Event_Score.png';
  const UPDATE_ICON_NEW = '/assets/images/updates/Updated_Event_New.png';
  const UPDATE_ICON_COMMENT = '/assets/images/updates/Updated_Event_Comment.png';
  const SPORT_ICON_BY_SLUG = {
    football: '/assets/images/football-ball/favicon-32x32.png',
    basketball: '/assets/images/sports/basketball.png',
    tennis: '/assets/images/sports/tennis.png',
    cricket: '/assets/images/sports/cricket.png',
    baseball: '/assets/images/sports/baseball.png',
    handball: '/assets/images/sports/Handball.png',
    rugby: '/assets/images/sports/rugby.png',
    'american-football': '/assets/images/sports/American Football.png',
    'beach-volleyball': '/assets/images/sports/volleyball.png',
    motorsport: '/assets/images/sports/Motorsport.png',
    cycling: '/assets/images/sports/cycling.png',
    boxing: '/assets/images/sports/fighting.png',
    mma: '/assets/images/sports/fighting.png',
    wrestling: '/assets/images/sports/fighting.png',
    judo: '/assets/images/sports/fighting.png',
    darts: '/assets/images/sports/Darts.png',
    golf: '/assets/images/sports/golf.png',
    snooker: '/assets/images/sports/snooker.png'
  };
  const sportIconUrl = (sportSlug) => SPORT_ICON_BY_SLUG[String(sportSlug || '').trim()] || '';
  const sportIconMarkup = (sportSlug, label = '') => {
    const icon = sportIconUrl(sportSlug);
    if (!icon) return '';
    return `<img class="rb-live-line-sport-icon" src="${escapeHtml(icon)}" alt="${escapeHtml(label || sportSlug)}" loading="lazy" decoding="async">`;
  };
  const renderSignalIcon = (icon) => {
    const value = String(icon || '').trim();
    if (/\.(png|svg|webp|jpg|jpeg)$/i.test(value) || value.startsWith('/')) {
      return `<img src="${escapeHtml(value)}" alt="" loading="lazy" decoding="async">`;
    }
    return escapeHtml(value);
  };
  const renderSignalPill = (icon, label, value, tone = 'neutral') => `
    <span class="rb-live-line-signal rb-live-line-signal--${escapeHtml(tone)}">
      <i>${renderSignalIcon(icon)}</i>
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(String(value || ''))}</b>
    </span>
  `;

  const oddsStateSignalForFixture = (fixture) => {
    const state = fixtureOddsState(fixture) || (fixtureHasFreshOddsSignal(fixture) ? 'active' : 'suspended');
    const age = Number(fixture?.odds_age_seconds ?? fixture?.oddsAgeSeconds);
    const ageLabel = Number.isFinite(age)
      ? (age < 60 ? `${Math.max(0, Math.floor(age))}s` : `${Math.floor(age / 60)}m`)
      : '';
    if (state === 'active') return renderSignalPill(UPDATE_ICON_SCORE, t('liveLine.odds.active', 'יחסים'), ageLabel || t('liveLine.odds.activeShort', 'פעיל'), 'good');
    if (state === 'stale') return renderSignalPill(UPDATE_ICON_COMMENT, t('liveLine.odds.stale', 'יחסים'), ageLabel || t('liveLine.odds.staleShort', 'מושהה'), 'warn');
    return renderSignalPill(UPDATE_ICON_NEW, t('liveLine.odds.suspended', 'יחסים'), t('liveLine.odds.unavailable', 'לא זמין'), 'bad');
  };

  const renderAccordionSection = (key, title, badge, body, openKey) => {
    const open = key === openKey;
    return `
      <section class="rb-live-line-accordion-item ${open ? 'open' : ''}">
        <button type="button" class="rb-live-line-accordion-toggle" data-rb-live-line-panel-toggle="${escapeHtml(key)}" aria-expanded="${open ? 'true' : 'false'}">
          <span>${escapeHtml(title)}</span>
          <em>${escapeHtml(badge || '')}</em>
          <i>${open ? '-' : '+'}</i>
        </button>
        <div class="rb-live-line-accordion-body" ${open ? '' : 'hidden'}>
          ${body}
        </div>
      </section>
    `;
  };

  const reorderSimulationAccordionItemsInDom = (scope) => {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
  };

  const detailStatsForSport = (sim, sportKey) => {
    if (!sim?.hasRealStats) return [];
    const key = canonicalSportKey(sportKey);
    if (key === 'tennis' || key === 'table-tennis') {
      const homeAces = Math.max(0, Math.floor((sim.shotsHome || 0) / 2));
      const awayAces = Math.max(0, Math.floor((sim.shotsAway || 0) / 2));
      const homeDoubleFaults = Math.max(0, Math.floor((sim.cornersHome || 0) / 2));
      const awayDoubleFaults = Math.max(0, Math.floor((sim.cornersAway || 0) / 2));
      return [
        { label: t('liveLine.stats.aces', 'אייסים'), value: `${homeAces}-${awayAces}` },
        { label: t('liveLine.stats.doubleFaults', 'שגיאות כפולות'), value: `${homeDoubleFaults}-${awayDoubleFaults}` },
        { label: t('liveLine.stats.firstServe', 'אחוז הגשה ראשונה'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` },
        { label: t('liveLine.stats.winners', 'ווינרים'), value: `${sim.attacksHome}-${sim.attacksAway}` }
      ];
    }
    if (key === 'basketball' || key === 'basketball3x3') {
      const homeRebounds = Math.max(0, Math.floor((sim.attacksHome || 0) / 2.6));
      const awayRebounds = Math.max(0, Math.floor((sim.attacksAway || 0) / 2.6));
      const homeAssists = Math.max(0, Math.floor((sim.shotsHome || 0) / 1.8));
      const awayAssists = Math.max(0, Math.floor((sim.shotsAway || 0) / 1.8));
      const homeTurnovers = Math.max(0, Math.floor((sim.cornersHome || 0) / 2));
      const awayTurnovers = Math.max(0, Math.floor((sim.cornersAway || 0) / 2));
      return [
        { label: t('liveLine.stats.rebounds', 'ריבאונדים'), value: `${homeRebounds}-${awayRebounds}` },
        { label: t('liveLine.stats.assists', 'אסיסטים'), value: `${homeAssists}-${awayAssists}` },
        { label: t('liveLine.stats.turnovers', 'איבודים'), value: `${homeTurnovers}-${awayTurnovers}` },
        { label: t('liveLine.stats.fieldGoalPct', 'אחוזי קליעה'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` }
      ];
    }
    if (key === 'baseball' || key === 'cricket') {
      const homeHits = Math.max(0, Math.floor((sim.shotsHome || 0) / 1.5));
      const awayHits = Math.max(0, Math.floor((sim.shotsAway || 0) / 1.5));
      return [
        { label: t('liveLine.stats.hits', 'חבטות'), value: `${homeHits}-${awayHits}` },
        { label: t('liveLine.stats.errors', 'שגיאות'), value: `${sim.cornersHome}-${sim.cornersAway}` },
        { label: t('liveLine.stats.strikeouts', 'סטרייקאאוטים'), value: `${sim.attacksHome}-${sim.attacksAway}` },
        { label: t('liveLine.stats.control', 'שליטה'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` }
      ];
    }
    if (['boxing', 'mma', 'wrestling', 'judo'].includes(key)) {
      const homeHits = Math.max(0, Math.floor((sim.shotsHome || 0) * 0.8));
      const awayHits = Math.max(0, Math.floor((sim.shotsAway || 0) * 0.8));
      return [
        { label: t('liveLine.stats.significantHits', 'מכות משמעותיות'), value: `${homeHits}-${awayHits}` },
        { label: t('liveLine.stats.controlTime', 'זמן שליטה'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` },
        { label: t('liveLine.stats.attempts', 'ניסיונות'), value: `${sim.attacksHome}-${sim.attacksAway}` },
        { label: t('liveLine.stats.knockdowns', 'נוקאאונים'), value: `${Math.max(0, Math.floor((sim.cornersHome || 0) / 2))}-${Math.max(0, Math.floor((sim.cornersAway || 0) / 2))}` }
      ];
    }
    if (['motorsport', 'cycling'].includes(key)) {
      const homeLaps = Math.max(1, Math.floor((sim.minute || 0) / 2));
      const awayLaps = Math.max(1, Math.floor((sim.minute || 0) / 2) + ((sim.shotsAway || 0) > (sim.shotsHome || 0) ? 1 : 0));
      return [
        { label: t('liveLine.stats.laps', 'הקפות'), value: `${homeLaps}-${awayLaps}` },
        { label: t('liveLine.stats.topSpeed', 'מהירות שיא'), value: `${120 + (sim.shotsHome || 0)} - ${120 + (sim.shotsAway || 0)}` },
        { label: t('liveLine.stats.pitStops', 'עצירות פיט'), value: `${sim.cornersHome}-${sim.cornersAway}` },
        { label: t('liveLine.stats.raceControl', 'שליטת מירוץ'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` }
      ];
    }
    if (['water-polo', 'swimming', 'surfing', 'sailing', 'beach-volleyball'].includes(key)) {
      return [
        { label: t('liveLine.stats.attempts', 'ניסיונות'), value: `${sim.shotsHome}-${sim.shotsAway}` },
        { label: t('liveLine.stats.phases', 'מהלכים'), value: `${sim.attacksHome}-${sim.attacksAway}` },
        { label: t('liveLine.stats.fouls', 'עבירות'), value: `${sim.cornersHome}-${sim.cornersAway}` },
        { label: t('liveLine.stats.control', 'שליטה'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` }
      ];
    }
    if (['darts', 'golf', 'snooker', 'bowling'].includes(key)) {
      return [
        { label: t('liveLine.stats.rounds', 'סיבובים'), value: `${Math.max(1, Math.floor((sim.minute || 1) / 4))}` },
        { label: t('liveLine.stats.precision', 'דיוק'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` },
        { label: t('liveLine.stats.success', 'הצלחות'), value: `${sim.shotsHome}-${sim.shotsAway}` },
        { label: t('liveLine.stats.attempts', 'ניסיונות'), value: `${sim.attacksHome}-${sim.attacksAway}` }
      ];
    }
    return [
      { label: t('liveLine.stats.shots', 'בעיטות'), value: `${sim.shotsHome}-${sim.shotsAway}` },
      { label: t('liveLine.stats.corners', 'קרנות'), value: `${sim.cornersHome}-${sim.cornersAway}` },
      { label: t('liveLine.stats.possession', 'החזקת כדור'), value: `${sim.possessionHome}% - ${sim.possessionAway}%` },
      { label: t('liveLine.stats.attacks', 'התקפות'), value: `${sim.attacksHome}-${sim.attacksAway}` }
    ];
  };

  const buildTimelineEvents = (fixture, sim, id, sportKey) => {
    if (sim.preGame) return [];
    const rawTimeline = pickFixtureValue(fixture, ['timeline', 'events', 'incidents', 'live_events']);
    if (Array.isArray(rawTimeline) && rawTimeline.length) {
      const normalized = rawTimeline
        .map((row) => {
          const minute = toFiniteNumber(pickFixtureValue(row, ['minute', 'time', 'elapsed']));
          const text = String(pickFixtureValue(row, ['text', 'label', 'type', 'name', 'event']) || '').trim();
          const team = String(pickFixtureValue(row, ['team', 'side']) || '').toLowerCase();
          const side = team.includes('home') ? 'home' : (team.includes('away') ? 'away' : 'neutral');
          if (minute == null || !text) return null;
          return { minute: Math.max(0, Math.floor(minute)), label: text, side };
        })
        .filter(Boolean)
        .sort((a, b) => b.minute - a.minute)
        .slice(0, 8);
      if (normalized.length) return normalized;
    }
    return [];
  };

  const isSimulationMarketRow = (row) => {
    return false;
  };

  const moveSimulationRowsToEnd = (rows) => {
    const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (!list.length) return [];
    return list;
  };

  const normalizeMarketText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}+/.\\\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const MARKET_TITLE_TRANSLATIONS = [
    { keys: ['h2h', 'match winner', 'result', 'moneyline'], he: 'תוצאה' },
    { keys: ['rest of match', 'remaining match'], he: 'הימור על שאר המשחק' },
    { keys: ['both teams to score', 'btts'], he: 'שתי הקבוצות יבקיעו' },
    { keys: ['draw no bet', 'dnb'], he: 'תיקו אין הימור' },
    { keys: ['result both teams to score', 'result btts'], he: 'תוצאה + שתי הקבוצות יבקיעו' },
    { keys: ['result total goals 1.5', 'result over under 1.5'], he: 'תוצאה + אובר/אנדר 1.5' },
    { keys: ['result total goals 2.5', 'result over under 2.5'], he: 'תוצאה + אובר/אנדר 2.5' },
    { keys: ['spreads', 'handicap', 'asian handicap'], he: 'הנדיקפ' },
    { keys: ['3 way handicap', 'handicap 3 way'], he: 'עדיפות (3 אפשרויות)' },
    { keys: ['totals', 'total goals', 'over under', 'goals over under'], he: 'סה״כ שערים' },
    { keys: ['asian total', 'asian goals'], he: 'סך הכל שערים - אסיאתי' },
    { keys: ['odd even goals', 'goals odd even'], he: 'שערים - זוגי/אי-זוגי' },
    { keys: ['exact goals', 'total exact goals'], he: 'כמות שערים מדוייקת' },
    { keys: ['correct score', 'exact score'], he: 'תוצאה מדוייקת' },
    { keys: ['next goal', 'next team to score'], he: 'גול הבא' },
    { keys: ['double chance'], he: 'אפשרות כפולה' },
    { keys: ['double chance btts', 'double chance both teams to score'], he: 'אפשרות כפולה + שתי הקבוצות יבקיעו' },
    { keys: ['halftime result', 'first half result', 'half time result'], he: 'תוצאת מחצית' },
    { keys: ['home total goals', 'home team total goals'], he: 'סה״כ שערים - קבוצת בית' },
    { keys: ['away total goals', 'away team total goals'], he: 'סה״כ שערים - קבוצת חוץ' },
    { keys: ['team total goals'], he: 'כמות שערים' },
    { keys: ['corners totals', 'corners over under'], he: 'קרנות - אובר/אנדר' },
    { keys: ['corners result'], he: 'קרנות - תוצאה' },
    { keys: ['corners correct score'], he: 'קרנות - תוצאה מדויקת' },
    { keys: ['corners odd even'], he: 'קרנות זוגי/אי-זוגי' },
    { keys: ['corners asian handicap'], he: 'קרנות - עדיפות אסיאתית' },
    { keys: ['yellow cards totals', 'cards totals', 'bookings totals'], he: 'כרטיסים צהובים אובר/אנדר' },
    { keys: ['yellow cards', 'cards', 'bookings'], he: 'כרטיסים צהובים' },
    { keys: ['yellow cards asian handicap', 'cards asian handicap'], he: 'כרטיסים צהובים - עדיפות אסיאתית' },
    { keys: ['yellow cards double chance', 'cards double chance'], he: 'כרטיסים צהובים - אפשרות כפולה' },
    { keys: ['yellow cards correct score', 'cards correct score'], he: 'כרטיסים צהובים: תוצאה מדוייקת' },
    { keys: ['win to nil', 'win to zero'], he: 'ניצחון על ה-0' }
  ];

  const translatedProviderMarketTitle = (rawTitle, rawKey = '') => {
    const title = String(rawTitle || '').trim();
    const key = String(rawKey || '').trim();
    const normalized = normalizeMarketText(`${key} ${title}`);
    const hit = MARKET_TITLE_TRANSLATIONS.find((entry) => entry.keys.some((candidate) => {
      const normalizedCandidate = normalizeMarketText(candidate);
      return normalizedCandidate && normalized.includes(normalizedCandidate);
    }));
    return hit?.he || title || key;
  };

  const normalizedOutcomeTeamName = (value) => normalizeMarketText(value)
    .replace(/[+.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isResultLikeProviderMarket = (marketKey, marketTitle) => {
    const normalized = normalizeMarketText(`${marketKey || ''} ${marketTitle || ''}`);
    return ['h2h', 'match winner', 'moneyline', 'result', 'תוצאה'].some((candidate) => {
      const needle = normalizeMarketText(candidate);
      return needle && normalized.includes(needle);
    });
  };

  const resultOutcomeLabelForFixture = (fixture, rawLabel, outcomeIndex, outcomeCount) => {
    const label = String(rawLabel || '').trim();
    const normalized = normalizedOutcomeTeamName(label);
    const homeNames = [
      fixture?.home_team,
      fixture?.home_team_original,
      fixture?.home_team_source,
      fixture?.__rbSourceHomeTeam
    ].map(normalizedOutcomeTeamName).filter(Boolean);
    const awayNames = [
      fixture?.away_team,
      fixture?.away_team_original,
      fixture?.away_team_source,
      fixture?.__rbSourceAwayTeam
    ].map(normalizedOutcomeTeamName).filter(Boolean);
    if (homeNames.includes(normalized)) return { label: '1', marketKey: 'home' };
    if (awayNames.includes(normalized)) return { label: '2', marketKey: 'away' };
    if (['x', 'draw', 'tie', 'שוויון', 'תיקו'].includes(normalized)) return { label: 'X', marketKey: 'draw' };
    if (outcomeCount === 3) {
      if (outcomeIndex === 0) return { label: '1', marketKey: 'home' };
      if (outcomeIndex === 1) return { label: 'X', marketKey: 'draw' };
      if (outcomeIndex === 2) return { label: '2', marketKey: 'away' };
    }
    if (outcomeCount === 2) {
      if (outcomeIndex === 0) return { label: '1', marketKey: 'home' };
      if (outcomeIndex === 1) return { label: '2', marketKey: 'away' };
    }
    return { label, marketKey: '' };
  };

  const requestedLockedLiveMarketsForFixture = (fixture) => {
    const home = String(fixture?.home_team || '').trim() || '1';
    const away = String(fixture?.away_team || '').trim() || '2';
    const draw = t('liveLine.market.draw', 'שוויון');
    const lockedMarket = (title, labels, sourceKey) => ({
      title,
      sourceKey,
      cols: labels,
      odds: labels.map(() => null),
      selections: labels.map((label, index) => ({
        label,
        marketId: '',
        selectionId: '',
        marketKey: `${sourceKey}-${index}`,
        readonly: true,
        unavailable: true
      }))
    });
    const comboLabels = [
      `${home} + אובר 1.5`,
      `${draw} + אובר 1.5`,
      `${away} + אובר 1.5`,
      '1X + אובר 1.5',
      '12 + אובר 1.5',
      'X2 + אובר 1.5',
      `${home} + אנדר 1.5`,
      `${draw} + אנדר 1.5`,
      `${away} + אנדר 1.5`,
      '1X + אנדר 1.5',
      '12 + אנדר 1.5',
      'X2 + אנדר 1.5'
    ];
    return [
      lockedMarket('סה״כ שערים', ['אובר (2.5)'], 'requested-total-goals'),
      lockedMarket('הנדיקפ', [`${home} (-2.0)`], 'requested-handicap'),
      lockedMarket('תוצאה + אובר / אנדר 1.5', comboLabels, 'requested-result-total-1-5')
    ];
  };

  const appendRequestedLockedLiveMarkets = (rows, fixture) => {
    const source = Array.isArray(rows) ? rows : [];
    const existingTitles = new Set(source.map((market) => String(market?.title || '').trim()).filter(Boolean));
    const requested = requestedLockedLiveMarketsForFixture(fixture)
      .filter((market) => !existingTitles.has(String(market?.title || '').trim()));
    return source.concat(requested);
  };

  const marketRowsForFixture = (fixture, sim, id, sportKey) => {
    const providerMarketTitle = (market) => {
      const key = String(pickFixtureValue(market, ['key', 'id', 'market_id', 'marketId']) || '').trim().toLowerCase();
      const title = String(pickFixtureValue(market, ['label', 'name', 'title']) || '').trim();
      return translatedProviderMarketTitle(title, key);
    };
    const providerOutcomeLabel = (outcome, marketKey, marketTitle, outcomeIndex, outcomeCount) => {
      const base = String(pickFixtureValue(outcome, ['label', 'name', 'title']) || '').trim();
      const description = String(pickFixtureValue(outcome, ['description']) || '').trim();
      const point = toFiniteNumber(pickFixtureValue(outcome, ['point', 'line', 'handicap']));
      const suffix = point != null ? ` ${point > 0 ? '+' : ''}${point}` : '';
      const prefix = description && description !== base ? `${description} ` : '';
      const rawLabel = `${prefix}${base}${suffix}`.trim();
      if (isResultLikeProviderMarket(marketKey, marketTitle)) {
        return resultOutcomeLabelForFixture(fixture, rawLabel || base || description, outcomeIndex, outcomeCount);
      }
      return { label: rawLabel, marketKey: '' };
    };
    let sourceRows = [];
    const sourceMarkets = pickFixtureValue(fixture, ['markets', 'bookmakers.0.markets', 'odds.markets']);
    if (Array.isArray(sourceMarkets) && sourceMarkets.length) {
      sourceRows = sourceMarkets
        .map((market) => {
          const rawMarketKey = String(pickFixtureValue(market, ['key', 'id', 'market_id', 'marketId']) || '').trim();
          const title = providerMarketTitle(market);
          const outcomes = pickFixtureValue(market, ['outcomes', 'selections', 'values', 'odds']);
          if (!title || !Array.isArray(outcomes) || !outcomes.length) return null;
          const mapped = outcomes
            .map((outcome, outcomeIndex) => {
              const outcomeLabel = providerOutcomeLabel(outcome, rawMarketKey, title, outcomeIndex, outcomes.length);
              const label = String(outcomeLabel?.label || '').trim();
              const odd = toFiniteNumber(pickFixtureValue(outcome, ['odd', 'price', 'value']));
              if (!label || odd == null) return null;
              return {
                label,
                marketKey: String(outcomeLabel?.marketKey || '').trim(),
                odd: Math.max(1.01, odd),
                index: outcomeIndex,
                marketId: String(
                  pickFixtureValue(outcome, ['market_id', 'marketId'])
                  || pickFixtureValue(market, ['market_id', 'marketId', 'id', 'key'])
                  || fixture?.market_id
                  || fixture?.marketId
                  || fixture?.fixture_id
                  || fixture?.id
                  || ''
                ).trim(),
                selectionId: String(
                  pickFixtureValue(outcome, ['selection_id', 'selectionId', 'outcome_id', 'outcomeId', 'id'])
                  || String(outcomeLabel?.marketKey || '').trim()
                  || ''
                ).trim()
              };
            })
            .filter(Boolean);
          if (!mapped.length) return null;
          return {
            title,
            sourceKey: rawMarketKey,
            cols: mapped.map((row) => row.label),
            odds: mapped.map((row) => row.odd),
            selections: mapped.map((row) => ({
              label: row.label,
              marketId: row.marketId,
              selectionId: row.selectionId,
              marketKey: row.marketKey || normalizeMarketKey(row.label, row.index, mapped.length, fixture?.home_team, fixture?.away_team)
            }))
          };
        })
        .filter(Boolean);
    }
    if (sourceRows.length) {
      return moveSimulationRowsToEnd(appendRequestedLockedLiveMarkets(sourceRows, fixture));
    }
    const topLevelResultSelections = [
      { label: '1', odd: toFiniteNumber(fixture?.odds_home ?? fixture?.home_odds), marketKey: 'home' },
      { label: 'X', odd: toFiniteNumber(fixture?.odds_draw ?? fixture?.draw_odds), marketKey: 'draw' },
      { label: '2', odd: toFiniteNumber(fixture?.odds_away ?? fixture?.away_odds), marketKey: 'away' }
    ].filter((selection) => selection.odd != null && selection.odd > 1);
    if (topLevelResultSelections.length >= 2) {
      return moveSimulationRowsToEnd(appendRequestedLockedLiveMarkets([{
        title: t('liveLine.market.result', 'תוצאה'),
        sourceKey: 'h2h',
        cols: topLevelResultSelections.map((selection) => selection.label),
        odds: topLevelResultSelections.map((selection) => selection.odd),
        selections: topLevelResultSelections.map((selection) => ({
          label: selection.label,
          marketId: String(fixture?.market_id || fixture?.marketId || fixture?.fixture_id || fixture?.id || '').trim(),
          selectionId: selection.marketKey,
          marketKey: selection.marketKey
        }))
      }], fixture));
    }
    return moveSimulationRowsToEnd(appendRequestedLockedLiveMarkets([], fixture));
  };

  const primaryMarketPreviewForFixture = (fixture, sim, id, sportKey) => {
    const rows = marketRowsForFixture(fixture, sim, id, sportKey)
      .filter((market) => Array.isArray(market?.odds) && market.odds.length);
    if (!rows.length) return null;
    const preferred = rows.find((market) => {
      const key = String(market?.sourceKey || market?.title || '').trim().toLowerCase();
      return key === 'h2h' || key.includes('result') || key.includes('winner') || key.includes('תוצאה');
    }) || rows[0];
    const odds = preferred.odds
      .map((odd, index) => ({
        odd: toFiniteNumber(odd),
        label: String(preferred.cols?.[index] || preferred.selections?.[index]?.label || '').trim()
      }))
      .filter((row) => row.odd != null && row.label)
      .slice(0, 3);
    if (!odds.length) return null;
    return {
      title: String(preferred.title || '').trim(),
      odds
    };
  };

  const pitchVariantForSport = (sportKey) => {
    const key = String(sportKey || '').toLowerCase();
    if (['basketball', 'basketball3x3'].includes(key)) return 'basketball';
    if (['tennis', 'table-tennis'].includes(key)) return 'tennis';
    if (['football', 'rugby', 'american-football', 'handball'].includes(key)) return 'football';
    if (['water-polo', 'swimming', 'surfing', 'sailing', 'beach-volleyball'].includes(key)) return 'water';
    if (['motorsport', 'cycling'].includes(key)) return 'motor';
    if (['boxing', 'mma', 'wrestling', 'judo'].includes(key)) return 'combat';
    if (['darts', 'golf', 'snooker', 'bowling'].includes(key)) return 'precision';
    return 'generic';
  };

  const liveLineBallPositionCache = new Map();
  const liveTrackerDomCache = new Map();

  const rememberExistingLiveTrackerNodes = (scope = document) => {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('[class~="3d-match-tracker"][data-rb-live-tracker-fixture]').forEach((node) => {
      const fixtureId = String(node.getAttribute('data-rb-live-tracker-fixture') || '').trim();
      if (!fixtureId) return;
      liveTrackerDomCache.set(fixtureId, node);
    });
  };

  const restorePreservedLiveTrackerNodes = (scope = document) => {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('[data-rb-live-tracker-preserve]').forEach((slot) => {
      const fixtureId = String(slot.getAttribute('data-rb-live-tracker-preserve') || '').trim();
      if (!fixtureId) return;
      const cachedNode = liveTrackerDomCache.get(fixtureId);
      if (!cachedNode) return;
      slot.replaceWith(cachedNode);
    });
  };

  const hasLiveTrackerNode = (fixtureId = '') => {
    const safeFixtureId = String(fixtureId || '').trim();
    if (!safeFixtureId) return Boolean(document.querySelector('[class~="3d-match-tracker"]'));
    return Array.from(document.querySelectorAll('[class~="3d-match-tracker"]')).some((node) => {
      const nodeFixtureId = String(node.getAttribute('data-rb-live-tracker-fixture') || '').trim();
      return nodeFixtureId === safeFixtureId;
    });
  };
  const liveTrackerSocketState = {
    scriptPromise: null,
    socket: null,
    connected: false,
    updatesByFixtureId: new Map()
  };

  const normalizeTrackerState = (value) => {
    const stateKey = String(value || '').trim().toUpperCase();
    if (stateKey === 'MIDFIELD') return 'MIDFIELD';
    if (stateKey === 'ATTACK_A') return 'ATTACK_A';
    if (stateKey === 'ATTACK_B') return 'ATTACK_B';
    if (stateKey === 'DANGEROUS_ATTACK_A') return 'DANGEROUS_ATTACK_A';
    if (stateKey === 'DANGEROUS_ATTACK_B') return 'DANGEROUS_ATTACK_B';
    if (stateKey === 'GOAL_A') return 'GOAL_A';
    if (stateKey === 'GOAL_B') return 'GOAL_B';
    if (stateKey === 'SUSPENDED') return 'SUSPENDED';
    return 'MIDFIELD';
  };

  const normalizeTrackerPossession = (value) => {
    const possessionKey = String(value || '').trim().toUpperCase();
    return possessionKey === 'TEAM_B' ? 'TEAM_B' : 'TEAM_A';
  };

  const trackerTargetFromState = (stateKey, previousX = 50, previousY = 50) => {
    return { x: previousX, y: previousY };
  };

  const trackerDepthScale = (y) => {
    const safeY = Math.max(20, Math.min(90, Number(y || 50)));
    const normalized = (safeY - 20) / 70;
    return 0.62 + (normalized * 0.56);
  };

  const trackerFixtureId = (fixture, fallback = '') => {
    const value = fixture?.fixture_id || fixture?.id || fallback || '';
    return String(value || '').trim();
  };

  const safeTrackerText = (value) => {
    const text = String(value || '').trim();
    if (text) return text;
    return t('liveLine.noTracking', '\u05d0\u05d9\u05df \u05e0\u05ea\u05d5\u05e0\u05d9 \u05de\u05d9\u05e7\u05d5\u05dd \u05d7\u05d9\u05d9\u05dd \u05db\u05e8\u05d2\u05e2');
  };

  const getLiveTrackerSocketTargets = () => {
    const explicitSocketBase = String(window.ROYALBET_SOCKET_URL || '').trim().replace(/\/+$/, '');
    const apiBase = String(window.ROYALBET_API_BASE || '').trim().replace(/\/+$/, '');
    const derivedApiBase = String(liveLineApiBase() || '').trim().replace(/\/+$/, '');
    const currentOrigin = String(window.location.origin || '').trim().replace(/\/+$/, '');
    const host = String(window.location.hostname || '').toLowerCase();
    const baseHost = host.startsWith('www.') ? host.slice(4) : host;
    const isLocalHost = ['localhost'].includes(host);
    const dedupe = (values) => Array.from(new Set(values.filter(Boolean)));

    if (explicitSocketBase) {
      return dedupe([explicitSocketBase, apiBase, derivedApiBase, currentOrigin]);
    }

    if (isLocalHost) {
      const currentPort = String(window.location.port || '').trim();
      if (!explicitSocketBase && currentPort !== '1337') return [];
      return dedupe([
        apiBase,
        currentOrigin
      ]);
    }

    return dedupe([
      apiBase,
      derivedApiBase,
      currentOrigin,
      baseHost ? `https://addapi.${baseHost}` : ''
    ]);
  };

  const extractTrackerPlayerTag = (value, possession = 'TEAM_A') => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return possession === 'TEAM_A' ? 'A' : 'B';
    const segments = text
      .split(/(?:➔|->|→|←|\|)/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const rawTail = (segments.length ? segments[segments.length - 1] : text).replace(/[.,;:!?]/g, ' ').trim();
    const words = rawTail.split(/\s+/).filter(Boolean);
    const stopWords = new Set([
      '\u05d1\u05de\u05e8\u05db\u05d6',
      '\u05d4\u05de\u05d2\u05e8\u05e9',
      '\u05d1\u05e8\u05d7\u05d1\u05d4',
      '\u05de\u05d9\u05de\u05d9\u05df',
      '\u05de\u05e9\u05de\u05d0\u05dc',
      '\u05e4\u05d5\u05e8\u05e5',
      '\u05de\u05e8\u05d9\u05dd',
      '\u05d1\u05e2\u05d9\u05d8\u05d4',
      '\u05e0\u05d5\u05d2\u05e2',
      '\u05e9\u05d5\u05dc\u05d7'
    ]);
    const token = words.find((word) => !stopWords.has(word)) || words[0] || '';
    const cleaned = token.replace(/[^0-9A-Za-z\u0590-\u05FF]/g, '');
    if (!cleaned) return possession === 'TEAM_A' ? 'A' : 'B';
    if (/^\d{1,2}$/.test(cleaned)) return cleaned;
    if (/^\d+/.test(cleaned)) return cleaned.slice(0, 2);
    return cleaned.slice(0, 1).toUpperCase();
  };

  const ensureSocketIoScript = () => {
    if (window.io && typeof window.io === 'function') return Promise.resolve(true);
    if (liveTrackerSocketState.scriptPromise) return liveTrackerSocketState.scriptPromise;

    const socketTargets = getLiveTrackerSocketTargets();
    const hostBase = String(socketTargets[0] || liveLineApiBase() || '').replace(/\/+$/, '');
    const scriptSources = Array.from(new Set([
      hostBase ? `${hostBase}/socket.io/socket.io.js` : '',
      '/socket.io/socket.io.js',
      'https://addapi.royalbet88.live/socket.io/socket.io.js'
    ].filter(Boolean)));

    liveTrackerSocketState.scriptPromise = scriptSources.reduce((promise, src) => {
      return promise.then((loaded) => {
        if (loaded) return true;
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.async = true;
          script.src = src;
          script.onload = () => resolve(Boolean(window.io));
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });
      });
    }, Promise.resolve(false)).finally(() => {
      liveTrackerSocketState.scriptPromise = null;
    });

    return liveTrackerSocketState.scriptPromise;
  };

  const applyLiveTrackerToWidget = (widget, payload, initial = false) => {
    if (!widget || !payload) return;
    const stateKey = normalizeTrackerState(payload.state);
    const prevX = Number(widget.getAttribute('data-rb-tracker-x') || 50);
    const prevY = Number(widget.getAttribute('data-rb-tracker-y') || 50);
    const hasDirectXY = Number.isFinite(Number(payload?.x)) && Number.isFinite(Number(payload?.y));
    const target = hasDirectXY
      ? { x: Number(payload.x), y: Number(payload.y) }
      : trackerTargetFromState(stateKey, prevX, prevY);
    const x = Math.max(0, Math.min(100, target.x));
    const y = Math.max(0, Math.min(100, target.y));
    const depth = trackerDepthScale(y);

    widget.setAttribute('data-rb-tracker-x', String(x.toFixed(2)));
    widget.setAttribute('data-rb-tracker-y', String(y.toFixed(2)));
    widget.setAttribute('data-rb-tracker-state', stateKey);
    widget.classList.toggle('is-suspended', stateKey === 'SUSPENDED');

    const player = widget.querySelector('.tracker-player');
    const ball = widget.querySelector('.rbl-3d-ball');
    const shadow = widget.querySelector('.rbl-3d-ball-shadow');
    const textNode = widget.querySelector('[data-rb-live-tracker-text]');

    const possession = normalizeTrackerPossession(payload.possession);
    const ballOffsetX = possession === 'TEAM_A' ? 3 : -3;
    const playerX = x;
    const playerY = Math.max(8, y - 8);
    const playerHeight = Math.max(18, (20 + (depth * 12)) * 1.55);
    const ballX = Math.max(2, Math.min(98, x + ballOffsetX));
    const ballY = Math.max(12, Math.min(94, playerY + (playerHeight * 0.55)));
    const shadowX = ballX;
    const shadowY = Math.min(97, ballY + 3.2);

    const playerSize = 20 + (depth * 12);
    const ballSize = 10 + (depth * 9);
    const shadowW = 12 + (depth * 12);
    const shadowH = 4 + (depth * 4);

    if (player) {
      const playerTag = extractTrackerPlayerTag(payload.text, possession);
      player.style.left = `${playerX}%`;
      player.style.top = `${playerY}%`;
      player.style.width = `${playerSize}px`;
      player.style.height = `${Math.max(18, playerSize * 1.55)}px`;
      player.setAttribute('data-player-tag', playerTag);
      player.setAttribute('data-team', possession);
      if (initial) player.classList.add('is-ready');
    }

    if (ball) {
      ball.style.left = `${ballX}%`;
      ball.style.top = `${ballY}%`;
      ball.style.width = `${ballSize}px`;
      ball.style.height = `${ballSize}px`;
      if (initial) ball.classList.add('is-ready');
    }

    if (shadow) {
      shadow.style.left = `${shadowX}%`;
      shadow.style.top = `${shadowY}%`;
      shadow.style.width = `${shadowW}px`;
      shadow.style.height = `${shadowH}px`;
      if (initial) shadow.classList.add('is-ready');
    }

    if (textNode) {
      textNode.textContent = safeTrackerText(payload.text);
    }
  };

  const hydrateLiveTrackerWidgets = () => {
    const widgets = document.querySelectorAll('[data-rb-live-tracker="1"]');
    widgets.forEach((widget) => {
      const fixtureId = String(widget.getAttribute('data-rb-live-tracker-fixture') || '').trim();
      const textNode = widget.querySelector('[data-rb-live-tracker-text]');
      const payload = liveTrackerSocketState.updatesByFixtureId.get(fixtureId);
      if (payload) {
        applyLiveTrackerToWidget(widget, payload, true);
        widget.setAttribute('data-rb-live-tracker-hydrated', '1');
        return;
      }
      const defaultX = Number(widget.getAttribute('data-rb-tracker-default-x') || 50);
      const defaultY = Number(widget.getAttribute('data-rb-tracker-default-y') || 52);
      const fallbackPayload = {
        state: normalizeTrackerState(widget.getAttribute('data-rb-tracker-default-state')),
        possession: normalizeTrackerPossession(widget.getAttribute('data-rb-tracker-default-possession')),
        text: safeTrackerText(widget.getAttribute('data-rb-tracker-default-text')),
        x: defaultX,
        y: defaultY
      };
      applyLiveTrackerToWidget(widget, fallbackPayload, true);
      if (textNode) textNode.textContent = safeTrackerText(fallbackPayload.text);
      widget.setAttribute('data-rb-live-tracker-hydrated', '1');
    });
  };

  const handleMatchSocketUpdate = (rawPayload) => {
    if (!rawPayload || typeof rawPayload !== 'object') return;
    const fixtureId = String(
      rawPayload.fixture_id
      || rawPayload.fixtureId
      || rawPayload.match_id
      || rawPayload.matchId
      || rawPayload.fixture
      || ''
    ).trim();

    const payload = {
      fixture_id: fixtureId,
      state: normalizeTrackerState(rawPayload.state),
      possession: normalizeTrackerPossession(rawPayload.possession),
      text: safeTrackerText(rawPayload.text || rawPayload.eventText || rawPayload.message),
      x: Number.isFinite(Number(rawPayload.x)) ? Number(rawPayload.x) : undefined,
      y: Number.isFinite(Number(rawPayload.y)) ? Number(rawPayload.y) : undefined,
      receivedAt: Date.now()
    };
    if (fixtureId) liveTrackerSocketState.updatesByFixtureId.set(fixtureId, payload);

    document.querySelectorAll('[data-rb-live-tracker="1"]').forEach((widget) => {
      const widgetFixtureId = String(widget.getAttribute('data-rb-live-tracker-fixture') || '').trim();
      if (fixtureId && widgetFixtureId !== fixtureId) return;
      if (String(widget.getAttribute('data-rb-live-active') || '0') !== '1') return;
      applyLiveTrackerToWidget(widget, payload, false);
      widget.setAttribute('data-rb-live-tracker-hydrated', '1');
    });
  };

  const ensureLiveTrackerSocket = async () => {
    if (liveTrackerSocketState.socket) return liveTrackerSocketState.socket;
    const loaded = await ensureSocketIoScript();
    if (!loaded || typeof window.io !== 'function') return null;

    const socketTargets = getLiveTrackerSocketTargets();
    if (!socketTargets.length) return null;

    const connectToBase = (base) => window.io(base, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: false,
      withCredentials: false
    });

    let targetIndex = 0;
    const attachSocketListeners = (socket) => {
      socket.on('connect', () => {
        liveTrackerSocketState.connected = true;
      });
      socket.on('disconnect', () => {
        liveTrackerSocketState.connected = false;
      });
      socket.on('matchUpdate', handleMatchSocketUpdate);
      socket.on('match_update', handleMatchSocketUpdate);
      socket.on('connect_error', () => {
        liveTrackerSocketState.connected = false;
        if (targetIndex >= socketTargets.length - 1) {
          try {
            socket.close();
          } catch (error) {
            void error;
          }
          liveTrackerSocketState.socket = null;
          return;
        }
        targetIndex += 1;
        try {
          socket.off('matchUpdate', handleMatchSocketUpdate);
          socket.off('match_update', handleMatchSocketUpdate);
          socket.close();
        } catch (error) {
          void error;
        }
        const nextSocket = connectToBase(socketTargets[targetIndex]);
        attachSocketListeners(nextSocket);
        liveTrackerSocketState.socket = nextSocket;
      });
    };

    const socket = connectToBase(socketTargets[targetIndex]);
    attachSocketListeners(socket);

    liveTrackerSocketState.socket = socket;
    return socket;
  };

  const trackerStateFromSim = (sim) => {
    const x = Math.max(0, Math.min(100, Number(sim?.ballPositionX ?? sim?.ballPosition ?? 50)));
    if (x <= 4) return 'GOAL_A';
    if (x >= 96) return 'GOAL_B';
    if (x < 30) return 'ATTACK_A';
    if (x > 70) return 'ATTACK_B';
    return 'MIDFIELD';
  };

  const fixtureMatchIdForAnimation = (fixture, fallbackId = '') => {
    const candidate = [
      fixture?.animation_match_id,
      fixture?.animationMatchId,
      fixture?.provider_match_id,
      fixture?.providerMatchId,
      fixture?.fixture_id,
      fixture?.match_id,
      fixture?.id,
      fallbackId
    ].find((value) => value != null && String(value).trim() !== '');
    if (candidate == null) return '';
    return String(candidate).trim();
  };

  const isUsableAnimationMatchId = (value) => {
    const id = String(value || '').trim();
    if (!id) return false;
    if (id.startsWith('sim-')) return false;
    return /^[a-z0-9_-]{6,96}$/i.test(id);
  };

  const shouldUseExternalAnimation = (fixture, sportKey, fallbackId = '') => {
    if (!LIVE_LINE_EXTERNAL_ANIMATION_ENABLED) return false;
    if (!fixture || String(fixture?.source || '').toLowerCase() === 'simulation') return false;
    const key = canonicalSportKey(sportKey);
    if (!EXTERNAL_ANIMATION_SPORTS.has(key)) return false;
    return isUsableAnimationMatchId(fixtureMatchIdForAnimation(fixture, fallbackId));
  };

  const resolveScAnimationEngineSource = (sportKey) => {
    const key = canonicalSportKey(sportKey);
    return SC_ANIMATION_ENGINE_SOURCES[key] || SC_ANIMATION_ENGINE_SOURCES.default;
  };

  const ensureScAnimationEngine = (sportKey) => {
    const expectedSource = resolveScAnimationEngineSource(sportKey);
    if (window.customElements?.get('sc-animation-component') && window.__SCAWp) {
      scAnimationEngineSource = scAnimationEngineSource || expectedSource;
      return Promise.resolve(true);
    }
    if (scAnimationEnginePromise) return scAnimationEnginePromise;

    scAnimationEnginePromise = new Promise((resolve) => {
      const existing = document.getElementById(SC_ANIMATION_SCRIPT_ID);
      if (existing) {
        const existingSource = String(existing.getAttribute('data-rb-engine-src') || '');
        if (existingSource && existingSource !== expectedSource) {
          existing.remove();
        } else {
          existing.addEventListener('load', () => resolve(Boolean(window.__SCAWp)), { once: true });
          existing.addEventListener('error', () => resolve(false), { once: true });
          return;
        }
      }

      const script = document.createElement('script');
      script.id = SC_ANIMATION_SCRIPT_ID;
      script.async = true;
      script.src = expectedSource;
      script.setAttribute('data-rb-engine-src', expectedSource);
      script.addEventListener('load', () => {
        scAnimationEngineSource = expectedSource;
        resolve(Boolean(window.__SCAWp));
      }, { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
      document.head.appendChild(script);
    }).finally(() => {
      scAnimationEnginePromise = null;
    });

    return scAnimationEnginePromise;
  };

  const renderLocalPitchSurfaceMarkup = (variant, ballMarkup) => {
    if (variant === 'basketball') {
      return `
        <div class="rb-live-line-pitch rb-live-line-pitch--basketball">
          <span class="rb-live-line-pitch-midline"></span>
          <span class="rb-live-line-pitch-circle"></span>
          <span class="rb-live-line-pitch-arc rb-live-line-pitch-arc-home"></span>
          <span class="rb-live-line-pitch-arc rb-live-line-pitch-arc-away"></span>
          ${ballMarkup}
        </div>
      `;
    }
    if (variant === 'tennis') {
      return `
        <div class="rb-live-line-pitch rb-live-line-pitch--tennis">
          <span class="rb-live-line-pitch-midline"></span>
          <span class="rb-live-line-pitch-net"></span>
          <span class="rb-live-line-pitch-service rb-live-line-pitch-service-home"></span>
          <span class="rb-live-line-pitch-service rb-live-line-pitch-service-away"></span>
          ${ballMarkup}
        </div>
      `;
    }
    if (variant === 'water' || variant === 'motor' || variant === 'combat' || variant === 'precision' || variant === 'generic') {
      return `
        <div class="rb-live-line-pitch rb-live-line-pitch--${variant}">
          <span class="rb-live-line-pitch-track"></span>
          <span class="rb-live-line-pitch-track rb-live-line-pitch-track-alt"></span>
          ${ballMarkup}
        </div>
      `;
    }
    return `
      <div class="rb-live-line-pitch rb-live-line-pitch--football">
        <span class="rb-live-line-pitch-midline"></span>
        <span class="rb-live-line-pitch-circle"></span>
        <span class="rb-live-line-pitch-box rb-live-line-pitch-box-home"></span>
        <span class="rb-live-line-pitch-box rb-live-line-pitch-box-away"></span>
        ${ballMarkup}
      </div>
    `;
  };

  const renderTrackerFieldMarkup = (variant) => {
    if (variant === 'football') {
      return `
        <span class="rb-live-line-tracker-mark midline"></span>
        <span class="rb-live-line-tracker-mark circle"></span>
        <span class="rb-live-line-tracker-mark box box-a"></span>
        <span class="rb-live-line-tracker-mark box box-b"></span>
        <span class="rb-live-line-tracker-mark small-box small-box-a"></span>
        <span class="rb-live-line-tracker-mark small-box small-box-b"></span>
        <span class="rb-live-line-tracker-mark arc arc-a"></span>
        <span class="rb-live-line-tracker-mark arc arc-b"></span>
        <span class="rb-live-line-tracker-mark spot spot-a"></span>
        <span class="rb-live-line-tracker-mark spot spot-b"></span>
        <span class="rb-live-line-tracker-mark goal goal-a"></span>
        <span class="rb-live-line-tracker-mark goal goal-b"></span>
      `;
    }
    if (variant === 'basketball') {
      return `
        <span class="rb-live-line-tracker-mark midline"></span>
        <span class="rb-live-line-tracker-mark circle"></span>
        <span class="rb-live-line-tracker-mark arc arc-a"></span>
        <span class="rb-live-line-tracker-mark arc arc-b"></span>
      `;
    }
    if (variant === 'tennis') {
      return `
        <span class="rb-live-line-tracker-mark midline"></span>
        <span class="rb-live-line-tracker-mark net"></span>
        <span class="rb-live-line-tracker-mark service service-a"></span>
        <span class="rb-live-line-tracker-mark service service-b"></span>
      `;
    }
    if (variant === 'water' || variant === 'motor' || variant === 'combat' || variant === 'precision' || variant === 'generic') {
      return `
        <span class="rb-live-line-tracker-mark track track-a"></span>
        <span class="rb-live-line-tracker-mark track track-b"></span>
      `;
    }
    return `
      <span class="rb-live-line-tracker-mark track track-a"></span>
      <span class="rb-live-line-tracker-mark track track-b"></span>
    `;
  };

  const ballThemeForSport = (sportKey, variant = 'generic') => {
    const key = String(sportKey || '').toLowerCase();
    if (key === 'football') return 'football';
    if (key === 'rugby') return 'rugby';
    if (key === 'american-football') return 'american-football';
    if (key === 'basketball' || key === 'basketball3x3') return 'basketball';
    if (key === 'tennis' || key === 'table-tennis') return 'tennis';
    if (key === 'baseball') return 'baseball';
    if (key === 'cricket') return 'cricket';
    if (key === 'golf') return 'golf';
    if (key === 'water-polo') return 'water-polo';
    if (key === 'handball') return 'handball';
    if (key === 'darts' || key === 'snooker' || key === 'bowling') return 'precision';
    if (variant === 'football') return 'football';
    if (variant === 'tennis') return 'tennis';
    if (variant === 'basketball') return 'basketball';
    if (variant === 'water') return 'water-polo';
    return 'generic';
  };

  const mountLiveLineExternalAnimation = async (fixture, sportKey, slotKey) => {
    if (!shouldUseExternalAnimation(fixture, sportKey, slotKey)) return;
    const matchId = fixtureMatchIdForAnimation(fixture, slotKey);
    if (!matchId) return;

    const slots = Array.from(document.querySelectorAll('[data-rb-live-line-animation-slot]'));
    const slot = slots.find((node) => String(node.getAttribute('data-rb-live-line-animation-slot') || '') === String(slotKey || ''));
    if (!slot) return;
    if (slot.getAttribute('data-rb-live-line-animation-mounted') === matchId) return;

    const ready = await ensureScAnimationEngine(sportKey);
    if (!ready || !window.customElements?.get('sc-animation-component') || typeof window.SCAW !== 'function') return;

    const host = slot.querySelector('[data-rb-live-line-animation-host]');
    if (!host) return;
    host.innerHTML = '';
    const animationNode = document.createElement('sc-animation-component');
    host.appendChild(animationNode);
    host.hidden = false;
    slot.querySelectorAll('.rb-live-line-animation-fallback').forEach((node) => {
      node.setAttribute('hidden', 'hidden');
    });
    slot.setAttribute('data-rb-live-line-animation-mounted', matchId);

    window.SCAW('_setClientInfo', { clientID: SC_ANIMATION_CLIENT_ID });
    window.SCAW('setLanguage', getSiteLanguage());
    window.SCAW('setHeader', false);
    window.SCAW('setTimer', true);
    window.SCAW('setTimeline', true);
    window.SCAW('setIsDemoMode', false);
    window.SCAW('setMatchID', matchId);
  };

  const renderPitchMarkup = (sim, sportKey, ballKey = 'live-line-ball', fixture = null) => {
    const variant = pitchVariantForSport(sportKey);
    const ballTheme = ballThemeForSport(sportKey, variant);
    const hasBallCoordinates = sim?.hasBallCoordinates === true;
    const hasExternalTracking = shouldUseExternalAnimation(fixture, sportKey, ballKey);
    const rawFixtureIdForRealtime = trackerFixtureId(fixture, ballKey);
    const realtimeSocketPayload = liveTrackerSocketState.updatesByFixtureId.get(rawFixtureIdForRealtime);
    const realtimeSocketFresh = Boolean(realtimeSocketPayload && (Date.now() - Number(realtimeSocketPayload.receivedAt || 0)) < 6000);
    const hasRealtimeTrackerSignal = hasBallCoordinates || realtimeSocketFresh;
    const preferUnifiedTracker = true;
    if (preferUnifiedTracker) {
      const rawFixtureId = trackerFixtureId(fixture, ballKey);
      if (hasLiveTrackerNode(rawFixtureId)) {
        return `<div data-rb-live-tracker-preserve="${escapeHtml(rawFixtureId)}"></div>`;
      }
      const fixtureId = escapeHtml(rawFixtureId);
      const defaultX = Math.max(0, Math.min(100, Number(sim?.ballPositionX ?? sim?.ballPosition ?? 50)));
      const defaultY = Math.max(0, Math.min(100, Number(sim?.ballPositionY ?? 52)));
      const defaultState = escapeHtml(trackerStateFromSim(sim));
      const defaultText = escapeHtml(
        hasRealtimeTrackerSignal
          ? safeTrackerText(sim?.lastEventText || sim?.eventText || '')
          : t('liveLine.noTracking', 'אין נתוני מיקום חיים כרגע')
      );
      const defaultPossession = defaultX >= 50 ? 'TEAM_A' : 'TEAM_B';
      const safeVariant = escapeHtml(String(variant || 'generic'));
      const safeBallTheme = escapeHtml(String(ballTheme || 'generic'));
      const trackerFieldMarkup = renderTrackerFieldMarkup(variant);
      return `
        <section
          class="rb-live-line-tracker-widget rb-live-line-tracker-widget--${safeVariant} 3d-match-tracker"
          data-rb-ball-theme="${safeBallTheme}"
          data-rb-live-tracker="1"
          data-rb-live-active="${(sim?.preGame || !hasRealtimeTrackerSignal) ? '0' : '1'}"
          data-rb-live-tracker-fixture="${fixtureId}"
          data-rb-tracker-default-state="${defaultState}"
          data-rb-tracker-default-possession="${escapeHtml(defaultPossession)}"
          data-rb-tracker-default-text="${defaultText}"
          data-rb-tracker-default-x="${defaultX}"
          data-rb-tracker-default-y="${defaultY}"
          data-rb-tracker-x="${defaultX}"
          data-rb-tracker-y="${defaultY}"
          data-rb-tracker-state="${defaultState}"
          dir="rtl"
        >
          <div class="rb-live-line-tracker-stage" aria-hidden="true">
            <div class="rb-live-line-tracker-field rb-live-line-tracker-field--${safeVariant}">
              ${trackerFieldMarkup}
            </div>
            <span class="rbl-3d-ball-shadow 3d-ball-shadow rbl-3d-ball-shadow--${safeBallTheme}"></span>
            <span class="rbl-3d-ball 3d-ball rbl-3d-ball--${safeBallTheme}"></span>
            <span class="tracker-player"></span>
            <div class="rb-live-line-tracker-overlay">
              <strong>${escapeHtml(t('liveLine.market.suspended', '\u05d4\u05e9\u05d5\u05e7 \u05de\u05d5\u05e9\u05d4\u05d4 \u05d6\u05de\u05e0\u05d9\u05ea'))}</strong>
            </div>
          </div>
          <p class="rb-live-line-tracker-text" data-rb-live-tracker-text aria-live="polite">
            ${defaultText}
          </p>
        </section>
      `;
    }
    if (!hasBallCoordinates && !hasExternalTracking) {
      return `
        <div class="rb-live-line-pitch-wrap" aria-hidden="true">
          <div class="rb-live-line-pitch rb-live-line-pitch--generic rb-live-line-pitch--no-tracking">
            <span>${escapeHtml(t('liveLine.noTracking', 'אין נתוני מיקום חיים כרגע'))}</span>
          </div>
        </div>
      `;
    }
    const ballX = Math.max(0, Math.min(100, Number(sim?.ballPositionX ?? sim?.ballPosition ?? sim?.possessionHome ?? 50)));
    const ballY = Math.max(0, Math.min(100, Number(sim?.ballPositionY ?? 50)));
    const safeBallKey = escapeHtml(String(ballKey || 'live-line-ball'));
    const safeBallTheme = escapeHtml(String(ballTheme || 'generic'));
    const ballMarkup = hasBallCoordinates
      ? `<span class="rb-live-line-pitch-ball rb-live-line-pitch-ball--${safeBallTheme}" data-rb-live-line-ball="1" data-rb-live-active="${sim?.preGame ? '0' : '1'}" data-rb-ball-theme="${safeBallTheme}" data-rb-ball-key="${safeBallKey}" data-rb-ball-target-x="${ballX}" data-rb-ball-target-y="${ballY}" style="--rb-ball-speed:6s;left:${ballX}%;top:${ballY}%"></span>`
      : '';
    const localPitch = renderLocalPitchSurfaceMarkup(variant, ballMarkup);
    if (!hasExternalTracking) {
      return `
        <div class="rb-live-line-pitch-wrap" aria-hidden="true">
          ${localPitch}
        </div>
      `;
    }
    const matchId = escapeHtml(fixtureMatchIdForAnimation(fixture, ballKey));
    return `
      <div
        class="rb-live-line-pitch-wrap rb-live-line-pitch-wrap--external"
        data-rb-live-line-animation-slot="${safeBallKey}"
        data-rb-live-line-animation-match-id="${matchId}"
      >
        <div class="rb-live-line-animation-host" data-rb-live-line-animation-host hidden></div>
        <div class="rb-live-line-animation-fallback" aria-hidden="true">
          ${localPitch}
        </div>
      </div>
    `;
  };

  const updateLiveLineBallMotion = () => {
    const balls = document.querySelectorAll('[data-rb-live-line-ball="1"]');
    if (!balls.length) return;
    balls.forEach((ball) => {
      if (String(ball.getAttribute('data-rb-live-active') || '0') !== '1') return;
      const key = ball.getAttribute('data-rb-ball-key') || 'live-line-ball';
      const targetX = Math.max(0, Math.min(100, Number(ball.getAttribute('data-rb-ball-target-x') || 50)));
      const targetY = Math.max(0, Math.min(100, Number(ball.getAttribute('data-rb-ball-target-y') || 50)));
      const previous = liveLineBallPositionCache.get(key);

      ball.style.setProperty('--rb-ball-speed', '6s');
      if (!previous || (previous.x === targetX && previous.y === targetY)) {
        ball.style.setProperty('left', `${targetX}%`);
        ball.style.setProperty('top', `${targetY}%`);
        liveLineBallPositionCache.set(key, { x: targetX, y: targetY });
        return;
      }

      ball.style.transition = 'none';
      ball.style.setProperty('left', `${previous.x}%`);
      ball.style.setProperty('top', `${previous.y}%`);
      ball.getBoundingClientRect();
      ball.style.transition = '';
      window.requestAnimationFrame(() => {
        ball.style.setProperty('left', `${targetX}%`);
        ball.style.setProperty('top', `${targetY}%`);
        liveLineBallPositionCache.set(key, { x: targetX, y: targetY });
      });
    });
  };

  const inferFixtureSportSlug = (fixture) => {
    const mapProviderSportKeyToUi = (key) => {
      const normalized = canonicalSportKey(key);
      if (!normalized) return '';
      if (SPORT_BY_KEY.has(normalized)) return normalized;
      const root = normalized.split('-')[0];

      if (normalized === 'soccer' || normalized.startsWith('soccer-')) return 'football';
      if (normalized === 'basket-ball' || normalized.startsWith('basketball-3x3') || normalized.includes('3x3')) return 'basketball3x3';
      if (normalized === 'basketball' || normalized.startsWith('basketball-')) return 'basketball';
      if (normalized === 'tabletennis' || normalized === 'ping-pong' || normalized.startsWith('table-tennis')) return 'table-tennis';
      if (normalized.startsWith('atp-') || normalized.startsWith('wta-') || normalized.startsWith('itf-') || normalized.startsWith('challenger-')) return 'tennis';
      if (normalized.includes('wimbledon') || normalized.includes('roland-garros') || normalized.includes('us-open') || normalized.includes('australian-open')) return 'tennis';
      if (normalized === 'tennis' || normalized.startsWith('tennis-')) return 'tennis';
      if (normalized === 'americanfootball' || normalized.startsWith('americanfootball-')) return 'american-football';
      if (normalized === 'baseball' || normalized.startsWith('baseball-')) return 'baseball';
      if (normalized === 'cricket' || normalized.startsWith('cricket-')) return 'cricket';
      if (normalized === 'aussierules' || normalized.startsWith('aussierules-')) return 'rugby';
      if (normalized === 'rugby' || normalized.startsWith('rugby-') || normalized.startsWith('rugbyleague-') || normalized.startsWith('rugbyunion-')) return 'rugby';
      if (normalized === 'boxing' || normalized.startsWith('boxing-')) return 'boxing';
      if (normalized === 'mma' || normalized.startsWith('mma-')) return 'mma';
      if (normalized === 'golf' || normalized.startsWith('golf-')) return 'golf';
      if (normalized === 'handball' || normalized.startsWith('handball-')) return 'handball';
      if (normalized === 'motorsport' || normalized.startsWith('motorsport-')) return 'motorsport';
      if (root === 'soccer') return 'football';
      if (root === 'basketball') return normalized.includes('3x3') ? 'basketball3x3' : 'basketball';
      if (root === 'tennis') return 'tennis';
      if (root === 'baseball') return 'baseball';
      if (root === 'cricket') return 'cricket';
      if (root === 'aussierules' || root === 'rugby' || root === 'rugbyleague' || root === 'rugbyunion') return 'rugby';
      if (root === 'americanfootball') return 'american-football';
      if (root === 'boxing') return 'boxing';
      if (root === 'mma') return 'mma';
      if (root === 'golf') return 'golf';
      return '';
    };

    const directCandidates = [
      fixture?.sport_key,
      fixture?.sport,
      fixture?.sportSlug,
      fixture?.sport_slug,
      fixture?.sport_title
    ].map((value) => canonicalSportKey(value)).filter(Boolean);

    for (const key of directCandidates) {
      const mapped = mapProviderSportKeyToUi(key);
      if (mapped) return mapped;
    }

    const text = normalizeText([
      fixture?.sport_key,
      fixture?.sport_title,
      fixture?.league_name,
      fixture?.league,
      fixture?.event_name,
      fixture?.home_team,
      fixture?.away_team,
      fixture?.fixture_id
    ].filter(Boolean).join(' '));

    if (!text) return '';
    if (
      /\b(atp|wta|itf|challenger)\b/.test(text)
      || text.includes('wimbledon')
      || text.includes('roland garros')
      || text.includes('french open')
      || text.includes('us open')
      || text.includes('australian open')
    ) return 'tennis';

    const firstMatch = (terms) => terms.some((term) => text.includes(term));

    // Specific before broad to avoid false football matches.
    if (firstMatch(['table tennis', 'ping pong', 'טניס שולחן', 'تنس الطاولة'])) return 'table-tennis';
    if (firstMatch(['american football', 'nfl', 'פוטבול', 'كرة القدم الأمريكية'])) return 'american-football';
    if (firstMatch(['basketball 3x3', '3x3 basketball', 'כדורסל 3x3'])) return 'basketball3x3';
    if (firstMatch(['beach volleyball', 'כדורעף חופים', 'كرة الطائرة الشاطئية'])) return 'beach-volleyball';
    if (firstMatch(['water polo', 'כדורמים', 'كرة الماء'])) return 'water-polo';
    if (firstMatch(['cricket', 'קריקט', 'كريكيت'])) return 'cricket';
    if (firstMatch(['baseball', 'בייסבול', 'بيسبول'])) return 'baseball';
    if (firstMatch(['basketball', 'כדורסל', 'كرة السلة'])) return 'basketball';
    if (firstMatch(['tennis', 'טניס', 'تنس', 'كرة المضرب'])) return 'tennis';
    if (firstMatch(['afl', 'australian rules', 'aussie rules', 'rugby', 'ראגבי', 'رجبي'])) return 'rugby';
    if (firstMatch(['handball', 'כדוריד'])) return 'handball';
    if (firstMatch(['motorsport', 'formula', 'מירוצים'])) return 'motorsport';
    if (firstMatch(['cycling', 'אופניים'])) return 'cycling';
    if (firstMatch(['boxing', 'אגרוף', 'ملاكمة'])) return 'boxing';
    if (firstMatch(['mma', 'ufc', 'mixed martial arts'])) return 'mma';
    if (firstMatch(['wrestling', 'היאבקות'])) return 'wrestling';
    if (firstMatch(['judo', 'גודו', "ג'ודו", 'جودو'])) return 'judo';
    if (firstMatch(['darts', 'חיצים'])) return 'darts';
    if (firstMatch(['golf', 'גולף'])) return 'golf';
    if (firstMatch(['snooker', 'סנוקר'])) return 'snooker';
    if (firstMatch(['bowling', 'באולינג'])) return 'bowling';
    if (firstMatch(['swimming', 'שחייה', 'سباحة'])) return 'swimming';
    if (firstMatch(['surfing', 'גלישה', 'ركوب الأمواج', 'ركوب الامواج'])) return 'surfing';
    if (firstMatch(['sailing', 'שייט', 'الإبحار', 'ابحار'])) return 'sailing';

    if (firstMatch(['football', 'soccer', 'fifa', 'כדורגל', 'كرة القدم'])) return 'football';
    return '';
  };

  const fixtureMatchesSecondarySport = (fixture, secondaryKey) => {
    const target = String(secondaryKey || '').trim().toLowerCase();
    if (!target) return true;
    const inferred = inferFixtureSportSlug(fixture);
    if (inferred === target) return true;

    const rawKey = canonicalSportKey(
      fixture?.sport_key
      || fixture?.sport
      || fixture?.sportSlug
      || fixture?.sport_slug
      || ''
    );
    if (!rawKey) return false;

    if (target === 'football') return rawKey === 'soccer' || rawKey.startsWith('soccer-');
    if (target === 'basketball3x3') return rawKey.includes('3x3');
    if (target === 'basketball') return (rawKey === 'basketball' || rawKey.startsWith('basketball-')) && !rawKey.includes('3x3');
    if (target === 'tennis') return rawKey === 'tennis' || rawKey.startsWith('tennis-');
    if (target === 'table-tennis') return rawKey === 'table-tennis' || rawKey === 'tabletennis' || rawKey.startsWith('table-tennis') || rawKey.includes('ping-pong');
    if (target === 'american-football') return rawKey === 'americanfootball' || rawKey.startsWith('americanfootball-');
    if (target === 'baseball') return rawKey === 'baseball' || rawKey.startsWith('baseball-');
    if (target === 'cricket') return rawKey === 'cricket' || rawKey.startsWith('cricket-');
    if (target === 'rugby') return rawKey === 'aussierules' || rawKey.startsWith('aussierules-') || rawKey === 'rugby' || rawKey.startsWith('rugby-') || rawKey.startsWith('rugbyleague-') || rawKey.startsWith('rugbyunion-');
    if (target === 'handball') return rawKey === 'handball' || rawKey.startsWith('handball-');
    if (target === 'motorsport') return rawKey === 'motorsport' || rawKey.startsWith('motorsport-');
    if (target === 'cycling') return rawKey === 'cycling' || rawKey.startsWith('cycling-');
    if (target === 'boxing') return rawKey === 'boxing' || rawKey.startsWith('boxing-');
    if (target === 'mma') return rawKey === 'mma' || rawKey.startsWith('mma-');
    if (target === 'wrestling') return rawKey === 'wrestling' || rawKey.startsWith('wrestling-');
    if (target === 'judo') return rawKey === 'judo' || rawKey.startsWith('judo-');
    if (target === 'darts') return rawKey === 'darts' || rawKey.startsWith('darts-');
    if (target === 'golf') return rawKey === 'golf' || rawKey.startsWith('golf-');
    if (target === 'snooker') return rawKey === 'snooker' || rawKey.startsWith('snooker-');
    if (target === 'bowling') return rawKey === 'bowling' || rawKey.startsWith('bowling-');
    if (target === 'water-polo') return rawKey === 'water-polo' || rawKey === 'waterpolo' || rawKey.startsWith('water-polo');
    if (target === 'beach-volleyball') return rawKey === 'beach-volleyball' || rawKey === 'beachvolleyball' || rawKey.startsWith('beach-volleyball');
    if (target === 'swimming') return rawKey === 'swimming' || rawKey.startsWith('swimming-');
    if (target === 'surfing') return rawKey === 'surfing' || rawKey.startsWith('surfing-');
    if (target === 'sailing') return rawKey === 'sailing' || rawKey.startsWith('sailing-');
    return false;
  };

  const fixtureCountryMatch = (fixture, countryKey) => {
    if (!countryKey || countryKey === 'global') return true;
    const terms = COUNTRY_FILTER_TERMS[countryKey] || [];
    if (!terms.length) return true;
    const hay = normalizeText([
      fixture?.league_name,
      fixture?.league,
      fixture?.sport_title,
      fixture?.event_name,
      fixture?.home_team,
      fixture?.away_team
    ].filter(Boolean).join(' '));
    return terms.some((term) => hay.includes(normalizeText(term)));
  };
  const fixtureWorldCupMatch = (fixture, worldCupKey) => {
    const sportKey = normalizeText(String(fixture?.sport_key || ''));
    const hay = normalizeText([
      fixture?.league_name,
      fixture?.league,
      fixture?.tournament,
      fixture?.competition,
      fixture?.sport_key,
      fixture?.sport_title,
      fixture?.event_name,
      fixture?.home_team,
      fixture?.away_team
    ].filter(Boolean).join(' '));
    if (!hay) return false;
    const worldCupFamily = (
      hay.includes('world cup')
      || hay.includes('fifa world cup')
      || hay.includes('\u05de\u05d5\u05e0\u05d3\u05d9\u05d0\u05dc')
      || sportKey.includes('world_cup')
    );
    if (!worldCupFamily) return false;
    if (!worldCupKey || worldCupKey === 'all') return true;
    const termsByKey = {
      worldcup: ['world cup', 'fifa', '\u05de\u05d5\u05e0\u05d3\u05d9\u05d0\u05dc'],
      qualifiers: ['qualifier', 'qualification', '\u05de\u05d5\u05e7\u05d3\u05de', 'wcq'],
      groups: ['group', '\u05d1\u05d9\u05ea', 'group stage'],
      knockout: ['round of 16', 'quarter', 'semi', 'final', '\u05e9\u05de\u05d9\u05e0\u05d9\u05ea', '\u05e8\u05d1\u05e2', '\u05d7\u05e6\u05d9', '\u05d2\u05de\u05e8']
    };
    const terms = termsByKey[worldCupKey] || [];
    return terms.some((term) => hay.includes(normalizeText(term)));
  };
  const fixtureWorldCupTimeMatch = (fixture, timeKey) => {
    if (!timeKey || timeKey === 'all') return true;
    const kickoffTs = parseFixtureTs(fixture);
    const now = Date.now();
    if (timeKey === 'live_now') {
      return fixtureIsLiveNow(fixture, fixtureId(fixture, 0));
    }
    if (!Number.isFinite(kickoffTs) || kickoffTs <= 0) return false;
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1;
    if (timeKey === 'today') {
      const isSameDay = kickoffTs >= startOfDay.getTime() && kickoffTs <= endOfDay;
      const rollingWindow = kickoffTs >= (now - (6 * 60 * 60 * 1000)) && kickoffTs <= (now + (18 * 60 * 60 * 1000));
      return isSameDay || rollingWindow;
    }
    if (timeKey === 'week') {
      const weekAhead = now + (7 * 24 * 60 * 60 * 1000);
      return kickoffTs >= (now - (6 * 60 * 60 * 1000)) && kickoffTs <= weekAhead;
    }
    return true;
  };

  const ensureGamesPanel = () => {
    const mount = getLiveLineMount();
    if (!mount) return null;
    let panel = mount.querySelector('[data-rb-live-line-games]');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.className = 'rb-live-line-games-panel';
    panel.setAttribute('data-rb-live-line-games', 'true');
    const anchor = mount.querySelector('[data-rb-live-line-countries]') || getLiveLineSecondaryRow(mount);
    if (anchor) anchor.insertAdjacentElement('afterend', panel);
    else mount.appendChild(panel);
    return panel;
  };

  const revealLiveLineMainOnMobile = () => {
    if (window.matchMedia('(min-width: 980px)').matches) return;
    const main = document.querySelector('.rb-live-line-main-wrap');
    if (!main) return;
    const top = main.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth'
    });
  };

  const readStoredBets = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAYER_BETS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const clearStoredBets = () => {
    try {
      localStorage.setItem(PLAYER_BETS_KEY, '[]');
    } catch {
      // no-op
    }
  };

  const readSyncState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LIVE_LINE_SYNC_KEY) || '{}');
      if (!parsed || typeof parsed !== 'object') return { synced: {}, failed: {} };
      return {
        synced: parsed.synced && typeof parsed.synced === 'object' ? parsed.synced : {},
        failed: parsed.failed && typeof parsed.failed === 'object' ? parsed.failed : {}
      };
    } catch {
      return { synced: {}, failed: {} };
    }
  };

  const writeSyncState = (next) => {
    try {
      localStorage.setItem(LIVE_LINE_SYNC_KEY, JSON.stringify(next || { synced: {}, failed: {} }));
    } catch {
      // no-op
    }
  };

  const getAuthToken = () => {
    try {
      if (window.RBSecurity && typeof window.RBSecurity.getToken === 'function') {
        return String(window.RBSecurity.getToken() || '');
      }
      return String(
        localStorage.getItem('royalbet_api_jwt')
        || localStorage.getItem('jwt')
        || localStorage.getItem('token')
        || ''
      );
    } catch {
      return '';
    }
  };

  const resolveBetApiOrigins = () => {
    const host = String(window.location.hostname || '').toLowerCase();
    const baseHost = host.startsWith('www.') ? host.slice(4) : host;
    const local = localStorage.getItem('royalbet_api_origin');
    const saved = window.RBSecurity && typeof window.RBSecurity.safeOrigin === 'function'
      ? window.RBSecurity.safeOrigin(local, '')
      : local;
    const candidates = [];
    if (saved) candidates.push(String(saved).replace(/\/+$/, ''));
    if (host === 'localhost' || host === 'localhost') {
      candidates.push('http://localhost:1337');
      candidates.push('https://addapi.royalbet88.live');
    } else if (host.startsWith('addapi.')) {
      candidates.push(window.location.origin.replace(/\/+$/, ''));
    } else if (baseHost) {
      candidates.push(`https://addapi.${baseHost}`);
    }
    candidates.push('https://addapi.royalbet88.live');
    return Array.from(new Set(candidates.filter(Boolean)));
  };

  const liveBetId = (bet, index) => {
    const direct = String(bet?.id || '').trim();
    if (direct) return direct;
    const sport = String(bet?.sport || '').trim();
    const event = String(bet?.event || '').trim();
    const market = String(bet?.market || '').trim();
    const odd = String(bet?.odd || '').trim();
    return `live-${sport}-${event}-${market}-${odd}-${index}`.toLowerCase();
  };

  const toNumberSafe = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const toIdempotencyKey = (id) => {
    const core = String(id || '').slice(0, 80).replace(/[^a-z0-9-_:.]/gi, '');
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 1e8).toString(36);
    return `ll-${core}-${ts}-${rand}`.slice(0, 120);
  };

  const readPreferredStake = () => {
    try {
      const raw = Number(localStorage.getItem(PLAYER_STAKE_KEY));
      if (!Number.isFinite(raw)) return 10;
      return Math.max(1, Math.min(100000, Math.round(raw)));
    } catch {
      return 10;
    }
  };

  const normalizeMarketKey = (label, index, total, homeName = '', awayName = '') => {
    const raw = String(label || '').trim().toLowerCase();
    const normalized = raw.replace(/\s+/g, ' ');
    const homeNorm = String(homeName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const awayNorm = String(awayName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const lineMatch = normalized.match(/(-?\d+(?:\.\d+)?)/);
    const lineToken = lineMatch ? lineMatch[1] : '';

    if (normalized === '1' || normalized === 'home' || normalized === homeNorm) return 'home';
    if (normalized === '2' || normalized === 'away' || normalized === awayNorm) return 'away';
    if (normalized === 'x' || normalized === 'draw' || normalized === 'tie' || normalized === 'תיקו') return 'draw';
    if (normalized === '1x') return 'double_chance:1x';
    if (normalized === '12') return 'double_chance:12';
    if (normalized === 'x2') return 'double_chance:x2';

    const overHints = ['over', 'אובר'];
    const underHints = ['under', 'אנדר'];
    const yesHints = ['yes', 'כן'];
    const noHints = ['no', 'לא'];
    const team1Hints = ['team 1', 'קבוצה 1'];
    const team2Hints = ['team 2', 'קבוצה 2'];
    const handicapHints = ['handicap', 'הנדיקפ', 'הנדיקאפ'];

    if (yesHints.some((hint) => normalized.includes(hint))) return 'btts_yes';
    if (noHints.some((hint) => normalized.includes(hint))) return 'btts_no';

    if (team1Hints.some((hint) => normalized.includes(hint))) {
      if (overHints.some((hint) => normalized.includes(hint))) return lineToken ? `team1_over:${lineToken}` : 'team1_over';
      if (underHints.some((hint) => normalized.includes(hint))) return lineToken ? `team1_under:${lineToken}` : 'team1_under';
    }

    if (team2Hints.some((hint) => normalized.includes(hint))) {
      if (overHints.some((hint) => normalized.includes(hint))) return lineToken ? `team2_over:${lineToken}` : 'team2_over';
      if (underHints.some((hint) => normalized.includes(hint))) return lineToken ? `team2_under:${lineToken}` : 'team2_under';
    }

    if (overHints.some((hint) => normalized.includes(hint))) return lineToken ? `over:${lineToken}` : 'over';
    if (underHints.some((hint) => normalized.includes(hint))) return lineToken ? `under:${lineToken}` : 'under';

    if (handicapHints.some((hint) => normalized.includes(hint))) return lineToken ? `handicap:${lineToken}` : 'handicap';

    return '';
  };

  const isSupportedLiveMarketKey = (key) => {
    const normalized = String(key || '').trim().toLowerCase();
    return ['home', 'draw', 'away', 'btts_yes', 'btts_no'].includes(normalized)
      || normalized.startsWith('double_chance:')
      || normalized.startsWith('over')
      || normalized.startsWith('under')
      || normalized.startsWith('team1_over')
      || normalized.startsWith('team1_under')
      || normalized.startsWith('team2_over')
      || normalized.startsWith('team2_under')
      || normalized.startsWith('handicap')
      || normalized.startsWith('player_score_anytime:');
  };

  const liveLineToast = (message, kind = 'info') => {
    const text = String(message || '').trim();
    if (!text) return;
    let node = document.querySelector('[data-rb-live-line-toast]');
    if (!node) {
      node = document.createElement('div');
      node.className = 'rb-live-line-toast';
      node.setAttribute('data-rb-live-line-toast', '1');
      document.body.appendChild(node);
    }
    node.textContent = text;
    node.dataset.kind = kind;
    node.classList.add('show');
    window.setTimeout(() => node.classList.remove('show'), 2200);
  };

  const expireLiveOddChangeIndicators = () => {
    const now = Date.now();
    document.querySelectorAll('[data-rb-live-line-odd-key][data-rb-live-line-odd-value]').forEach((node) => {
      const key = String(node.getAttribute('data-rb-live-line-odd-key') || '');
      const change = key ? state.oddChangeByKey[key] : null;
      if (change && Number(change.until || 0) > now) return;
      node.classList.remove('rb-live-line-odd-up', 'rb-live-line-odd-down');
      const deltaEl = node.querySelector('.rb-live-line-odd-delta');
      if (deltaEl) {
        deltaEl.textContent = '';
        deltaEl.hidden = true;
      }
      if (key && change) delete state.oddChangeByKey[key];
    });
  };

  const postLiveBet = async (bet, id) => {
    const token = getAuthToken();
    if (!token) return { ok: false, skipped: 'no_token' };
    const origins = resolveBetApiOrigins();
    const marketKey = String(bet?.marketKey || bet?.market || '').trim().toLowerCase();
    const normalizedMarket = isSupportedLiveMarketKey(marketKey) ? marketKey : '';
    const marketId = String(bet?.market_id || bet?.marketId || '').trim();
    const selectionId = String(bet?.selection_id || bet?.selectionId || '').trim();
    const hasProviderIds = Boolean(marketId && selectionId);
    const fixtureId = String(bet?.fixture_id || bet?.fixtureId || '').trim();
    const stake = toNumberSafe(bet?.stake, 0);
    if (!fixtureId || (!normalizedMarket && !hasProviderIds) || !Number.isFinite(stake) || stake <= 0) {
      return { ok: false, skipped: 'invalid_payload' };
    }
    const payload = {
      fixture_id: fixtureId,
      market: normalizedMarket,
      market_key: normalizedMarket || marketKey,
      market_id: marketId || undefined,
      selection_id: selectionId || undefined,
      marketLabel: String(bet?.market || ''),
      stake,
      client_bet_id: id,
      source: 'live-line',
      sport: String(bet?.sport || ''),
      event: String(bet?.event || ''),
      player: String(bet?.player || ''),
      period: String(bet?.period || ''),
      odd: toNumberSafe(bet?.odd, 0),
      odds_updated_at: bet?.odds_updated_at || bet?.oddsUpdatedAt || undefined,
      possibleWin: toNumberSafe(bet?.possibleWin, 0),
      placedAt: new Date().toISOString()
    };

    for (const origin of origins) {
      for (const endpoint of LIVE_BET_ENDPOINTS) {
        try {
          const response = await fetch(`${origin}${endpoint}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Idempotency-Key': toIdempotencyKey(id)
            },
            body: JSON.stringify(payload)
          });
          if (response.ok) return { ok: true };
          if (response.status === 404 || response.status === 405) continue;
          if (response.status === 401 || response.status === 403) return { ok: false, skipped: 'unauthorized' };
        } catch {
          // try next endpoint/origin
        }
      }
    }
    return { ok: false };
  };

  const syncStoredBetsToApi = async () => {
    if (state.syncInFlight) return;
    state.syncInFlight = true;
    try {
      const bets = readStoredBets();
      if (!bets.length) return;
      const syncState = readSyncState();
      const nextState = {
        synced: { ...(syncState.synced || {}) },
        failed: { ...(syncState.failed || {}) }
      };

      for (let i = 0; i < bets.length; i += 1) {
        const bet = bets[i];
        const id = liveBetId(bet, i);
        if (!id || nextState.synced[id]) continue;
        const result = await postLiveBet(bet, id);
        if (result.ok) {
          nextState.synced[id] = Date.now();
          delete nextState.failed[id];
        } else if (result.skipped === 'no_token' || result.skipped === 'unauthorized') {
          break;
        } else {
          nextState.failed[id] = Date.now();
        }
      }
      writeSyncState(nextState);
    } finally {
      state.syncInFlight = false;
    }
  };

  const placeLiveBetNow = async (button, fixture) => {
    if (!button || !fixture) return false;
    const buttonKey = String(button.getAttribute('data-rb-live-line-odd-key') || '');
    if (buttonKey && state.placingInFlightByButton[buttonKey]) return false;

    const fixtureId = String(button.getAttribute('data-rb-bet-fixture-id') || fixture?.fixture_id || '').trim();
    const marketKey = String(button.getAttribute('data-rb-bet-market-key') || '').trim().toLowerCase();
    const marketId = String(button.getAttribute('data-rb-bet-market-id') || '').trim();
    const selectionId = String(button.getAttribute('data-rb-bet-selection-id') || '').trim();
    const hasProviderIds = Boolean(marketId && selectionId);
    const odd = Number(button.getAttribute('data-rb-bet-odd') || button.getAttribute('data-odds') || 0);
    const stake = readPreferredStake();

    if (!fixtureId || (!hasProviderIds && !isSupportedLiveMarketKey(marketKey)) || !Number.isFinite(odd) || odd < 1) {
      liveLineToast(t('liveLine.bet.invalid', 'בחירה לא תקינה להימור חי'), 'error');
      return false;
    }
    if (!fixtureHasActiveOdds(fixture)) {
      liveLineToast(t('liveLine.bet.staleOdds', 'היחס אינו עדכני. רענן ונסה שוב.'), 'error');
      return false;
    }

    const eventLabel = String(button.getAttribute('data-rb-bet-event') || `${fixture?.home_team || ''} - ${fixture?.away_team || ''}`).trim();
    const bet = {
      fixture_id: fixtureId,
      marketKey,
      market_id: marketId,
      selection_id: selectionId,
      market: String(button.getAttribute('data-rb-bet-market') || '').trim(),
      player: String(button.getAttribute('data-rb-bet-player') || '').trim(),
      period: String(button.getAttribute('data-rb-bet-period') || '').trim(),
      sport: String(button.getAttribute('data-rb-bet-sport') || '').trim(),
      event: eventLabel,
      odd: Number(odd.toFixed(2)),
      odds_updated_at: fixtureOddsUpdatedAt(fixture),
      stake,
      possibleWin: Number((odd * stake).toFixed(2))
    };
    const betIdPart = (marketKey || `${marketId}:${selectionId}` || 'market').replace(/[^a-z0-9:_-]/gi, '-');
    const id = `live-${fixtureId}-${betIdPart}-${Date.now()}`;
    if (buttonKey) state.placingInFlightByButton[buttonKey] = true;
    button.classList.add('placing');
    try {
      const result = await postLiveBet(bet, id);
      if (result.ok) {
        const localBet = {
          id,
          sport: bet.sport,
          event: bet.event,
          market: bet.market,
          market_id: bet.market_id,
          selection_id: bet.selection_id,
          player: bet.player,
          period: bet.period,
          odd: bet.odd,
          stake: bet.stake,
          possibleWin: bet.possibleWin,
          fixture_id: bet.fixture_id,
          marketKey: bet.marketKey
        };
        const existing = readStoredBets();
        existing.unshift(localBet);
        try {
          localStorage.setItem(PLAYER_BETS_KEY, JSON.stringify(existing.slice(0, 24)));
        } catch {
          // no-op
        }
        renderMiniSlip();
        liveLineToast(t('liveLine.bet.placed', 'הימור חי נשלח בהצלחה'), 'success');
        return true;
      }
      if (result.skipped === 'no_token' || result.skipped === 'unauthorized') {
        liveLineToast(t('liveLine.bet.login', 'נדרש להתחבר כדי לבצע הימור חי'), 'error');
      } else if (result.skipped === 'invalid_payload') {
        liveLineToast(t('liveLine.bet.invalid', 'בחירה לא תקינה להימור חי'), 'error');
      } else {
        liveLineToast(t('liveLine.bet.failed', 'הימור חי נכשל. נסה שוב'), 'error');
      }
      return false;
    } finally {
      button.classList.remove('placing');
      if (buttonKey) delete state.placingInFlightByButton[buttonKey];
    }
  };

  const playerBetsUrl = (baseUrl) => {
    try {
      const bets = readStoredBets();
      if (!bets.length) return baseUrl;
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('rbBets', JSON.stringify(bets.slice(0, 8)));
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return baseUrl;
    }
  };

  const ensureMiniSlip = () => {
    let node = document.querySelector('[data-rb-live-line-mini-slip]');
    if (node) return node;
    node = document.createElement('aside');
    node.className = 'rb-live-line-mini-slip';
    node.setAttribute('data-rb-live-line-mini-slip', 'true');
    document.body.appendChild(node);
    return node;
  };

  const renderMiniSlip = () => {
    const existingNode = document.querySelector('[data-rb-live-line-mini-slip]');
    if (existingNode) existingNode.remove();
    const bets = readStoredBets();
    const latest = bets[0];
    const count = bets.length;
    const totalStake = bets.reduce((sum, bet) => {
      const n = Number(bet?.stake);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const totalPossibleWin = bets.reduce((sum, bet) => {
      const n = Number(bet?.possibleWin);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const multi = count > 1;
  };

  const renderGamesPanel = () => {
    const panel = ensureGamesPanel();
    if (!panel) return;
    const allActiveRows = (Array.isArray(state.fixtures) ? state.fixtures : [])
      .filter((fixture) => !fixtureHasFinalStatus(fixture))
      .filter((fixture) => fixture?.finished !== true && fixture?.completed !== true);
    if (!state.autoSelectedSportForData && allActiveRows.length) {
      const currentRows = allActiveRows.filter((fixture) => fixtureMatchesSecondarySport(fixture, state.secondary));
      if (!currentRows.length) {
        const tabOrder = SECONDARY_SPORT_TABS.map((tab) => tab.key);
        const counts = new Map();
        allActiveRows.forEach((fixture) => {
          const sport = inferFixtureSportSlug(fixture);
          if (!sport) return;
          counts.set(sport, (counts.get(sport) || 0) + 1);
        });
        const bestSport = Array.from(counts.entries())
          .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return tabOrder.indexOf(a[0]) - tabOrder.indexOf(b[0]);
          })[0]?.[0];
        if (bestSport && bestSport !== state.secondary) {
          state.primary = primaryForSecondary(bestSport);
          state.secondary = bestSport;
          state.country = 'global';
          state.worldCupMenuOpen = bestSport === 'football';
          state.worldCupMenuKey = 'all';
          state.worldCupTimeKey = 'all';
          state.selectedGameId = '';
          const mount = getLiveLineMount();
          const subRow = getLiveLineSecondaryRow(mount);
          const countriesRow = mount?.querySelector('[data-rb-live-line-countries]');
          if (subRow) subRow.dataset.rbSecondaryTabsBuilt = '0';
          if (countriesRow) countriesRow.dataset.rbCountriesBuilt = '0';
          ensureSecondarySportsRow();
          ensureCountriesRow();
          applySelectionDataset();
        }
      }
      state.autoSelectedSportForData = true;
    }
    ensurePrimarySportsRow();
    ensureSecondarySportsRow();
    ensureCountriesRow();
    const applyWorldCupFilter = (list) => {
      if (!(state.secondary === 'football' && state.country === 'global' && state.worldCupMenuOpen)) return list;
      if ((state.worldCupMenuKey || 'all') === 'all' && (state.worldCupTimeKey || 'all') === 'all') return list;
      return (Array.isArray(list) ? list : [])
        .filter((fixture) => fixtureWorldCupMatch(fixture, state.worldCupMenuKey))
        .filter((fixture) => fixtureWorldCupTimeMatch(fixture, state.worldCupTimeKey));
    };
    const sportRows = allActiveRows
      .filter((fixture) => fixtureMatchesSecondarySport(fixture, state.secondary));
    const nonFinalRows = (Array.isArray(sportRows) ? sportRows : [])
      .filter((fixture) => !fixtureHasFinalStatus(fixture))
      .filter((fixture) => fixture?.finished !== true && fixture?.completed !== true);
    const sourceRows = nonFinalRows;
    const globalLiveRows = allActiveRows
      .map((fixture, index) => ({ fixture, id: fixtureId(fixture, index) }))
      .filter((row) => fixtureIsLiveNow(row.fixture, row.id))
      .sort((a, b) => (parseFixtureTs(a.fixture) || 0) - (parseFixtureTs(b.fixture) || 0))
      .slice(0, 24);

    let rows = applyWorldCupFilter(sourceRows)
      .filter((fixture) => fixtureCountryMatch(fixture, state.country))
      .sort((a, b) => {
        const aFeedLive = isFixtureFromLiveLineFeed(a);
        const bFeedLive = isFixtureFromLiveLineFeed(b);
        if (aFeedLive !== bFeedLive) return aFeedLive ? -1 : 1;
        const aLive = fixtureIsLiveNow(a, fixtureId(a, 0));
        const bLive = fixtureIsLiveNow(b, fixtureId(b, 0));
        if (aLive !== bLive) return aLive ? -1 : 1;
        return (parseFixtureTs(a) || Number.MAX_SAFE_INTEGER) - (parseFixtureTs(b) || Number.MAX_SAFE_INTEGER);
      })
      .slice(0, LIVE_LINE_MAX_VISIBLE_GAMES);

    if (!rows.length && sourceRows.length && state.country === 'global') {
      rows = sourceRows
        .sort((a, b) => {
          const aFeedLive = isFixtureFromLiveLineFeed(a);
          const bFeedLive = isFixtureFromLiveLineFeed(b);
          if (aFeedLive !== bFeedLive) return aFeedLive ? -1 : 1;
          const aLive = fixtureIsLiveNow(a, fixtureId(a, 0));
          const bLive = fixtureIsLiveNow(b, fixtureId(b, 0));
          if (aLive !== bLive) return aLive ? -1 : 1;
          return (parseFixtureTs(a) || Number.MAX_SAFE_INTEGER) - (parseFixtureTs(b) || Number.MAX_SAFE_INTEGER);
        })
        .slice(0, LIVE_LINE_MAX_VISIBLE_GAMES);
    }

    if (!rows.length) {
      state.selectedGameId = '';
      panel.innerHTML = `<div class="rb-live-line-empty">${escapeHtml(t('liveLine.emptySelection', 'אין משחקים להצגה עבור הבחירה הנוכחית'))}</div>`;
      return;
    }

    const mappedRows = rows.map((fixture, index) => ({ fixture, id: fixtureId(fixture, index) }));
    if (state.pinnedGameId && !mappedRows.some((row) => row.id === state.pinnedGameId)) {
      state.pinnedGameId = '';
    }

    if (state.pendingLiveJumpKey) {
      const pendingKey = String(state.pendingLiveJumpKey || '');
      const pendingRow = mappedRows.find((row, index) => (
        (providerFixtureKey(row.fixture, index) || row.id) === pendingKey
      ));
      state.pendingLiveJumpKey = '';
      if (pendingRow) {
        state.selectedGameId = pendingRow.id;
        state.pinnedGameId = pendingRow.id;
      }
    }

    if (state.pinnedGameId) {
      state.selectedGameId = state.pinnedGameId;
    }

    if (!mappedRows.some((row) => row.id === state.selectedGameId)) {
      const firstLive = mappedRows.find((row) => !mergeRealLiveData(row.fixture, makeLiveSim(row.fixture, row.id)).preGame);
      state.selectedGameId = (firstLive || mappedRows[0]).id;
    }
    const selectedRow = mappedRows.find((row) => row.id === state.selectedGameId) || mappedRows[0];
    const selectedFixture = selectedRow.fixture;
    const sim = mergeRealLiveData(selectedFixture, makeLiveSim(selectedFixture, selectedRow.id));
    const selectedHome = String(selectedFixture?.home_team || '').trim() || 'Home';
    const selectedAway = String(selectedFixture?.away_team || '').trim() || 'Away';
    const selectedLeague = String(selectedFixture?.league_name || selectedFixture?.league || selectedFixture?.sport_title || '').trim();
    const selectedSportKey = inferFixtureSportSlug(selectedFixture) || state.secondary;
    const detailStats = detailStatsForSport(sim, selectedSportKey);
    const timeline = buildTimelineEvents(selectedFixture, sim, selectedRow.id, selectedSportKey);
    const markets = marketRowsForFixture(selectedFixture, sim, selectedRow.id, selectedSportKey);
    const selectedStatus = matchStatusTone(sim);
    const selectedRemaining = estimatedRemainingLabel(sim, selectedSportKey);
    const selectedMomentum = momentumInfo(sim, selectedHome, selectedAway);
    const selectedHasRealStats = Boolean(sim?.hasRealStats);
    const selectedCompactStats = compactStatsForMatchResolved(sim, selectedSportKey);
    const selectedLastEvent = timeline[0];
    const openInfoPanelKey = state.openInfoPanelKey || 'overview';
    const selectedEvent = String(selectedFixture?.event_name || '').trim();
    const selectedFromLiveFeed = isFixtureFromLiveLineFeed(selectedFixture);
    const updatedLabel = formatClock(state.lastUpdatedAt || state.fixturesLoadedAt || Date.now());
    const isPinned = state.pinnedGameId === selectedRow.id;
    const liveRowsInSelection = mappedRows.filter((row) => fixtureIsLiveNow(row.fixture, row.id));
    const marketQuery = String(state.marketQuery || '').trim().toLowerCase();
    const filteredMarkets = moveSimulationRowsToEnd(marketQuery
      ? markets.filter((market) => {
        const title = String(market?.title || '').toLowerCase();
        const cols = Array.isArray(market?.cols) ? market.cols.join(' ').toLowerCase() : '';
        return title.includes(marketQuery) || cols.includes(marketQuery);
      })
      : markets);
    if (!filteredMarkets.some((market) => market.title === state.openMarketKey)) {
      state.openMarketKey = filteredMarkets[0]?.title || '';
    }

    const overviewBody = `
      <div class="rb-live-line-overview-grid">
        <div class="rb-live-line-overview-main">
          ${renderPitchMarkup(sim, selectedSportKey, selectedRow.id, selectedFixture)}
          ${selectedHasRealStats ? `
            <div class="rb-live-line-momentum-bar rb-live-line-momentum-bar--${escapeHtml(selectedMomentum.key)}">
              <span style="width:${Math.max(8, Math.min(92, selectedMomentum.share))}%"></span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const statsBody = `
      <div class="rb-live-line-stat-matrix">
        ${detailStats.length ? detailStats.map((row) => `
          <span>
            <i>${escapeHtml(row.label)}</i>
            <b>${escapeHtml(String(row.value || ''))}</b>
          </span>
        `).join('') : `<div class="rb-live-line-timeline-empty">${escapeHtml(t('liveLine.stats.noRealData', 'אין נתוני מדדים חיים מהספק כרגע'))}</div>`}
      </div>
      ${sim.hasRealStats ? `<div class="rb-live-line-team-balance" style="--rb-home-share:${Math.max(0, Math.min(100, sim.possessionHome || 50))}%">
        <b>${escapeHtml(selectedHome)}</b>
        <span><i></i></span>
        <b>${escapeHtml(selectedAway)}</b>
      </div>` : ''}
    `;

    const timelineBody = `
      <div class="rb-live-line-timeline-list">
        ${timeline.length ? timeline.map((event) => `
          <div class="rb-live-line-timeline-row is-${escapeHtml(event.side)}">
            <span>${event.minute}'</span>
            <p>${escapeHtml(event.label)}</p>
          </div>
        `).join('') : `<div class="rb-live-line-timeline-empty">${escapeHtml(t('liveLine.timeline.empty', 'אין אירועים עדיין'))}</div>`}
      </div>
    `;

    const fixtureMarketId = String(
      selectedFixture?.market_id
      || selectedFixture?.match_id
      || selectedFixture?.fixture_id
      || selectedFixture?.id
      || ''
    ).trim();
    const marketsBody = `
      <div class="rb-live-line-market-head">
        <label class="rb-live-line-market-search">
          <input type="search" data-rb-live-line-market-search placeholder="${escapeHtml(t('liveLine.market.search', 'חפש שוק...'))}" value="${escapeHtml(state.marketQuery || '')}">
        </label>
        <span class="rb-live-line-market-id">${escapeHtml(t('liveLine.market.mainId', 'Main ID'))} ${escapeHtml(fixtureMarketId || '--')}</span>
      </div>
      <div class="rb-live-line-market-list">
        ${filteredMarkets.map((market) => `
          <section class="rb-live-line-market-row ${market.title === state.openMarketKey ? 'open' : ''}">
            <button type="button" class="rb-live-line-market-toggle" data-rb-live-line-market-toggle="${escapeHtml(market.title)}" aria-expanded="${market.title === state.openMarketKey ? 'true' : 'false'}">
              <h4>${escapeHtml(market.title)} <small>${sim.preGame ? escapeHtml(t('liveLine.pre', 'Pre')) : escapeHtml(t('liveLine.liveLabel', 'Live'))}</small></h4>
              <i>${market.title === state.openMarketKey ? '-' : '+'}</i>
            </button>
            <div class="rb-live-line-market-odds" style="--rb-market-cols:${Math.max(2, Math.min(2, market.odds.length || 2))}" ${market.title === state.openMarketKey ? '' : 'hidden'}>
              ${market.odds.map((odd, index) => `
                ${(() => {
                  const oddKey = `${providerFixtureKey(selectedFixture, 0) || selectedRow.id}|${market.title}|${market.cols[index] || index}`;
                  const selection = Array.isArray(market.selections) ? market.selections[index] : null;
                  const oddNumber = toFiniteNumber(odd);
                  const hasRealOdd = oddNumber != null && oddNumber > 1;
                  const oddValue = hasRealOdd ? oddNumber.toFixed(2) : '';
                  const marketLabel = String(selection?.label || market.cols[index] || market.title || '');
                  const marketKey = String(selection?.marketKey || normalizeMarketKey(marketLabel, index, market.odds.length, selectedHome, selectedAway)).trim().toLowerCase();
                  const marketId = String(selection?.marketId || selectedFixture?.market_id || selectedFixture?.marketId || '').trim();
                  const selectionId = String(selection?.selectionId || '').trim();
                  const hasProviderIds = Boolean(marketId && selectionId);
                  const oddsAreActive = fixtureHasActiveOdds(selectedFixture);
                  const canPlaceLiveBet = Boolean(oddsAreActive && hasRealOdd && !selection?.unavailable && (hasProviderIds || isSupportedLiveMarketKey(marketKey)) && (selectedFixture?.fixture_id || selectedFixture?.id));
                  return `
                <button
                  type="button"
                  class="rb-live-line-market-btn ${canPlaceLiveBet ? '' : 'is-readonly'} ${hasRealOdd && oddsAreActive ? '' : 'is-unavailable'}"
                  data-rb-live-line-odd-key="${escapeHtml(oddKey)}"
                  data-rb-live-line-odd-value="${escapeHtml(oddValue)}"
                  data-rb-live-line-market="${escapeHtml(market.title)}"
                  data-rb-live-line-col="${escapeHtml(market.cols[index] || '')}"
                  data-market="${escapeHtml(market.cols[index] || market.title || '')}"
                  data-odds="${escapeHtml(oddValue)}"
                  data-rb-bet-sport="${escapeHtml(state.secondary || '')}"
                  data-rb-bet-event="${escapeHtml(`${selectedHome} - ${selectedAway}`)}"
                  data-rb-bet-market="${escapeHtml(marketLabel)}"
                  data-rb-bet-player="${escapeHtml(selection?.player || '')}"
                  data-rb-bet-period="${escapeHtml(selection?.period || '')}"
                  data-rb-bet-market-id="${escapeHtml(marketId)}"
                  data-rb-bet-selection-id="${escapeHtml(selectionId)}"
                  data-rb-bet-fixture-id="${escapeHtml(String(selectedFixture?.fixture_id || selectedFixture?.id || selectedRow.id || ''))}"
                  data-rb-bet-market-key="${escapeHtml(marketKey)}"
                  data-rb-bet-odd="${escapeHtml(oddValue)}"
                  data-rb-bet-odds-updated-at="${escapeHtml(fixtureOddsUpdatedAt(selectedFixture))}"
                  title="${escapeHtml(canPlaceLiveBet ? t('liveLine.bet.available', 'זמין להימור') : t('liveLine.bet.unavailableOddsMoving', 'היחס מוצג למעקב אך אינו זמין להימור כרגע'))}"
                  ${canPlaceLiveBet ? '' : 'disabled aria-disabled="true"'}
                >
                  <small>${escapeHtml(market.cols[index] || '')}</small>
                  <b>${hasRealOdd ? oddValue : '-'}</b>
                  <span class="rb-live-line-odd-delta" hidden></span>
                </button>
                  `;
                })()}
              `).join('')}
            </div>
          </section>
        `).join('')}
        ${filteredMarkets.length ? '' : `<div class="rb-live-line-empty">${escapeHtml(t('liveLine.market.noResults', 'לא נמצאו שווקים'))}</div>`}
      </div>
    `;

    rememberExistingLiveTrackerNodes(panel);

    panel.innerHTML = `
      <section class="rb-live-line-shell">
        <aside class="rb-live-line-list-wrap">
          <div class="rb-live-line-meta">${escapeHtml(t('liveLine.updated', 'עודכן'))}: ${escapeHtml(updatedLabel)}</div>
          <div class="rb-live-line-games-list">
            ${mappedRows.map((row) => {
              const fixture = row.fixture;
              const home = String(fixture?.home_team || '').trim() || 'Home';
              const away = String(fixture?.away_team || '').trim() || 'Away';
              const league = String(fixture?.league_name || fixture?.league || fixture?.sport_title || '').trim();
              const kickoff = formatDateTime(parseFixtureTs(fixture));
              const lineSportKey = inferFixtureSportSlug(fixture) || state.secondary;
              const lineSim = mergeRealLiveData(fixture, makeLiveSim(fixture, row.id));
              const lineStatus = matchStatusTone(lineSim);
              const lineRemaining = estimatedRemainingLabel(lineSim, lineSportKey);
              const lineMomentum = momentumInfo(lineSim, home, away);
              const lineStats = compactStatsForMatchResolved(lineSim, lineSportKey);
              const lineTimeline = buildTimelineEvents(fixture, lineSim, row.id, lineSportKey);
              const lineLastEvent = lineTimeline[0];
              const lineIsLiveNow = fixtureIsLiveNow(fixture, row.id);
              const linePrimaryMarket = primaryMarketPreviewForFixture(fixture, lineSim, row.id, lineSportKey);
              const lineScore = liveScoreParts(lineSim);
              return `
                <article class="rb-live-line-game-card ${row.id === state.selectedGameId ? 'active' : ''} ${lineIsLiveNow ? 'is-live-now' : ''}" data-rb-live-line-game="${escapeHtml(row.id)}" role="button" tabindex="0" aria-label="${escapeHtml(home)} ${escapeHtml(t('liveLine.vs', 'נגד'))} ${escapeHtml(away)}">
<div class="rb-live-line-card-scoreline">
                    <div class="rb-live-line-card-team">
                      ${teamAvatarMarkup(fixture, 'home', home, 'small')}
                      <b>${escapeHtml(home)}</b>
                      <div class="rb-live-line-sport-icon" data-sport="${lineSportKey}" title="${t('liveLine.sport', 'ענף')}"></div>
                    </div>
                    <div class="rb-live-line-mini-score">
                      ${lineScore
                        ? `<b>${escapeHtml(lineScore.home)}</b><i>:</i><b>${escapeHtml(lineScore.away)}</b>`
                        : `<b>${escapeHtml(t('liveLine.noLiveScoreShort', '-'))}</b>`}
                    </div>
                    <div class="rb-live-line-card-team rb-live-line-card-team--away">
                      ${teamAvatarMarkup(fixture, 'away', away, 'small')}
                      <b>${escapeHtml(away)}</b>
                      <div class="rb-live-line-sport-icon" data-sport="${lineSportKey}" title="${t('liveLine.sport', 'ענף')}"></div>
                    </div>
                  </div>
                  <div class="rb-live-line-card-signals">
                    ${renderSignalPill(sportIconUrl(lineSportKey) || 'S', t('liveLine.sport', 'ענף'), league || t(`sport.${lineSportKey}`, lineSportKey), 'neutral')}
                    ${oddsStateSignalForFixture(fixture)}
                    ${renderSignalPill('T', t('liveLine.remaining', 'זמן'), lineRemaining, lineStatus.key)}
                    ${lineSim.hasRealStats ? renderSignalPill('M', t('liveLine.momentum', 'מומנטום'), lineMomentum.label, lineMomentum.key) : ''}
                    ${lineStats.slice(0, 2).map((stat) => renderSignalPill(stat.icon, stat.label, stat.value, 'neutral')).join('')}
                  </div>
                  ${linePrimaryMarket ? `
                    <div class="rb-live-line-card-market-preview" aria-label="${escapeHtml(linePrimaryMarket.title || t('liveLine.market.result', 'תוצאה'))}">
                      ${linePrimaryMarket.odds.map((item) => `
                        <span data-rb-live-line-odd-key="${escapeHtml(`${providerFixtureKey(fixture, 0) || row.id}|preview|${linePrimaryMarket.title || ''}|${item.label}`)}" data-rb-live-line-odd-value="${Number(item.odd).toFixed(2)}">
                          <small>${escapeHtml(item.label)}</small>
                          <b>${Number(item.odd).toFixed(2)}</b>
                          <i class="rb-live-line-odd-delta" hidden></i>
                        </span>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="rb-live-line-card-market-preview rb-live-line-card-market-preview--locked" aria-label="${escapeHtml(t('liveLine.noOpenOdds', 'אין יחסים פתוחים'))}">
                      ${['1', 'X', '2'].map((label) => `
                        <span aria-disabled="true">
                          <small>${escapeHtml(label)}</small>
                          <b>-</b>
                        </span>
                      `).join('')}
                    </div>
                  `}
                  ${lineLastEvent ? `
                    <div class="rb-live-line-card-footer">
                      <span>${escapeHtml(`${lineLastEvent.minute}'`)} ${escapeHtml(lineLastEvent.label)}</span>
                    </div>
                  ` : ''}
                </article>
              `;
            }).join('')}
          </div>
        </aside>
        <section class="rb-live-line-main-wrap">
          <section class="rb-live-line-detail">
            <div class="rb-live-line-detail-main">
              <div class="rb-live-line-detail-team">
                ${teamAvatarMarkup(selectedFixture, 'home', selectedHome, 'large')}
                <b>${escapeHtml(selectedHome)}</b>
              </div>
              <div class="rb-live-line-detail-score">
                <strong>${liveScoreParts(sim) ? `${escapeHtml(liveScoreParts(sim).home)} : ${escapeHtml(liveScoreParts(sim).away)}` : escapeHtml(t('liveLine.noLiveScore', 'אין תוצאה חיה'))}</strong>
                <small>${escapeHtml(selectedEvent || (selectedFromLiveFeed ? t('liveLine.liveFeed', 'פיד חי') : t('liveLine.liveMatch', 'משחק חי')))}</small>
              </div>
              <div class="rb-live-line-detail-team">
                ${teamAvatarMarkup(selectedFixture, 'away', selectedAway, 'large')}
                <b>${escapeHtml(selectedAway)}</b>
              </div>
            </div>
            <div class="rb-live-line-accordion">
              ${renderAccordionSection('stats', t('liveLine.accordion.stats', 'מדדים'), `${detailStats.length} ${t('liveLine.items', 'פריטים')}`, statsBody, openInfoPanelKey)}
              ${renderAccordionSection('timeline', t('liveLine.timeline', 'טיימליין'), `${timeline.length || 0}`, timelineBody, openInfoPanelKey)}
              ${renderAccordionSection('markets', t('liveLine.liveMarkets', 'שווקים חיים'), `${markets.length || 0}`, marketsBody, openInfoPanelKey)}
              ${renderAccordionSection('overview', t('liveLine.accordion.overview', 'סקירה חיה'), selectedStatus.label, overviewBody, openInfoPanelKey)}
            </div>
          </section>
        </section>
      </section>
    `;
    restorePreservedLiveTrackerNodes(panel);
    hydrateLiveTrackerWidgets();
    mountLiveLineExternalAnimation(selectedFixture, selectedSportKey, selectedRow.id).catch(() => {});
    window.requestAnimationFrame(() => updateLiveLineBallMotion());
    reorderSimulationAccordionItemsInDom(panel);

    const nowTs = Date.now();
    const nextOddsByKey = Object.create(null);
    const nextOddChangeByKey = Object.create(null);
    panel.querySelectorAll('[data-rb-live-line-odd-key][data-rb-live-line-odd-value]').forEach((node) => {
      const key = String(node.getAttribute('data-rb-live-line-odd-key') || '');
      const current = Number(node.getAttribute('data-rb-live-line-odd-value') || '');
      if (!key || !Number.isFinite(current)) return;
      const deltaEl = node.querySelector('.rb-live-line-odd-delta');
      const prev = Number(state.prevOddsByKey[key]);
      const previousChange = state.oddChangeByKey[key];
      node.classList.remove('rb-live-line-odd-up', 'rb-live-line-odd-down');
      const applyChange = (change) => {
        if (!change || Number(change.until || 0) <= nowTs) {
          if (deltaEl) {
            deltaEl.textContent = '';
            deltaEl.hidden = true;
          }
          return;
        }
        if (change.dir === 'up') node.classList.add('rb-live-line-odd-up');
        if (change.dir === 'down') node.classList.add('rb-live-line-odd-down');
        if (deltaEl) {
          const sign = change.dir === 'up' ? '+' : '-';
          deltaEl.textContent = `${sign}${Number(change.diff || 0).toFixed(2)}`;
          deltaEl.hidden = false;
        }
        nextOddChangeByKey[key] = change;
      };
      if (Number.isFinite(prev)) {
        if (current > prev) {
          const change = {
            dir: 'up',
            diff: Number((current - prev).toFixed(2)),
            until: nowTs + 5000
          };
          applyChange(change);
        } else if (current < prev) {
          const change = {
            dir: 'down',
            diff: Number((prev - current).toFixed(2)),
            until: nowTs + 5000
          };
          applyChange(change);
        } else {
          applyChange(previousChange);
        }
      } else {
        applyChange(previousChange);
      }
      nextOddsByKey[key] = current;
    });
    state.prevOddsByKey = nextOddsByKey;
    state.oddChangeByKey = nextOddChangeByKey;

    const gamesList = panel.querySelector('.rb-live-line-games-list');
    if (gamesList && gamesList.dataset.rbLiveLineScrollBound !== '1') {
      gamesList.addEventListener('scroll', () => {
        if (Date.now() < Number(state.suppressScrollTrackingUntil || 0)) return;
        state.lastUserScrollTs = Date.now();
      }, { passive: true });
      gamesList.dataset.rbLiveLineScrollBound = '1';
    }

    if (panel.dataset.rbGameClickBound !== '1') {
      panel.addEventListener('click', (event) => {
        const liveJump = event.target.closest('[data-rb-live-line-live-jump]');
        if (liveJump && panel.contains(liveJump)) {
          const id = String(liveJump.getAttribute('data-rb-live-line-live-jump') || '');
          const key = String(liveJump.getAttribute('data-rb-live-line-live-key') || id || '').trim();
          const sport = String(liveJump.getAttribute('data-rb-live-line-live-sport') || state.secondary || '').trim();
          if (sport) {
            state.primary = primaryForSecondary(sport);
            state.secondary = sport;
            state.country = 'global';
            state.worldCupMenuOpen = sport === 'football';
            state.worldCupMenuKey = 'all';
            state.worldCupTimeKey = 'all';
          }
          if (key) {
            state.pendingLiveJumpKey = key;
            state.selectedGameId = '';
            state.pinnedGameId = '';
          }
          const mount = getLiveLineMount();
          const groupsRow = getLiveLinePrimaryRow(mount);
          const subRow = getLiveLineSecondaryRow(mount);
          const countriesRow = mount?.querySelector('[data-rb-live-line-countries]');
          if (groupsRow) groupsRow.dataset.rbPrimaryTabsBuilt = '0';
          if (subRow) subRow.dataset.rbSecondaryTabsBuilt = '0';
          if (countriesRow) countriesRow.dataset.rbCountriesBuilt = '0';
          ensurePrimarySportsRow();
          ensureSecondarySportsRow();
          ensureCountriesRow();
          applySelectionDataset();
          applyVisualOverrides();
          renderGamesPanel();
          window.requestAnimationFrame(() => revealLiveLineMainOnMobile());
          return;
        }
        const pinButton = event.target.closest('[data-rb-live-line-pin]');
        if (pinButton && panel.contains(pinButton)) {
          const id = String(pinButton.getAttribute('data-rb-live-line-pin') || '');
          if (!id) return;
          state.pinnedGameId = state.pinnedGameId === id ? '' : id;
          if (state.pinnedGameId) state.selectedGameId = state.pinnedGameId;
          renderGamesPanel();
          return;
        }
        const infoToggle = event.target.closest('[data-rb-live-line-panel-toggle]');
        if (infoToggle && panel.contains(infoToggle)) {
          const key = String(infoToggle.getAttribute('data-rb-live-line-panel-toggle') || '');
          if (key) {
            state.openInfoPanelKey = state.openInfoPanelKey === key ? 'overview' : key;
            renderGamesPanel();
          }
          return;
        }
        const marketToggle = event.target.closest('[data-rb-live-line-market-toggle]');
        if (marketToggle && panel.contains(marketToggle)) {
          const title = String(marketToggle.getAttribute('data-rb-live-line-market-toggle') || '');
          if (title) {
            state.openMarketKey = state.openMarketKey === title ? '' : title;
            renderGamesPanel();
          }
          return;
        }
        const marketBtn = event.target.closest('.rb-live-line-market-btn');
        if (marketBtn && panel.contains(marketBtn)) {
          panel.querySelectorAll('.rb-live-line-market-btn.active').forEach((node) => node.classList.remove('active'));
          marketBtn.classList.add('active');
          placeLiveBetNow(marketBtn, selectedFixture).finally(() => {
            window.setTimeout(() => {
              renderMiniSlip();
              syncStoredBetsToApi();
            }, 80);
          });
          return;
        }
        const card = event.target.closest('[data-rb-live-line-game]');
        if (!card || !panel.contains(card)) return;
        const id = String(card.getAttribute('data-rb-live-line-game') || '');
        if (!id || id === state.selectedGameId) return;
        state.selectedGameId = id;
        if (state.pinnedGameId) state.pinnedGameId = id;
        renderGamesPanel();
        window.requestAnimationFrame(() => revealLiveLineMainOnMobile());
      });
      panel.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('[data-rb-live-line-game]');
        if (!card || !panel.contains(card)) return;
        event.preventDefault();
        const id = String(card.getAttribute('data-rb-live-line-game') || '');
        if (!id || id === state.selectedGameId) return;
        state.selectedGameId = id;
        renderGamesPanel();
        window.requestAnimationFrame(() => revealLiveLineMainOnMobile());
      });
      panel.addEventListener('input', (event) => {
        const search = event.target.closest('[data-rb-live-line-market-search]');
        if (!search || !panel.contains(search)) return;
        state.marketQuery = String(search.value || '').trim();
        renderGamesPanelPreservingViewport();
      });
      panel.dataset.rbGameClickBound = '1';
    }

  };

  const renderGamesPanelPreservingViewport = () => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollSnapshot = snapshotRowsScroll();
    state.suppressScrollTrackingUntil = Date.now() + 900;
    const restoreViewport = () => {
      restoreRowsScroll(scrollSnapshot);
      if (Math.abs(window.scrollY - scrollY) > 2 || Math.abs(window.scrollX - scrollX) > 2) {
        state.suppressScrollTrackingUntil = Date.now() + 900;
        window.scrollTo(scrollX, scrollY);
      }
    };
    renderGamesPanel();
    window.requestAnimationFrame(() => {
      restoreViewport();
      window.setTimeout(restoreViewport, 80);
      window.setTimeout(restoreViewport, 260);
    });
  };

  const loadFixturesForLiveLine = async (options = {}) => {
    const forceRefresh = options?.forceRefresh === true;
    const now = Date.now();
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = ['localhost'].includes(host);
    const configuredBase = String(window.ROYALBET_API_BASE || '').replace(/\/+$/, '');
    const strictLocalMode = isLocalHost;
    if (!state.cacheHydrated) {
      state.cacheHydrated = true;
      if (strictLocalMode) {
        clearLiveLineFixturesCache();
      }
      const cached = readLiveLineFixturesCache();
      if (!strictLocalMode && cached && !state.fixtures.length) {
        const normalizedCachedRows = normalizeIncomingFixtures(cached.rows);
        state.fixtures = normalizedCachedRows;
        state.fixturesSignature = fixtureRowsSignature(normalizedCachedRows);
        state.fixturesLoaded = true;
        state.fixturesLoadedAt = cached.loadedAt;
        state.lastUpdatedAt = now;
      }
    }
    if (!forceRefresh && state.fixturesLoaded && state.fixtures.length && (now - state.fixturesLoadedAt) < LIVE_LINE_FIXTURES_CACHE_MS) return state.fixtures;
    const locale = getSiteLanguage();
    const endpointGroups = liveLineFixtureEndpointGroups(locale);
    let withRows = [];
    for (const endpoints of endpointGroups) {
      const results = await Promise.all(endpoints.map(async (endpoint) => {
        const result = await fetchJsonWithTimeout(endpoint, 4500);
        if (!result.ok) return { endpoint, rows: [] };
        const feed = String(endpoint || '').includes('/api/public-live-line') ? 'live-line' : 'fixtures';
        const rows = fixtureRowsFromPayload(result.payload).map((row) => ({
          ...normalizeFixture(row),
          __rbFeed: feed
        }));
        return { endpoint, rows };
      }));
      withRows.push(...results.filter((item) => item.rows.length));
    }

    if (withRows.length) {
      const localRows = isLocalHost
        ? withRows.filter((item) => /^https?:\/\/(localhost|):1337\//i.test(item.endpoint))
        : [];
      const configuredRows = configuredBase
        ? withRows.filter((item) => item.endpoint.startsWith(configuredBase))
        : [];
      const sameOriginRows = withRows.filter((item) => {
        if (item.endpoint.startsWith('/')) return true;
        return item.endpoint.startsWith(window.location.origin);
      });
      const materializeRows = (items) => {
        const byKey = new Map();
        (items || []).forEach((item) => {
          (item.rows || []).forEach((row, index) => {
            const key = String(row?.fixture_id || row?.id || `${row?.home_team || 'home'}-${row?.away_team || 'away'}-${row?.commence_time || index}`);
            const existing = byKey.get(key);
            if (!existing) {
              byKey.set(key, row);
              return;
            }
            const incomingLive = fixtureIsLiveNow(row, key);
            const existingLive = fixtureIsLiveNow(existing, key);
            if (incomingLive && !existingLive) byKey.set(key, row);
          });
        });
        return Array.from(byKey.values());
      };
      // In localhost/dev mode we must mirror the local backend strictly,
      // so phantom fixtures from external fallback sources cannot leak into the UI.
      const sourceCandidates = strictLocalMode
        ? [
          { key: 'local', items: localRows }
        ]
        : [
          { key: 'local', items: localRows },
          { key: 'configured', items: configuredRows },
          { key: 'same-origin', items: sameOriginRows },
          { key: 'any', items: withRows }
        ];
      const rankedSources = sourceCandidates
        .map((candidate) => {
          const rows = materializeRows(candidate.items);
          const fixturesCount = (candidate.items || []).reduce((count, item) => (
            count + (String(item?.endpoint || '').includes('/api/public-fixtures') ? (item.rows || []).length : 0)
          ), 0);
          const liveCount = rows.reduce((count, fixture, index) => (
            fixtureIsLiveNow(fixture, fixtureId(fixture, index)) ? count + 1 : count
          ), 0);
          const activeCount = rows.reduce((count, fixture) => (
            (!fixtureHasFinalStatus(fixture) && fixture?.finished !== true && fixture?.completed !== true) ? count + 1 : count
          ), 0);
          return {
            key: candidate.key,
            rows,
            fixturesCount,
            liveCount,
            activeCount,
            totalCount: rows.length
          };
        })
        .filter((candidate) => candidate.totalCount > 0)
        .sort((a, b) => {
          if (b.fixturesCount !== a.fixturesCount) return b.fixturesCount - a.fixturesCount;
          if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
          if (b.liveCount !== a.liveCount) return b.liveCount - a.liveCount;
          return b.totalCount - a.totalCount;
        });
      const rows = rankedSources[0]?.rows || [];
      const stabilizedRows = freezeNonLiveRows(rows, state.fixtures);
      const normalizedRows = normalizeIncomingFixtures(stabilizedRows);
      const nextSignature = fixtureRowsSignature(normalizedRows);
      if (state.fixtures.length && state.fixturesSignature === nextSignature) {
        state.fixturesLoaded = true;
        state.fixturesLoadedAt = Date.now();
        state.lastUpdatedAt = Date.now();
        return state.fixtures;
      }
      state.fixtures = normalizedRows;
      state.fixturesSignature = nextSignature;
      state.fixturesLoaded = true;
      state.fixturesLoadedAt = Date.now();
      state.lastUpdatedAt = Date.now();
      writeLiveLineFixturesCache(state.fixtures, state.fixturesSignature, state.fixturesLoadedAt);
      prefetchTeamBadgesForRows(state.fixtures);

      // Translate labels asynchronously after first paint to avoid load flash/delay.
            translateFixtureRowsLive(rows, locale).then((translatedRows) => {
        if (!Array.isArray(translatedRows) || !translatedRows.length) return;
        
        const stabilizedTranslatedRows = freezeNonLiveRows(translatedRows, state.fixtures);
        const normalizedTranslatedRows = normalizeIncomingFixtures(stabilizedTranslatedRows);
        const translatedSignature = fixtureRowsSignature(normalizedTranslatedRows);
        
        if (state.fixturesSignature === translatedSignature) return;
        state.fixtures = normalizedTranslatedRows;
        state.fixturesSignature = translatedSignature;
        state.fixturesLoadedAt = Date.now();
        state.lastUpdatedAt = Date.now();
        
        writeLiveLineFixturesCache(state.fixtures, state.fixturesSignature, state.fixturesLoadedAt);
        prefetchTeamBadgesForRows(state.fixtures);
        renderGamesPanelPreservingViewport();
      }).catch((err) => {
        console.error("Translation stream failure", err);
        renderGamesPanelPreservingViewport();
      });

      return state.fixtures;
    }

    if (state.fixtures.length) {
      if (strictLocalMode) {
        state.fixtures = [];
        state.fixturesSignature = 'empty';
        clearLiveLineFixturesCache();
      } else {
      const staleState = (Date.now() - Number(state.fixturesLoadedAt || 0)) > 120000;
      const preservedRows = normalizeIncomingFixtures(state.fixtures).filter((fixture, index) => {
        if (fixtureHasFinalStatus(fixture) || fixture?.finished === true || fixture?.completed === true) return false;
        return true;
      });
      if (!staleState && preservedRows.length) {
        state.fixtures = preservedRows;
        state.fixturesSignature = fixtureRowsSignature(preservedRows);
        state.fixturesLoaded = true;
        state.fixturesLoadedAt = Date.now();
        state.lastUpdatedAt = Date.now();
        writeLiveLineFixturesCache(state.fixtures, state.fixturesSignature, state.fixturesLoadedAt);
        return state.fixtures;
      }
      clearLiveLineFixturesCache();
      if (staleState) {
        state.fixtures = [];
        state.fixturesSignature = 'empty';
      }
      }
    }

    const cached = readLiveLineFixturesCache();
    if (!strictLocalMode && cached && cached.rows.length) {
      const normalizedCachedRows = normalizeIncomingFixtures(cached.rows);
      state.fixtures = normalizedCachedRows;
      state.fixturesSignature = fixtureRowsSignature(normalizedCachedRows);
      state.fixturesLoaded = true;
      state.fixturesLoadedAt = cached.loadedAt;
      state.lastUpdatedAt = Date.now();
      return state.fixtures;
    }

    state.fixtures = normalizeIncomingFixtures([]);
    state.fixturesSignature = 'empty';
    state.fixturesLoaded = true;
    state.fixturesLoadedAt = Date.now();
    state.lastUpdatedAt = Date.now();
    return state.fixtures;
  };

  const pruneLiveLineContent = () => {
    const mount = getLiveLineMount();
    if (!mount) return;
    if (mount.dataset.rbLiveLinePruned === '1') return;
    PRUNE_SELECTORS.forEach((selector) => {
      mount.querySelectorAll(selector).forEach((node) => node.remove());
    });
    mount.dataset.rbLiveLinePruned = '1';
  };

  const ensurePrimarySportsRow = () => {
    const mount = getLiveLineMount();
    if (!mount) return;
    const groupsRow = getLiveLinePrimaryRow(mount);
    if (!groupsRow) return;
    const tabs = primaryTabsForCurrentData();
    const expectedKeys = tabs.map((tab) => String(tab.key || '').trim()).filter(Boolean);
    const existingButtons = Array.from(groupsRow.querySelectorAll('[data-rb-live-line-primary]'));
    const existingKeys = existingButtons.map((node) => String(node.getAttribute('data-rb-live-line-primary') || '').trim()).filter(Boolean);
    const existingKeySignature = existingKeys.map((key, index) => `${key}:${existingButtons[index]?.getAttribute('data-rb-live-line-count') || '0'}`).join('|');
    const expectedKeySignature = tabs.map((tab) => `${tab.key}:${countFixturesForPrimary(tab.key)}`).join('|');
    if (!tabs.some((tab) => tab.key === state.primary)) {
      state.primary = tabs[0]?.key || state.primary;
      state.secondary = firstSecondaryForPrimary(state.primary)?.key || state.secondary;
      state.country = 'global';
      state.worldCupMenuOpen = state.secondary === 'football';
      state.worldCupMenuKey = 'all';
      state.worldCupTimeKey = 'all';
      state.selectedGameId = '';
    }
    if (groupsRow.dataset.rbPrimaryTabsBuilt === '1' && existingKeySignature === expectedKeySignature) return;

    groupsRow.innerHTML = tabs.map((tab) => (
      `<button type="button" class="rb-home-sport-group rb-live-line-primary-tab ${tab.key === state.primary ? 'active' : ''}" data-rb-live-line-primary="${tab.key}" data-rb-live-line-count="${countFixturesForPrimary(tab.key)}">
        ${menuCountBadge(countFixturesForPrimary(tab.key))}
        <strong>${escapeHtml(t(tab.labelKey, tab.label))}</strong>
        <span><img src="${tab.image}" alt=""></span>
      </button>`
    )).join('');

    if (groupsRow.dataset.rbPrimaryClickBound !== '1') {
      groupsRow.addEventListener('click', (event) => {
        const scrollSnapshot = snapshotRowsScroll();
        const tabButton = event.target.closest('[data-rb-live-line-primary]');
        if (!tabButton || !groupsRow.contains(tabButton)) return;
        event.preventDefault();
        event.stopPropagation();
        groupsRow.querySelectorAll('[data-rb-live-line-primary]').forEach((node) => node.classList.remove('active'));
        tabButton.classList.add('active');
        state.primary = String(tabButton.getAttribute('data-rb-live-line-primary') || 'ball-games');
        state.secondary = firstSecondaryForPrimary(state.primary)?.key || state.secondary;
        state.country = 'global';
        state.worldCupMenuOpen = state.secondary === 'football';
        state.worldCupMenuKey = 'all';
        state.worldCupTimeKey = 'all';
        state.selectedGameId = '';
        const subRow = getLiveLineSecondaryRow(mount);
        if (subRow) subRow.dataset.rbSecondaryTabsBuilt = '0';
        const countriesRow = mount.querySelector('[data-rb-live-line-countries]');
        if (countriesRow) countriesRow.dataset.rbCountriesBuilt = '0';
        ensureSecondarySportsRow();
        ensureCountriesRow();
        applySelectionDataset();
        renderGamesPanel();
        window.requestAnimationFrame(() => restoreRowsScroll(scrollSnapshot));
      });
      groupsRow.dataset.rbPrimaryClickBound = '1';
    }

    groupsRow.dataset.rbPrimaryTabsBuilt = '1';
    groupsRow.dataset.rbLiveLinePrimary = '1';
  };

  const ensureSecondarySportsRow = () => {
    const mount = getLiveLineMount();
    if (!mount) return;
    const subRow = getLiveLineSecondaryRow(mount);
    if (!subRow) return;
    const tabs = secondariesForPrimary(state.primary);
    const currentForPrimary = String(subRow.dataset.rbSecondaryForPrimary || '');
    const existingButtons = Array.from(subRow.querySelectorAll('[data-rb-live-line-secondary]'));
    const expectedKeys = tabs.map((tab) => String(tab.key || '').trim()).filter(Boolean);
    const existingKeys = existingButtons.map((node) => String(node.getAttribute('data-rb-live-line-secondary') || '').trim()).filter(Boolean);
    const existingKeySignature = existingKeys.map((key, index) => `${key}:${existingButtons[index]?.getAttribute('data-rb-live-line-count') || '0'}`).join('|');
    const expectedKeySignature = tabs.map((tab) => `${tab.key}:${countFixturesForSecondary(tab.key)}`).join('|');
    const labelsMismatch = existingButtons.some((node) => {
      const key = String(node.getAttribute('data-rb-live-line-secondary') || '').trim();
      if (!key) return true;
      const tab = tabs.find((item) => item.key === key);
      if (!tab) return true;
      const expectedLabel = String(t(tab.labelKey, tab.label) || '').replace(/\s+/g, ' ').trim();
      const currentLabel = String(node.textContent || '').replace(/\s+/g, ' ').trim();
      return expectedLabel && currentLabel && expectedLabel !== currentLabel;
    });
    const shouldRebuild = subRow.dataset.rbSecondaryTabsBuilt !== '1'
      || currentForPrimary !== state.primary
      || existingKeySignature !== expectedKeySignature
      || labelsMismatch;
    if (!shouldRebuild) return;
    const preserveScroll = currentForPrimary === state.primary && existingButtons.length > 0;
    const previousSecondaryScroll = preserveScroll ? getLogicalScrollLeft(subRow) : 0;

    if (!tabs.some((item) => item.key === state.secondary)) {
      state.secondary = tabs[0]?.key || state.secondary;
    }

    subRow.innerHTML = tabs.map((tab) => (
      `<button type="button" class="rb-home-sub-sport rb-live-line-secondary-tab ${tab.key === state.secondary ? 'active' : ''}" data-rb-live-line-secondary="${tab.key}" data-rb-live-line-count="${countFixturesForSecondary(tab.key)}">
        ${menuCountBadge(countFixturesForSecondary(tab.key))}
        <strong class="rb-live-line-secondary-label">${escapeHtml(t(tab.labelKey, tab.label))}</strong>
        <span><img src="${tab.image}" alt=""></span>
      </button>`
    )).join('');

    if (subRow.dataset.rbSecondaryClickBound !== '1') {
      subRow.addEventListener('click', (event) => {
        const scrollSnapshot = snapshotRowsScroll();
        const tabButton = event.target.closest('[data-rb-live-line-secondary]');
        if (!tabButton || !subRow.contains(tabButton)) return;
        event.preventDefault();
        event.stopPropagation();
        subRow.querySelectorAll('[data-rb-live-line-secondary]').forEach((node) => node.classList.remove('active'));
        tabButton.classList.add('active');
        state.secondary = String(tabButton.getAttribute('data-rb-live-line-secondary') || state.secondary);
        state.country = 'global';
        state.worldCupMenuOpen = state.secondary === 'football';
        state.worldCupMenuKey = 'all';
        state.worldCupTimeKey = 'all';
        state.selectedGameId = '';
        const countriesRow = mount.querySelector('[data-rb-live-line-countries]');
        if (countriesRow) countriesRow.dataset.rbCountriesBuilt = '0';
        ensureCountriesRow();
        applySelectionDataset();
        renderGamesPanel();
        window.requestAnimationFrame(() => restoreRowsScroll(scrollSnapshot));
      });
      subRow.dataset.rbSecondaryClickBound = '1';
    }

    subRow.dataset.rbSecondaryTabsBuilt = '1';
    subRow.dataset.rbLiveLineSecondary = '1';
    subRow.dataset.rbSecondaryForPrimary = state.primary;
    if (preserveScroll) {
      window.requestAnimationFrame(() => {
        setLogicalScrollLeft(subRow, previousSecondaryScroll);
      });
    }
  };

  const ensureCountriesRow = () => {
    const mount = getLiveLineMount();
    if (!mount) return;
    const subRow = getLiveLineSecondaryRow(mount);
    if (!subRow) return;

    let countriesRow = mount.querySelector('[data-rb-live-line-countries]');
    if (!countriesRow) {
      countriesRow = document.createElement('div');
      countriesRow.className = 'rb-live-line-countries-row';
      countriesRow.setAttribute('data-rb-live-line-countries', 'true');
      subRow.insertAdjacentElement('afterend', countriesRow);
    }

    const countries = countriesForSecondary(state.secondary);
    if (!countries.some((item) => item.key === state.country)) state.country = 'global';
    const forSecondary = String(countriesRow.dataset.rbCountriesForSecondary || '');
    const expectedCountrySignature = countries.map((country) => `${country.key}:${countFixturesForCountry(state.secondary, country.key)}`).join('|');
    const shouldRebuild = countriesRow.dataset.rbCountriesBuilt !== '1'
      || forSecondary !== state.secondary
      || countriesRow.dataset.rbCountriesCountSignature !== expectedCountrySignature;
    if (!shouldRebuild) return;

    countriesRow.innerHTML = countries.map((country) => (
      `<button type="button" class="rb-live-line-country-chip ${country.key === state.country ? 'active' : ''}" data-rb-live-line-country="${country.key}" data-rb-live-line-count="${countFixturesForCountry(state.secondary, country.key)}">
        ${menuCountBadge(countFixturesForCountry(state.secondary, country.key))}
        <span class="rb-live-line-country-chip-label">${escapeHtml(t(country.labelKey, country.label))}</span>
        <span class="rb-live-line-country-chip-flag" aria-hidden="true">${
          country.flagCode && localFlagForCountryKey(country.key || country.flagCode)
            ? `<img src="${escapeHtml(localFlagForCountryKey(country.key || country.flagCode))}" alt="${escapeHtml(t(country.labelKey, country.label))}" loading="lazy" decoding="async">`
            : country.flagCode
              ? `<img src="https://flagcdn.com/w40/${country.flagCode}.png" alt="${escapeHtml(t(country.labelKey, country.label))}" loading="lazy" decoding="async">`
            : (country.emoji || '\ud83c\udf0d')
        }</span>
      </button>`
    )).join('');

    if (countriesRow.dataset.rbCountryClickBound !== '1') {
      countriesRow.addEventListener('click', (event) => {
        const scrollSnapshot = snapshotRowsScroll();
        const button = event.target.closest('[data-rb-live-line-country]');
        if (!button || !countriesRow.contains(button)) return;
        event.preventDefault();
        event.stopPropagation();
        countriesRow.querySelectorAll('[data-rb-live-line-country]').forEach((node) => node.classList.remove('active'));
        button.classList.add('active');
        state.country = String(button.getAttribute('data-rb-live-line-country') || 'global');
        if (state.country === 'global' && state.secondary === 'football') {
          state.worldCupMenuOpen = true;
        } else {
          state.worldCupMenuOpen = false;
          state.worldCupMenuKey = 'all';
          state.worldCupTimeKey = 'all';
        }
        state.selectedGameId = '';
        applySelectionDataset();
        renderWorldCupMenuRow();
        renderGamesPanel();
        window.requestAnimationFrame(() => restoreRowsScroll(scrollSnapshot));
      });
      countriesRow.dataset.rbCountryClickBound = '1';
    }

    countriesRow.dataset.rbCountriesBuilt = '1';
    countriesRow.dataset.rbCountriesForSecondary = state.secondary;
    countriesRow.dataset.rbCountriesCountSignature = expectedCountrySignature;
    renderWorldCupMenuRow();
  };

  const renderWorldCupMenuRow = () => {
    const mount = getLiveLineMount();
    if (!mount) return;
    const countriesRow = mount.querySelector('[data-rb-live-line-countries]');
    if (!countriesRow) return;
    let worldRow = mount.querySelector('[data-rb-live-line-world-cup-menu]');
    const shouldShow = state.secondary === 'football' && state.country === 'global' && state.worldCupMenuOpen;
    if (!shouldShow) {
      if (worldRow) worldRow.remove();
      return;
    }
    if (!worldRow) {
      worldRow = document.createElement('div');
      worldRow.className = 'rb-live-line-world-cup-row';
      worldRow.setAttribute('data-rb-live-line-world-cup-menu', 'true');
      countriesRow.insertAdjacentElement('afterend', worldRow);
    }
    worldRow.innerHTML = `
      <div class="rb-live-line-world-cup-group" data-rb-live-line-world-cup-stage>
        ${WORLD_CUP_MENU_ITEMS.map((item) => (
          `<button type="button" class="rb-live-line-world-cup-chip ${item.key === state.worldCupMenuKey ? 'active' : ''}" data-rb-live-line-world-cup="${item.key}">${escapeHtml(t(item.labelKey, item.fallback))}</button>`
        )).join('')}
      </div>
      <div class="rb-live-line-world-cup-group" data-rb-live-line-world-cup-time>
        ${WORLD_CUP_TIME_ITEMS.map((item) => (
          `<button type="button" class="rb-live-line-world-cup-chip ${item.key === state.worldCupTimeKey ? 'active' : ''}" data-rb-live-line-world-cup-time="${item.key}">${escapeHtml(t(item.labelKey, item.fallback))}</button>`
        )).join('')}
      </div>
    `;
    if (worldRow.dataset.rbWorldCupClickBound !== '1') {
      worldRow.addEventListener('click', (event) => {
        const stageButton = event.target.closest('[data-rb-live-line-world-cup]');
        const timeButton = event.target.closest('[data-rb-live-line-world-cup-time]');
        if (!stageButton && !timeButton) return;
        event.preventDefault();
        if (stageButton) {
          const key = String(stageButton.getAttribute('data-rb-live-line-world-cup') || 'all');
          state.worldCupMenuKey = key;
          worldRow.querySelectorAll('[data-rb-live-line-world-cup]').forEach((node) => node.classList.remove('active'));
          stageButton.classList.add('active');
        }
        if (timeButton) {
          const key = String(timeButton.getAttribute('data-rb-live-line-world-cup-time') || 'all');
          state.worldCupTimeKey = key;
          worldRow.querySelectorAll('[data-rb-live-line-world-cup-time]').forEach((node) => node.classList.remove('active'));
          timeButton.classList.add('active');
        }
        state.selectedGameId = '';
        renderGamesPanelPreservingViewport();
      });
      worldRow.dataset.rbWorldCupClickBound = '1';
    }
  };

  const applySelectionDataset = () => {
    const mount = getLiveLineMount();
    if (!mount) return;
    mount.dataset.rbLiveLinePrimary = state.primary;
    mount.dataset.rbLiveLineSecondary = state.secondary;
    mount.dataset.rbLiveLineCountry = state.country;
  };

  const applyVisualOverrides = () => {
    const tabs = document.querySelectorAll('.rb-live-line-primary-tab, .rb-live-line-secondary-tab, .rb-live-line-country-chip');
    tabs.forEach((tab) => {
      tab.style.setProperty('background-color', LIVE_LINE_TAB_BG, 'important');
      tab.style.setProperty('background-image', 'none', 'important');
      tab.style.setProperty('flex-shrink', '0', 'important');
    });
  };

  const refreshLanguageIfNeeded = () => {
    const next = getSiteLanguage();
    if (next === state.language) return;
    state.language = next;
    const mount = getLiveLineMount();
    const groupsRow = getLiveLinePrimaryRow(mount);
    const subRow = getLiveLineSecondaryRow(mount);
    const countriesRow = mount?.querySelector('[data-rb-live-line-countries]');
    if (groupsRow) groupsRow.dataset.rbPrimaryTabsBuilt = '0';
    if (subRow) subRow.dataset.rbSecondaryTabsBuilt = '0';
    if (countriesRow) countriesRow.dataset.rbCountriesBuilt = '0';
    state.fixturesLoaded = false;
    state.fixturesLoadedAt = 0;
    state.fixturesSignature = '';
    renderMiniSlip();
    renderGamesPanel();
    ensurePrimarySportsRow();
    ensureSecondarySportsRow();
    ensureCountriesRow();
    applyVisualOverrides();
  };

  let tickBusy = false;
  const tick = () => {
    if (tickBusy) return;
    tickBusy = true;
    scrubLegacySportsSelectors(getLiveLineMount());
    const activeLanguage = getSiteLanguage();
    if (!liveLineTranslations.has(activeLanguage)) {
      ensureLiveLineTranslations(activeLanguage)
        .catch(() => ({}));
    }
    refreshLanguageIfNeeded();
    pruneLiveLineContent();
    ensurePrimarySportsRow();
    ensureSecondarySportsRow();
    ensureCountriesRow();
    applySelectionDataset();
    applyVisualOverrides();
    renderMiniSlip();
    renderGamesPanel();
    syncStoredBetsToApi();
    loadFixturesForLiveLine()
      .then(renderGamesPanel)
      .catch(() => renderGamesPanel())
      .finally(() => {
        tickBusy = false;
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick, { once: true });
  } else {
    tick();
  }

  let rafId = 0;
  const schedule = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      tick();
    });
  };

  let liveLineGuardObserver = null;
  let liveLineGuardBusy = false;
  const ensureLiveLineGuard = () => {
    if (liveLineGuardObserver) return;
    liveLineGuardObserver = new MutationObserver(() => {
      if (liveLineGuardBusy) return;
      const hasShell = Boolean(document.querySelector('.rb-live-line-shell'));
      const mount = getLiveLineMount();
      if (hasShell && mount) return;
      liveLineGuardBusy = true;
      window.requestAnimationFrame(() => {
        liveLineGuardBusy = false;
        schedule();
      });
    });
    liveLineGuardObserver.observe(document.body, { childList: true, subtree: true });
  };

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('storage', (event) => {
    if (!event?.key) return;
    if (event.key === PLAYER_BETS_KEY) {
      renderMiniSlip();
      syncStoredBetsToApi();
      return;
    }
    if (event.key === LANGUAGE_KEY) {
      ensureLiveLineTranslations(getSiteLanguage()).finally(schedule);
    }
  });
  document.addEventListener('click', (event) => {
    const languageOption = event.target.closest('[data-rb-language-option]');
    if (!languageOption) return;
    window.setTimeout(() => {
      ensureLiveLineTranslations(getSiteLanguage()).finally(schedule);
    }, 20);
  });
  window.addEventListener('scroll', () => {
    document.documentElement.classList.toggle('rb-live-line-scrolled', window.scrollY > 24);
    if (Date.now() < Number(state.suppressScrollTrackingUntil || 0)) return;
    state.lastUserScrollTs = Date.now();
  }, { passive: true });
  document.documentElement.classList.toggle('rb-live-line-scrolled', window.scrollY > 24);
  let panelRefreshTimer = 0;
  const panelRefreshDelayMs = () => (document.visibilityState === 'visible' ? LIVE_LINE_ODDS_REFRESH_MS : 40000);
  const queuePanelRefresh = () => {
    if (panelRefreshTimer) window.clearTimeout(panelRefreshTimer);
    panelRefreshTimer = window.setTimeout(runPanelRefresh, panelRefreshDelayMs());
  };
  const runPanelRefresh = () => {
    const now = Date.now();
    const userIsScrolling = (now - Number(state.lastUserScrollTs || 0)) < 1200;
    if (userIsScrolling) {
      queuePanelRefresh();
      return;
    }
    const mount = getLiveLineMount();
    const hasPrimary = Boolean(getLiveLinePrimaryRow(mount));
    const hasSecondary = Boolean(getLiveLineSecondaryRow(mount));
    const hasCountries = Boolean(mount?.querySelector('[data-rb-live-line-countries]'));
    if (!hasPrimary || !hasSecondary || !hasCountries) {
      const y = window.scrollY;
      tick();
      window.requestAnimationFrame(() => {
        if ((Date.now() - Number(state.lastUserScrollTs || 0)) < 200) return;
        if (Math.abs(window.scrollY - y) > 80) window.scrollTo(window.scrollX, y);
      });
      queuePanelRefresh();
      return;
    }
    const previousSignature = String(state.fixturesSignature || '');
    const previousCount = Array.isArray(state.fixtures) ? state.fixtures.length : 0;
    const justLoaded = Number(state.fixturesLoadedAt || 0) > 0 && (now - Number(state.fixturesLoadedAt || 0)) < LIVE_LINE_ODDS_REFRESH_MS;
    if (justLoaded) {
      queuePanelRefresh();
      return;
    }
    loadFixturesForLiveLine({ forceRefresh: document.visibilityState === 'visible' }).then(() => {
      if ((Date.now() - Number(state.lastUserScrollTs || 0)) < 500) return;
      const nextCount = Array.isArray(state.fixtures) ? state.fixtures.length : 0;
      const dataChanged = String(state.fixturesSignature || '') !== previousSignature || nextCount !== previousCount;
      if (!dataChanged) {
        expireLiveOddChangeIndicators();
        return;
      }
      renderGamesPanelPreservingViewport();
    }).catch(() => {
      if ((Date.now() - Number(state.lastUserScrollTs || 0)) < 500) return;
      renderGamesPanelPreservingViewport();
    }).finally(() => {
      queuePanelRefresh();
    });
  };
  queuePanelRefresh();
  let betsSyncTimer = 0;
  const betsSyncDelayMs = () => (document.visibilityState === 'visible' ? 25000 : 90000);
  const queueBetsSync = () => {
    if (betsSyncTimer) window.clearTimeout(betsSyncTimer);
    betsSyncTimer = window.setTimeout(() => {
      syncStoredBetsToApi();
      queueBetsSync();
    }, betsSyncDelayMs());
  };
  queueBetsSync();
  ensureLiveTrackerSocket().catch(() => {});
  window.setInterval(expireLiveOddChangeIndicators, 1000);
  window.setInterval(() => {
    updateLiveLineBallMotion();
  }, 850);

  ensureLiveLineGuard();
  const guardBootUntil = Date.now() + 12000;
  const guardBootTimer = window.setInterval(() => {
    if (Date.now() > guardBootUntil) {
      window.clearInterval(guardBootTimer);
      return;
    }
    if (!document.querySelector('.rb-live-line-shell')) schedule();
  }, 300);
})();
