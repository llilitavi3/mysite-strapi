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

  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const isLiveLineRoute = currentPath === '/sport/live-line' || currentPath === '/live-line';
  if (isLiveLineRoute) document.documentElement.classList.add('rb-route-live-line');
  const adminHostLike = /^addapi\./i.test(window.location.hostname || '');
  const isStrapiAdminPath = (
    currentPath.startsWith('/admin')
    || currentPath.startsWith('/content-manager')
    || currentPath.startsWith('/settings')
    || currentPath.startsWith('/plugins')
  );
  if (adminHostLike || isStrapiAdminPath) return;
  const BETSLIP_COLLAPSED_KEY = 'royalbet_betslip_collapsed';
  const FOOTER_MENU_OPEN_KEY = 'royalbet_footer_menu_open';
  const SPORT_SELECTION_KEY = 'royalbet_selected_sport';
  const LANGUAGE_KEY = 'royalbet_site_language';
  const PLAYER_BETS_KEY = 'royalbet_player_bets';
  const PLAYER_STAKE_KEY = 'royalbet_player_stake';
  const PLAYER_ACCOUNT_URL = '/account/login.html';
  const PLAYER_DASHBOARD_URL = '/player-dashboard.html';
  const AGENT_DASHBOARD_URL = '/agent-dashboard.html';
  const AUTH_TOKEN_KEYS = ['royalbet_api_jwt', 'jwt', 'token'];
  const AUTH_USER_KEYS = ['royalbet_user', 'user'];
  const AGENT_ROLES = ['agent', 'admin', 'master', 'super', 'manager'];
  const ENABLE_SYNTHETIC_CONTENT = false;
  const ENABLE_PAGE_SLIDER = false;
  if (ENABLE_PAGE_SLIDER) {
    document.documentElement.classList.add('rb-page-slider-pending');
  } else {
    document.documentElement.classList.remove('rb-page-slider-pending');
    document.documentElement.classList.add('rb-page-slider-ready');
  }
  const closest = (target, selector) => target && target.closest ? target.closest(selector) : null;
  const internalRoute = (href) => href && href.startsWith('/') && !href.startsWith('/assets/');
  const hasAuthToken = () => {
    if (window.RBSecurity && typeof window.RBSecurity.getToken === 'function') {
      return Boolean(window.RBSecurity.getToken());
    }
    return AUTH_TOKEN_KEYS.some((key) => Boolean(sessionStorage.getItem(key) || localStorage.getItem(key)));
  };
  const readAuthUser = () => {
    if (window.RBSecurity && typeof window.RBSecurity.getUser === 'function') {
      const user = window.RBSecurity.getUser();
      if (user && typeof user === 'object' && Object.keys(user).length) return user;
    }
    for (const key of AUTH_USER_KEYS) {
      try {
        const parsed = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null');
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return null;
  };
  const normalizedRole = (user) => {
    const candidates = [user?.role?.type, user?.role?.name, user?.role?.code, user?.role, user?.user_type, user?.type];
    const role = candidates.find((value) => typeof value === 'string' && value.trim());
    return (role || '').trim().toLowerCase();
  };
  const isAgentUser = (user) => {
    const role = normalizedRole(user);
    const playersCount = Number(user?.players_count || user?.playersCount || user?.attributes?.players_count || 0);
    const markers = [
      user?.is_agent,
      user?.isAgent,
      user?.attributes?.is_agent,
      user?.attributes?.isAgent,
      Boolean(user?.invite_code || user?.attributes?.invite_code),
      playersCount > 0
    ];
    return AGENT_ROLES.some((item) => role.includes(item)) || markers.some((value) => value === true);
  };
  const preferredAppOrigin = () => {
    if (['localhost'].includes(window.location.hostname)) return window.location.origin;
    const stored = localStorage.getItem('royalbet_frontend_origin');
    if (stored) {
      try {
        const parsed = new URL(stored, window.location.origin);
        if (/^https?:$/.test(parsed.protocol)) return parsed.origin;
      } catch {}
    }
    return window.location.origin;
  };
   const siteLanguages = {
    he: { label: 'עברית', short: 'HE' },
    en: { label: 'English', short: 'EN' },
    es: { label: 'Español', short: 'ES' },
    fr: { label: 'Français', short: 'FR' },
    ar: { label: 'العربية', short: 'AR' },
  };
  const languageFlags = {
    he: 'il',
    en: 'gb',
    es: 'es',
    fr: 'fr',
    ar: 'sa',
  };
  const TRANSLATION_BASE_PATH = '/assets/i18n/site';
  const TRANSLATION_VERSION = '20260704a';
  const translationFiles = Object.fromEntries(
    Object.keys(siteLanguages).map((code) => [code, `${TRANSLATION_BASE_PATH}/${code}.json?v=${TRANSLATION_VERSION}`])
  );
  const loadedTranslationLanguages = new Set();
  const translationPromises = new Map();
  const siteTranslations = {
    he: {
language: 'שפה',
      sport: 'ספורט',
      casino: 'קזינו',
      menu: 'תפריט',
      liveCasino: 'קזינו חי',
      promotions: 'מבצעים',
      slots: 'סלוטים',
      crash: 'התרסקות',
      popularSports: 'משחקי ספורט פופולריים',
      luckySlot: 'שיא מכונת מזל',
      betslipOpen: 'פתח טופס',
      betslipClose: 'סגור טופס',
      activeSport: 'ענף פעיל',
      sportContext: 'התוכן בעמוד עודכן לפי הבחירה. בחר ענף אחר מהסרגל או מתפריט הפוטר.',
      live: 'משחקים חיים',
      upcoming: 'אירועים קרובים',
      markets: 'שווקים פופולריים',
      oddsReady: 'יחסים זמינים לפי Strapi/Odds',
      submenuReady: 'תצוגה משתנה לפי תת התפריט',
      marketExamples: '1X2, מנצח, מעל/מתחת',
      'sport.football': 'כדורגל',
      'sport.basketball': 'כדורסל',
      'sport.tennis': 'טניס',
      'sport.volleyball': 'כדורעף',
      'sport.baseball': 'בייסבול',
      'sport.ice-hockey': 'הוקי קרח',
      'sport.handball': 'כדוריד',
      'sport.table-tennis': 'טניס שולחן',
      'sport.boxing': 'אגרוף',
      'sport.mma': 'MMA',
      'sport.cricket': 'קריקט',
      'sport.rugby': 'ראגבי',
      'sport.golf': 'גולף',
      'sport.darts': 'חיצים',
      'sport.motorsport': 'מוטורספורט',
      'sport.cycling': 'אופניים',
      'sport.swimming': 'שחייה',
      'sport.athletics': 'אתלטיקה',
      'sport.badminton': 'בדמינטון',
      'sport.field-hockey': 'הוקי שדה',
      'sport.judo': 'ג׳ודו',
      'sport.karate': 'קראטה',
      'sport.taekwondo': 'טאקוונדו',
      'sport.wrestling': 'היאבקות',
      'sport.weightlifting': 'הרמת משקולות',
      'sport.rowing': 'חתירה',
      'sport.sailing': 'שייט',
      'sport.surfing': 'גלישה',
      'sport.skiing': 'סקי',
      'sport.snowboarding': 'סנובורד',
      'sport.skateboarding': 'סקייטבורד',
      'sport.softball': 'סופטבול',
      'sport.bowling': 'באולינג',
      'sport.fencing': 'סיף',
      'sport.equestrian': 'רכיבה',
      'sport.triathlon': 'טריאתלון',
      'sport.basketball3x3': '3x3 כדורסל',
      'sport.beach-volleyball': 'כדורעף חופים',
      'sport.water-polo': 'כדורמים',
      'sport.american-football': 'פוטבול',
    },
    en: {
      language: 'Language',
      sport: 'Sports',
      casino: 'Casino',
      menu: 'Menu',
      liveCasino: 'Live Casino',
      promotions: 'Promotions',
      slots: 'Slots',
      crash: 'Crash',
      popularSports: 'Popular Sports Games',
      luckySlot: 'Lucky Slot Wins',
      betslipOpen: 'Open betslip',
      betslipClose: 'Close betslip',
      activeSport: 'Active sport',
      sportContext: 'The page content updates by your selection. Pick another sport from the bar or footer menu.',
      live: 'Live matches',
      upcoming: 'Upcoming events',
      markets: 'Popular markets',
      oddsReady: 'Odds available from Strapi/Odds',
      submenuReady: 'Display changes by submenu',
      marketExamples: '1X2, winner, over/under',
      'sport.football': 'Football',
      'sport.basketball': 'Basketball',
      'sport.tennis': 'Tennis',
      'sport.volleyball': 'Volleyball',
      'sport.baseball': 'Baseball',
      'sport.ice-hockey': 'Ice hockey',
      'sport.handball': 'Handball',
      'sport.table-tennis': 'Table tennis',
      'sport.boxing': 'Boxing',
      'sport.mma': 'MMA',
      'sport.cricket': 'Cricket',
      'sport.rugby': 'Rugby',
      'sport.golf': 'Golf',
      'sport.darts': 'Darts',
      'sport.motorsport': 'Motorsport',
      'sport.cycling': 'Cycling',
      'sport.swimming': 'Swimming',
      'sport.athletics': 'Athletics',
      'sport.badminton': 'Badminton',
      'sport.field-hockey': 'Field hockey',
      'sport.judo': 'Judo',
      'sport.karate': 'Karate',
      'sport.taekwondo': 'Taekwondo',
      'sport.wrestling': 'Wrestling',
      'sport.weightlifting': 'Weightlifting',
      'sport.rowing': 'Rowing',
      'sport.sailing': 'Sailing',
      'sport.surfing': 'Surfing',
      'sport.skiing': 'Skiing',
      'sport.snowboarding': 'Snowboarding',
      'sport.skateboarding': 'Skateboarding',
      'sport.softball': 'Softball',
      'sport.bowling': 'Bowling',
      'sport.fencing': 'Fencing',
      'sport.equestrian': 'Equestrian',
      'sport.triathlon': 'Triathlon',
      'sport.basketball3x3': '3x3 Basketball',
      'sport.beach-volleyball': 'Beach volleyball',
      'sport.water-polo': 'Water polo',
      'sport.american-football': 'American football',
    },
    es: {
      language: 'Idioma',
      sport: 'Deportes',
      casino: 'Casino',
      menu: 'MenÃº',
      liveCasino: 'Casino en vivo',
      promotions: 'Promociones',
      slots: 'Tragamonedas',
      crash: 'Crash',
      popularSports: 'Juegos deportivos populares',
      luckySlot: 'Ganancias de tragamonedas',
      betslipOpen: 'Abrir cupÃ³n',
      betslipClose: 'Cerrar cupÃ³n',
      activeSport: 'Deporte activo',
      sportContext: 'El contenido cambia segÃºn tu selecciÃ³n. Elige otro deporte desde la barra o el menÃº inferior.',
      live: 'Partidos en vivo',
      upcoming: 'PrÃ³ximos eventos',
      markets: 'Mercados populares',
      oddsReady: 'Cuotas disponibles por Strapi/Odds',
      submenuReady: 'La vista cambia por submenÃº',
      marketExamples: '1X2, ganador, mÃ¡s/menos',
    },
    fr: {
      language: 'Langue',
      sport: 'Sports',
      casino: 'Casino',
      menu: 'Menu',
      liveCasino: 'Casino live',
      promotions: 'Promotions',
      slots: 'Machines Ã  sous',
      crash: 'Crash',
      popularSports: 'Jeux sportifs populaires',
      luckySlot: 'Gains machines Ã  sous',
      betslipOpen: 'Ouvrir le coupon',
      betslipClose: 'Fermer le coupon',
      activeSport: 'Sport actif',
      sportContext: 'Le contenu de la page suit votre sÃ©lection. Choisissez un autre sport depuis la barre ou le menu infÃ©rieur.',
      live: 'Matchs en direct',
      upcoming: 'Ã‰vÃ©nements Ã  venir',
      markets: 'MarchÃ©s populaires',
      oddsReady: 'Cotes disponibles via Strapi/Odds',
      submenuReady: 'La vue change selon le sous-menu',
      marketExamples: '1X2, vainqueur, plus/moins',
    },
    ar: {
       language: 'اللغة',
      sport: 'رياضة',
      casino: 'كازينو',
      menu: 'القائمة',
      liveCasino: 'كازينو مباشر',
      promotions: 'عروض',
      slots: 'سلوتس',
      crash: 'كراش',
      popularSports: 'ألعاب رياضية شائعة',
      luckySlot: 'جوائز السلوت',
      betslipOpen: 'فتح القسيمة',
      betslipClose: 'إغلاق القسيمة',
      activeSport: 'الرياضة النشطة',
      sportContext: 'يتغير محتوى الصفحة حسب اختيارك. اختر رياضة أخرى من الشريط أو القائمة السفلية.',
      live: 'مباريات مباشرة',
      upcoming: 'أحداث قادمة',
      markets: 'أسواق شائعة',
      oddsReady: 'الاحتمالات متاحة عبر Strapi/Odds',
      submenuReady: 'العرض يتغير حسب القائمة الفرعية',
      marketExamples: '1X2، الفائز، أكثر/أقل',
    },
    ru: {
      language: 'Язык',
      sport: 'Спорт',
      casino: 'Казино',
      menu: 'Меню',
      liveCasino: 'Live казино',
      promotions: 'Акции',
      slots: 'Слоты',
      crash: 'Crash',
      popularSports: 'Популярные спортивные игры',
      luckySlot: 'Выигрыши в слотах',
      betslipOpen: 'Открыть купон',
      betslipClose: 'Закрыть купон',
      activeSport: 'Активный спорт',
      sportContext: 'Контент страницы меняется по вашему выбору. Выберите другой спорт в панели или нижнем меню.',
      live: 'Матчи live',
      upcoming: 'Ближайшие события',
      markets: 'Популярные рынки',
      oddsReady: 'Коэффициенты доступны через Strapi/Odds',
      submenuReady: 'Вид меняется по подменю',
      marketExamples: '1X2, победитель, больше/меньше',
    },
  };
  const getSiteLanguage = () => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved && siteLanguages[saved] ? saved : 'he';
  };
  const mojibakePattern = /[ÃÂÐÑØÙ×â]/;
  const mojibakeScore = (text) => {
    const matches = String(text || '').match(/[ÃÂÐÑØÙ×â]/g);
    return matches ? matches.length : 0;
  };
  const fixMojibake = (value) => {
    const text = String(value ?? '');
    if (!text || !mojibakePattern.test(text)) return text;
    try {
      const bytes = Uint8Array.from(Array.from(text).map((ch) => ch.charCodeAt(0) & 255));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (decoded && mojibakeScore(decoded) < mojibakeScore(text)) return decoded;
    } catch {}
    return text;
  };
  const t = (key, fallback = '') => {
    const lang = getSiteLanguage();
    const raw = siteTranslations[lang]?.[key] || siteTranslations.en[key] || siteTranslations.he[key] || fallback || key;
    return fixMojibake(raw);
  };
  const CORE_SPORT_LABELS_HE = {
    football: 'כדורגל',
    basketball: 'כדורסל',
    tennis: 'טניס',
    volleyball: 'כדור עף',
    baseball: 'כדור בסיס',
    handball: 'כדור יד',
    'table-tennis': 'טניס שולחן',
    rugby: 'רוגבי',
    'american-football': 'פוטבול',
    basketball3x3: 'כדורסל 3x3',
    'beach-volleyball': 'כדורעף חופים',
    'water-polo': 'כדורמים'
  };
  const enforceCoreSportLabels = (lang = getSiteLanguage()) => {
    const safeLang = siteLanguages[lang] ? lang : 'he';
    if (safeLang !== 'he') return;
    siteTranslations.he = siteTranslations.he || {};
    Object.entries(CORE_SPORT_LABELS_HE).forEach(([slug, label]) => {
      siteTranslations.he[`sport.${slug}`] = label;
    });
  };
  const translatedSportLabel = (sport) => t(`sport.${sport.slug}`, fixMojibake(sport.label));
  const staticTextKeys = [
    ['ספורט', 'sport'],
    ['קזינו', 'casino'],
    ['תפריט', 'menu'],
    ['קזינו חי', 'liveCasino'],
    ['מבצעים', 'promotions'],
    ['סלוטים', 'slots'],
    ['התרסקות', 'crash'],
    ['משחקי ספורט פופולריים', 'popularSports'],
    ['שיא מכונת מזל', 'luckySlot'],
  ];
  Object.assign(siteTranslations.he, {
    language: '\u05e9\u05e4\u05d4',
    sport: '\u05e1\u05e4\u05d5\u05e8\u05d8',
    casino: '\u05e7\u05d6\u05d9\u05e0\u05d5',
    menu: '\u05ea\u05e4\u05e8\u05d9\u05d8',
    liveCasino: '\u05e7\u05d6\u05d9\u05e0\u05d5 \u05d7\u05d9',
    promotions: '\u05de\u05d1\u05e6\u05e2\u05d9\u05dd',
    slots: '\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd',
    crash: '\u05d4\u05ea\u05e8\u05e1\u05e7\u05d5\u05ea',
    popularSports: '\u05de\u05e9\u05d7\u05e7\u05d9 \u05e1\u05e4\u05d5\u05e8\u05d8 \u05e4\u05d5\u05e4\u05d5\u05dc\u05e8\u05d9\u05d9\u05dd',
    luckySlot: '\u05e9\u05d9\u05d0 \u05de\u05db\u05d5\u05e0\u05ea \u05de\u05d6\u05dc',
    betslipOpen: '\u05e4\u05ea\u05d7 \u05d8\u05d5\u05e4\u05e1',
    betslipClose: '\u05e1\u05d2\u05d5\u05e8 \u05d8\u05d5\u05e4\u05e1',
    activeSport: '\u05e2\u05e0\u05e3 \u05e4\u05e2\u05d9\u05dc',
    sportContext: '\u05d4\u05ea\u05d5\u05db\u05df \u05d1\u05e2\u05de\u05d5\u05d3 \u05e2\u05d5\u05d3\u05db\u05df \u05dc\u05e4\u05d9 \u05d4\u05d1\u05d7\u05d9\u05e8\u05d4. \u05d1\u05d7\u05e8 \u05e2\u05e0\u05e3 \u05d0\u05d7\u05e8 \u05de\u05d4\u05e1\u05e8\u05d2\u05dc \u05d0\u05d5 \u05de\u05ea\u05e4\u05e8\u05d9\u05d8 \u05d4\u05e4\u05d5\u05d8\u05e8.',
    live: '\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05d7\u05d9\u05d9\u05dd',
    upcoming: '\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e7\u05e8\u05d5\u05d1\u05d9\u05dd',
    markets: '\u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05e4\u05d5\u05e4\u05d5\u05dc\u05e8\u05d9\u05d9\u05dd',
    oddsReady: '\u05d9\u05d7\u05e1\u05d9\u05dd \u05d6\u05de\u05d9\u05e0\u05d9\u05dd \u05dc\u05e4\u05d9 Strapi/Odds',
    submenuReady: '\u05ea\u05e6\u05d5\u05d2\u05d4 \u05de\u05e9\u05ea\u05e0\u05d4 \u05dc\u05e4\u05d9 \u05ea\u05ea \u05d4\u05ea\u05e4\u05e8\u05d9\u05d8',
    marketExamples: '1X2, \u05de\u05e0\u05e6\u05d7, \u05de\u05e2\u05dc/\u05de\u05ea\u05d7\u05ea',
    'sport.football': '\u05db\u05d3\u05d5\u05e8\u05d2\u05dc',
    'sport.basketball': '\u05db\u05d3\u05d5\u05e8\u05e1\u05dc',
    'sport.tennis': '\u05d8\u05e0\u05d9\u05e1',
    'sport.volleyball': '\u05db\u05d3\u05d5\u05e8\u05e2\u05e3',
    'sport.baseball': '\u05d1\u05d9\u05d9\u05e1\u05d1\u05d5\u05dc',
    'sport.ice-hockey': '\u05d4\u05d5\u05e7\u05d9 \u05e7\u05e8\u05d7',
    'sport.handball': '\u05db\u05d3\u05d5\u05e8\u05d9\u05d3',
    'sport.table-tennis': '\u05d8\u05e0\u05d9\u05e1 \u05e9\u05d5\u05dc\u05d7\u05df',
    'sport.boxing': '\u05d0\u05d2\u05e8\u05d5\u05e3',
    'sport.mma': 'MMA',
    'sport.cricket': '\u05e7\u05e8\u05d9\u05e7\u05d8',
    'sport.rugby': '\u05e8\u05d0\u05d2\u05d1\u05d9',
    'sport.golf': '\u05d2\u05d5\u05dc\u05e3',
    'sport.darts': '\u05d7\u05d9\u05e6\u05d9\u05dd',
    'sport.motorsport': '\u05de\u05d5\u05d8\u05d5\u05e8\u05e1\u05e4\u05d5\u05e8\u05d8',
    'sport.cycling': '\u05d0\u05d5\u05e4\u05e0\u05d9\u05d9\u05dd',
    'sport.swimming': '\u05e9\u05d7\u05d9\u05d9\u05d4',
    'sport.athletics': '\u05d0\u05ea\u05dc\u05d8\u05d9\u05e7\u05d4',
    'sport.badminton': '\u05d1\u05d3\u05de\u05d9\u05e0\u05d8\u05d5\u05df',
    'sport.field-hockey': '\u05d4\u05d5\u05e7\u05d9 \u05e9\u05d3\u05d4',
    'sport.judo': '\u05d2\u05f3\u05d5\u05d3\u05d5',
    'sport.karate': '\u05e7\u05e8\u05d0\u05d8\u05d4',
    'sport.taekwondo': '\u05d8\u05d0\u05e7\u05d5\u05d5\u05e0\u05d3\u05d5',
    'sport.wrestling': '\u05d4\u05d9\u05d0\u05d1\u05e7\u05d5\u05ea',
    'sport.weightlifting': '\u05d4\u05e8\u05de\u05ea \u05de\u05e9\u05e7\u05d5\u05dc\u05d5\u05ea',
    'sport.rowing': '\u05d7\u05ea\u05d9\u05e8\u05d4',
    'sport.sailing': '\u05e9\u05d9\u05d9\u05d8',
    'sport.surfing': '\u05d2\u05dc\u05d9\u05e9\u05d4',
    'sport.skiing': '\u05e1\u05e7\u05d9',
    'sport.snowboarding': '\u05e1\u05e0\u05d5\u05d1\u05d5\u05e8\u05d3',
    'sport.skateboarding': '\u05e1\u05e7\u05d9\u05d9\u05d8\u05d1\u05d5\u05e8\u05d3',
    'sport.softball': '\u05e1\u05d5\u05e4\u05d8\u05d1\u05d5\u05dc',
    'sport.bowling': '\u05d1\u05d0\u05d5\u05dc\u05d9\u05e0\u05d2',
    'sport.fencing': '\u05e1\u05d9\u05e3',
    'sport.equestrian': '\u05e8\u05db\u05d9\u05d1\u05d4',
    'sport.triathlon': '\u05d8\u05e8\u05d9\u05d0\u05ea\u05dc\u05d5\u05df',
    'sport.basketball3x3': '3x3 \u05db\u05d3\u05d5\u05e8\u05e1\u05dc',
    'sport.beach-volleyball': '\u05db\u05d3\u05d5\u05e8\u05e2\u05e3 \u05d7\u05d5\u05e4\u05d9\u05dd',
    'sport.water-polo': '\u05db\u05d3\u05d5\u05e8\u05de\u05d9\u05dd',
    'sport.american-football': '\u05e4\u05d5\u05d8\u05d1\u05d5\u05dc',
    back: '\u05d7\u05d6\u05e8\u05d4',
    menuGroupBall: '\u05de\u05e9\u05d7\u05e7\u05d9 \u05db\u05d3\u05d5\u05e8',
    menuGroupWater: '\u05e1\u05e4\u05d5\u05e8\u05d8 \u05d9\u05de\u05d9',
    menuGroupMotor: '\u05e1\u05e4\u05d5\u05e8\u05d8 \u05de\u05d5\u05d8\u05d5\u05e8\u05d9',
    menuGroupCombat: '\u05d0\u05d5\u05de\u05e0\u05d5\u05d9\u05d5\u05ea \u05dc\u05d7\u05d9\u05de\u05d4',
    menuGroupPrecision: '\u05d3\u05d9\u05d5\u05e7 \u05d5\u05e4\u05e0\u05d0\u05d9',
    menuGroupCasino: '\u05e7\u05d6\u05d9\u05e0\u05d5',
    login: '\u05db\u05e0\u05d9\u05e1\u05d4',
    register: '\u05d4\u05e8\u05e9\u05de\u05d4',
    sportsBet: '\u05d4\u05d9\u05de\u05d5\u05e8\u05d9 \u05e1\u05e4\u05d5\u05e8\u05d8',
    casinoSlots: '\u05e7\u05d6\u05d9\u05e0\u05d5 \u05e1\u05dc\u05d5\u05d8\u05d9\u05dd',
    runningLine: '\u05dc\u05d9\u05d9\u05df \u05e8\u05e5',
    liveOdds: '\u05d9\u05d7\u05e1\u05d9\u05dd \u05d7\u05d9\u05d9\u05dd',
    myBets: '\u05d4\u05d4\u05d9\u05de\u05d5\u05e8\u05d9\u05dd \u05e9\u05dc\u05d9',
    picks: '\u05d1\u05d7\u05d9\u05e8\u05d5\u05ea',
    open: '\u05e4\u05ea\u05d7',
    guest: '\u05d0\u05d5\u05e8\u05d7',
    games: '\u05de\u05e9\u05d7\u05e7\u05d9\u05dd',
    showAllSports: '\u05d4\u05e6\u05d2 \u05d0\u05ea \u05db\u05dc \u05e2\u05e0\u05e4\u05d9 \u05d4\u05e1\u05e4\u05d5\u05e8\u05d8',
    showAllLiveCasino: '\u05d4\u05e6\u05d2 \u05d0\u05ea \u05db\u05dc \u05d4\u05e7\u05d6\u05d9\u05e0\u05d5 \u05d4\u05d7\u05d9',
    showAllSlots: '\u05d4\u05e6\u05d2 \u05d0\u05ea \u05db\u05dc \u05d4\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd',
  });
  Object.assign(siteTranslations.en, {
    back: 'Back',
    menuGroupBall: 'Ball games',
    menuGroupWater: 'Water sports',
    menuGroupMotor: 'Motor sports',
    menuGroupCombat: 'Combat sports',
    menuGroupPrecision: 'Precision sports',
    menuGroupCasino: 'Casino',
    login: 'Login',
    register: 'Register',
    sportsBet: 'Sports betting',
    casinoSlots: 'Casino slots',
    runningLine: 'Live line',
    liveOdds: 'Live Odds',
    myBets: 'My Bets',
    picks: 'Picks',
    open: 'Open',
    guest: 'Guest',
    games: 'Games',
    showAllSports: 'Show all sports',
    showAllLiveCasino: 'Show all live casino',
    showAllSlots: 'Show all slots',
  });
  Object.assign(siteTranslations.es, {
    back: 'Volver',
    menuGroupBall: 'Juegos de pelota',
    menuGroupWater: 'Deportes acuaticos',
    menuGroupMotor: 'Deportes motor',
    menuGroupCombat: 'Combate',
    menuGroupPrecision: 'Precision y ocio',
    menuGroupCasino: 'Casino',
    login: 'Entrar',
    register: 'Registro',
    sportsBet: 'Apuestas deportivas',
    casinoSlots: 'Slots de casino',
    runningLine: 'Linea en vivo',
    open: 'Abrir',
    guest: 'Invitado',
    games: 'Juegos',
    showAllSports: 'Ver todos los deportes',
    showAllLiveCasino: 'Ver todo el casino en vivo',
    showAllSlots: 'Ver todos los slots',
  });
  Object.assign(siteTranslations.fr, {
    back: 'Retour',
    menuGroupBall: 'Jeux de ballon',
    menuGroupWater: 'Sports nautiques',
    menuGroupMotor: 'Sports moteur',
    menuGroupCombat: 'Sports de combat',
    menuGroupPrecision: 'Precision et loisirs',
    menuGroupCasino: 'Casino',
    login: 'Connexion',
    register: 'Inscription',
    sportsBet: 'Paris sportifs',
    casinoSlots: 'Slots casino',
    runningLine: 'Ligne en direct',
    open: 'Ouvrir',
    guest: 'Invite',
    games: 'Jeux',
    showAllSports: 'Voir tous les sports',
    showAllLiveCasino: 'Voir tout le casino live',
    showAllSlots: 'Voir tous les slots',
  });
  Object.assign(siteTranslations.ar, {
    back: '\u0631\u062c\u0648\u0639',
    menuGroupBall: '\u0623\u0644\u0639\u0627\u0628 \u0627\u0644\u0643\u0631\u0629',
    menuGroupWater: '\u0631\u064a\u0627\u0636\u0627\u062a \u0645\u0627\u0626\u064a\u0629',
    menuGroupMotor: '\u0631\u064a\u0627\u0636\u0627\u062a \u0645\u062d\u0631\u0643\u0627\u062a',
    menuGroupCombat: '\u0631\u064a\u0627\u0636\u0627\u062a \u0642\u062a\u0627\u0644\u064a\u0629',
    menuGroupPrecision: '\u062f\u0642\u0629 \u0648\u062a\u0631\u0641\u064a\u0647',
    menuGroupCasino: '\u0643\u0627\u0632\u064a\u0646\u0648',
    login: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    register: '\u062a\u0633\u062c\u064a\u0644',
    sportsBet: '\u0631\u0647\u0627\u0646\u0627\u062a \u0631\u064a\u0627\u0636\u064a\u0629',
    casinoSlots: '\u0633\u0644\u0648\u062a\u0633 \u0627\u0644\u0643\u0627\u0632\u064a\u0646\u0648',
    runningLine: '\u0627\u0644\u062e\u0637 \u0627\u0644\u0645\u0628\u0627\u0634\u0631',
    open: '\u0641\u062a\u062d',
    guest: '\u0636\u064a\u0641',
    games: '\u0623\u0644\u0639\u0627\u0628',
    showAllSports: '\u0639\u0631\u0636 \u0643\u0644 \u0627\u0644\u0631\u064a\u0627\u0636\u0627\u062a',
    showAllLiveCasino: '\u0639\u0631\u0636 \u0643\u0644 \u0627\u0644\u0643\u0627\u0632\u064a\u0646\u0648 \u0627\u0644\u0645\u0628\u0627\u0634\u0631',
    showAllSlots: '\u0639\u0631\u0636 \u0643\u0644 \u0627\u0644\u0633\u0644\u0648\u062a\u0633',
    'sport.football': '\u0643\u0631\u0629 \u0627\u0644\u0642\u062f\u0645',
    'sport.basketball': '\u0643\u0631\u0629 \u0627\u0644\u0633\u0644\u0629',
    'sport.tennis': '\u062a\u0646\u0633',
    'sport.volleyball': '\u0643\u0631\u0629 \u0627\u0644\u0637\u0627\u0626\u0631\u0629',
  });
  Object.assign(siteTranslations.ru, {
    back: '\u041d\u0430\u0437\u0430\u0434',
    menuGroupBall: '\u0418\u0433\u0440\u044b \u0441 \u043c\u044f\u0447\u043e\u043c',
    menuGroupWater: '\u0412\u043e\u0434\u043d\u044b\u0439 \u0441\u043f\u043e\u0440\u0442',
    menuGroupMotor: '\u041c\u043e\u0442\u043e\u0441\u043f\u043e\u0440\u0442',
    menuGroupCombat: '\u0415\u0434\u0438\u043d\u043e\u0431\u043e\u0440\u0441\u0442\u0432\u0430',
    menuGroupPrecision: '\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c \u0438 \u0434\u043e\u0441\u0443\u0433',
    menuGroupCasino: '\u041a\u0430\u0437\u0438\u043d\u043e',
    login: '\u0412\u0445\u043e\u0434',
    register: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f',
    sportsBet: '\u0421\u0442\u0430\u0432\u043a\u0438 \u043d\u0430 \u0441\u043f\u043e\u0440\u0442',
    casinoSlots: '\u0421\u043b\u043e\u0442\u044b \u043a\u0430\u0437\u0438\u043d\u043e',
    runningLine: 'Live \u043b\u0438\u043d\u0438\u044f',
    open: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c',
    guest: '\u0413\u043e\u0441\u0442\u044c',
    games: '\u0418\u0433\u0440\u044b',
    showAllSports: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0435\u0441\u044c \u0441\u043f\u043e\u0440\u0442',
    showAllLiveCasino: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 live \u043a\u0430\u0437\u0438\u043d\u043e',
    showAllSlots: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u0441\u043b\u043e\u0442\u044b',
  });
  Object.keys(siteLanguages).forEach((code) => {
    siteTranslations[code] = {};
  });
  const mergeSiteTranslations = (lang, payload) => {
    if (!lang || !siteLanguages[lang]) return;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    siteTranslations[lang] = { ...(siteTranslations[lang] || {}), ...payload };
    enforceCoreSportLabels(lang);
    loadedTranslationLanguages.add(lang);
  };
  const ensureSiteTranslations = (lang) => {
    const safeLang = siteLanguages[lang] ? lang : 'he';
    if (loadedTranslationLanguages.has(safeLang)) return Promise.resolve(siteTranslations[safeLang] || {});
    if (translationPromises.has(safeLang)) return translationPromises.get(safeLang);
    const source = translationFiles[safeLang];
    if (!source) return Promise.resolve(siteTranslations[safeLang] || {});
    const pending = fetch(source, { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload && typeof payload === 'object') mergeSiteTranslations(safeLang, payload);
        return siteTranslations[safeLang] || {};
      })
      .catch(() => (siteTranslations[safeLang] || {}))
      .finally(() => {
        translationPromises.delete(safeLang);
      });
    translationPromises.set(safeLang, pending);
    return pending;
  };
  const preloadSiteTranslations = () => Promise.all(
    Object.keys(siteLanguages).map((code) => ensureSiteTranslations(code))
  );
  staticTextKeys.push(
    ['\u05db\u05e0\u05d9\u05e1\u05d4', 'login'],
    ['\u05d4\u05e8\u05e9\u05de\u05d4', 'register'],
    ['\u05d4\u05d9\u05de\u05d5\u05e8\u05d9 \u05e1\u05e4\u05d5\u05e8\u05d8', 'sportsBet'],
    ['\u05e7\u05d6\u05d9\u05e0\u05d5 \u05e1\u05dc\u05d5\u05d8\u05d9\u05dd', 'casinoSlots'],
    ['\u05dc\u05d9\u05d9\u05df \u05e8\u05e5', 'runningLine'],
    ['\u05e4\u05ea\u05d7', 'open'],
    ['\u05d0\u05d5\u05e8\u05d7', 'guest'],
    ['\u05de\u05e9\u05d7\u05e7\u05d9\u05dd', 'games'],
    ['\u05d4\u05e6\u05d2 \u05d0\u05ea \u05db\u05dc \u05e2\u05e0\u05e4\u05d9 \u05d4\u05e1\u05e4\u05d5\u05e8\u05d8', 'showAllSports'],
    ['\u05d4\u05e6\u05d2 \u05d0\u05ea \u05db\u05dc \u05d4\u05e7\u05d6\u05d9\u05e0\u05d5 \u05d4\u05d7\u05d9', 'showAllLiveCasino'],
    ['\u05d4\u05e6\u05d2 \u05d0\u05ea \u05db\u05dc \u05d4\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd', 'showAllSlots']
  );
  const applyStaticTranslations = () => {
    const lang = getSiteLanguage();
    const map = new Map(staticTextKeys.map(([source, key]) => [source, siteTranslations[lang]?.[key] || source]));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || closest(parent, 'script, style, textarea, select, option, .rb-language-switcher')) continue;
      const currentValue = String(node.nodeValue || '');
      const fixedValue = fixMojibake(currentValue);
      if (fixedValue !== currentValue) {
        node.nodeValue = fixedValue;
      }
      const normalized = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
      const source = parent.dataset.rbSourceText || (map.has(normalized) ? normalized : '');
      if (source) nodes.push([node, parent, source]);
    }
    nodes.forEach(([node, parent, source]) => {
      parent.dataset.rbSourceText = source;
      const nextText = map.get(source) || source;
      node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), nextText);
    });
  };
  const applyFrontendLanguage = (lang = getSiteLanguage()) => {
    const safeLang = siteLanguages[lang] ? lang : 'he';
    enforceCoreSportLabels(safeLang);
    if (!loadedTranslationLanguages.has(safeLang)) {
      ensureSiteTranslations(safeLang).then(() => applyFrontendLanguage(safeLang));
    }
    localStorage.setItem(LANGUAGE_KEY, safeLang);
    document.documentElement.lang = safeLang;
    document.documentElement.dir = 'rtl';
    document.body.dir = 'rtl';
    document.body.dataset.rbLanguage = safeLang;
    document.querySelectorAll('[data-rb-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.rbI18n, el.textContent || '');
    });
    document.querySelectorAll('[data-rb-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.rbI18nAria, el.getAttribute('aria-label') || ''));
    });
    const select = document.querySelector('[data-rb-language-select]');
    if (select) select.value = safeLang;
    const currentLanguage = siteLanguages[safeLang];
    const languageButton = document.querySelector('[data-rb-language-button]');
    if (languageButton && currentLanguage) {
      languageButton.setAttribute('aria-label', t('language'));
      languageButton.querySelector('[data-rb-language-current-flag]').dataset.rbLanguageFlag = languageFlags[safeLang] || safeLang;
      languageButton.querySelector('[data-rb-language-current-code]').textContent = currentLanguage.short;
      languageButton.querySelector('[data-rb-language-current-label]').textContent = currentLanguage.label;
    }
    document.querySelectorAll('[data-rb-language-option]').forEach((option) => {
      option.classList.toggle('active', option.dataset.rbLanguageOption === safeLang);
      option.setAttribute('aria-selected', String(option.dataset.rbLanguageOption === safeLang));
    });
    const betslipToggle = document.querySelector('[data-rb-betslip-toggle]');
    if (betslipToggle) {
      const collapsed = document.body.classList.contains('rb-betslip-collapsed');
      betslipToggle.textContent = collapsed ? t('betslipOpen') : t('betslipClose');
    }
    applyStaticTranslations();
  };
  const setupLanguageSelector = () => {
    const existingSwitcher = document.querySelector('[data-rb-language-switcher]');
    if (existingSwitcher) {
      const headerLanguageSlot = document.querySelector('[data-rb-header-language-slot]');
      if (headerLanguageSlot && existingSwitcher.parentElement !== headerLanguageSlot) {
        headerLanguageSlot.appendChild(existingSwitcher);
      }
      applyFrontendLanguage();
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'rb-language-switcher';
    wrap.dataset.rbLanguageSwitcher = 'true';
    const activeLanguage = siteLanguages[getSiteLanguage()];
    wrap.innerHTML = `
      <span data-rb-i18n="language">${t('language')}</span>
      <button class="rb-language-button" type="button" data-rb-language-button aria-haspopup="listbox" aria-expanded="false" aria-label="${t('language')}">
        <span class="rb-language-flag" data-rb-language-current-flag data-rb-language-flag="${languageFlags[getSiteLanguage()] || getSiteLanguage()}" aria-hidden="true"></span>
        <span class="rb-language-code" data-rb-language-current-code>${activeLanguage.short}</span>
        <span class="rb-language-current" data-rb-language-current-label>${activeLanguage.label}</span>
      </button>
      <div class="rb-language-menu" data-rb-language-menu role="listbox" aria-label="${t('language')}">
        ${Object.entries(siteLanguages).map(([code, language]) => `
          <button class="rb-language-option" type="button" role="option" data-rb-language-option="${code}" aria-selected="${code === getSiteLanguage()}">
            <span class="rb-language-flag" data-rb-language-flag="${languageFlags[code] || code}" aria-hidden="true"></span>
            <span class="rb-language-option-text">
              <strong>${language.label}</strong>
              <small>${language.short}</small>
            </span>
          </button>
        `).join('')}
      </div>
    `;
    const button = wrap.querySelector('[data-rb-language-button]');
    const menu = wrap.querySelector('[data-rb-language-menu]');
    const closeMenu = () => {
      wrap.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', () => {
      const isOpen = wrap.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
    wrap.querySelectorAll('[data-rb-language-option]').forEach((option) => {
      option.addEventListener('click', () => {
        applyFrontendLanguage(option.dataset.rbLanguageOption);
        closeMenu();
        renderSportContext();
      });
    });
    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const option = closest(event.target, '[data-rb-language-option]');
      if (!option) return;
      event.preventDefault();
      applyFrontendLanguage(option.dataset.rbLanguageOption);
      closeMenu();
      renderSportContext();
    });
    const headerLanguageSlot = document.querySelector('[data-rb-header-language-slot]');
    (headerLanguageSlot || document.body).appendChild(wrap);
    applyFrontendLanguage();
  };
  const removeVendorWarnings = () => {
    document.querySelectorAll('.HeadWarnMessage').forEach((warning) => warning.remove());
    document.querySelectorAll('.WarnText, .CloseWarning').forEach((warningPart) => {
      const warning = closest(warningPart, '.HeadWarnMessage');
      (warning || warningPart).remove();
    });
  };
  removeVendorWarnings();
  const vendorWarningObserver = new MutationObserver(removeVendorWarnings);
  vendorWarningObserver.observe(document.documentElement, { childList: true, subtree: true });
  const footerSports = [
    { slug: 'football', label: 'כדורגל', image: 'footbal.jpeg' },
    { slug: 'basketball', label: 'כדורסל', image: 'basketball.jpeg' },
    { slug: 'tennis', label: 'טניס', image: 'tennis.jpeg' },
    { slug: 'volleyball', label: 'כדורעף', image: 'volleyball.jpeg' },
    { slug: 'baseball', label: 'בייסבול', image: 'baseball.jpeg' },
    { slug: 'ice-hockey', label: 'הוקי קרח', image: 'ice-hocky.jpeg' },
    { slug: 'handball', label: 'כדוריד', image: 'handball.jpeg' },
    { slug: 'table-tennis', label: 'טניס שולחן', image: 'table-tennis.jpeg' },
    { slug: 'boxing', label: 'אגרוף', image: 'boxing.jpeg' },
    { slug: 'mma', label: 'MMA', image: 'mma.jpeg' },
    { slug: 'cricket', label: 'קריקט', image: 'cricket.jpeg' },
    { slug: 'rugby', label: 'ראגבי', image: 'rugby.jpeg' },
    { slug: 'golf', label: 'גולף', image: 'golf.jpeg' },
    { slug: 'darts', label: 'חיצים', image: 'darts.jpeg' },
    { slug: 'motorsport', label: 'מוטורספורט', image: 'motorsport.jpeg' },
    { slug: 'cycling', label: 'אופניים', image: 'cycling.jpeg' },
    { slug: 'swimming', label: 'שחייה', image: 'swimming.jpeg' },
    { slug: 'athletics', label: 'אתלטיקה', image: 'athletics.jpeg' },
    { slug: 'badminton', label: 'בדמינטון', image: 'badminton.jpeg' },
    { slug: 'field-hockey', label: 'הוקי שדה', image: 'field-hockey.jpeg' },
    { slug: 'judo', label: 'ג׳ודו', image: 'judo.jpeg' },
    { slug: 'karate', label: 'קראטה', image: 'karate.jpeg' },
    { slug: 'taekwondo', label: 'טאקוונדו', image: 'teakwondo.jpeg' },
    { slug: 'wrestling', label: 'היאבקות', image: 'wresling.jpeg' },
    { slug: 'weightlifting', label: 'הרמת משקולות', image: 'weightlifting.jpeg' },
    { slug: 'rowing', label: 'חתירה', image: 'rowing.jpeg' },
    { slug: 'sailing', label: 'שייט', image: 'saling.jpeg' },
    { slug: 'surfing', label: 'גלישה', image: 'surfing.jpeg' },
    { slug: 'skiing', label: 'סקי', image: 'skiing.jpeg' },
    { slug: 'snowboarding', label: 'סנובורד', image: 'snowboarding.jpeg' },
    { slug: 'skateboarding', label: 'סקייטבורד', image: 'skatboarding.jpeg' },
    { slug: 'softball', label: 'סופטבול', image: 'softball.jpeg' },
    { slug: 'bowling', label: 'באולינג', image: 'bowling.jpeg' },
    { slug: 'fencing', label: 'סיף', image: 'fencing.jpeg' },
    { slug: 'equestrian', label: 'רכיבה', image: 'equesrian.jpeg' },
    { slug: 'triathlon', label: 'טריאתלון', image: 'triathlon.jpeg' },
    { slug: 'basketball3x3', label: '3x3 כדורסל', image: 'basketball3x3.jpeg' },
    { slug: 'beach-volleyball', label: 'כדורעף חופים', image: 'beach voleyball.jpeg' },
    { slug: 'water-polo', label: 'כדורמים', image: 'water-pold.jpeg' },
    { slug: 'american-football', label: 'פוטבול', image: 'am-football.jpeg' },
  ];
  const sportBySlug = new Map(footerSports.map((sport) => [sport.slug, sport]));
  const sportImage = (image) => image && image.startsWith('/') ? image : `/assets/images/footer-menu/${image}`;
  const footerMenuGroups = [
    {
      key: 'ball',
      labelKey: 'menuGroupBall',
      label: '\u05de\u05e9\u05d7\u05e7\u05d9 \u05db\u05d3\u05d5\u05e8',
      image: 'footbal.jpeg',
      sports: ['football', 'basketball', 'tennis', 'volleyball', 'baseball', 'handball', 'table-tennis', 'rugby', 'american-football', 'basketball3x3', 'beach-volleyball', 'water-polo'],
    },
    {
      key: 'water',
      labelKey: 'menuGroupWater',
      label: '\u05e1\u05e4\u05d5\u05e8\u05d8 \u05d9\u05de\u05d9',
      image: 'swimming.jpeg',
      sports: ['swimming', 'rowing', 'sailing', 'surfing', 'water-polo'],
    },
    {
      key: 'motor',
      labelKey: 'menuGroupMotor',
      label: '\u05e1\u05e4\u05d5\u05e8\u05d8 \u05de\u05d5\u05d8\u05d5\u05e8\u05d9',
      image: 'motorsport.jpeg',
      sports: ['motorsport', 'cycling', 'skateboarding', 'skiing', 'snowboarding'],
    },
    {
      key: 'combat',
      labelKey: 'menuGroupCombat',
      label: '\u05d0\u05d5\u05de\u05e0\u05d5\u05d9\u05d5\u05ea \u05dc\u05d7\u05d9\u05de\u05d4',
      image: 'boxing.jpeg',
      sports: ['boxing', 'mma', 'judo', 'karate', 'taekwondo', 'wrestling', 'fencing'],
    },
    {
      key: 'precision',
      labelKey: 'menuGroupPrecision',
      label: '\u05d3\u05d9\u05d5\u05e7 \u05d5\u05e4\u05e0\u05d0\u05d9',
      image: 'darts.jpeg',
      sports: ['golf', 'darts', 'bowling', 'badminton', 'field-hockey', 'equestrian', 'triathlon', 'athletics', 'softball', 'cricket', 'weightlifting'],
    },
    {
      key: 'casino',
      labelKey: 'menuGroupCasino',
      label: '\u05e7\u05d6\u05d9\u05e0\u05d5',
      image: '/assets/images/home-casino.png',
      links: [
        { href: '/casino/slot', labelKey: 'slots', label: '\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd', image: '/assets/images/dashboard-casino.webp' },
        { href: '/casino/live', labelKey: 'liveCasino', label: '\u05e7\u05d6\u05d9\u05e0\u05d5 \u05d7\u05d9', image: '/assets/images/dashboard-livecasino.webp' },
        { href: '/casino/virtual', labelKey: 'sport', label: '\u05e1\u05e4\u05d5\u05e8\u05d8', image: '/assets/images/dashboard-livesport.webp' },      ],
    }
  ];
  const footerMenuGroupByKey = new Map(footerMenuGroups.map((group) => [group.key, group]));
  const sportGroupForSport = (sport) => (
    footerMenuGroups.find((group) => Array.isArray(group.sports) && (group.sports || []).includes(sport?.slug))
    || footerMenuGroups.find((group) => Array.isArray(group.sports) && (group.sports || []).length)
    || footerMenuGroups[0]
  );
  const normalizeSportText = (text) => fixMojibake(String(text || '')).replace(/\(\d+\)/g, '').replace(/\s+/g, ' ').trim();
  const sportFromText = (text) => {
    const label = normalizeSportText(text);
    if (!label) return null;
    const exact = footerSports.find((sport) => sport.label === label);
    if (exact) return exact;
    return {
      slug: label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'sport',
      label,
      image: 'footbal.jpeg',
    };
  };
  const sportSubmenuFallback = [
    { key: 'live', label: '\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05d7\u05d9\u05d9\u05dd', summary: '\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd, \u05d9\u05d7\u05e1 \u05d6\u05de\u05d9\u05df \u05d5\u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05de\u05e8\u05db\u05d6\u05d9\u05d9\u05dd.' },
    { key: 'upcoming', label: '\u05e7\u05e8\u05d5\u05d1\u05d9\u05dd', summary: '\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05de\u05ea\u05d5\u05db\u05e0\u05e0\u05d9\u05dd, \u05e4\u05ea\u05d9\u05d7\u05ea \u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05d5\u05de\u05e2\u05e7\u05d1 \u05dc\u05e4\u05e0\u05d9 \u05de\u05e9\u05d7\u05e7.' },
    { key: 'markets', label: '\u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05e4\u05d5\u05e4\u05d5\u05dc\u05e8\u05d9\u05d9\u05dd', summary: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05de\u05e0\u05e6\u05d7, \u05d9\u05ea\u05e8\u05d5\u05df, \u05e1\u05da \u05e0\u05e7\u05d5\u05d3\u05d5\u05ea \u05d5\u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05de\u05e9\u05dc\u05d9\u05de\u05d9\u05dd.' },
  ];
  const sportSubmenus = {
    football: [
      { key: 'match-winner', label: '\u05de\u05e0\u05e6\u05d7\u05ea \u05e8\u05d0\u05e9\u05d9\u05ea', summary: '1X2, \u05ea\u05d9\u05e7\u05d5, \u05e0\u05d9\u05e6\u05d7\u05d5\u05df \u05d1\u05d9\u05ea \u05d5\u05d7\u05d5\u05e5.' },
      { key: 'first-half', label: '\u05de\u05d7\u05e6\u05d9\u05ea \u05e8\u05d0\u05e9\u05d5\u05e0\u05d4', summary: '\u05ea\u05d5\u05e6\u05d0\u05d4, \u05de\u05e0\u05e6\u05d7\u05ea, \u05e9\u05e2\u05e8\u05d9\u05dd \u05d5\u05d9\u05ea\u05e8\u05d5\u05df \u05d1\u05de\u05d7\u05e6\u05d9\u05ea \u05d4\u05e8\u05d0\u05e9\u05d5\u05e0\u05d4.' },
      { key: 'second-half', label: '\u05de\u05d7\u05e6\u05d9\u05ea \u05e9\u05e0\u05d9\u05d9\u05d4', summary: '\u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05dc\u05de\u05d7\u05e6\u05d9\u05ea \u05d4\u05e9\u05e0\u05d9\u05d9\u05d4 \u05d5\u05e2\u05d3\u05db\u05d5\u05df \u05dc\u05d0\u05d7\u05e8 \u05d4\u05e4\u05e1\u05e7\u05d4.' },
      { key: 'totals', label: '\u05e1\u05da \u05d4\u05db\u05dc / \u05e9\u05e2\u05e8\u05d9\u05dd', summary: '\u05de\u05e2\u05dc/\u05de\u05ea\u05d7\u05ea \u05e9\u05e2\u05e8\u05d9\u05dd, \u05e1\u05da \u05e9\u05e2\u05e8\u05d9\u05dd \u05d5\u05e7\u05d5\u05d5\u05d9 \u05de\u05e9\u05d7\u05e7.' },
      { key: 'handicap', label: '\u05e2\u05d3\u05d9\u05e4\u05d5\u05ea / \u05e0\u05db\u05d5\u05ea', summary: '\u05d9\u05ea\u05e8\u05d5\u05df \u05d0\u05e1\u05d9\u05d0\u05ea\u05d9, \u05d0\u05d9\u05e8\u05d5\u05e4\u05d9 \u05d5\u05e7\u05d5\u05d5\u05d9 \u05e0\u05db\u05d5\u05ea \u05de\u05e8\u05db\u05d6\u05d9\u05d9\u05dd.' },
      { key: 'both-teams', label: '\u05e9\u05ea\u05d9 \u05d4\u05e7\u05d1\u05d5\u05e6\u05d5\u05ea \u05dc\u05d4\u05d1\u05e7\u05d9\u05e2', summary: '\u05db\u05df/\u05dc\u05d0, \u05e9\u05e2\u05e8 \u05e8\u05d0\u05e9\u05d5\u05df \u05d5\u05e9\u05d9\u05dc\u05d5\u05d1\u05d9 \u05ea\u05d5\u05e6\u05d0\u05d4.' },
    ],
    basketball: [
      { key: 'winner', label: '\u05de\u05e0\u05e6\u05d7\u05ea \u05de\u05e9\u05d7\u05e7', summary: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05de\u05e0\u05e6\u05d7\u05ea, \u05d4\u05d0\u05e8\u05db\u05d4 \u05d5\u05e7\u05d5\u05d5\u05d9 \u05de\u05e9\u05d7\u05e7.' },
      { key: 'quarters', label: '\u05e8\u05d1\u05e2\u05d9\u05dd', summary: '\u05e8\u05d1\u05e2 \u05e8\u05d0\u05e9\u05d5\u05df, \u05de\u05d7\u05e6\u05d9\u05ea \u05d5\u05e8\u05d1\u05e2\u05d9\u05dd \u05dc\u05e4\u05d9 \u05de\u05e9\u05d7\u05e7.' },
      { key: 'totals', label: '\u05e1\u05da \u05e0\u05e7\u05d5\u05d3\u05d5\u05ea', summary: '\u05de\u05e2\u05dc/\u05de\u05ea\u05d7\u05ea \u05e0\u05e7\u05d5\u05d3\u05d5\u05ea, \u05e7\u05d1\u05d5\u05e6\u05ea\u05d9 \u05d5\u05db\u05dc\u05dc\u05d9.' },
      { key: 'handicap', label: '\u05d4\u05e4\u05e8\u05e9 / \u05e0\u05db\u05d5\u05ea', summary: '\u05e0\u05db\u05d5\u05ea \u05e0\u05e7\u05d5\u05d3\u05d5\u05ea \u05d5\u05d4\u05e4\u05e8\u05e9\u05d9 \u05e0\u05d9\u05e6\u05d7\u05d5\u05df.' },
    ],
    tennis: [
      { key: 'winner', label: '\u05de\u05e0\u05e6\u05d7 \u05de\u05e9\u05d7\u05e7', summary: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05de\u05e0\u05e6\u05d7 \u05de\u05e9\u05d7\u05e7 \u05d5\u05de\u05e2\u05e8\u05db\u05d5\u05ea.' },
      { key: 'sets', label: '\u05de\u05e2\u05e8\u05db\u05d5\u05ea', summary: '\u05ea\u05d5\u05e6\u05d0\u05d4 \u05de\u05d3\u05d5\u05d9\u05e7\u05ea, \u05de\u05e0\u05e6\u05d7 \u05de\u05e2\u05e8\u05db\u05d4 \u05d5\u05e1\u05da \u05de\u05e2\u05e8\u05db\u05d5\u05ea.' },
      { key: 'games', label: '\u05de\u05e9\u05d7\u05e7\u05d5\u05e0\u05d9\u05dd', summary: '\u05e1\u05da \u05de\u05e9\u05d7\u05e7\u05d5\u05e0\u05d9\u05dd, \u05e0\u05db\u05d5\u05ea \u05de\u05e9\u05d7\u05e7\u05d5\u05e0\u05d9\u05dd \u05d5\u05e9\u05d5\u05d1\u05e8 \u05e9\u05d5\u05d5\u05d9\u05d5\u05df.' },
    ],
    volleyball: [
      { key: 'winner', label: '\u05de\u05e0\u05e6\u05d7\u05ea \u05de\u05e9\u05d7\u05e7', summary: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05de\u05e0\u05e6\u05d7\u05ea \u05d5\u05e1\u05d9\u05db\u05d5\u05de\u05d9 \u05de\u05e2\u05e8\u05db\u05d5\u05ea.' },
      { key: 'sets', label: '\u05de\u05e2\u05e8\u05db\u05d5\u05ea', summary: '\u05de\u05e0\u05e6\u05d7\u05ea \u05de\u05e2\u05e8\u05db\u05d4, \u05e1\u05da \u05de\u05e2\u05e8\u05db\u05d5\u05ea \u05d5\u05ea\u05d5\u05e6\u05d0\u05d4 \u05de\u05d3\u05d5\u05d9\u05e7\u05ea.' },
      { key: 'points', label: '\u05e0\u05e7\u05d5\u05d3\u05d5\u05ea', summary: '\u05de\u05e2\u05dc/\u05de\u05ea\u05d7\u05ea \u05e0\u05e7\u05d5\u05d3\u05d5\u05ea \u05d5\u05e0\u05db\u05d5\u05ea \u05e0\u05e7\u05d5\u05d3\u05d5\u05ea.' },
    ],
  };
  const getSportSubmenu = (sport) => sportSubmenus[sport?.slug] || sportSubmenuFallback;
  const applySportSubmenuSelection = (pickedSport, preferredModeKey) => {
    const sport = sportBySlug.get(pickedSport?.slug) || pickedSport || getInitialSport();
    const modeKey = preferredModeKey || getSportSubmenu(sport)[0]?.key || 'live';
    document.body.dataset.rbActiveSport = sport.slug || 'sport';
    localStorage.setItem(SPORT_SELECTION_KEY, JSON.stringify(sport));
    renderSportSubmenu(sport, modeKey);
    setupSportBettingPage(sport, modeKey);
  };
  let sportSubmenuHitLayerRaf = 0;
  const removeSportSubmenuHitLayer = () => {
    document.querySelector('[data-rb-sport-submenu-hitlayer]')?.remove();
  };
  const syncSportSubmenuHitLayer = () => {
    removeSportSubmenuHitLayer();
  };
  const requestSyncSportSubmenuHitLayer = () => {
    if (sportSubmenuHitLayerRaf) return;
    sportSubmenuHitLayerRaf = window.requestAnimationFrame(() => {
      sportSubmenuHitLayerRaf = 0;
      syncSportSubmenuHitLayer();
    });
  };
  const buildSportStateHref = (sportSlug, modeKey) => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/betting';
    const base = path.startsWith('/sport') ? '/sport' : '/betting';
    const params = new URLSearchParams(window.location.search || '');
    params.set('sport', sportSlug || 'football');
    params.set('view', modeKey || 'live');
    return `${base}?${params.toString()}`;
  };
  const getTopSportMenu = () => (
    document.getElementById('pmSportMenuSwiper') ||
    document.querySelector('.sx-sports-swiper swiper-container') ||
    document.querySelector('.dash-event-sports swiper-container')
  );
  const renderSportSubmenu = () => {
    // Unified navigation: we use the home-style sports menu as the single menu everywhere.
    document.querySelector('[data-rb-sport-submenu]')?.remove();
    requestSyncSportSubmenuHitLayer();
  };
  const setupTopSportMenu = () => {
    const menuSwiper = getTopSportMenu();
    if (!menuSwiper) return;
    menuSwiper.querySelectorAll('.dash-sports-slide, swiper-slide, a').forEach((slide) => {
      if (!normalizeSportText(slide.textContent)) return;
      if (!slide.matches('a')) {
        slide.setAttribute('role', 'button');
        slide.setAttribute('tabindex', '0');
      }
      const sport = sportFromText(slide.textContent);
      if (sport?.slug) slide.dataset.rbSportSlug = sport.slug;
    });
    const active = menuSwiper.querySelector('.dash-sports-slide.active, .dash-sports-slide.rb-click-active, a.active, a.rb-click-active') || menuSwiper.querySelector('.dash-sports-slide, a');
    const preferredSport = sportBySlug.get(document.body.dataset.rbActiveSport || '');
    const sport = preferredSport || sportFromText(active?.textContent) || getInitialSport();
    const currentMount = document.querySelector('[data-rb-sport-submenu]');
    const activeKey = currentMount?.dataset.rbSportSubmenuActive;
    renderSportSubmenu(sport, activeKey);
  };
  const sportPageUrl = (sport, extra = '') => `/sport/pregame?sport=${encodeURIComponent(sport.slug || 'sport')}${extra}`;
  const homeSportGroups = footerMenuGroups.filter((group) => Array.isArray(group.sports) && group.sports.length);
  const homeSportCards = (sport) => [
    {
      key: 'live',
      eyebrow: 'Live',
      title: `${translatedSportLabel(sport)} - ${t('live')}`,
      text: t('oddsReady'),
      href: sportPageUrl(sport, '&view=live'),
    },
    {
      key: 'upcoming',
      eyebrow: 'Upcoming',
      title: `${translatedSportLabel(sport)} - ${t('upcoming')}`,
      text: t('submenuReady'),
      href: sportPageUrl(sport, '&view=upcoming'),
    },
    {
      key: 'markets',
      eyebrow: 'Markets',
      title: `${translatedSportLabel(sport)} - ${t('markets')}`,
      text: t('marketExamples'),
      href: sportPageUrl(sport, '&view=markets'),
    },
    {
      key: 'leagues',
      eyebrow: 'Leagues',
      title: `${translatedSportLabel(sport)} - \u05dc\u05d9\u05d2\u05d5\u05ea \u05d5\u05d8\u05d5\u05e8\u05e0\u05d9\u05e8\u05d9\u05dd`,
      text: '\u05dc\u05d9\u05d2\u05d5\u05ea, \u05de\u05d3\u05d9\u05e0\u05d5\u05ea \u05d5\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05de\u05d5\u05de\u05dc\u05e6\u05d9\u05dd \u05d1\u05e2\u05e0\u05e3.',
      href: sportPageUrl(sport, '&view=leagues'),
    },
  ];
  let homeSportsTimer = 0;
  let homeBettingTimer = 0;
  let homeBettingResumeTimer = 0;
  let homeLiveLineTimer = 0;
  let dedicatedLiveLineTimer = 0;
  let homeBettingActiveTrack = null;
  let homeBettingLastFrameTs = 0;
  const loopRailPoint = (rail, itemSelector) => {
    const items = Array.from(rail.querySelectorAll(itemSelector));
    if (items.length < 2) return 0;
    const half = Math.floor(items.length / 2);
    return items[half] ? Math.max(0, items[half].offsetLeft - items[0].offsetLeft) : 0;
  };
  const snapLoopRail = (rail, loopPoint) => {
    if (!loopPoint || rail.scrollLeft < loopPoint - 2) return;
    rail.scrollLeft = Math.max(0, rail.scrollLeft - loopPoint);
  };
  const advanceLoopRail = (rail, itemSelector, fallbackGap = 10) => {
    const item = rail.querySelector(itemSelector);
    if (!item) return;
    const loopPoint = loopRailPoint(rail, itemSelector);
    if (!loopPoint) return;
    snapLoopRail(rail, loopPoint);
    const step = item.getBoundingClientRect().width + fallbackGap;
    rail.scrollTo({ left: rail.scrollLeft + step, behavior: 'smooth' });
    window.setTimeout(() => snapLoopRail(rail, loopPoint), 720);
  };
  const stopHomeBettingAuto = () => {
    if (homeBettingTimer) {
      window.cancelAnimationFrame(homeBettingTimer);
      homeBettingTimer = 0;
    }
    if (homeBettingActiveTrack) {
      homeBettingActiveTrack.classList.remove('rb-auto-moving');
      homeBettingActiveTrack = null;
    }
    homeBettingLastFrameTs = 0;
    if (homeBettingResumeTimer) {
      window.clearTimeout(homeBettingResumeTimer);
      homeBettingResumeTimer = 0;
    }
  };
  const startHomeBettingAuto = (track) => {
    stopHomeBettingAuto();
    if (!track) return;
    homeBettingActiveTrack = track;
    track.classList.add('rb-auto-moving');
    const speedPxPerMs = 0.05;
    const tick = (ts) => {
      if (!document.body.contains(track)) {
        stopHomeBettingAuto();
        return;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        homeBettingTimer = window.requestAnimationFrame(tick);
        return;
      }
      if (track.scrollWidth > track.clientWidth + 2) {
        if (!homeBettingLastFrameTs) homeBettingLastFrameTs = ts;
        const delta = Math.max(0, ts - homeBettingLastFrameTs);
        homeBettingLastFrameTs = ts;
        const loopPoint = Math.floor(track.scrollWidth / 2);
        track.scrollLeft += delta * speedPxPerMs;
        if (loopPoint > 0 && track.scrollLeft >= loopPoint) {
          track.scrollLeft -= loopPoint;
        }
      }
      homeBettingTimer = window.requestAnimationFrame(tick);
    };
    homeBettingTimer = window.requestAnimationFrame(tick);
  };
  const bindHomeBettingTouchAuto = (track, canAutoRun) => {
    if (!track || !canAutoRun) return;
    if (track.dataset.rbHomeBettingBound === '1') return;
    const pauseAndResume = () => {
      stopHomeBettingAuto();
      homeBettingResumeTimer = window.setTimeout(() => startHomeBettingAuto(track), 1600);
    };
    track.addEventListener('touchstart', pauseAndResume, { passive: true });
    track.addEventListener('touchend', pauseAndResume, { passive: true });
    track.addEventListener('pointerdown', pauseAndResume);
    track.addEventListener('pointerup', pauseAndResume);
    track.addEventListener('pointercancel', pauseAndResume);
    track.dataset.rbHomeBettingBound = '1';
  };
  const renderHomeSubSports = (root, groupKey, sportSlug) => {
    const group = footerMenuGroupByKey.get(groupKey) || homeSportGroups[0];
    const selectedSport = sportBySlug.get(sportSlug) || sportBySlug.get(group.sports[0]) || sportBySlug.get('football');
    const subRow = root.querySelector('[data-rb-home-sub-sports]');
    if (!subRow || !selectedSport) return;
    const previousScrollLeft = Number.isFinite(readLogicalScrollLeft(subRow)) ? readLogicalScrollLeft(subRow) : 0;
    if (subRow.dataset.rbSubSportsBound !== '1') {
      subRow.addEventListener('scroll', () => {
        subRow.dataset.rbLastScrollTs = String(Date.now());
      }, { passive: true });
      subRow.dataset.rbSubSportsBound = '1';
    }

    subRow.innerHTML = (group.sports || []).map((slug) => {
      const sport = sportBySlug.get(slug);
      if (!sport) return '';
      return `
        <a
          class="rb-home-sub-sport ${sport.slug === selectedSport.slug ? 'active' : ''}"
          href="${sportPageUrl(sport)}"
          data-rb-home-sub-sport="${sport.slug}"
        >
          <span><img src="${sportImage(sport.image)}" alt=""></span>
          <strong data-rb-i18n="sport.${sport.slug}">${translatedSportLabel(sport)}</strong>
        </a>
      `;
    }).join('');
    window.requestAnimationFrame(() => {
      if (!document.body.contains(subRow)) return;
      writeLogicalScrollLeft(subRow, previousScrollLeft);
    });
    renderHomeSportsSlider(root, selectedSport);
    renderHomeBettingBoard(root, selectedSport);
  };
  const renderHomeSportsSlider = (root, sport) => {
    const slider = root.querySelector('[data-rb-home-sports-slider]');
    if (!slider || !sport) return;
    const cards = homeSportCards(sport);
    const repeatedCards = cards.concat(cards);
    slider.innerHTML = repeatedCards.map((card) => `
      <a class="rb-home-sport-card" href="${card.href}" data-rb-home-sport-card="${card.key}">
        <img src="${sportImage(sport.image)}" alt="">
        <span>${card.eyebrow}</span>
        <strong>${card.title}</strong>
        <small>${card.text}</small>
      </a>
    `).join('');
    if (homeSportsTimer) window.clearInterval(homeSportsTimer);
    homeSportsTimer = window.setInterval(() => {
      if (!document.body.contains(slider) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      advanceLoopRail(slider, '.rb-home-sport-card', 10);
    }, 3600);
  };
  const betBoardText = {
    title: '\u05de\u05e2\u05e8\u05db\u05ea \u05d4\u05d9\u05de\u05d5\u05e8\u05d9\u05dd',
    live: '\u05d7\u05d9',
    upcoming: '\u05d1\u05e7\u05e8\u05d5\u05d1',
    marketMain: '\u05e9\u05d5\u05e7 \u05e8\u05d0\u05e9\u05d9',
    quickSlip: '\u05d8\u05d5\u05e4\u05e1 \u05de\u05d4\u05d9\u05e8',
    pickOdd: '\u05dc\u05d7\u05e5 \u05e2\u05dc \u05d9\u05d7\u05e1 \u05db\u05d3\u05d9 \u05dc\u05d4\u05db\u05d9\u05df \u05d1\u05d7\u05d9\u05e8\u05d4.',
    selection: '\u05d1\u05d7\u05d9\u05e8\u05d4',
    stake: '\u05e1\u05db\u05d5\u05dd',
    possibleWin: '\u05d6\u05db\u05d9\u05d9\u05d4 \u05d0\u05e4\u05e9\u05e8\u05d9\u05ea',
    addToSlip: '\u05d4\u05d5\u05e1\u05e3 \u05dc\u05d8\u05d5\u05e4\u05e1',
    openSport: '\u05e2\u05d1\u05d5\u05e8 \u05dc\u05d3\u05e3 \u05d4\u05e2\u05e0\u05e3',
  };
  const formatOdd = (value) => (Math.round(value * 100) / 100).toFixed(2);
  const defaultSportGlossaryTerms = {
    football: 'כדורגל',
    soccer: 'כדורגל',
    basketball: 'כדורסל',
    tennis: 'טניס',
    volleyball: 'כדור עף',
    baseball: 'כדור בסיס',
    handball: 'כדור יד',
    'table tennis': 'טניס שולחן',
    'ice hockey': 'הוקי קרח',
    boxing: 'אגרוף',
    cricket: 'קריקט',
    rugby: 'רוגבי',
    golf: 'גולף',
    darts: 'חיצים',
    winner: 'מנצח',
    draw: 'תיקו',
    over: 'מעל',
    under: 'מתחת',
    handicap: 'יוביל',
    points: 'נקודות',
    games: 'משחקים',
    sets: 'מערכות',
    quarters: 'רבעים',
    'both teams to score': 'שתי הקבוצות יבקיעו',
    'btts yes': 'ביט כן',
    'btts no': 'ביט לא',
    yes: 'כן',
    no: 'לא',
    upcoming: 'בקרוב',
    live: 'חי',
    home: 'בית',
    away: 'חוץ',
    vs: 'נגד',
    'fifa world cup': 'פיפה גביע העולם',
    'world cup': 'מונדיאל',
    'home -1': 'בית -1',
    'away +1': 'חוץ +1',
    'q1 home': ' רבע 1 בית',
    'q1 away': 'רבע 1 חוץ',
    'set 1': 'מערכה 1',
    'set 2': 'מערכב 2',
    'over games': 'משחק על',
    'under games': 'תת משחק',
    argentina: 'ארגנטינה',
    belgium: 'בלגיה',
    egypt: 'מצרים',
    'united states': 'ארצות הברית',
    'united states of america': 'ארצות הברית',
    usa: 'ארצות הברית',
    us: 'ארצות הברית',
    algeria: 'אלג׳יריה',
    australia: 'אוסטרליה',
    austria: 'אוסטריה',
    'bosnia and herzegovina': 'בוסניה והרצגובינה',
    brazil: 'ברזיל',
    canada: 'קנדה',
    'cape verde': 'כף ורדה',
    colombia: 'קולומביה',
    croatia: 'קרואטיה',
    ecuador: 'אקוודור',
    england: 'אנגליה',
    france: 'צרפת',
    germany: 'גרמניה',
    ghana: 'גאנה',
    'ivory coast': 'חוף השנהב',
    japan: 'יפן',
    jordan: 'ירדן',
    mexico: 'מקסיקו',
    morocco: 'מרוקו',
    netherlands: 'הולנד',
    norway: 'נורווגיה',
    paraguay: 'פרגוואי',
    portugal: 'פורטוגל',
    senegal: 'סנגל',
    'south africa': 'דרום אפריקה',
    spain: 'ספרד',
    sweden: 'שוודיה',
    switzerland: 'שווייץ',
    uzbekistan: 'אוזבקיסטן',
    'הגיפט': 'מצרים',
    גיפט: 'מצרים',
  };
  const sportGlossaryState = {
    loadingByLocale: new Map(),
    loadedByLocale: new Map(),
    activeLocale: '',
    terms: new Map(),
  };
  const normalizeGlossaryKey = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hasBrokenText = (value) => /�/.test(String(value || ''));
  const sanitizeDisplayText = (value, fallback = '') => {
    const primary = fixMojibake(String(value || '')).trim();
    if (primary && !hasBrokenText(primary)) return primary;
    const backup = fixMojibake(String(fallback || '')).trim();
    if (backup && !hasBrokenText(backup)) return backup;
    return backup || primary || '';
  };
  const sanitizeMarketLabel = (label, fallback = '') => {
    const safe = sanitizeDisplayText(label, fallback);
    if (!safe) return '';
    const normalized = normalizeGlossaryKey(safe);
    if (normalized === 'home') return '1';
    if (normalized === 'draw') return 'X';
    if (normalized === 'away') return '2';
    return safe;
  };
  const setSportGlossaryTerms = (terms, locale = getSiteLanguage()) => {
    const next = new Map();
    Object.entries(defaultSportGlossaryTerms).forEach(([rawKey, rawValue]) => {
      const key = normalizeGlossaryKey(rawKey);
      const value = sanitizeDisplayText(rawValue);
      if (key && value) next.set(key, value);
    });
    Object.entries(terms || {}).forEach(([rawKey, rawValue]) => {
      const key = normalizeGlossaryKey(rawKey);
      const value = typeof rawValue === 'string'
        ? sanitizeDisplayText(rawValue, next.get(key) || '')
        : '';
      if (key && value) next.set(key, value);
    });
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    sportGlossaryState.terms = next;
    sportGlossaryState.activeLocale = safeLocale;
    sportGlossaryState.loadedByLocale.set(safeLocale, next);
  };
  const extractGlossaryTerms = (payload) => {
    const candidates = [
      payload?.data?.terms,
      payload?.terms,
      payload?.data?.sportGlossary?.terms,
      payload?.data?.sportGlossary,
      payload?.sportGlossary,
    ];
    const match = candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    return match || {};
  };
   const glossaryFetchEndpoints = (locale = getSiteLanguage()) => {
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    const host = String(window.location.hostname || '').toLowerCase();
    
    // מניעת בלבול בדפדפן: כפיית כתובת אחת ישירה ומדויקת ל-Strapi
    if (['localhost'].includes(host)) {
      return [
        `http://localhost:1337/api/public-glossary?locale=${encodeURIComponent(safeLocale)}`
      ];
    }
    
    const base = sportPageApiBase();
    const endpoints = [
      `${base}/api/public-glossary?locale=${encodeURIComponent(safeLocale)}`,
      `/api/public-glossary?locale=${encodeURIComponent(safeLocale)}`,
      `${window.location.origin}/api/public-glossary?locale=${encodeURIComponent(safeLocale)}`,
      `https://addapi.royalbet88.live/api/public-glossary?locale=${encodeURIComponent(safeLocale)}`
    ];
    return Array.from(new Set(endpoints));
  };

  const loadSportGlossaryForLocale = async (locale) => {
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    const cached = sportGlossaryState.loadedByLocale.get(safeLocale);
    if (cached) return cached;
    if (sportGlossaryState.loadingByLocale.has(safeLocale)) {
      return sportGlossaryState.loadingByLocale.get(safeLocale);
    }
        const pending = (async () => {
      await ensureSiteTranslations(safeLocale);
      
      if (
        window.__rbCachedGlossaryMap &&
        window.__rbCachedGlossaryMap.size > 0 &&
        window.__rbCachedGlossaryLocale === safeLocale
      ) {
        sportGlossaryState.loadedByLocale.set(safeLocale, window.__rbCachedGlossaryMap);
        return window.__rbCachedGlossaryMap;
      }

      const endpoints = glossaryFetchEndpoints(safeLocale);
      
      for (const endpoint of endpoints) {
        const result = await fetchJsonWithTimeout(endpoint, 4000).catch(() => null);
        if (!result || !result.ok) continue;
        const rawTerms = extractGlossaryTerms(result.payload);

        if (rawTerms && typeof rawTerms === 'object' && Object.keys(rawTerms).length) {
          const merged = new Map();
          
          Object.entries(defaultSportGlossaryTerms || {}).forEach(([rawKey, rawValue]) => {
            const key = normalizeGlossaryKey(rawKey);
            const value = sanitizeDisplayText(rawValue);
            if (key && value) merged.set(key, value);
          });
          
          Object.entries(rawTerms).forEach(([rawKey, rawValue]) => {
            const key = normalizeGlossaryKey(rawKey);
            const value = typeof rawValue === 'string'
              ? sanitizeDisplayText(rawValue, merged.get(key) || '')
              : '';
            if (key && value) merged.set(key, value);
          });

          window.__rbCachedGlossaryMap = merged;
          window.__rbCachedGlossaryLocale = safeLocale;
          sportGlossaryState.loadedByLocale.set(safeLocale, merged);
          return merged;
        }
      }
      
      return new Map();
    })().finally(() => {
      sportGlossaryState.loadingByLocale.delete(safeLocale);
    });

    sportGlossaryState.loadingByLocale.set(safeLocale, pending);
    return pending;
  };
  const loadSportGlossary = async () => {
    const preferred = getSiteLanguage();
    const localePriority = Array.from(new Set([preferred, 'en', 'he']));
    for (const locale of localePriority) {
      const terms = await loadSportGlossaryForLocale(locale);
      if (terms && terms.size) {
        sportGlossaryState.terms = new Map(terms);
        sportGlossaryState.activeLocale = locale;
        return Object.fromEntries(terms);
      }
    }
    setSportGlossaryTerms({}, preferred);
    return {};
  };

  const translateSportTerm = (rawValue, fallback = '') => {
    if (rawValue == null || rawValue === '') return fallback || '';
    const value = sanitizeDisplayText(rawValue, fallback);
    if (!value) return fallback || '';
    const direct = sportGlossaryState.terms.get(normalizeGlossaryKey(value));
    if (direct) return sanitizeDisplayText(direct, fallback || value);
    const parts = value.split(/(\s+|\/|\\|\||,|:|\(|\)|\[|\]|\{|\}|-)/g);
    let replaced = 0;
    const merged = parts.map((part) => {
      const key = normalizeGlossaryKey(part);
      if (!key) return part;
      const hit = sportGlossaryState.terms.get(key);
      if (!hit) return part;
      replaced += 1;
      return sanitizeDisplayText(hit, part);
    }).join('');
    if (replaced > 0) return sanitizeDisplayText(merged, fallback || value);
    return sanitizeDisplayText(fallback || value, value);
  };
  const isLiveLinePagePath = () => false;
  const sportPageApiBase = () => {
    if (window.ROYALBET_API_BASE) return window.ROYALBET_API_BASE;
    if (['localhost'].includes(window.location.hostname)) return 'http://localhost:1337';
    return `https://addapi.${window.location.hostname.replace(/^www\./, '')}`;
  };
  const buildSportApiEndpoints = (path) => {
    const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
    const base = String(sportPageApiBase() || '').replace(/\/+$/, '');
    if (window.ROYALBET_API_BASE && base) return [`${base}${normalizedPath}`];
    const fallbackBase = 'https://addapi.royalbet88.live';
    const isLocalHost = ['localhost'].includes(window.location.hostname);
    const endpoints = [];

    if (base) endpoints.push(`${base}${normalizedPath}`);
    if (isLocalHost) {
      endpoints.push(`http://localhost:1337${normalizedPath}`);
      endpoints.push(`http://localhost:1337${normalizedPath}`);
      endpoints.push(`${window.location.origin}${normalizedPath}`);
      endpoints.push(normalizedPath);
    } else {
      endpoints.push(normalizedPath);
      endpoints.push(`${window.location.origin}${normalizedPath}`);
      endpoints.push(`${fallbackBase}${normalizedPath}`);
    }
    return Array.from(new Set(endpoints));
  };
  const extractFixtureRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.fixtures)) return payload.fixtures;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };
    const fixtureFetchEndpoints = (locale = getSiteLanguage()) => {
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    const host = String(window.location.hostname || '').toLowerCase();

    // בדיקה אם אנחנו עובדים מקומית (Localhost)
    if (['localhost'].includes(host)) {
      // כפייה ישירה לפנות ל-Strapi בפורט 1337 שבו נמצאים המשחקים והמילון
      return [
        `http://localhost:1337/api/public-fixtures?locale=${encodeURIComponent(safeLocale)}`,
        `http://localhost:1337/api/public-fixtures`
      ];
    }

    // הגדרת ברירת המחדל המקורית של האתר כאשר הוא יעלה לאוויר (Production)
    const withLocale = buildSportApiEndpoints(`/api/public-fixtures?locale=${encodeURIComponent(safeLocale)}`);
    const generic = buildSportApiEndpoints('/api/public-fixtures');
    return Array.from(new Set([...withLocale, ...generic]));
  };

  const fetchJsonWithTimeout = async (url, timeoutMs = 4500) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const isCrossOrigin = /^https?:/i.test(url) && !url.startsWith(window.location.origin);
      const response = await fetch(url, {
        credentials: isCrossOrigin ? 'omit' : 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      const payload = await response.json();
      return { ok: true, payload };
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'timeout' : (error?.message || 'fetch-failed');
      return { ok: false, error: message };
    } finally {
      window.clearTimeout(timer);
    }
  };
  const liveTranslationTarget = (locale) => {
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    return ({ he: 'he', en: 'en', es: 'es', fr: 'fr', ar: 'ar' })[safeLocale] || 'en';
  };
  const translateFixtureRowsLive = async (rows, locale = getSiteLanguage()) => {
    const source = Array.isArray(rows) ? rows : [];
    if (!source.length) return source;
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    if (liveTranslationTarget(safeLocale) === 'en') return source;
    await loadSportGlossaryForLocale(safeLocale).catch(() => null);

    return source.map((item) => {
      const next = { ...item };
      ['home_team', 'away_team', 'league_name', 'league', 'sport_title', 'status'].forEach((key) => {
        const original = String(item?.[key] || '').trim();
        if (!original) return;
        const originalKey = `${key}_original`;
        if (!String(next?.[originalKey] || '').trim()) next[originalKey] = original;
        next[key] = translateSportTerm(original, original);
      });
      return next;
    });
  };
  const sportFixturesState = {
    loadingByLocale: new Map(),
    itemsByLocale: new Map(),
    loadedAtByLocale: new Map(),
    activeLocale: '',
    lastErrorByLocale: new Map(),
  };
  const SPORT_FIXTURES_CACHE_TTL_MS = 30 * 1000;
  const SPORT_FIXTURE_STALE_AFTER_KICKOFF_MS = 20 * 60 * 1000;
  const SPORT_ODDS_SILENCE_HIDE_MS = 5 * 60 * 1000;
  const normalizeFixture = (fixture) => fixture?.attributes || fixture || {};
  const parseFixtureTimestamp = (value) => {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
      const ts = value.getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      if (value > 1e12) return Math.floor(value);
      if (value > 1e9) return Math.floor(value * 1000);
      return null;
    }
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{13}$/.test(raw)) return Number(raw);
    if (/^\d{10}$/.test(raw)) return Number(raw) * 1000;

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)) return null;

    const nativeTs = new Date(raw).getTime();
    if (Number.isFinite(nativeTs)) return nativeTs;

    const normalized = raw.replace(/,/g, '.').replace(/\s+/g, ' ').trim();
    const dayFirst = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dayFirst) {
      const day = Number(dayFirst[1]);
      const month = Number(dayFirst[2]) - 1;
      const year = Number(dayFirst[3]);
      const hours = Number(dayFirst[4] || 0);
      const minutes = Number(dayFirst[5] || 0);
      const seconds = Number(dayFirst[6] || 0);
      const ts = Date.UTC(year, month, day, hours, minutes, seconds);
      return Number.isFinite(ts) ? ts : null;
    }
    const yearFirst = normalized.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (yearFirst) {
      const year = Number(yearFirst[1]);
      const month = Number(yearFirst[2]) - 1;
      const day = Number(yearFirst[3]);
      const hours = Number(yearFirst[4] || 0);
      const minutes = Number(yearFirst[5] || 0);
      const seconds = Number(yearFirst[6] || 0);
      const ts = new Date(year, month, day, hours, minutes, seconds).getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    return null;
  };
  const fixtureKickoffTs = (fixture) => {
    const directCandidates = [
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
      fixture?.ts,
    ];
    for (const item of directCandidates) {
      const ts = parseFixtureTimestamp(item);
      if (Number.isFinite(ts)) return ts;
    }

    const datePart = fixture?.date || fixture?.match_date || fixture?.fixture_date;
    const timePart = fixture?.time || fixture?.match_time || fixture?.fixture_time;
    if (datePart && timePart) {
      const ts = parseFixtureTimestamp(`${datePart} ${timePart}`);
      if (Number.isFinite(ts)) return ts;
    }
    return null;
  };
  const isDemoFixtureLike = (fixture) => {
    const text = [
      fixture?.fixture_id,
      fixture?.home_team,
      fixture?.away_team,
      fixture?.league_name,
      fixture?.sport_title,
    ].filter(Boolean).join(' ').toLowerCase();

    if (!text) return false;
    return /(royal tel aviv|jerusalem crown|red haifa|ashdod 88|\b(?:demo|mock|test|sample|dummy|sandbox|qa)\b|×œ×™×’×ª ×¨×•×™××œ)/i.test(text);
  };
  const normalizeFixtureSportText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const fixtureSportTokens = (fixture) => {
    const candidates = [
      fixture?.sport_key,
      fixture?.sport_title,
      fixture?.league_name,
      fixture?.fixture_id,
    ];
    const combined = normalizeFixtureSportText(candidates.filter(Boolean).join(' '));
    const tokens = new Set(combined.split(/\s+/).filter(Boolean));
    return { combined, tokens };
  };
  const tokenStartsWithAny = (token, prefixes) => prefixes.some((prefix) => token.startsWith(prefix));
  function tokenStartsWithAnyFromSet(tokens, prefixes) {
    return Array.from(tokens).some((token) => tokenStartsWithAny(token, prefixes));
  }
  const inferFixtureSportSlug = (fixture) => {
    const ctx = fixtureSportTokens(fixture);
    const tokens = ctx.tokens;
    const key = normalizeFixtureSportText(fixture?.sport_key);
    const has = (...values) => values.some((value) => tokens.has(value));
    const hasPrefix = (...prefixes) => tokenStartsWithAnyFromSet(tokens, prefixes);

    if (key.startsWith('americanfootball') || hasPrefix('americanfootball', 'nfl', 'ncaa')) return 'american-football';
    if (hasPrefix('tabletennis', 'pingpong') || (has('table') && has('tennis'))) return 'table-tennis';
    if (hasPrefix('beachvolleyball') || (has('beach') && has('volleyball'))) return 'beach-volleyball';
    if (hasPrefix('waterpolo') || (has('water') && has('polo'))) return 'water-polo';
    if (hasPrefix('fieldhockey') || (has('field') && has('hockey'))) return 'field-hockey';
    if (hasPrefix('icehockey', 'nhl', 'khl') || (has('ice') && has('hockey'))) return 'ice-hockey';
    if (hasPrefix('basketball3x3') || ((hasPrefix('basketball') || has('basketball')) && has('3x3'))) return 'basketball3x3';

    if (key.startsWith('soccer') || (has('football') && !has('american')) || hasPrefix('soccer', 'fifa', 'uefa')) return 'football';
    if (hasPrefix('basketball', 'nba', 'wnba', 'euroleague')) return 'basketball';
    if (hasPrefix('tennis', 'atp', 'wta', 'wimbledon', 'roland', 'usopen')) return 'tennis';
    if (hasPrefix('volleyball', 'volley')) return 'volleyball';
    if (hasPrefix('baseball', 'mlb')) return 'baseball';
    if (hasPrefix('handball')) return 'handball';
    if (hasPrefix('boxing')) return 'boxing';
    if (hasPrefix('mma', 'ufc')) return 'mma';
    if (hasPrefix('cricket', 'ipl')) return 'cricket';
    if (hasPrefix('rugby')) return 'rugby';
    if (hasPrefix('golf', 'pga')) return 'golf';
    if (hasPrefix('darts')) return 'darts';
    if (hasPrefix('motorsport', 'motogp', 'formula', 'f1', 'nascar', 'rally')) return 'motorsport';
    if (hasPrefix('cycling', 'uci', 'tour')) return 'cycling';
    if (hasPrefix('swimming')) return 'swimming';
    if (hasPrefix('athletics', 'track')) return 'athletics';
    if (hasPrefix('badminton')) return 'badminton';
    if (hasPrefix('judo')) return 'judo';
    if (hasPrefix('karate')) return 'karate';
    if (hasPrefix('taekwondo')) return 'taekwondo';
    if (hasPrefix('wrestling')) return 'wrestling';
    if (hasPrefix('weightlifting')) return 'weightlifting';
    if (hasPrefix('rowing')) return 'rowing';
    if (hasPrefix('sailing')) return 'sailing';
    if (hasPrefix('surfing')) return 'surfing';
    if (hasPrefix('skiing')) return 'skiing';
    if (hasPrefix('snowboarding')) return 'snowboarding';
    if (hasPrefix('skateboarding')) return 'skateboarding';
    if (hasPrefix('softball')) return 'softball';
    if (hasPrefix('bowling')) return 'bowling';
    if (hasPrefix('fencing')) return 'fencing';
    if (hasPrefix('equestrian', 'horse')) return 'equestrian';
    if (hasPrefix('triathlon')) return 'triathlon';
    return '';
  };
  const fixtureMatchesSportSlug = (fixture, slug) => {
    return inferFixtureSportSlug(fixture) === String(slug || '');
  };
  const FINAL_STATUS_TOKENS = [
    'final',
    'finished',
    'ended',
    'end',
    'full time',
    'full-time',
    'ft',
    'after penalties',
    'aet',
    'abandoned',
    'cancelled',
    'canceled',
    'postponed',
    'complete',
    'completed',
  ];
  const LIVE_STATUS_TOKENS = [
    'live',
    'in progress',
    'in_progress',
    'inplay',
    'in_play',
    'running',
    'ongoing',
    '1h',
    '2h',
    'ht',
    'halftime',
    'first half',
    'second half',
    'extra time',
  ];
  const fixtureStatusText = (fixture) => String(
    fixture?.status
    || fixture?.live_status
    || fixture?.state
    || fixture?.match_status
    || fixture?.phase
    || ''
  ).toLowerCase();
  const statusContainsAny = (text, tokens) => tokens.some((token) => text.includes(token));
  const fixtureIsFinished = (fixture) => {
    if (fixture?.finished === true || fixture?.completed === true) return true;
    const status = fixtureStatusText(fixture);
    return Boolean(status) && statusContainsAny(status, FINAL_STATUS_TOKENS);
  };
  const fixtureIsLive = (fixture) => {
    if (fixtureIsFinished(fixture)) return false;
    const explicitLive = fixture?.is_live ?? fixture?.live ?? fixture?.inplay ?? fixture?.in_play;
    if (explicitLive === true || explicitLive === 1 || explicitLive === '1') return true;
    const status = fixtureStatusText(fixture);
    if (status && statusContainsAny(status, LIVE_STATUS_TOKENS)) return true;
    return false;
  };
  const oddNumber = (value, fallback = 1.7) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 1) return fallback;
    return parsed;
  };
  const isRealOddValue = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 1;
  };
  const realMarket = (label, value, key = '') => {
    if (!isRealOddValue(value)) return null;
    return { label: sanitizeMarketLabel(translateSportTerm(label, label), label), odd: formatOdd(Number(value)), key };
  };
  const fixtureHasRealOdds = (fixture) => (
    isRealOddValue(fixture?.odds_home)
    || isRealOddValue(fixture?.odds_draw)
    || isRealOddValue(fixture?.odds_away)
  );
  const fixtureLastOddsUpdateTs = (fixture) => {
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
    for (const item of candidates) {
      const ts = parseFixtureTimestamp(item);
      if (Number.isFinite(ts)) return ts;
    }
    return null;
  };
  const fixtureHasFreshOddsSignal = (fixture, now = Date.now()) => {
    if (!fixtureHasRealOdds(fixture)) return false;
    const kickoffTs = fixtureKickoffTs(fixture);
    const hasStarted = Number.isFinite(kickoffTs) && kickoffTs <= now;
    if (!hasStarted) return true;
    const ts = fixtureLastOddsUpdateTs(fixture);
    if (!Number.isFinite(ts)) return false;
    return (now - ts) <= SPORT_ODDS_SILENCE_HIDE_MS;
  };
  const normalizeFixtureIdentityText = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const fixtureIdentityKey = (fixture, index = 0) => {
    const sourceHome = normalizeFixtureIdentityText(fixtureSourceTeamName(fixture, 'home') || fixture?.home_team);
    const sourceAway = normalizeFixtureIdentityText(fixtureSourceTeamName(fixture, 'away') || fixture?.away_team);
    const sport = normalizeFixtureIdentityText(fixture?.sport_key || fixture?.sport_title || fixture?.league_name);
    const league = normalizeFixtureIdentityText(fixture?.league_name || fixture?.league);
    const pair = [sourceHome || 'home', sourceAway || 'away'].sort().join('|');
    const kickoffTs = fixtureKickoffTs(fixture);
    const kickoffBucket = Number.isFinite(kickoffTs) ? Math.floor(kickoffTs / 60000) : '';
    return `${sport || 'sport'}|${league || 'league'}|${pair}|${kickoffBucket || index}`;
  };
  const fixtureShouldHideFromBoard = (fixture, now = Date.now()) => {
    if (fixtureIsFinished(fixture)) return true;
    if (!fixtureHasFreshOddsSignal(fixture, now)) return true;
    const kickoffTs = fixtureKickoffTs(fixture);
    if (!Number.isFinite(kickoffTs) || kickoffTs <= 0) return false;
    if (kickoffTs <= now && fixtureHasFreshOddsSignal(fixture, now)) return false;
    if (fixtureIsLive(fixture)) return false;
    return (now - kickoffTs) > SPORT_FIXTURE_STALE_AFTER_KICKOFF_MS;
  };
  const fixtureRowQualityScore = (fixture) => {
    let score = 0;
    if (fixtureIsLive(fixture)) score += 8;
    if (fixtureHasRealOdds(fixture)) score += 4;
    if (Number.isFinite(fixtureKickoffTs(fixture))) score += 2;
    if (String(fixture?.status || '').trim()) score += 1;
    return score;
  };
  const sanitizeFixtureRowsForBoard = (rows) => {
    const source = Array.isArray(rows) ? rows : [];
    const now = Date.now();
    const deduped = new Map();
    source.forEach((row, index) => {
      const fixture = normalizeFixture(row);
      if (!fixture || typeof fixture !== 'object') return;
      if (isDemoFixtureLike(fixture)) return;
      if (!fixture.home_team || !fixture.away_team) return;
      if (fixtureShouldHideFromBoard(fixture, now)) return;
      const key = fixtureIdentityKey(fixture, index);
      const previous = deduped.get(key);
      if (!previous) {
        deduped.set(key, fixture);
        return;
      }
      if (fixtureRowQualityScore(fixture) >= fixtureRowQualityScore(previous)) deduped.set(key, fixture);
    });
    return Array.from(deduped.values()).sort((a, b) => {
      const aTs = fixtureKickoffTs(a) || Number.MAX_SAFE_INTEGER;
      const bTs = fixtureKickoffTs(b) || Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    });
  };
  const modeMarketsForFixture = (fixture, modeKey) => {
    return [
      realMarket('1', fixture?.odds_home, 'home'),
      realMarket('X', fixture?.odds_draw, 'draw'),
      realMarket('2', fixture?.odds_away, 'away'),
    ].filter(Boolean);
  };
  const fixtureTimeLabel = (value) => {
    if (!value) return betBoardText.upcoming;
    const ts = parseFixtureTimestamp(value);
    const date = new Date(ts == null ? value : ts);
    if (Number.isNaN(date.getTime())) return betBoardText.upcoming;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  const fixtureDateLabel = (value) => {
    if (!value) return '';
    const ts = parseFixtureTimestamp(value);
    const date = new Date(ts == null ? value : ts);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };
  const teamAliases = {
    'united-states': 'usa',
    usa: 'usa',
    us: 'usa',
    'u-s-a': 'usa',
    'u-s': 'usa',
    'united-states-of-america': 'usa',
    'ivory-coast': 'ivory-coast',
    'cote-divoire': 'ivory-coast',
    'dr-congo': 'dr-congo',
    'drc': 'dr-congo',
    'democratic-republic-of-congo': 'dr-congo',
    'cape-verde-islands': 'cape-verde',
    'bosnia-and-herzegovina': 'bosnia-herzegovina',
    bosnia: 'bosnia-herzegovina',
    'south-korea': 'korea',
    'korea-republic': 'korea',
    'czech-republic': 'czechia',
    czechia: 'czechia',
    'saudi-arabia': 'saudi-arabia',
    uae: 'united-arab-emirates',
  };
  const teamBadgeSlugs = new Set([
    'algeria', 'argentina', 'australia', 'austria', 'belgium', 'bosnia-herzegovina', 'brazil',
    'canada', 'cape-verde', 'colombia', 'croatia', 'dr-congo', 'ecuador', 'egypt', 'england',
    'france', 'germany', 'ghana', 'ivory-coast', 'japan', 'jordan', 'mexico', 'morocco',
    'netherlands', 'norway', 'paraguay', 'portugal', 'senegal', 'south-africa', 'spain',
    'sweden', 'switzerland', 'usa', 'uzbekistan'
  ]);
  const placeholderBadge = '/assets/images/fifa-world-cup-2026/team-badges/placeholder-team.svg';
  const SPORTS_DB_API_BASES = [
    'https://www.thesportsdb.com/api/v1/json/123',
    'https://www.thesportsdb.com/api/v1/json/3',
  ];
  const SPORTS_DB_CACHE_KEY = 'royalbet_sportsdb_team_badges_v2';
  const SPORTS_DB_EVENT_CACHE_KEY = 'royalbet_sportsdb_event_images_v2';
  const SPORTS_DB_BACKOFF_UNTIL_KEY = 'royalbet_sportsdb_backoff_until_v1';
  const SPORTS_DB_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
  const SPORTS_DB_MAX_LOOKUPS_PER_LOAD = 24;
  const SPORTS_DB_MAX_EVENT_LOOKUPS_PER_LOAD = 24;
  const SPORTS_DB_MAX_REQUESTS_PER_MINUTE = 20;
  const SPORTS_DB_RATE_WINDOW_MS = 60 * 1000;
  const SPORTS_DB_BACKOFF_MS = 10 * 60 * 1000;
  const SPORTS_DB_CLIENT_FETCH_ENABLED = String(window.ROYALBET_ENABLE_SPORTSDB_CLIENT || '').trim().toLowerCase() === 'true';
  const REMOTE_IMAGE_WEBP_WIDTH = 960;
  const REMOTE_IMAGE_WEBP_QUALITY = 72;
  const MATCH_IMAGE_PLACEHOLDER = '/assets/images/sport2.jpeg';
  const sportsDbTeamBadgeCache = new Map();
  const sportsDbTeamHeroCache = new Map();
  const sportsDbTeamBadgeInflight = new Map();
  const sportsDbEventImageCache = new Map();
  const sportsDbEventInflight = new Map();
  const sportsDbRequestTimestamps = [];
  const LOCAL_TEAM_LOGO_INDEX_URL = '/assets/images/sportteamlogos/index.json?v=20260709a';
  let localTeamLogoIndex = null;
  let localTeamLogoIndexPromise = null;
  let sportsDbRateLimitChain = Promise.resolve();
  let sportsDbCacheLoaded = false;
  let sportsDbEventCacheLoaded = false;
  const slugifyTeam = (input) => String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const normalizedTeamSlug = (name) => {
    const slug = slugifyTeam(name);
    return teamAliases[slug] || slug;
  };
  const normalizeLogoLookupKey = (name) => String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const loadLocalTeamLogoIndex = async () => {
    if (localTeamLogoIndex) return localTeamLogoIndex;
    if (localTeamLogoIndexPromise) return localTeamLogoIndexPromise;
    localTeamLogoIndexPromise = fetch(LOCAL_TEAM_LOGO_INDEX_URL, { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        localTeamLogoIndex = payload && typeof payload === 'object' ? payload : { teams: {}, aliases: {} };
        return localTeamLogoIndex;
      })
      .catch(() => ({ teams: {}, aliases: {} }))
      .finally(() => { localTeamLogoIndexPromise = null; });
    return localTeamLogoIndexPromise;
  };
  const localTeamLogoFromIndex = (teamName) => {
    const index = localTeamLogoIndex;
    if (!index) return '';
    const key = normalizeLogoLookupKey(teamName);
    if (!key) return '';
    const teamKey = index.aliases?.[key] || key;
    const entry = index.teams?.[teamKey];
    return String(entry?.url || '').trim();
  };
  const normalizeSportsDbQuery = (input) => String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .,'&()_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const isSportsDbQueryEligible = (input) => {
    const query = normalizeSportsDbQuery(input);
    if (query.length < 3) return false;
    return /[A-Za-z0-9]/.test(query);
  };
  const fixtureSourceValue = (fixture, key) => {
    const original = String(fixture?.[`${key}_original`] || '').trim();
    if (original) return original;
    return String(fixture?.[key] || '').trim();
  };
  const fixtureSourceTeamName = (fixture, side) => fixtureSourceValue(fixture, side === 'home' ? 'home_team' : 'away_team');
  const sleepMs = (ms) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  const readSportsDbBackoffUntil = () => {
    try {
      const raw = localStorage.getItem(SPORTS_DB_BACKOFF_UNTIL_KEY);
      const value = Number(raw || 0);
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  };
  const writeSportsDbBackoffUntil = (untilTs) => {
    try {
      localStorage.setItem(SPORTS_DB_BACKOFF_UNTIL_KEY, String(Math.max(0, Number(untilTs) || 0)));
    } catch {}
  };
  const isSportsDbCoolingDown = () => {
    const untilTs = readSportsDbBackoffUntil();
    if (!Number.isFinite(untilTs) || untilTs <= 0) return false;
    if (Date.now() < untilTs) return true;
    writeSportsDbBackoffUntil(0);
    return false;
  };
  const scheduleSportsDbRequest = () => {
    sportsDbRateLimitChain = sportsDbRateLimitChain.then(async () => {
      while (true) {
        const now = Date.now();
        while (sportsDbRequestTimestamps.length && (now - sportsDbRequestTimestamps[0]) >= SPORTS_DB_RATE_WINDOW_MS) {
          sportsDbRequestTimestamps.shift();
        }
        if (sportsDbRequestTimestamps.length < SPORTS_DB_MAX_REQUESTS_PER_MINUTE) {
          sportsDbRequestTimestamps.push(now);
          return;
        }
        const waitMs = SPORTS_DB_RATE_WINDOW_MS - (now - sportsDbRequestTimestamps[0]) + 10;
        await sleepMs(waitMs);
      }
    });
    return sportsDbRateLimitChain;
  };
  const fetchSportsDbJson = async (endpoint, timeoutMs = 3500) => {
    if (!SPORTS_DB_CLIENT_FETCH_ENABLED) return { ok: false, error: 'sportsdb-client-disabled' };
    if (isSportsDbCoolingDown()) return { ok: false, error: 'sportsdb-backoff' };
    await scheduleSportsDbRequest();
    if (isSportsDbCoolingDown()) return { ok: false, error: 'sportsdb-backoff' };
    const result = await fetchJsonWithTimeout(endpoint, timeoutMs);
    if (!result?.ok && String(result?.error || '').toUpperCase().includes('HTTP 429')) {
      writeSportsDbBackoffUntil(Date.now() + SPORTS_DB_BACKOFF_MS);
      return { ok: false, error: 'sportsdb-backoff' };
    }
    return result;
  };
  const optimizeRemoteImageUrl = (rawUrl, width = REMOTE_IMAGE_WEBP_WIDTH) => {
    const source = String(rawUrl || '').trim();
    if (!source) return '';
    if (!/^https?:\/\//i.test(source)) return source;
    if (/images\.weserv\.nl/i.test(source)) return source;
    if (/\.webp(?:$|[?#])/i.test(source)) return source;
    try {
      const parsed = new URL(source);
      const remote = parsed.href.replace(/^https?:\/\//i, '');
      const params = new URLSearchParams();
      params.set('url', remote);
      params.set('output', 'webp');
      params.set('q', String(REMOTE_IMAGE_WEBP_QUALITY));
      if (Number.isFinite(Number(width)) && Number(width) > 0) {
        params.set('w', String(Math.round(Number(width))));
      }
      return `https://images.weserv.nl/?${params.toString()}`;
    } catch {
      return source;
    }
  };
  const readSportsDbCache = () => {
    if (sportsDbCacheLoaded) return;
    sportsDbCacheLoaded = true;
    try {
      const raw = localStorage.getItem(SPORTS_DB_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const now = Date.now();
      Object.entries(parsed).forEach(([key, row]) => {
        const badge = typeof row === 'string'
          ? String(row || '').trim()
          : String(row?.badge || row?.url || '').trim();
        const hero = String(row?.hero || '').trim();
        const ts = Number(row?.ts || 0);
        if (!badge && !hero) return;
        if (!Number.isFinite(ts) || (now - ts) > SPORTS_DB_CACHE_TTL_MS) return;
        const safeKey = String(key || '');
        if (badge) sportsDbTeamBadgeCache.set(safeKey, badge);
        if (hero) sportsDbTeamHeroCache.set(safeKey, hero);
      });
    } catch {}
  };
  const writeSportsDbCache = () => {
    try {
      const now = Date.now();
      const next = {};
      const keys = new Set([
        ...sportsDbTeamBadgeCache.keys(),
        ...sportsDbTeamHeroCache.keys(),
      ]);
      keys.forEach((key) => {
        const badge = String(sportsDbTeamBadgeCache.get(key) || '').trim();
        const hero = String(sportsDbTeamHeroCache.get(key) || '').trim();
        if (!key || (!badge && !hero)) return;
        next[key] = { badge, hero, ts: now };
      });
      localStorage.setItem(SPORTS_DB_CACHE_KEY, JSON.stringify(next));
    } catch {}
  };
  const readSportsDbEventCache = () => {
    if (sportsDbEventCacheLoaded) return;
    sportsDbEventCacheLoaded = true;
    try {
      const raw = localStorage.getItem(SPORTS_DB_EVENT_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const now = Date.now();
      Object.entries(parsed).forEach(([key, row]) => {
        const image = typeof row === 'string'
          ? String(row || '').trim()
          : String(row?.image || row?.url || '').trim();
        const ts = Number(row?.ts || 0);
        if (!image) return;
        if (!Number.isFinite(ts) || (now - ts) > SPORTS_DB_CACHE_TTL_MS) return;
        const safeKey = String(key || '');
        if (!safeKey) return;
        sportsDbEventImageCache.set(safeKey, image);
      });
    } catch {}
  };
  const writeSportsDbEventCache = () => {
    try {
      const now = Date.now();
      const next = {};
      sportsDbEventImageCache.forEach((image, key) => {
        const safeKey = String(key || '').trim();
        const safeImage = String(image || '').trim();
        if (!safeKey || !safeImage) return;
        next[safeKey] = { image: safeImage, ts: now };
      });
      localStorage.setItem(SPORTS_DB_EVENT_CACHE_KEY, JSON.stringify(next));
    } catch {}
  };
  const sportsDbTeamCacheKey = (name) => normalizedTeamSlug(name);
  const sportsDbEventCacheKey = (fixture) => {
    const home = sportsDbTeamCacheKey(fixtureSourceTeamName(fixture, 'home'));
    const away = sportsDbTeamCacheKey(fixtureSourceTeamName(fixture, 'away'));
    if (!home || !away) return '';
    const kickoffTs = fixtureKickoffTs(fixture);
    const day = Number.isFinite(kickoffTs) ? new Date(kickoffTs).toISOString().slice(0, 10) : 'na';
    return `${home}__${away}__${day}`;
  };
  const sportsDbBadgeFromCache = (teamName) => {
    readSportsDbCache();
    const key = sportsDbTeamCacheKey(teamName);
    if (!key) return '';
    return String(sportsDbTeamBadgeCache.get(key) || '');
  };
  const sportsDbHeroFromCache = (teamName) => {
    readSportsDbCache();
    const key = sportsDbTeamCacheKey(teamName);
    if (!key) return '';
    return String(sportsDbTeamHeroCache.get(key) || '');
  };
  const sportsDbEventImageFromCache = (fixture) => {
    readSportsDbEventCache();
    const key = sportsDbEventCacheKey(fixture);
    if (!key) return '';
    return String(sportsDbEventImageCache.get(key) || '');
  };
  const pickSportsDbBadge = (teams, teamName) => {
    const list = Array.isArray(teams) ? teams : [];
    if (!list.length) return '';
    const wanted = sportsDbTeamCacheKey(teamName);
    const withBadge = list.filter((row) => {
      const badge = String(row?.strBadge || row?.strTeamBadge || row?.strLogo || '').trim();
      return Boolean(badge);
    });
    if (!withBadge.length) return '';
    const exact = withBadge.find((row) => sportsDbTeamCacheKey(row?.strTeam || row?.strAlternate || '') === wanted);
    return String((exact || withBadge[0])?.strBadge || (exact || withBadge[0])?.strTeamBadge || (exact || withBadge[0])?.strLogo || '').trim();
  };
  const pickSportsDbHero = (teams, teamName) => {
    const list = Array.isArray(teams) ? teams : [];
    if (!list.length) return '';
    const wanted = sportsDbTeamCacheKey(teamName);
    const exact = list.find((row) => sportsDbTeamCacheKey(row?.strTeam || row?.strAlternate || '') === wanted) || list[0];
    const hero = [
      exact?.strFanart1,
      exact?.strFanart2,
      exact?.strFanart3,
      exact?.strTeamFanart1,
      exact?.strTeamFanart2,
      exact?.strTeamFanart3,
      exact?.strTeamFanart4,
      exact?.strStadiumThumb,
      exact?.strTeamBanner,
      exact?.strBanner,
      exact?.strTeamThumb,
    ].find((item) => typeof item === 'string' && item.trim());
    return String(hero || '').trim();
  };
  const normalizeSportsDbEventTitle = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+vs\.?\s+/g, ' vs ')
    .replace(/[^a-z0-9\u0590-\u05FF\u0600-\u06FF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const pickSportsDbEventImage = (events, fixture) => {
    const list = Array.isArray(events) ? events : [];
    if (!list.length) return '';
    const home = normalizeSportsDbEventTitle(fixtureSourceTeamName(fixture, 'home'));
    const away = normalizeSportsDbEventTitle(fixtureSourceTeamName(fixture, 'away'));
    const fixtureDay = (() => {
      const kickoffTs = fixtureKickoffTs(fixture);
      if (!Number.isFinite(kickoffTs)) return '';
      return new Date(kickoffTs).toISOString().slice(0, 10);
    })();
    const candidates = list.filter((row) => {
      const title = normalizeSportsDbEventTitle(
        row?.strEvent
        || row?.strFilename
        || `${row?.strHomeTeam || ''} vs ${row?.strAwayTeam || ''}`
      );
      if (!title) return false;
      const teamsMatch = home && away
        ? (title.includes(home) && title.includes(away))
        : true;
      if (!teamsMatch) return false;
      if (!fixtureDay) return true;
      const rowDay = String(row?.dateEvent || row?.strDate || '').trim();
      return !rowDay || rowDay === fixtureDay;
    });
    const pool = candidates.length ? candidates : list;
    const winner = pool.find((row) => [
      row?.strThumb,
      row?.strBanner,
      row?.strPoster,
      row?.strFanart,
      row?.strSquare,
    ].some((item) => typeof item === 'string' && item.trim()));
    if (!winner) return '';
    return String(
      winner.strThumb
      || winner.strBanner
      || winner.strPoster
      || winner.strFanart
      || winner.strSquare
      || ''
    ).trim();
  };
  const fetchSportsDbTeamMedia = async (teamName) => {
    if (!SPORTS_DB_CLIENT_FETCH_ENABLED) return '';
    if (isSportsDbCoolingDown()) return '';
    const safeTeamQuery = normalizeSportsDbQuery(teamName);
    if (!isSportsDbQueryEligible(safeTeamQuery)) return '';
    const key = sportsDbTeamCacheKey(teamName);
    if (!key) return '';
    const cached = sportsDbBadgeFromCache(teamName);
    const cachedHero = sportsDbHeroFromCache(teamName);
    if (cached || cachedHero) return cached || cachedHero;
    if (sportsDbTeamBadgeInflight.has(key)) return sportsDbTeamBadgeInflight.get(key);
    const pending = (async () => {
      for (let i = 0; i < SPORTS_DB_API_BASES.length; i += 1) {
        if (isSportsDbCoolingDown()) break;
        const endpoint = `${SPORTS_DB_API_BASES[i]}/searchteams.php?t=${encodeURIComponent(safeTeamQuery)}`;
        const result = await fetchSportsDbJson(endpoint, 3500);
        if (!result.ok && String(result.error || '') === 'sportsdb-backoff') break;
        if (!result.ok) continue;
        const badge = pickSportsDbBadge(result.payload?.teams, teamName);
        const hero = pickSportsDbHero(result.payload?.teams, teamName);
        if (!badge && !hero) continue;
        if (badge) sportsDbTeamBadgeCache.set(key, optimizeRemoteImageUrl(badge, 140));
        if (hero) sportsDbTeamHeroCache.set(key, optimizeRemoteImageUrl(hero, REMOTE_IMAGE_WEBP_WIDTH));
        writeSportsDbCache();
        return badge || hero;
      }
      return '';
    })().finally(() => {
      sportsDbTeamBadgeInflight.delete(key);
    });
    sportsDbTeamBadgeInflight.set(key, pending);
    return pending;
  };
  const fetchSportsDbEventImage = async (fixture) => {
    if (!SPORTS_DB_CLIENT_FETCH_ENABLED) return '';
    if (isSportsDbCoolingDown()) return '';
    const key = sportsDbEventCacheKey(fixture);
    if (!key) return '';
    const cached = sportsDbEventImageFromCache(fixture);
    if (cached) return cached;
    if (sportsDbEventInflight.has(key)) return sportsDbEventInflight.get(key);
    const pending = (async () => {
      const home = fixtureSourceTeamName(fixture, 'home');
      const away = fixtureSourceTeamName(fixture, 'away');
      if (!home || !away) return '';
      const queries = [
        String(fixtureSourceValue(fixture, 'event_name') || '').trim(),
        String(fixture?.event_name || '').trim(),
        `${home} vs ${away}`,
        `${away} vs ${home}`,
        `${home} - ${away}`,
        `${away} - ${home}`,
        `${home}_${away}`,
      ]
        .map((query) => normalizeSportsDbQuery(query))
        .filter((query) => isSportsDbQueryEligible(query));
      const dedupedQueries = Array.from(new Set(queries));
      for (let i = 0; i < dedupedQueries.length; i += 1) {
        for (let b = 0; b < SPORTS_DB_API_BASES.length; b += 1) {
          if (isSportsDbCoolingDown()) break;
          const endpoint = `${SPORTS_DB_API_BASES[b]}/searchevents.php?e=${encodeURIComponent(dedupedQueries[i])}`;
          const result = await fetchSportsDbJson(endpoint, 3500);
          if (!result.ok && String(result.error || '') === 'sportsdb-backoff') break;
          if (!result.ok) continue;
          const image = pickSportsDbEventImage(result.payload?.event, fixture);
          if (!image) continue;
          sportsDbEventImageCache.set(key, optimizeRemoteImageUrl(image, REMOTE_IMAGE_WEBP_WIDTH));
          writeSportsDbEventCache();
          return image;
        }
      }
      return '';
    })().finally(() => {
      sportsDbEventInflight.delete(key);
    });
    sportsDbEventInflight.set(key, pending);
    return pending;
  };
  const fixtureTeamLogo = (fixture, side) => {
    const keys = side === 'home'
      ? ['home_team_logo', 'home_logo', 'home_badge', 'home_badge_url', 'home_logo_url', 'home_team_image']
      : ['away_team_logo', 'away_logo', 'away_badge', 'away_badge_url', 'away_logo_url', 'away_team_image'];
    const value = keys.map((key) => fixture?.[key]).find((item) => typeof item === 'string' && item.trim());
    if (value) {
      const safeValue = String(value || '').trim();
      if (/^https?:\/\//i.test(safeValue) || safeValue.startsWith('/')) return safeValue;
      if (safeValue.startsWith('assets/')) return `/${safeValue}`;
    }

    const teamName = fixtureSourceTeamName(fixture, side);
    const localLogo = localTeamLogoFromIndex(teamName);
    if (localLogo) return localLogo;
    const sportsDbBadge = sportsDbBadgeFromCache(teamName);
    if (sportsDbBadge) return sportsDbBadge;
    const slug = normalizedTeamSlug(teamName);
    if (!slug) return placeholderBadge;
    if (teamBadgeSlugs.has(slug)) return `/assets/images/fifa-world-cup-2026/team-badges/${slug}.png`;
    return placeholderBadge;
  };
  const fixtureMatchImage = (fixture) => {
    const keys = [
      'match_image',
      'event_image',
      'event_thumb',
      'thumb',
      'strThumb',
      'strBanner',
    ];
    const direct = keys.map((key) => fixture?.[key]).find((item) => typeof item === 'string' && item.trim());
    if (direct) return direct;
    const eventImage = sportsDbEventImageFromCache(fixture);
    if (eventImage) return eventImage;
    const homeHero = sportsDbHeroFromCache(fixtureSourceTeamName(fixture, 'home'));
    if (homeHero) return homeHero;
    const awayHero = sportsDbHeroFromCache(fixtureSourceTeamName(fixture, 'away'));
    if (awayHero) return awayHero;
    return MATCH_IMAGE_PLACEHOLDER;
  };
  const teamInitials = (name) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length) return 'TM';
    return parts.map((part) => part.charAt(0)).join('').toUpperCase();
  };
  const mapFixtureToSportEvent = (fixture, index, sport, modeKey) => {
    const isLive = fixtureIsLive(fixture);
    const isFinished = fixtureIsFinished(fixture);
    const markets = modeMarketsForFixture(fixture, modeKey);
    const sourceHome = fixtureSourceTeamName(fixture, 'home') || fixture.home_team;
    const sourceAway = fixtureSourceTeamName(fixture, 'away') || fixture.away_team;
    const translatedHome = translateSportTerm(sourceHome, sourceHome) || translateSportTerm('home', 'Home');
    const translatedAway = translateSportTerm(sourceAway, sourceAway) || translateSportTerm('away', 'Away');
    const kickoffTs = fixtureKickoffTs(fixture);
    const matchImage = fixtureMatchImage(fixture);
    const homeLogoRaw = fixtureTeamLogo(fixture, 'home');
    const awayLogoRaw = fixtureTeamLogo(fixture, 'away');
    return {
      id: fixture.fixture_id || `${sport?.slug || 'sport'}-fixture-${index}`,
      fixtureId: fixture.fixture_id || fixture.id || `${sport?.slug || 'sport'}-fixture-${index}`,
      oddsState: String(fixture?.odds_state || fixture?.oddsState || '').trim().toLowerCase(),
      oddsUpdatedAt: fixture?.odds_updated_at || fixture?.oddsUpdatedAt || '',
      league: translateSportTerm(
        fixtureSourceValue(fixture, 'league_name') || fixtureSourceValue(fixture, 'league') || fixture.sport_title,
        fixtureSourceValue(fixture, 'league_name') || fixtureSourceValue(fixture, 'league') || fixture.sport_title
      )
        || translatedSportLabel(sport),
      time: isLive ? betBoardText.live : fixtureTimeLabel(kickoffTs),
      kickoffLabel: fixtureDateLabel(kickoffTs),
      kickoffAt: kickoffTs,
      home: translatedHome,
      homeLogoRaw,
      homeLogo: optimizeRemoteImageUrl(homeLogoRaw, 140),
      homeInitials: teamInitials(translatedHome),
      away: translatedAway,
      awayLogoRaw,
      awayLogo: optimizeRemoteImageUrl(awayLogoRaw, 140),
      awayInitials: teamInitials(translatedAway),
      matchImage,
      matchImageOptimized: optimizeRemoteImageUrl(matchImage, REMOTE_IMAGE_WEBP_WIDTH),
      isLive,
      isFinished,
      round: isLive ? translateSportTerm('live', '\u05d7\u05d9') : translateSportTerm(fixture.status || betBoardText.upcoming, fixture.status || betBoardText.upcoming),
      markets,
    };
  };
  const loadSportFixtures = async () => {
    const locale = getSiteLanguage();
    const safeLocale = siteLanguages[locale] ? locale : 'he';
    const cached = sportFixturesState.itemsByLocale.get(safeLocale);
    const cachedAt = Number(sportFixturesState.loadedAtByLocale.get(safeLocale) || 0);
    if (cached && cached.length && (Date.now() - cachedAt) < SPORT_FIXTURES_CACHE_TTL_MS) {
      sportFixturesState.activeLocale = safeLocale;
      return cached;
    }
    if (sportFixturesState.loadingByLocale.has(safeLocale)) {
      return sportFixturesState.loadingByLocale.get(safeLocale);
    }
    const pending = (async () => {
      await loadLocalTeamLogoIndex();
      const endpoints = fixtureFetchEndpoints(safeLocale);
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          const result = await fetchJsonWithTimeout(endpoint, 4500);
          if (!result.ok) return { endpoint, ok: false, error: result.error, rows: [] };
          const rows = sanitizeFixtureRowsForBoard(extractFixtureRows(result.payload));
          const uniqueTeams = [];
          const seenTeams = new Set();
          rows.forEach((row) => {
            const home = fixtureSourceTeamName(row, 'home');
            const away = fixtureSourceTeamName(row, 'away');
            if (home) {
              const homeKey = sportsDbTeamCacheKey(home);
              if (homeKey && !seenTeams.has(homeKey) && !sportsDbBadgeFromCache(home)) {
                seenTeams.add(homeKey);
                uniqueTeams.push(home);
              }
            }
            if (away) {
              const awayKey = sportsDbTeamCacheKey(away);
              if (awayKey && !seenTeams.has(awayKey) && !sportsDbBadgeFromCache(away)) {
                seenTeams.add(awayKey);
                uniqueTeams.push(away);
              }
            }
          });
          if (uniqueTeams.length) {
            uniqueTeams
              .slice(0, SPORTS_DB_MAX_LOOKUPS_PER_LOAD)
              .forEach((teamName) => {
                fetchSportsDbTeamMedia(teamName).catch(() => {});
              });
          }
          const fixturesNeedingEventImages = rows
            .filter((row) => !row?.match_image && !sportsDbEventImageFromCache(row))
            .slice(0, SPORTS_DB_MAX_EVENT_LOOKUPS_PER_LOAD);
          if (fixturesNeedingEventImages.length) {
            fixturesNeedingEventImages.forEach((row) => {
              fetchSportsDbEventImage(row).catch(() => {});
            });
          }
          const timedRows = rows.filter((item) => Number.isFinite(fixtureKickoffTs(item))).length;
          return { endpoint, ok: true, error: '', rows, timedRows };
        })
      );

      const winner = results
        .filter((item) => item.ok && item.rows.length)
        .sort((a, b) => {
          const aTimed = Number(a.timedRows || 0);
          const bTimed = Number(b.timedRows || 0);
          if (bTimed !== aTimed) return bTimed - aTimed;
          return b.rows.length - a.rows.length;
        })[0];
      if (winner) {
        const translatedRows = await translateFixtureRowsLive(winner.rows, safeLocale);
        sportFixturesState.itemsByLocale.set(safeLocale, sanitizeFixtureRowsForBoard(translatedRows));
        sportFixturesState.loadedAtByLocale.set(safeLocale, Date.now());
        sportFixturesState.activeLocale = safeLocale;
        sportFixturesState.lastErrorByLocale.set(safeLocale, '');
      } else {
        const errors = results.map((item) => `${item.endpoint} -> ${item.ok ? 'empty' : item.error}`);
        sportFixturesState.itemsByLocale.set(safeLocale, []);
        sportFixturesState.loadedAtByLocale.set(safeLocale, Date.now());
        sportFixturesState.activeLocale = safeLocale;
        sportFixturesState.lastErrorByLocale.set(safeLocale, errors.join(' | '));
        if (errors.length) console.error('[royalbet] fixtures load failed:', sportFixturesState.lastErrorByLocale.get(safeLocale));
      }
      return sportFixturesState.itemsByLocale.get(safeLocale) || [];
    })().finally(() => {
      sportFixturesState.loadingByLocale.delete(safeLocale);
    });
    sportFixturesState.loadingByLocale.set(safeLocale, pending);
    return pending;
  };
  const liveLineEndpoints = () => {
    return buildSportApiEndpoints('/api/public-live-line');
  };
  const extractLiveLineRows = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  const setupDedicatedLiveLinePage = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (!isLiveLinePagePath(path)) return;
    if (homeLiveLineTimer) {
      window.clearInterval(homeLiveLineTimer);
      homeLiveLineTimer = 0;
    }
    if (dedicatedLiveLineTimer) {
      window.clearTimeout(dedicatedLiveLineTimer);
      dedicatedLiveLineTimer = 0;
    }
    document.querySelector('[data-rb-sport-submenu]')?.remove();
    document.querySelector('[data-rb-sport-page-betting]')?.remove();
    const container = document.querySelector('.main-content-wrapper') || document.querySelector('.app-main-content') || document.querySelector('app-main') || document.body;
    let mount = document.querySelector('[data-rb-live-line-page]');
    if (!mount) {
      mount = document.createElement('section');
      mount.className = 'rb-live-line-page';
      mount.dataset.rbLiveLinePage = 'true';
      container.insertBefore(mount, container.firstChild);
    }
    renderLinratzLiveLineShell(mount);
    if (isLiveLineRoute) {
      mount.dataset.rbRuntimeLiveLineData = 'disabled';
      return;
    }
    const refreshDelayMs = () => (document.visibilityState === 'visible' ? 15000 : 45000);
    const scheduleRefresh = (refreshFn) => {
      if (dedicatedLiveLineTimer) window.clearTimeout(dedicatedLiveLineTimer);
      dedicatedLiveLineTimer = window.setTimeout(refreshFn, refreshDelayMs());
    };
    const refresh = async () => {
      if (!document.body.contains(mount)) {
        if (dedicatedLiveLineTimer) window.clearTimeout(dedicatedLiveLineTimer);
        dedicatedLiveLineTimer = 0;
        return;
      }
      if (mount.dataset.rbLiveLineRefreshBusy === '1') {
        scheduleRefresh(refresh);
        return;
      }
      mount.dataset.rbLiveLineRefreshBusy = '1';
      try {
        const rows = await loadLiveLine();
        renderDedicatedLiveLinePage(mount, rows);
      } finally {
        mount.dataset.rbLiveLineRefreshBusy = '0';
        scheduleRefresh(refresh);
      }
    };
    const linratzFrame = mount.querySelector('[data-rb-linratz-frame]');
    if (linratzFrame) {
      linratzFrame.addEventListener('error', () => {
        refresh();
      }, { once: true });
      return;
    }
    refresh();
  };
  const isWorldCupFixture = (fixture) => {
    const text = [
      fixture?.league_name,
      fixture?.league,
      fixture?.sport_title,
      fixture?.sport_key,
      fixture?.fixture_id,
    ].filter(Boolean).join(' ').toLowerCase();
    if (!text) return false;
    return /(world\s*cup|fifa|×ž×•× ×“×™××œ)/i.test(text);
  };
  const homeBettingEvents = (sport, fixtures) => {
    const source = sanitizeFixtureRowsForBoard(Array.isArray(fixtures) ? fixtures : []);
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const isHomePage = path === '/';
    const sportSlug = String(sport?.slug || '').trim().toLowerCase();

    if (isHomePage) {
      if (sportSlug === 'football') {
        const footballSport = sportBySlug.get('football') || sport;
        const worldCupFixtures = source
          .filter((fixture) => isWorldCupFixture(fixture))
          .filter((fixture) => fixtureHasRealOdds(fixture));
        if (worldCupFixtures.length) {
          return worldCupFixtures.map((fixture, index) => mapFixtureToSportEvent(fixture, index, footballSport, 'markets'));
        }
      }

      const events = sportPageEvents(sport, source, 'markets');
      if (events.length) return events;
      if (sportSlug === 'football') {
        const fallbackSport = sportBySlug.get('football') || sport;
        return sportPageEvents(fallbackSport, source, 'markets');
      }
      return [];
    }

    return sportPageEvents(sport, source, 'markets');
  };
  const renderHomeBetSlip = (root, selection) => {
    const slip = root.querySelector('[data-rb-home-bet-slip]');
    if (!slip) return;
    if (!selection) {
      slip.innerHTML = `
        <strong>${betBoardText.quickSlip}</strong>
        <p>${betBoardText.pickOdd}</p>
      `;
      return;
    }
    const stake = normalizeStakeAmount(selection?.stake, readPreferredStake());
    const win = formatOdd(oddNumber(selection?.odd, 0) * stake);
    slip.innerHTML = `
      <strong>${betBoardText.quickSlip}</strong>
      <span>${selection.sport}</span>
      <p>${selection.event}</p>
      <div class="rb-home-bet-slip-row">
        <small>${betBoardText.selection}</small>
        <b>${selection.market} @ ${selection.odd}</b>
      </div>
      <div class="rb-home-bet-slip-row">
        <small>${betBoardText.stake}</small>
        <b>${stake} נק'</b>
      </div>
      <div class="rb-home-bet-slip-row">
        <small>${betBoardText.possibleWin}</small>
        <b>${win} נק'</b>
      </div>
      <button type="button">${betBoardText.addToSlip}</button>
    `;
  };
  const getPlayerBets = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAYER_BETS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const normalizeStakeAmount = (value, fallback = 50) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return Number(fallback) || 50;
    const rounded = Math.round(numeric);
    return Math.max(1, Math.min(1000000, rounded));
  };
  const readPreferredStake = () => normalizeStakeAmount(localStorage.getItem(PLAYER_STAKE_KEY), 50);
  const setPlayerBets = (bets) => {
    localStorage.setItem(PLAYER_BETS_KEY, JSON.stringify(bets.slice(0, 8)));
    document.querySelectorAll('.betslip-count').forEach((count) => {
      count.textContent = ` ${bets.length || 0} `;
    });
    const badge = document.querySelector('[data-rb-player-bets-count]');
    if (badge) badge.textContent = String(bets.length || 0);
  };
  const playerBetFromSelection = (selection) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sport: selection.sport || '',
    event: selection.event || '',
    market: selection.market || '',
    odd: selection.odd || '',
    stake: normalizeStakeAmount(selection.stake, readPreferredStake()),
    possibleWin: selection.possibleWin || formatOdd(oddNumber(selection.odd || 0, 0) * normalizeStakeAmount(selection.stake, readPreferredStake())),
  });
  const updateStoredBetStake = (stake, betId = '') => {
    const bets = getPlayerBets();
    if (!bets.length) return null;
    const index = betId ? bets.findIndex((item) => String(item.id || '') === String(betId || '')) : 0;
    if (index < 0) return null;
    const amount = normalizeStakeAmount(stake, readPreferredStake());
    const bet = bets[index] || {};
    const odd = oddNumber(bet.odd || 0, 0);
    const updated = {
      ...bet,
      stake: amount,
      possibleWin: formatOdd(odd * amount),
    };
    bets[index] = updated;
    localStorage.setItem(PLAYER_STAKE_KEY, String(amount));
    setPlayerBets(bets);
    return updated;
  };
  const playerBetsUrl = (baseUrl) => {
    try {
      const bets = getPlayerBets();
      if (!bets.length) return baseUrl;
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('rbBets', JSON.stringify(bets.slice(0, 8)));
      return url.pathname + url.search + url.hash;
    } catch {
      return baseUrl;
    }
  };
  const playerAccountUrl = () => {
    const authUser = readAuthUser();
    if (hasAuthToken()) {
      const dashboardPath = isAgentUser(authUser) ? AGENT_DASHBOARD_URL : PLAYER_DASHBOARD_URL;
      return playerBetsUrl(new URL(dashboardPath, preferredAppOrigin()).toString());
    }
    const loginUrl = new URL(PLAYER_ACCOUNT_URL, preferredAppOrigin());
    loginUrl.searchParams.set('next', PLAYER_DASHBOARD_URL);
    loginUrl.searchParams.set('appOrigin', preferredAppOrigin());
    return playerBetsUrl(loginUrl.toString());
  };
  const renderPlayerBetsCard = (open = false) => {
    let card = document.querySelector('[data-rb-player-bets-card]');
    if (!card) {
      card = document.createElement('aside');
      card.className = 'rb-player-bets-card';
      card.dataset.rbPlayerBetsCard = 'true';
      card.setAttribute('aria-live', 'polite');
      document.body.appendChild(card);
    }
    const bets = getPlayerBets();
    const latest = bets[0];
    const authUser = readAuthUser();
    const signedIn = hasAuthToken();
    const ctaLabel = signedIn
      ? (isAgentUser(authUser) ? '\u05dc\u05dc\u05d5\u05d7 \u05e1\u05d5\u05db\u05df' : '\u05dc\u05dc\u05d5\u05d7 \u05e9\u05d7\u05e7\u05df')
      : '\u05d4\u05ea\u05d7\u05d1\u05e8 \u05db\u05d3\u05d9 \u05dc\u05d4\u05de\u05e9\u05d9\u05da';
    const latestStake = latest ? normalizeStakeAmount(latest.stake, readPreferredStake()) : readPreferredStake();
    const latestPossibleWin = latest ? formatOdd(oddNumber(latest.odd || 0, 0) * latestStake) : '0.00';
    card.classList.toggle('open', open || card.classList.contains('open'));
    card.innerHTML = `
      <div class="rb-player-bets-head">
        <div>
          <span>${t('myBets', 'My Bets')}</span>
          <strong>\u05db\u05e8\u05d8\u05d9\u05e1 \u05e9\u05d7\u05e7\u05df</strong>
          <small class="rb-player-bets-pill">${bets.length || 0} ${t('picks', 'Picks')}</small>
        </div>
        <button type="button" data-rb-player-bets-close aria-label="Close">&times;</button>
      </div>
      <div class="rb-player-bets-body">
        ${latest ? `
          <article class="rb-player-bet-main">
            <span>${latest.sport}</span>
            <strong>${latest.event}</strong>
            <div class="rb-player-bet-stake-row">
              <label for="rb-player-stake-input">\u05e1\u05db\u05d5\u05dd \u05d4\u05d9\u05de\u05d5\u05e8</label>
              <input
                id="rb-player-stake-input"
                type="number"
                min="1"
                step="1"
                value="${latestStake}"
                inputmode="numeric"
                data-rb-player-bet-stake
                data-rb-player-bet-id="${latest.id || ''}"
              >
            </div>
            <div class="rb-player-bet-grid">
              <small>\u05d1\u05d7\u05d9\u05e8\u05d4</small><b>${latest.market}</b>
              <small>\u05d9\u05d7\u05e1</small><b>${latest.odd}</b>
              <small>\u05d6\u05db\u05d9\u05d9\u05d4 \u05d0\u05e4\u05e9\u05e8\u05d9\u05ea</small><b data-rb-player-bet-win>${latestPossibleWin} נק'</b>
            </div>
          </article>
          ${bets.length > 1 ? `
            <div class="rb-player-bets-list">
              ${bets.slice(1, 4).map((bet) => `
                <article>
                  <span>${bet.sport}</span>
                  <strong>${bet.market} @ ${bet.odd}</strong>
                  <small>${bet.event}</small>
                </article>
              `).join('')}
            </div>
          ` : ''}
        ` : `
          <p>\u05e2\u05d3\u05d9\u05d9\u05df \u05d0\u05d9\u05df \u05d4\u05d9\u05de\u05d5\u05e8\u05d9\u05dd \u05d1\u05db\u05e8\u05d8\u05d9\u05e1.</p>
        `}
      </div>
      <div class="rb-player-bets-actions">
        <button type="button" data-rb-player-bets-clear>\u05e0\u05e7\u05d4</button>
        <a class="rb-player-bets-cta" href="${playerAccountUrl()}" data-rb-player-account-link>${ctaLabel}</a>
      </div>
    `;
    setPlayerBets(bets);
  };
  const openPlayerBetsCard = (selection) => {
    if (selection) {
      const bets = getPlayerBets();
      bets.unshift(playerBetFromSelection(selection));
      setPlayerBets(bets);
    }
    renderPlayerBetsCard(true);
  };
  const onPlayerStakeInput = (input) => {
    if (!input) return;
    const raw = String(input.value || '').trim();
    if (!raw) return;
    const amount = normalizeStakeAmount(raw, readPreferredStake());
    if (String(amount) !== raw) input.value = String(amount);
    const updated = updateStoredBetStake(amount, input.dataset.rbPlayerBetId || '');
    if (!updated) return;
    const card = closest(input, '[data-rb-player-bets-card]');
    const winNode = card?.querySelector('[data-rb-player-bet-win]');
    if (winNode) winNode.textContent = `${formatOdd(Number(updated.possibleWin || 0))} נק'`;
    const accountLink = card?.querySelector('[data-rb-player-account-link]');
    if (accountLink) accountLink.setAttribute('href', playerAccountUrl());
  };
  const handleOddSelection = (odd, root, sourceEvent) => {
    if (!odd) return false;
    const isClick = sourceEvent?.type === 'click';
    const lastPress = Number(odd.dataset.rbOddPressTs || 0);
    if (isClick && lastPress > 0 && (Date.now() - lastPress) < 450) return true;
    odd.dataset.rbOddPressTs = String(Date.now());

    if (root) {
      root.querySelectorAll('[data-rb-sport-page-bet-odd], [data-rb-home-bet-odd]').forEach((item) => item.classList.remove('active', 'rb-odd-selected'));
    }
    odd.classList.add('active', 'rb-odd-selected');
    const selection = {
      sport: odd.dataset.rbBetSport,
      event: odd.dataset.rbBetEvent,
      market: odd.dataset.rbBetMarket,
      odd: odd.dataset.rbBetOdd,
      stake: readPreferredStake(),
    };
    const homeRoot = odd.closest('[data-rb-home-betting-board]');
    const sportRoot = odd.closest('[data-rb-sport-page-betting]');
    if (homeRoot) renderHomeBetSlip(homeRoot, selection);
    if (sportRoot) renderSportPageBetSlip(sportRoot, selection);
    openPlayerBetsCard(selection);
    return true;
  };
  const selectionFromGenericOdd = (odd) => {
    const card = closest(odd, '.rb-match, [data-rb-fixture], article, .sx-event-card, .pre-match-card, .sx-livematch-card');
    const eventText =
      card?.querySelector('.rb-match-title')?.textContent
      || card?.querySelector('.rb-home-betting-teams')?.textContent
      || card?.querySelector('.rb-sport-page-event-meta, .rb-sport-page-event-main')?.textContent
      || '';
    const compactEvent = String(eventText || '').replace(/\s+/g, ' ').trim();
    const marketRaw = odd.dataset.market || odd.dataset.rbBetMarket || odd.textContent || '';
    const market = String(marketRaw).replace(/\s+/g, ' ').trim();
    const oddValue = odd.dataset.odds || odd.dataset.rbBetOdd || '';
    return {
      sport: odd.dataset.rbBetSport || '',
      event: compactEvent || translateSportTerm('match', 'Match'),
      market: market || translateSportTerm('pick', 'Pick'),
      odd: String(oddValue || '').trim() || '1.00',
      stake: readPreferredStake(),
    };
  };
  const handleGenericOddSelection = (odd, sourceEvent) => {
    if (!odd) return false;
    const isClick = sourceEvent?.type === 'click';
    const lastPress = Number(odd.dataset.rbOddPressTs || 0);
    if (isClick && lastPress > 0 && (Date.now() - lastPress) < 450) return true;
    odd.dataset.rbOddPressTs = String(Date.now());
    const selection = selectionFromGenericOdd(odd);
    openPlayerBetsCard(selection);
    return true;
  };
  let homeBettingBoardToken = 0;
  const renderHomeBettingBoard = async (root, sport) => {
    const board = root.querySelector('[data-rb-home-betting-board]');
    if (!board || !sport) return;
    const token = ++homeBettingBoardToken;
    board.innerHTML = `
      <div class="rb-home-betting-head">
        <div>
          <span>${betBoardText.title}</span>
          <strong>${translatedSportLabel(sport)}</strong>
        </div>
        <a href="${sportPageUrl(sport)}">${betBoardText.openSport}</a>
      </div>
      <div class="rb-home-betting-layout">
        <div class="rb-home-betting-events rb-home-betting-carousel">
          <div class="rb-home-betting-track">
            <article class="rb-home-betting-slide rb-sport-page-event">
              <div class="rb-sport-page-event-main">
                <div class="rb-sport-page-event-meta rb-sport-page-event-meta-new">
                  <small>${translatedSportLabel(sport)}</small>
                  <em>${t('upcoming')}</em>
                </div>
              </div>
              <div class="rb-sport-page-market-grid">
                <section class="rb-sport-page-market-block">
                  <div>
                    <button type="button" disabled>
                      <span>${t('oddsReady')}</span>
                      <strong>--</strong>
                    </button>
                  </div>
                </section>
              </div>
            </article>
          </div>
        </div>
        <aside class="rb-home-bet-slip" data-rb-home-bet-slip></aside>
      </div>
    `;
    renderHomeBetSlip(root);
    await loadSportGlossary();
    const fixtures = await loadSportFixtures();
    if (token !== homeBettingBoardToken) return;
    const events = homeBettingEvents(sport, fixtures);
    const sliderEvents = events;
    board.innerHTML = `
      <div class="rb-home-betting-head">
        <div>
          <span>${betBoardText.title}</span>
          <strong>${translatedSportLabel(sport)}</strong>
        </div>
        <a href="${sportPageUrl(sport)}">${betBoardText.openSport}</a>
      </div>
      <div class="rb-home-betting-layout">
        <div class="rb-home-betting-events rb-home-betting-carousel">
          <div class="rb-home-betting-track">
          ${events.length ? sliderEvents.map((event, index) => `
            <article class="rb-home-betting-slide rb-sport-page-event">
              <div class="rb-sport-page-event-main">
                <div class="rb-sport-page-event-meta rb-sport-page-event-meta-new">
                  <small>${event.league}</small>
                  <em>${event.round}</em>
                </div>
                <div class="rb-match-teams">
                  <div class="rb-match-team">
                    ${event.homeLogo ? `<img src="${event.homeLogo}" data-rb-original-src="${event.homeLogoRaw || ''}" alt="${event.home}" loading="lazy" decoding="async" onerror="if(this.dataset.rbImgFallback!=='1'){this.dataset.rbImgFallback='1';const original=this.getAttribute('data-rb-original-src');if(original&&this.src!==original){this.src=original;return;}}this.onerror=null;this.src='${placeholderBadge}';">` : `<span>${event.homeInitials}</span>`}
                    <strong>${event.home}</strong>
                  </div>
                    <div class="rb-match-center">
                    ${event.matchImage ? `<img src="${event.matchImageOptimized || event.matchImage}" data-rb-original-src="${event.matchImage}" alt="${event.home} vs ${event.away}" class="rb-match-center-image" loading="lazy" decoding="async" onerror="if(this.dataset.rbImgFallback!=='1'){this.dataset.rbImgFallback='1';const original=this.getAttribute('data-rb-original-src');if(original&&this.src!==original){this.src=original;return;}}this.onerror=null;this.src='/assets/images/sport2.jpeg';">` : ''}
                    </div>
                  <div class="rb-match-team">
                    ${event.awayLogo ? `<img src="${event.awayLogo}" data-rb-original-src="${event.awayLogoRaw || ''}" alt="${event.away}" loading="lazy" decoding="async" onerror="if(this.dataset.rbImgFallback!=='1'){this.dataset.rbImgFallback='1';const original=this.getAttribute('data-rb-original-src');if(original&&this.src!==original){this.src=original;return;}}this.onerror=null;this.src='${placeholderBadge}';">` : `<span>${event.awayInitials}</span>`}
                    <strong>${event.away}</strong>
                  </div>
                </div>
                <div
                  class="rb-match-kickoff"
                  data-rb-countdown
                  data-rb-kickoff="${event.kickoffAt || ''}"
                  data-rb-live="${event.isLive ? '1' : '0'}"
                  data-rb-finished="${event.isFinished ? '1' : '0'}"
                >
                  <div class="rb-home-kickoff-row">
                    <small dir="ltr" class="rb-home-match-open">${t('open', 'open')}</small>
                    <div class="rb-match-countdown-grid">
                      <article><b data-rb-unit-days>00</b><small>\u05d9\u05de\u05d9\u05dd</small></article>
                      <article><b data-rb-unit-hours>00</b><small>\u05e9\u05e2\u05d5\u05ea</small></article>
                      <article><b data-rb-unit-minutes>00</b><small>\u05d3\u05e7\u05d5\u05ea</small></article>
                      <article><b data-rb-unit-seconds>00</b><small>\u05e9\u05e0\u05d9\u05d5\u05ea</small></article>
                    </div>
                    <em dir="rtl" class="rb-home-match-league">${event.league}</em>
                  </div>
                </div>
              </div>
              <div class="rb-sport-page-market-grid" aria-label="${betBoardText.marketMain}">
                ${sportPageMarketGroups(sport, event, index % Math.max(1, events.length)).map((marketGroup) => `
                  <section class="rb-sport-page-market-block">
                    <div>
                      ${marketGroup.markets.map((market) => `
                        <button
                          type="button"
                          data-rb-home-bet-odd
                          data-rb-bet-sport="${translatedSportLabel(sport)}"
                          data-rb-bet-event="${event.home} - ${event.away}"
                          data-rb-bet-market="${market.label}"
                          data-rb-bet-odd="${market.odd}"
                          data-rb-bet-fixture-id="${event.fixtureId || event.id || ''}"
                          data-rb-bet-market-key="${market.key || ''}"
                          data-rb-bet-odds-updated-at="${event.oddsUpdatedAt || ''}"
                        >
                          <span>${market.label}</span>
                          <strong>${market.odd}</strong>
                        </button>
                      `).join('')}
                    </div>
                  </section>
                `).join('')}
              </div>
            </article>
          `).join('') : `
            <article class="rb-home-betting-slide rb-sport-page-event">
              <div class="rb-sport-page-event-main">
                <div class="rb-sport-page-event-meta rb-sport-page-event-meta-new">
                  <small>${translatedSportLabel(sport)}</small>
                  <em>${t('oddsReady')}</em>
                </div>
              </div>
            </article>
          `}
          </div>
        </div>
        <aside class="rb-home-bet-slip" data-rb-home-bet-slip></aside>
      </div>
    `;
    renderHomeBetSlip(root);
    runSportCountdownTicker(board);
    stopHomeBettingAuto();
    const track = board.querySelector('.rb-home-betting-track');
    if (track && events.length) {
      bindHomeBettingTouchAuto(track, true);
      startHomeBettingAuto(track);
    }
  };
  let homeSliderWaitCount = 0;
  const delayHomeSectionForSlider = (setup) => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/') return false;
    if (!document.documentElement.classList.contains('rb-page-slider-pending')) return false;
    if (document.querySelector('[data-rb-page-slider]')) return false;
    if (homeSliderWaitCount > 20) {
      document.documentElement.classList.remove('rb-page-slider-pending');
      document.documentElement.classList.add('rb-page-slider-ready');
      return false;
    }
    homeSliderWaitCount += 1;
    window.setTimeout(setup, 150);
    return true;
  };
  const setupHomeSportsExplorer = () => {
    if (!ENABLE_SYNTHETIC_CONTENT) return;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/') return;
    if (delayHomeSectionForSlider(setupHomeSportsExplorer)) return;
    const existing = document.querySelector('[data-rb-home-sports]');
    const anchor = document.querySelector('[data-rb-page-slider]') || document.querySelector('.main-slider') || document.querySelector('#mainimageSwiper');
    if (existing) {
      if (anchor && existing.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', existing);
      return;
    }
    const mount = document.createElement('section');
    mount.className = 'rb-home-sports';
    mount.dataset.rbHomeSports = 'true';
    const activeGroup = homeSportGroups[0] || footerMenuGroups[0];
    mount.innerHTML = `
        <div class="rb-home-sports-inner">
          <div class="rb-home-sports-head">
          <strong data-rb-i18n="popularSports">${t('popularSports')}</strong>
          </div>
        <div class="rb-home-sports-groups" data-rb-home-sport-groups>
          ${homeSportGroups.map((group) => `
            <button
              class="rb-home-sport-group ${group.key === activeGroup.key ? 'active' : ''}"
              type="button"
              tabindex="-1"
              data-rb-home-sport-group="${group.key}"
            >
              <span><img src="${sportImage(group.image)}" alt=""></span>
              <strong data-rb-i18n="${group.labelKey}">${t(group.labelKey, group.label)}</strong>
            </button>
          `).join('')}
        </div>
        <div class="rb-home-sub-sports" data-rb-home-sub-sports></div>
        <div class="rb-home-sports-slider" data-rb-home-sports-slider aria-live="polite"></div>
        <div class="rb-home-betting-board" data-rb-home-betting-board></div>
      </div>
    `;

    const appMain = document.querySelector('.app-main-content, app-main, app-root') || document.body;
    if (anchor) {
      anchor.insertAdjacentElement('afterend', mount);
    } else {
      appMain.insertBefore(mount, appMain.firstChild);
    }

    mount.addEventListener('click', (event) => {
      const groupButton = closest(event.target, '[data-rb-home-sport-group]');
      if (groupButton) {
        event.preventDefault();
        mount.querySelectorAll('[data-rb-home-sport-group]').forEach((button) => button.classList.remove('active'));
        groupButton.classList.add('active');
        renderHomeSubSports(mount, groupButton.dataset.rbHomeSportGroup);
        return;
      }

      const subSport = closest(event.target, '[data-rb-home-sub-sport]');
      if (subSport) {
        event.preventDefault();
        mount.querySelectorAll('[data-rb-home-sub-sport]').forEach((item) => item.classList.remove('active'));
        subSport.classList.add('active');
        const sport = sportBySlug.get(subSport.dataset.rbHomeSubSport);
        if (sport) {
          localStorage.setItem(SPORT_SELECTION_KEY, JSON.stringify(sport));
          renderHomeSportsSlider(mount, sport);
          renderHomeBettingBoard(mount, sport);
        }
        return;
      }

      const odd = closest(event.target, '[data-rb-home-bet-odd]');
      if (odd) {
        event.preventDefault();
        event.stopPropagation();
        handleOddSelection(odd, mount, event);
        return;
      }
    });

    renderHomeSubSports(mount, activeGroup.key);
    applyFrontendLanguage();
  };
  const sportPageGroupForSport = (sport) => homeSportGroups.find((group) => (group.sports || []).includes(sport?.slug)) || homeSportGroups[0];
  const sportPageModeOptions = (sport) => sportSubmenus[sport?.slug] || sportSubmenuFallback;
  const sportGroupsScrollStorageKey = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return `rb_sport_groups_scroll:${path}`;
  };
  const readSportGroupsScroll = () => {
    try {
      const value = Number(sessionStorage.getItem(sportGroupsScrollStorageKey()));
      return Number.isFinite(value) ? Math.max(0, value) : null;
    } catch {
      return null;
    }
  };
  const writeSportGroupsScroll = (value) => {
    try {
      sessionStorage.setItem(sportGroupsScrollStorageKey(), String(Math.max(0, Number(value) || 0)));
    } catch {}
  };
  let cachedRtlScrollAxisType = '';
  const rtlScrollAxisType = () => {
    if (cachedRtlScrollAxisType) return cachedRtlScrollAxisType;
    const host = document.createElement('div');
    host.dir = 'rtl';
    host.style.width = '4px';
    host.style.height = '1px';
    host.style.overflow = 'auto';
    host.style.position = 'absolute';
    host.style.top = '-9999px';
    const inner = document.createElement('div');
    inner.style.width = '8px';
    inner.style.height = '1px';
    host.appendChild(inner);
    document.body.appendChild(host);
    host.scrollLeft = 1;
    if (host.scrollLeft === 0) {
      host.scrollLeft = -1;
      cachedRtlScrollAxisType = host.scrollLeft < 0 ? 'negative' : 'reverse';
    } else {
      cachedRtlScrollAxisType = 'default';
    }
    document.body.removeChild(host);
    return cachedRtlScrollAxisType;
  };
  const readLogicalScrollLeft = (el) => {
    if (!el) return 0;
    const raw = Number(el.scrollLeft);
    if (!Number.isFinite(raw)) return 0;
    const max = Math.max(0, Number(el.scrollWidth || 0) - Number(el.clientWidth || 0));
    const dir = window.getComputedStyle(el).direction;
    if (dir !== 'rtl') return Math.max(0, raw);
    const axisType = rtlScrollAxisType();
    if (axisType === 'negative') return Math.max(0, -raw);
    if (axisType === 'reverse') return Math.max(0, max - raw);
    return Math.max(0, raw);
  };
  const writeLogicalScrollLeft = (el, logical) => {
    if (!el) return;
    const max = Math.max(0, Number(el.scrollWidth || 0) - Number(el.clientWidth || 0));
    const next = Math.min(max, Math.max(0, Number(logical) || 0));
    const dir = window.getComputedStyle(el).direction;
    if (dir !== 'rtl') {
      el.scrollLeft = next;
      return;
    }
    const axisType = rtlScrollAxisType();
    if (axisType === 'negative') {
      el.scrollLeft = -next;
      return;
    }
    if (axisType === 'reverse') {
      el.scrollLeft = max - next;
      return;
    }
    el.scrollLeft = next;
  };
  const finiteNumberOrNull = (value) => {
    if (value == null || value === '') return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  };
  const firstFiniteNumber = (...values) => {
    for (const value of values) {
      const next = finiteNumberOrNull(value);
      if (next != null) return next;
    }
    return 0;
  };
  let sportPageCountdownTimer = 0;
  const countdownParts = (targetTs) => {
    if (!Number.isFinite(targetTs)) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const diff = Math.max(0, targetTs - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  };
  const applySportCountdown = (host) => {
    const targetTs = Number(host.dataset.rbKickoff || 0);
    const isLive = String(host.dataset.rbLive || '') === '1';
    const isFinished = String(host.dataset.rbFinished || '') === '1';
    const status = host.querySelector('[data-rb-countdown-status]');
    const now = Date.now();
    const hasReachedKickoff = Number.isFinite(targetTs) && targetTs > 0 && targetTs <= now;
    if (isFinished) {
      host.querySelector('[data-rb-unit-days]') && (host.querySelector('[data-rb-unit-days]').textContent = '00');
      host.querySelector('[data-rb-unit-hours]') && (host.querySelector('[data-rb-unit-hours]').textContent = '00');
      host.querySelector('[data-rb-unit-minutes]') && (host.querySelector('[data-rb-unit-minutes]').textContent = '00');
      host.querySelector('[data-rb-unit-seconds]') && (host.querySelector('[data-rb-unit-seconds]').textContent = '00');
      if (status) status.textContent = '\u05d4\u05e1\u05ea\u05d9\u05d9\u05dd';
      return;
    }
    if (isLive || !targetTs) {
      host.querySelector('[data-rb-unit-days]') && (host.querySelector('[data-rb-unit-days]').textContent = '00');
      host.querySelector('[data-rb-unit-hours]') && (host.querySelector('[data-rb-unit-hours]').textContent = '00');
      host.querySelector('[data-rb-unit-minutes]') && (host.querySelector('[data-rb-unit-minutes]').textContent = '00');
      host.querySelector('[data-rb-unit-seconds]') && (host.querySelector('[data-rb-unit-seconds]').textContent = '00');
      if (status) status.textContent = isLive ? '\u05d7\u05d9 \u05e2\u05db\u05e9\u05d9\u05d5' : '\u05d1\u05e7\u05e8\u05d5\u05d1';
      return;
    }
    const parts = countdownParts(targetTs);
    host.querySelector('[data-rb-unit-days]') && (host.querySelector('[data-rb-unit-days]').textContent = String(parts.days).padStart(2, '0'));
    host.querySelector('[data-rb-unit-hours]') && (host.querySelector('[data-rb-unit-hours]').textContent = String(parts.hours).padStart(2, '0'));
    host.querySelector('[data-rb-unit-minutes]') && (host.querySelector('[data-rb-unit-minutes]').textContent = String(parts.minutes).padStart(2, '0'));
    host.querySelector('[data-rb-unit-seconds]') && (host.querySelector('[data-rb-unit-seconds]').textContent = String(parts.seconds).padStart(2, '0'));
    if (hasReachedKickoff) {
      if (status) status.textContent = '\u05d4\u05ea\u05d7\u05d9\u05dc';
      return;
    }
    if (status) status.textContent = '\u05e1\u05e4\u05d9\u05e8\u05d4 \u05dc\u05de\u05e9\u05d7\u05e7';
  };
  const refreshSportCountdowns = (root = document) => {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-rb-countdown]').forEach((host) => applySportCountdown(host));
  };
  const runSportCountdownTicker = () => {
    refreshSportCountdowns(document);
    if (sportPageCountdownTimer) return;
    sportPageCountdownTimer = window.setInterval(() => {
      if (!document.body) {
        window.clearInterval(sportPageCountdownTimer);
        sportPageCountdownTimer = 0;
        return;
      }
      refreshSportCountdowns(document);
    }, 1000);
  };
  const sportPageMarketGroups = (sport, event, index) => {
    const liveMarkets = Array.isArray(event.markets)
      ? event.markets
        .map((market, marketIndex) => {
          const oddValue = Number(market?.odd);
          if (!Number.isFinite(oddValue)) return null;
          const fallbackLabel = ['1', 'X', '2'][marketIndex] || `\u05d1\u05d7\u05d9\u05e8\u05d4 ${marketIndex + 1}`;
          return {
            label: sanitizeMarketLabel(market?.label, fallbackLabel),
            odd: formatOdd(oddValue),
          };
        })
        .filter(Boolean)
      : [];
    if (!liveMarkets.length) return [];
    return [{ title: '1X2', markets: liveMarkets }];
  };
  const sportPageEvents = (sport, fixtures, modeKey) => {
    const source = sanitizeFixtureRowsForBoard(Array.isArray(fixtures) ? fixtures : []);
    const sportSlug = String(sport?.slug || '').trim();
    if (!sportSlug) return [];
    let filtered = source.filter((fixture) => fixtureMatchesSportSlug(fixture, sportSlug));

    const mode = String(modeKey || '').toLowerCase();
    if (mode === 'live') {
      filtered = filtered.filter((fixture) => fixtureIsLive(fixture));
    } else if (mode === 'upcoming') {
      filtered = filtered.filter((fixture) => !fixtureIsLive(fixture) && !fixtureIsFinished(fixture));
    } else if (mode === 'markets') {
      filtered = filtered.filter((fixture) => fixtureHasRealOdds(fixture) && !fixtureIsFinished(fixture));
    }
    filtered = filtered.filter((fixture) => !fixtureShouldHideFromBoard(fixture));

    return filtered.slice(0, 300).map((fixture, index) => mapFixtureToSportEvent(fixture, index, sport, modeKey));
  };
  const renderSportPageBetSlip = (root, selection) => {
    const slip = root.querySelector('[data-rb-sport-page-bet-slip]');
    if (!slip) return;
    if (!selection) {
      slip.innerHTML = `
        <span>${betBoardText.quickSlip}</span>
        <strong>\u05d1\u05d7\u05e8 \u05d9\u05d7\u05e1 \u05de\u05d4\u05d8\u05d1\u05dc\u05d4</strong>
        <p>${betBoardText.pickOdd}</p>
      `;
      return;
    }
    const stake = normalizeStakeAmount(selection?.stake, readPreferredStake());
    const win = formatOdd(oddNumber(selection?.odd, 0) * stake);
    slip.innerHTML = `
      <span>${betBoardText.quickSlip}</span>
      <strong>${selection.sport}</strong>
      <p>${selection.event}</p>
      <div><small>${betBoardText.selection}</small><b>${selection.market} @ ${selection.odd}</b></div>
      <div><small>${betBoardText.stake}</small><b>${stake} \u20aa</b></div>
      <div><small>${betBoardText.possibleWin}</small><b>${win} \u20aa</b></div>
      <a href="${playerAccountUrl()}" data-rb-player-account-link>${betBoardText.addToSlip}</a>
    `;
  };
  const renderSportPageBetting = (root, state) => {
    const pinnedGroupScrollLeft = Number(state?.keepGroupScrollLeft);
    const pinnedSubSportsScrollLeft = Number(state?.keepSubSportsScrollLeft);
    const storedGroupScrollLeft = readSportGroupsScroll();
    const previousGroupScrollLeft = Number.isFinite(pinnedGroupScrollLeft)
      ? pinnedGroupScrollLeft
      : (Number.isFinite(storedGroupScrollLeft)
      ? storedGroupScrollLeft
      : (Number.isFinite(readLogicalScrollLeft(root.querySelector('[data-rb-home-sport-groups]')))
      ? readLogicalScrollLeft(root.querySelector('[data-rb-home-sport-groups]'))
      : 0));
    const previousSubSportsScrollLeft = Number.isFinite(pinnedSubSportsScrollLeft)
      ? pinnedSubSportsScrollLeft
      : (Number.isFinite(readLogicalScrollLeft(root.querySelector('[data-rb-home-sub-sports]')))
      ? readLogicalScrollLeft(root.querySelector('[data-rb-home-sub-sports]'))
      : 0);
    const sport = sportBySlug.get(state.sportSlug) || getInitialSport();
    const group = footerMenuGroupByKey.get(state.groupKey) || sportPageGroupForSport(sport);
    const activeHomeGroup = sportPageGroupForSport(sport);
    const modes = sportPageModeOptions(sport);
    const mode = modes.find((option) => option.key === state.modeKey) || modes[0];
    const events = sportPageEvents(sport, state.fixtures || [], mode.key);
    document.body.classList.add('rb-sport-page-enhanced');
    localStorage.setItem(SPORT_SELECTION_KEY, JSON.stringify(sport));
    root.dataset.rbSportPageGroup = group.key;
    root.dataset.rbSportPageSport = sport.slug;
    root.dataset.rbSportPageMode = mode.key;

    root.innerHTML = `
      <div class="rb-sport-page-inner">
        <header class="rb-sport-page-hero">
          <div>
            <span>${betBoardText.title}</span>
            <h1>${translatedSportLabel(sport)}</h1>
            <p>${fixMojibake(mode.summary) || t('sportContext')}</p>
          </div>
          <img src="${sportImage(sport.image || group.image)}" alt="">
        </header>

        <section class="rb-home-sports rb-sport-page-home-menu" data-rb-home-sports data-rb-sport-page-home-menu="true">
          <div class="rb-home-sports-inner">
            <div class="rb-home-sports-head">
              <strong data-rb-i18n="popularSports">${t('popularSports')}</strong>
            </div>
            <div class="rb-home-sports-groups" data-rb-home-sport-groups>
              ${homeSportGroups.map((homeGroup) => `
                <button
                  class="rb-home-sport-group ${homeGroup.key === activeHomeGroup.key ? 'active' : ''}"
                  type="button"
                  tabindex="-1"
                  data-rb-home-sport-group="${homeGroup.key}"
                >
                  <span><img src="${sportImage(homeGroup.image)}" alt=""></span>
                  <strong data-rb-i18n="${homeGroup.labelKey}">${t(homeGroup.labelKey, homeGroup.label)}</strong>
                </button>
              `).join('')}
            </div>
            <div class="rb-home-sub-sports" data-rb-home-sub-sports></div>
            <div class="rb-home-sports-slider" data-rb-home-sports-slider aria-live="polite"></div>
            <div class="rb-home-betting-board" data-rb-home-betting-board></div>
          </div>
        </section>

        <div class="rb-sport-page-layout">
          <main class="rb-sport-page-events">
            <div class="rb-sport-page-events-head">
              <strong>${fixMojibake(mode.label)} - ${translatedSportLabel(sport)}</strong>
              <span>${events.length} \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd</span>
            </div>
            ${events.length ? events.map((event, index) => `
              <article class="rb-sport-page-event">
                <div class="rb-sport-page-event-main">
                  <div class="rb-sport-page-event-meta rb-sport-page-event-meta-new">
                    <small>${event.league}</small>
                    <em>${event.round}</em>
                  </div>
                  <div class="rb-match-teams">
                    <div class="rb-match-team">
                      ${event.homeLogo ? `<img src="${event.homeLogo}" data-rb-original-src="${event.homeLogoRaw || ''}" alt="${event.home}" loading="lazy" decoding="async" onerror="if(this.dataset.rbImgFallback!=='1'){this.dataset.rbImgFallback='1';const original=this.getAttribute('data-rb-original-src');if(original&&this.src!==original){this.src=original;return;}}this.onerror=null;this.src='${placeholderBadge}';">` : `<span>${event.homeInitials}</span>`}
                      <strong>${event.home}</strong>
                    </div>
                    <div class="rb-match-center">
                    </div>
                    <div class="rb-match-team">
                      ${event.awayLogo ? `<img src="${event.awayLogo}" data-rb-original-src="${event.awayLogoRaw || ''}" alt="${event.away}" loading="lazy" decoding="async" onerror="if(this.dataset.rbImgFallback!=='1'){this.dataset.rbImgFallback='1';const original=this.getAttribute('data-rb-original-src');if(original&&this.src!==original){this.src=original;return;}}this.onerror=null;this.src='${placeholderBadge}';">` : `<span>${event.awayInitials}</span>`}
                      <strong>${event.away}</strong>
                    </div>
                  </div>
                  <div
                    class="rb-match-kickoff"
                    data-rb-countdown
                    data-rb-kickoff="${event.kickoffAt || ''}"
                    data-rb-live="${event.isLive ? '1' : '0'}"
                    data-rb-finished="${event.isFinished ? '1' : '0'}"
                  >
                    <div class="rb-match-kickoff-bar">
                      <span data-rb-countdown-status>\u05e1\u05e4\u05d9\u05e8\u05d4 \u05dc\u05de\u05e9\u05d7\u05e7</span>
                    </div>
                    <div class="rb-match-countdown-grid">
                      <article><b data-rb-unit-days>00</b><small>\u05d9\u05de\u05d9\u05dd</small></article>
                      <article><b data-rb-unit-hours>00</b><small>\u05e9\u05e2\u05d5\u05ea</small></article>
                      <article><b data-rb-unit-minutes>00</b><small>\u05d3\u05e7\u05d5\u05ea</small></article>
                      <article><b data-rb-unit-seconds>00</b><small>\u05e9\u05e0\u05d9\u05d5\u05ea</small></article>
                    </div>
                  </div>
                </div>
                <div class="rb-sport-page-market-grid">
                  ${sportPageMarketGroups(sport, event, index).map((marketGroup) => `
                    <section class="rb-sport-page-market-block">
                      <div>
                        ${marketGroup.markets.map((market) => `
                          <button
                            type="button"
                            data-rb-sport-page-bet-odd
                            data-rb-bet-sport="${translatedSportLabel(sport)}"
                            data-rb-bet-event="${event.home} - ${event.away}"
                            data-rb-bet-market="${market.label}"
                            data-rb-bet-odd="${market.odd}"
                            data-rb-bet-fixture-id="${event.fixtureId || event.id || ''}"
                            data-rb-bet-market-key="${market.key || ''}"
                            data-rb-bet-odds-updated-at="${event.oddsUpdatedAt || ''}"
                          >
                            <span>${market.label}</span>
                            <strong>${market.odd}</strong>
                          </button>
                        `).join('')}
                      </div>
                    </section>
                  `).join('')}
                </div>
              </article>
            `).join('') : `
              <article class="rb-sport-page-event">
                <div class="rb-sport-page-event-main">
                  <div class="rb-sport-page-event-meta">
                    <span>${t('upcoming')}</span>
                    <small>${translatedSportLabel(sport)}</small>
                    <em>${t('oddsReady')}</em>
                  </div>
                  ${sportFixturesState.lastError ? `<div class="rb-sport-page-error-note">${sportFixturesState.lastError}</div>` : ''}
                </div>
              </article>
            `}
          </main>

          <aside class="rb-sport-page-side">
            <div class="rb-sport-page-slip" data-rb-sport-page-bet-slip></div>
            <div class="rb-sport-page-side-card">
              <span>\u05e9\u05d5\u05d5\u05e7\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd</span>
              <strong>${translatedSportLabel(sport)}</strong>
              <p>${fixMojibake(mode.summary) || t('marketExamples')}</p>
            </div>
          </aside>
        </div>
      </div>
    `;
    root.querySelectorAll('.rb-match-center > i, [data-rb-countdown-substatus]').forEach((node) => node.remove());
    renderHomeSubSports(root, activeHomeGroup.key, sport.slug);
    const restoreMenuScroll = () => {
      const groupsRow = root.querySelector('[data-rb-home-sport-groups]');
      const subSportsRow = root.querySelector('[data-rb-home-sub-sports]');
      if (groupsRow) {
        const keepGroupKey = String(state?.keepGroupKey || '');
        if (!keepGroupKey) {
          writeLogicalScrollLeft(groupsRow, previousGroupScrollLeft);
        }
        if (keepGroupKey) {
          const keptGroupButton = groupsRow.querySelector(`[data-rb-home-sport-group="${keepGroupKey}"]`);
          if (keptGroupButton) keptGroupButton.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        }
        writeSportGroupsScroll(readLogicalScrollLeft(groupsRow));
        if (groupsRow.dataset.rbGroupsBound !== '1') {
          groupsRow.addEventListener('scroll', () => {
            writeSportGroupsScroll(readLogicalScrollLeft(groupsRow));
          }, { passive: true });
          groupsRow.dataset.rbGroupsBound = '1';
        }
      }
      if (subSportsRow) {
        writeLogicalScrollLeft(subSportsRow, previousSubSportsScrollLeft);
        const keepSubSportKey = String(state?.keepSubSportKey || '');
        if (keepSubSportKey) {
          const keptSubSportButton = subSportsRow.querySelector(`[data-rb-home-sub-sport="${keepSubSportKey}"]`);
          if (keptSubSportButton) keptSubSportButton.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        }
      }
    };
    window.requestAnimationFrame(restoreMenuScroll);
    window.setTimeout(restoreMenuScroll, 60);
    window.setTimeout(restoreMenuScroll, 180);
    renderSportPageBetSlip(root);
    runSportCountdownTicker(root);
    applyFrontendLanguage();
  };
  const setupSportBettingPage = (sport, preferredModeKey) => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/betting' && !path.startsWith('/sport')) return;
    const isLiveLineRoute = path === '/sport/live-line' || path === '/live-line';
    const selected = sport || getInitialSport();
    const initialGroup = sportPageGroupForSport(selected);
    const initialModeKey = preferredModeKey || (new URLSearchParams(window.location.search).get('view')) || sportPageModeOptions(selected)[0]?.key;
    renderSportSubmenu();
    let activeRenderToken = 0;
    const renderWithFixtures = async (mount, state) => {
      const token = ++activeRenderToken;
      const cachedFixtures = sportFixturesState.itemsByLocale.get(getSiteLanguage()) || [];
      renderSportPageBetting(mount, { ...state, fixtures: cachedFixtures });
      stripLegacyDemoSportsContent();
      await loadSportGlossary();
      const fixtures = await loadSportFixtures();
      if (token !== activeRenderToken) return;
      renderSportPageBetting(mount, { ...state, fixtures });
      stripLegacyDemoSportsContent();
    };
    let mount = document.querySelector('[data-rb-sport-page-betting]');
    if (!mount) {
      mount = document.createElement('section');
      mount.className = 'rb-sport-page-betting';
      mount.dataset.rbSportPageBetting = 'true';
      const container = document.querySelector('.main-content-wrapper') || document.querySelector('.app-main-content') || document.querySelector('app-main') || document.body;
      container.insertBefore(mount, container.firstChild);
    }
    if (!isLiveLineRoute) {
      mount.__rbRenderWithFixtures = renderWithFixtures;
    } else {
      delete mount.__rbRenderWithFixtures;
    }
    if (!isLiveLineRoute && mount.dataset.rbSportPageBound !== '1') {
      mount.addEventListener('click', (event) => {
        const renderer = mount.__rbRenderWithFixtures;
        if (typeof renderer !== 'function') return;
        const recentPrimaryControlPress = lastSportControlPressTs > 0 && (Date.now() - lastSportControlPressTs) < SPORT_CONTROL_DEDUP_MS;
        if (recentPrimaryControlPress && closest(event.target, [
          '[data-rb-home-sport-group]',
          '[data-rb-home-sub-sport]',
          '[data-rb-home-bet-odd]',
          '[data-rb-sport-page-bet-odd]',
        ].join(', '))) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const homeGroupButton = closest(event.target, '[data-rb-home-sport-group]');
        if (homeGroupButton) {
          if (event.detail > 0) {
            // Pointer/touch clicks are handled centrally on pointerup to avoid double-render races.
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const homeMenu = mount.querySelector('[data-rb-home-sports]');
          const groupsRow = closest(homeGroupButton, '[data-rb-home-sport-groups]');
          const stableGroupKey = homeMenu?.dataset?.rbPendingHomeGroupKey
            || mount.dataset.rbPendingHomeGroupKey
            || homeGroupButton.dataset.rbHomeSportGroup;
          const resolvedButton = stableGroupKey
            ? mount.querySelector(`[data-rb-home-sport-group="${stableGroupKey}"]`)
            : homeGroupButton;
          mount.querySelectorAll('[data-rb-home-sport-group]').forEach((item) => item.classList.remove('active'));
          if (resolvedButton) resolvedButton.classList.add('active');
          const group = footerMenuGroupByKey.get(stableGroupKey) || homeSportGroups[0];
          const firstSport = sportBySlug.get((group.sports || [])[0]) || getInitialSport();
          delete mount.dataset.rbPendingHomeGroupKey;
          if (homeMenu) delete homeMenu.dataset.rbPendingHomeGroupKey;
          const pinnedGroupsScroll = firstFiniteNumber(
            readLogicalScrollLeft(groupsRow),
            mount.dataset.rbPinnedGroupScroll,
            homeMenu?.dataset?.rbPinnedGroupScroll,
            readLogicalScrollLeft(mount.querySelector('[data-rb-home-sport-groups]'))
          );
          renderer(mount, {
            groupKey: group.key,
            sportSlug: firstSport.slug,
            modeKey: sportPageModeOptions(firstSport)[0]?.key,
            keepGroupScrollLeft: pinnedGroupsScroll,
            keepGroupKey: group.key,
          });
          return;
        }

        const homeSubSportButton = closest(event.target, '[data-rb-home-sub-sport]');
        if (homeSubSportButton) {
          if (event.detail > 0) {
            // Pointer/touch clicks are handled centrally on pointerup to avoid double-render races.
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          mount.querySelectorAll('[data-rb-home-sub-sport]').forEach((item) => item.classList.remove('active'));
          homeSubSportButton.classList.add('active');
          const pickedSport = sportBySlug.get(homeSubSportButton.dataset.rbHomeSubSport) || getInitialSport();
          const group = sportPageGroupForSport(pickedSport);
          const homeMenu = mount.querySelector('[data-rb-home-sports]');
          const subSportsRow = closest(homeSubSportButton, '[data-rb-home-sub-sports]');
          const pinnedSubSportsScroll = firstFiniteNumber(
            readLogicalScrollLeft(subSportsRow),
            mount.dataset.rbPinnedSubSportsScroll,
            homeMenu?.dataset?.rbPinnedSubSportsScroll,
            readLogicalScrollLeft(mount.querySelector('[data-rb-home-sub-sports]'))
          );
          delete mount.dataset.rbPendingHomeSubSport;
          if (homeMenu) delete homeMenu.dataset.rbPendingHomeSubSport;
          const currentModeKey = mount.dataset.rbSportPageMode || '';
          const modeOptions = sportPageModeOptions(pickedSport);
          const nextModeKey = modeOptions.some((option) => option.key === currentModeKey)
            ? currentModeKey
            : modeOptions[0]?.key;
          renderer(mount, {
            groupKey: group.key,
            sportSlug: pickedSport.slug,
            modeKey: nextModeKey,
            keepSubSportsScrollLeft: pinnedSubSportsScroll,
            keepSubSportKey: pickedSport.slug,
          });
          return;
        }

        const homeOdd = closest(event.target, '[data-rb-home-bet-odd]');
        if (homeOdd) {
          event.preventDefault();
          event.stopPropagation();
          handleOddSelection(homeOdd, mount, event);
          return;
        }

        const odd = closest(event.target, '[data-rb-sport-page-bet-odd]');
        if (odd) {
          event.preventDefault();
          event.stopPropagation();
          handleOddSelection(odd, mount, event);
          return;
        }
      });
      mount.dataset.rbSportPageBound = '1';
    }
    renderWithFixtures(mount, {
      groupKey: initialGroup.key,
      sportSlug: selected.slug,
      modeKey: initialModeKey,
    });
    stripLegacyDemoSportsContent();
    setTimeout(stripLegacyDemoSportsContent, 300);
    setTimeout(stripLegacyDemoSportsContent, 1100);
  };
  const casinoGameImages = [
    'casino-royal88- (1).jpeg',
    'casino-royal88- (2).jpeg',
    'casino-royal88- (3).jpeg',
    'casino-royal88- (4).jpeg',
    'casino-royal88- (7).jpeg',
    'casino-royal88- (10).jpeg',
    'casino-royal88- (11).jpeg',
    'casino-royal88- (12).jpeg',
    'casino-royal88- (13).jpeg',
    'casino-royal88- (14).jpeg',
    'casino-royal88- (15).jpeg',
    'casino-royal88- (16).jpeg',
    'casino-royal88- (18).jpeg',
    '822f88ab-69e6-4970-8c29-4c51de5c52e2.png',
    'd832fa71-8e88-4635-bc61-c24090ad97cf.jpeg',
  ];
  const casinoGameTitles = [
    'Royal Blaze',
    'Roulette Queen',
    'Diamond Spin',
    'Crimson 777',
    'Golden Joker',
    'Lucky Crown',
    'Neon Fruits',
    'Royal Dice',
    'Mega Fortune',
    'Vegas Rush',
    'Jackpot Night',
    'Crystal Reels',
    'Red Tiger',
    'Bonus Wheel',
    'Midnight Gold',
  ];
  const casinoPromoSlides = [
    {
      image: '/assets/images/casino-royal8hero2.jpeg',
      eyebrow: 'Promotion',
      title: '\u05de\u05d1\u05e6\u05e2\u05d9 \u05e7\u05d6\u05d9\u05e0\u05d5',
      text: '\u05d1\u05d5\u05e0\u05d5\u05e1\u05d9\u05dd, \u05e1\u05dc\u05d5\u05d8\u05d9\u05dd \u05d7\u05de\u05d9\u05dd \u05d5\u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea \u05dc\u05d9\u05d9\u05d1 \u05d1\u05de\u05e8\u05d7\u05d1 \u05d0\u05d7\u05d3.',
    },
    {
      image: '/assets/images/casino-royal8hero3.jpeg',
      eyebrow: 'Live Casino',
      title: '\u05dc\u05d9\u05d9\u05d1 \u05e7\u05d6\u05d9\u05e0\u05d5',
      text: '\u05e8\u05d5\u05dc\u05d8\u05d4, \u05d1\u05dc\u05e7\u05d2\u05e7 \u05d5\u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea \u05e4\u05e8\u05d9\u05de\u05d9\u05d5\u05dd \u05d1\u05e2\u05d9\u05e6\u05d5\u05d1 \u05e8\u05d5\u05d9\u05d0\u05dc\u05d9.',
    },
    {
      image: '/assets/images/home-casino.png',
      eyebrow: 'Jackpot',
      title: '\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd \u05d7\u05de\u05d9\u05dd',
      text: '\u05d4\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05d4\u05d1\u05d5\u05dc\u05d8\u05d9\u05dd \u05e2\u05db\u05e9\u05d9\u05d5 \u05e2\u05dd \u05ea\u05e0\u05d5\u05e2\u05d4 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea.',
    },
  ];
  let homeCasinoTimers = [];
  const clearHomeCasinoTimers = () => {
    homeCasinoTimers.forEach((timer) => clearInterval(timer));
    homeCasinoTimers = [];
  };
  const casinoGameImage = (name) => `/assets/images/casino-games/${encodeURIComponent(name)}`;
  const casinoGameCard = (name, index) => `
    <a class="rb-casino-game-card" href="/casino/slot" data-rb-casino-game-card>
      <img src="${casinoGameImage(name)}" alt="">
      <span>${index % 2 ? '\u05e1\u05dc\u05d5\u05d8 \u05d7\u05dd' : '\u05de\u05d5\u05de\u05dc\u05e5'}</span>
      <strong>${casinoGameTitles[index] || 'Royal Casino'}</strong>
    </a>
  `;
  const findNativeLuckySlotSection = () => {
    const sections = Array.from(document.querySelectorAll('.home-common-wrap, .dashboardmain-games, .slot-game, .dashboardmain-slot-game'));
    return sections.find((section) => {
      if (section.dataset.rbNativeCasinoHidden) return false;
      const text = normalizeSportText(section.textContent);
      return /×©×™×|×ž×›×•× ×ª ×ž×–×œ|Lucky Slot|slot wins/i.test(text);
    }) || null;
  };
  const startHomeCasinoMotion = (root) => {
    clearHomeCasinoTimers();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.querySelectorAll('[data-rb-casino-rail]').forEach((rail, index) => {
      const timer = setInterval(() => {
        if (!document.body.contains(rail)) {
          clearInterval(timer);
          return;
        }
        advanceLoopRail(rail, '[data-rb-casino-game-card]', 14);
      }, index ? 3200 : 2800);
      homeCasinoTimers.push(timer);
    });

    let activePromo = 0;
    const promoTimer = setInterval(() => {
      if (!document.body.contains(root)) {
        clearInterval(promoTimer);
        return;
      }
      const slides = Array.from(root.querySelectorAll('[data-rb-casino-promo-slide]'));
      const dots = Array.from(root.querySelectorAll('[data-rb-casino-promo-dot]'));
      if (!slides.length) return;
      activePromo = (activePromo + 1) % slides.length;
      slides.forEach((slide, index) => slide.classList.toggle('active', index === activePromo));
      dots.forEach((dot, index) => dot.classList.toggle('active', index === activePromo));
    }, 4200);
    homeCasinoTimers.push(promoTimer);
  };
  const setupHomeCasinoShowcase = () => {
    if (!ENABLE_SYNTHETIC_CONTENT) return;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/') return;
    if (delayHomeSectionForSlider(setupHomeCasinoShowcase)) return;
    const nativeSection = findNativeLuckySlotSection();
    const existing = document.querySelector('[data-rb-home-casino-showcase]');
    if (existing) {
      if (nativeSection) {
        nativeSection.dataset.rbNativeCasinoHidden = 'true';
        nativeSection.classList.add('rb-native-casino-wins-hidden');
        nativeSection.insertAdjacentElement('beforebegin', existing);
      }
      return;
    }

    const topGames = casinoGameImages.slice(0, 8);
    const bottomGames = casinoGameImages.slice(7).concat(casinoGameImages.slice(0, 2));
    const topRailGames = topGames.concat(topGames);
    const bottomRailGames = bottomGames.concat(bottomGames);
    const mount = document.createElement('section');
    mount.className = 'rb-home-casino-showcase';
    mount.dataset.rbHomeCasinoShowcase = 'true';
    mount.innerHTML = `
      <div class="rb-home-casino-inner">
        <div class="rb-home-casino-head">
          <div>
            <span>\u05e7\u05d6\u05d9\u05e0\u05d5</span>
            <strong>\u05e9\u05d9\u05d0 \u05de\u05db\u05d5\u05e0\u05d5\u05ea \u05de\u05d6\u05dc</strong>
          </div>
          <a href="/casino/slot">\u05db\u05dc \u05d4\u05de\u05e9\u05d7\u05e7\u05d9\u05dd</a>
        </div>
        <div class="rb-casino-rail rb-casino-rail-top" data-rb-casino-rail>
          ${topRailGames.map(casinoGameCard).join('')}
        </div>
        <div class="rb-casino-promo" data-rb-casino-promo>
          ${casinoPromoSlides.map((slide, index) => `
            <a class="rb-casino-promo-slide ${index === 0 ? 'active' : ''}" href="/sport/live-line" data-rb-sport-link-slide>
              <img src="${slide.image}" alt="">
              <span>${slide.eyebrow}</span>
              <strong>${slide.title}</strong>
              <small>${slide.text}</small>
            </a>
          `).join('')}
          <div class="rb-casino-promo-dots">
            ${casinoPromoSlides.map((_, index) => `<button class="${index === 0 ? 'active' : ''}" type="button" data-rb-casino-promo-dot="${index}" aria-label="Promotion ${index + 1}"></button>`).join('')}
          </div>
        </div>
        <div class="rb-casino-rail rb-casino-rail-bottom" data-rb-casino-rail>
          ${bottomRailGames.map((game, index) => casinoGameCard(game, index + 7)).join('')}
        </div>
      </div>
    `;

    if (nativeSection) {
      nativeSection.dataset.rbNativeCasinoHidden = 'true';
      nativeSection.classList.add('rb-native-casino-wins-hidden');
      nativeSection.insertAdjacentElement('beforebegin', mount);
    } else {
      const fallback = document.querySelector('.popular-slot-game, .app-main-content, app-main, app-root') || document.body;
      fallback.insertAdjacentElement(fallback === document.body ? 'afterbegin' : 'beforebegin', mount);
    }

    mount.addEventListener('click', (event) => {
      const dot = closest(event.target, '[data-rb-casino-promo-dot]');
      if (!dot) return;
      const index = Number(dot.dataset.rbCasinoPromoDot || 0);
      mount.querySelectorAll('[data-rb-casino-promo-slide]').forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === index));
      mount.querySelectorAll('[data-rb-casino-promo-dot]').forEach((item, dotIndex) => item.classList.toggle('active', dotIndex === index));
    });
    startHomeCasinoMotion(mount);
  };
  const casinoPageNav = [
    { key: 'slot', href: '/casino/slot', label: '\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd', icon: '777', text: '\u05e1\u05e4\u05d9\u05e0\u05d9\u05dd, \u05d1\u05d5\u05e0\u05d5\u05e1\u05d9\u05dd \u05d5\u05d2\u05f3\u05e7\u05e4\u05d5\u05d8\u05d9\u05dd' },
    { key: 'live', href: '/casino/live', label: '\u05dc\u05d9\u05d9\u05d1 \u05e7\u05d6\u05d9\u05e0\u05d5', icon: '\u25cf', text: '\u05e8\u05d5\u05dc\u05d8\u05d4, \u05d1\u05dc\u05e7\u05d2\u05f3\u05e7 \u05d5\u05d3\u05d9\u05dc\u05e8\u05d9\u05dd' },
    { key: 'mini', href: '/casino/slotcategory47', label: '\u05de\u05d9\u05e0\u05d9 \u05d2\u05d9\u05d9\u05de\u05e1', icon: '\u25c6', text: '\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05e7\u05e6\u05e8\u05d9\u05dd \u05d5\u05de\u05d4\u05d9\u05e8\u05d9\u05dd' },
    { key: 'virtual', href: '/casino/virtual', label: '\u05d5\u05d9\u05e8\u05d8\u05d5\u05d0\u05dc\u05d9', icon: '\u25b2', text: '\u05de\u05e8\u05d5\u05e6\u05d9\u05dd \u05d5\u05e1\u05e4\u05d5\u05e8\u05d8 \u05de\u05d3\u05d5\u05de\u05d4' },
    { key: 'crash', href: '/casino/category?pgType=4&category=46', label: 'Crash', icon: '\u2197', text: '\u05e7\u05e6\u05d1 \u05d2\u05d1\u05d5\u05d4 \u05d5\u05e1\u05d9\u05d1\u05d5\u05d1\u05d9\u05dd \u05de\u05d4\u05d9\u05e8\u05d9\u05dd' },
  ];
  const casinoPageProfiles = {
    slot: {
      key: 'slot',
      eyebrow: '\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd',
      title: '\u05d0\u05d5\u05dc\u05dd \u05d4\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd \u05e9\u05dc RoyalBet88',
      text: '\u05de\u05e1\u05dc\u05d5\u05dc \u05de\u05e8\u05d5\u05db\u05d6 \u05dc\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05d7\u05de\u05d9\u05dd, \u05e1\u05e4\u05d9\u05e0\u05d9\u05dd \u05de\u05d4\u05d9\u05e8\u05d9\u05dd, \u05d1\u05d5\u05e0\u05d5\u05e1\u05d9\u05dd \u05d5\u05d2\u05f3\u05e7\u05e4\u05d5\u05d8\u05d9\u05dd.',
      image: '/assets/images/home-casino.png',
    },
    live: {
      key: 'live',
      eyebrow: '\u05dc\u05d9\u05d9\u05d1 \u05e7\u05d6\u05d9\u05e0\u05d5',
      title: '\u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea \u05dc\u05d9\u05d9\u05d1 \u05d1\u05d0\u05d5\u05d5\u05d9\u05e8\u05d4 \u05e4\u05e8\u05d9\u05de\u05d9\u05d5\u05dd',
      text: '\u05e8\u05d5\u05dc\u05d8\u05d4, \u05d1\u05dc\u05e7\u05d2\u05f3\u05e7 \u05d5\u05de\u05e9\u05d7\u05e7\u05d9 \u05e9\u05d5\u05dc\u05d7\u05df \u05e2\u05dd \u05ea\u05d7\u05d5\u05e9\u05ea \u05e1\u05d8\u05d5\u05d3\u05d9\u05d5 \u05de\u05dc\u05d0\u05d4.',
      image: '/assets/images/home-csino-virtual.png',
    },
    mini: {
      key: 'mini',
      eyebrow: '\u05de\u05d9\u05e0\u05d9 \u05d2\u05d9\u05d9\u05de\u05e1',
      title: '\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05e7\u05e6\u05e8\u05d9\u05dd \u05dc\u05e8\u05d2\u05e2\u05d9\u05dd \u05de\u05d4\u05d9\u05e8\u05d9\u05dd',
      text: '\u05d7\u05d5\u05d5\u05d9\u05d9\u05ea \u05e7\u05d6\u05d9\u05e0\u05d5 \u05e7\u05dc\u05d9\u05dc\u05d4 \u05dc\u05e1\u05d9\u05d1\u05d5\u05d1\u05d9\u05dd \u05de\u05d4\u05d9\u05e8\u05d9\u05dd, \u05e4\u05e8\u05e1\u05d9\u05dd \u05d5\u05d1\u05d7\u05d9\u05e8\u05d4 \u05de\u05d9\u05d9\u05d3\u05d9\u05ea.',
      image: '/assets/images/home-skill-games.png',
    },
    virtual: {
      key: 'virtual',
      eyebrow: '\u05d5\u05d9\u05e8\u05d8\u05d5\u05d0\u05dc\u05d9',
      title: '\u05d6\u05d9\u05e8\u05ea \u05d5\u05d9\u05e8\u05d8\u05d5\u05d0\u05dc \u05e9\u05dc \u05e1\u05e4\u05d5\u05e8\u05d8 \u05d5\u05e7\u05d6\u05d9\u05e0\u05d5',
      text: '\u05de\u05e8\u05d5\u05e6\u05d9\u05dd, \u05dc\u05d9\u05d2\u05d5\u05ea \u05d5\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05de\u05d3\u05d5\u05de\u05d9\u05dd \u05d1\u05e7\u05e6\u05d1 \u05d2\u05d1\u05d5\u05d4.',
      image: '/assets/images/home-virtual-sport.png',
    },
    crash: {
      key: 'crash',
      eyebrow: 'Crash',
      title: '\u05de\u05e9\u05d7\u05e7\u05d9 Crash \u05d5\u05de\u05d4\u05d9\u05e8\u05d9\u05dd',
      text: '\u05de\u05ea\u05d7\u05dd \u05dc\u05e9\u05d7\u05e7\u05e0\u05d9\u05dd \u05e9\u05d0\u05d5\u05d4\u05d1\u05d9\u05dd \u05e7\u05e6\u05d1, \u05e1\u05d9\u05db\u05d5\u05df \u05de\u05d3\u05d5\u05d3 \u05d5\u05d4\u05d7\u05dc\u05d8\u05d5\u05ea \u05de\u05d4\u05d9\u05e8\u05d5\u05ea.',
      image: '/assets/images/Casino-Jackpot-background.webp',
    },
  };
  const casinoProfileForPath = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/casino/slot';
    if (path.includes('/casino/live')) return casinoPageProfiles.live;
    if (path.includes('/casino/virtual')) return casinoPageProfiles.virtual;
    if (path.includes('/casino/slotcategory47')) return casinoPageProfiles.mini;
    if (path.includes('/casino/category')) return casinoPageProfiles.crash;
    return casinoPageProfiles.slot;
  };
  const casinoPageGameCard = (name, index, href = '/casino/slot') => `
    <a class="rb-casino-page-game" href="${href}" data-rb-casino-page-game>
      <img src="${casinoGameImage(name)}" alt="">
      <span>${index % 3 === 0 ? 'Hot' : index % 3 === 1 ? 'Royal' : 'New'}</span>
      <strong>${casinoGameTitles[index % casinoGameTitles.length] || 'Royal Casino'}</strong>
    </a>
  `;
  const setupCasinoPageExperience = () => {
    if (!ENABLE_SYNTHETIC_CONTENT) return;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (!path.startsWith('/casino')) return;
    if (document.querySelector('[data-rb-casino-page]')) return;
    const profile = casinoProfileForPath();
    document.documentElement.classList.add('rb-page-slider-ready');
    document.documentElement.classList.remove('rb-page-slider-pending');
    document.body.classList.add('rb-casino-page-enhanced');
    const games = casinoGameImages.concat(casinoGameImages.slice(0, 5));
    const railGames = games.concat(games);
    const activeNav = (item) => item.key === profile.key || (profile.key === 'crash' && item.key === 'crash');
    const mount = document.createElement('section');
    mount.className = 'rb-casino-page';
    mount.dataset.rbCasinoPage = profile.key;
    mount.innerHTML = `
      <div class="rb-casino-page-shell">
        <nav class="rb-casino-page-nav" aria-label="Casino sections">
          ${casinoPageNav.map((item) => `
            <a class="${activeNav(item) ? 'active' : ''}" href="${item.href}">
              <i>${item.icon}</i>
              <span>${item.label}</span>
              <small>${item.text}</small>
            </a>
          `).join('')}
        </nav>
        <header class="rb-casino-page-hero">
          <div class="rb-casino-page-hero-copy">
            <span>${profile.eyebrow}</span>
            <h1>${profile.title}</h1>
            <p>${profile.text}</p>
            <div class="rb-casino-page-actions">
              <a href="${path}${window.location.search || ''}">\u05e9\u05d7\u05e7 \u05e2\u05db\u05e9\u05d9\u05d5</a>
            </div>
          </div>
          <div class="rb-casino-page-hero-media">
            <img src="${profile.image}" alt="">
          </div>
          <div class="rb-casino-page-stats" aria-label="Casino highlights">
            <strong><span>24/7</span><small>\u05e4\u05e2\u05d9\u05dc</small></strong>
            <strong><span>150+</span><small>\u05de\u05e9\u05d7\u05e7\u05d9\u05dd</small></strong>
            <strong><span>VIP</span><small>\u05e1\u05d5\u05db\u05df \u05d0\u05d9\u05e9\u05d9</small></strong>
          </div>
        </header>
        <section class="rb-casino-page-strip">
          <div>
            <span>\u05de\u05d5\u05de\u05dc\u05e6\u05d9\u05dd \u05e2\u05db\u05e9\u05d9\u05d5</span>
            <strong>\u05d1\u05d7\u05d9\u05e8\u05d5\u05ea \u05e9\u05e8\u05e6\u05d5\u05ea \u05d1\u05dc\u05d5\u05dc\u05d0\u05d4</strong>
          </div>
          <a href="/casino/slot">\u05dc\u05db\u05dc \u05d4\u05e7\u05d8\u05dc\u05d5\u05d2</a>
        </section>
        <div class="rb-casino-page-rail" data-rb-casino-page-rail>
          ${railGames.map((game, index) => casinoPageGameCard(game, index, casinoPageNav[index % casinoPageNav.length].href)).join('')}
        </div>
        <section class="rb-casino-page-grid">
          <article>
            <span>\u05de\u05e1\u05dc\u05d5\u05dc \u05d7\u05db\u05dd</span>
            <strong>\u05de\u05ea\u05d7\u05d9\u05dc\u05d9\u05dd \u05de\u05d4\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05d4\u05de\u05d5\u05de\u05dc\u05e6\u05d9\u05dd</strong>
            <p>\u05d4\u05e4\u05e8\u05d9\u05e1\u05d4 \u05de\u05e6\u05d9\u05e4\u05d4 \u05dc\u05e9\u05d7\u05e7\u05df \u05de\u05d4 \u05db\u05d3\u05d0\u05d9 \u05dc\u05e0\u05e1\u05d5\u05ea \u05dc\u05e4\u05e0\u05d9 \u05e9\u05d4\u05d5\u05d0 \u05d9\u05d5\u05e8\u05d3 \u05dc\u05e7\u05d8\u05dc\u05d5\u05d2 \u05d4\u05de\u05dc\u05d0.</p>
          </article>
          <article>
            <span>\u05dc\u05d9\u05d9\u05d1 \u05d5\u05de\u05d4\u05d9\u05e8</span>
            <strong>\u05d7\u05d9\u05d1\u05d5\u05e8 \u05de\u05d9\u05d9\u05d3\u05d9 \u05dc\u05e1\u05d5\u05d2\u05d9 \u05d4\u05e7\u05d6\u05d9\u05e0\u05d5</strong>
            <p>\u05d4\u05dc\u05e9\u05d5\u05e0\u05d9\u05d5\u05ea \u05dc\u05de\u05e2\u05dc\u05d4 \u05de\u05d5\u05d1\u05d9\u05dc\u05d5\u05ea \u05d0\u05ea \u05d4\u05e9\u05d7\u05e7\u05df \u05d9\u05e9\u05d9\u05e8 \u05dc\u05e1\u05dc\u05d5\u05d8\u05d9\u05dd, \u05dc\u05d9\u05d9\u05d1, \u05de\u05d9\u05e0\u05d9 \u05d2\u05d9\u05d9\u05de\u05e1 \u05d5\u05d5\u05d9\u05e8\u05d8\u05d5\u05d0\u05dc.</p>
          </article>
          <article>
            <span>\u05de\u05d1\u05e6\u05e2\u05d9\u05dd</span>
            <strong>\u05d1\u05d5\u05e0\u05d5\u05e1\u05d9\u05dd \u05d5\u05e4\u05e8\u05d5\u05de\u05d5 \u05d1\u05de\u05e8\u05d7\u05e7 \u05dc\u05d7\u05d9\u05e6\u05d4</strong>
            <p>\u05de\u05e7\u05d5\u05dd \u05d1\u05d5\u05dc\u05d8 \u05dc\u05de\u05d1\u05e6\u05e2\u05d9\u05dd \u05de\u05d7\u05d6\u05e7 \u05d0\u05ea \u05d4\u05e7\u05d6\u05d9\u05e0\u05d5 \u05db\u05de\u05ea\u05d7\u05dd \u05d7\u05d9 \u05d5\u05d3\u05d9\u05e0\u05de\u05d9.</p>
          </article>
        </section>
      </div>
    `;
    const container = document.querySelector('.main-content-wrapper') || document.querySelector('.app-main-content') || document.querySelector('app-main') || document.body;
    container.insertBefore(mount, container.firstChild);
    container.querySelectorAll('.casinomain-wrapper, .casino-game-wrapper, .casino-game-list, .game-list, .dashboardmain-games, .popular-slot-game, .sx-event-list-header, .sx-match-list, .sx-livematch-card, .sx-prematch-card, .sx-right-panel, .sportsbook-wrapper, sportsbook, app-sport, app-casino').forEach((node) => {
      if (!mount.contains(node)) node.remove();
    });
    const rail = mount.querySelector('[data-rb-casino-page-rail]');
    if (rail && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = window.setInterval(() => {
        if (!document.body.contains(rail)) {
          clearInterval(timer);
          return;
        }
        advanceLoopRail(rail, '[data-rb-casino-page-game]', 14);
      }, 2600);
      homeCasinoTimers.push(timer);
    }
  };
  const setBetslipCollapsed = (collapsed) => {
    document.body.classList.toggle('rb-betslip-collapsed', collapsed);
    localStorage.setItem(BETSLIP_COLLAPSED_KEY, collapsed ? '1' : '0');
    const toggle = document.querySelector('[data-rb-betslip-toggle]');
    if (toggle) {
      toggle.textContent = collapsed ? t('betslipOpen') : t('betslipClose');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    }
  };

  const setupBetslipToggle = () => {
    document.body.classList.remove('appSidebarVisible');
    document.querySelectorAll('[data-rb-betslip-toggle], #royalbet-strapi-bridge, right-sidebar-xl, .mainsidebar, .mainsidebar-overlay, .sidebar-hamburger-btn, .sx-right-panel, .sx-betslip-mainbox, .rightsidebar-overlay').forEach((node) => {
      node.remove();
    });
    setBetslipCollapsed(true);
  };

  const shouldUseMobileFooter = () => window.matchMedia('(max-width: 1024px)').matches;
  const setupMobileFooter = () => {
    const existing = document.querySelector('[data-rb-mobile-footer]');
    if (!shouldUseMobileFooter()) {
      if (existing) existing.remove();
      document.querySelector('[data-rb-footer-fan]')?.remove();
      document.body.classList.remove('rb-footer-menu-open');
      return;
    }
    if (existing) existing.remove();
    const iconImageByKey = {
      sport: '/assets/images/footermenu-img/sport.png',
      casino: '/assets/images/footermenu-img/casino.png',
      menu: '/assets/images/footermenu-img/menu.png',
      live: '/assets/images/footermenu-img/home.png',
      promo: '/assets/images/footermenu-img/promotion.png',
    };
    const items = [
      { href: '/sport/live', icon: 'sport', label: 'sport', match: '/sport' },
      { href: '/casino/slot', icon: 'casino', label: 'casino', match: '/casino/slot' },
      { href: '/', icon: 'menu', label: 'menu', match: '/' },
      { href: '/casino/live', icon: 'live', label: 'liveCasino', match: '/casino/live' },
      { href: '/sport/live-line', icon: 'promo', label: 'promotions', match: '/sport/live-line' },
    ];
    const path = window.location.pathname;
    const footer = document.createElement('nav');
    footer.className = 'rb-mobile-footer';
    footer.dataset.rbMobileFooter = 'true';
    footer.setAttribute('aria-label', '\u05e0\u05d9\u05d5\u05d5\u05d8 \u05ea\u05d7\u05ea\u05d5\u05df');
    footer.innerHTML = items.map((item) => {
      const active = item.match === '/' ? path === '/' : path.startsWith(item.match);
      return `
        <a class="${active ? 'active' : ''}" href="${item.href}">
          <span class="rb-footer-icon" data-rb-icon="${item.icon}" aria-hidden="true">
            <img src="${iconImageByKey[item.icon] || ''}" alt="">
          </span>
          <span data-rb-i18n="${item.label}">${t(item.label)}</span>
        </a>
      `;
    }).join('');
    document.body.appendChild(footer);
    applyFrontendLanguage();
  };

  const setupFooterSportFan = () => {
    const footer = document.querySelector('[data-rb-mobile-footer]');
    if (!footer) return;
    document.body.classList.remove('rb-footer-menu-open');
    localStorage.setItem(FOOTER_MENU_OPEN_KEY, '0');

    const footerItems = Array.from(footer.children);
    const menuSlot = footerItems[2];
    if (menuSlot && !menuSlot.matches('[data-rb-footer-menu-trigger]')) {
      const button = document.createElement('button');
      button.className = menuSlot.className || '';
      button.classList.add('rb-footer-menu-trigger');
      button.dataset.rbFooterMenuTrigger = 'true';
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = `
        <span class="rb-footer-icon" data-rb-icon="menu" aria-hidden="true">
          <img src="/assets/images/footermenu-img/menu.png" alt="">
        </span>
        <span data-rb-i18n="menu">${t('menu')}</span>
      `;
      menuSlot.replaceWith(button);
    }

    if (!document.querySelector('[data-rb-footer-fan]')) {
      const fan = document.createElement('div');
      fan.className = 'rb-footer-fan';
      fan.dataset.rbFooterFan = 'true';
      fan.setAttribute('aria-label', '\u05ea\u05e4\u05e8\u05d9\u05d8 \u05e2\u05e0\u05e4\u05d9 \u05e1\u05e4\u05d5\u05e8\u05d8');
      document.body.appendChild(fan);
    }

    const fan = document.querySelector('[data-rb-footer-fan]');
    const itemPosition = (index, total) => {
      const maxPerRow = total <= 7 ? total : 6;
      const row = Math.floor(index / maxPerRow);
      const col = index % maxPerRow;
      const rowTotal = Math.min(maxPerRow, total - row * maxPerRow);
      const center = (rowTotal - 1) / 2;
      return {
        x: (col - center) * 60,
        y: -92 - (row * 76) - (Math.abs(col - center) * 4),
      };
    };
    const renderFanMenu = (groupKey = '') => {
      if (!fan) return;
      fan.dataset.rbFooterFanLevel = groupKey ? 'children' : 'groups';
      fan.dataset.rbFooterFanGroup = groupKey;
      const group = groupKey ? footerMenuGroupByKey.get(groupKey) : null;
      const entries = group
        ? [
            { kind: 'back', labelKey: 'back', label: '\u05d7\u05d6\u05e8\u05d4', image: 'footbal.jpeg' },
            ...(group.links || []),
            ...(group.sports || []).map((slug) => sportBySlug.get(slug)).filter(Boolean),
          ]
        : footerMenuGroups;
      fan.innerHTML = entries.map((entry, index) => {
        const pos = itemPosition(index, entries.length);
        const style = `--rb-i:${index}; left:calc(50% - 38px + ${pos.x}px); bottom:${Math.abs(pos.y)}px;`;
        if (entry.kind === 'back') {
          return `
            <button class="rb-footer-fan-item rb-footer-fan-back" style="${style}" type="button" data-rb-footer-back="true">
              <span class="rb-footer-fan-img"><span class="rb-footer-fan-symbol">\u2039</span></span>
              <span data-rb-i18n="back">${t('back')}</span>
            </button>
          `;
        }
        if (entry.key) {
          return `
            <button class="rb-footer-fan-item rb-footer-fan-category" style="${style}" type="button" data-rb-footer-category="${entry.key}">
              <span class="rb-footer-fan-img"><img src="${sportImage(entry.image)}" alt=""></span>
              <span data-rb-i18n="${entry.labelKey}">${t(entry.labelKey, entry.label)}</span>
            </button>
          `;
        }
        if (entry.href) {
          return `
            <a class="rb-footer-fan-item rb-footer-fan-link" style="${style}" href="${entry.href}">
              <span class="rb-footer-fan-img"><img src="${sportImage(entry.image)}" alt=""></span>
              <span data-rb-i18n="${entry.labelKey}">${t(entry.labelKey, entry.label)}</span>
            </a>
          `;
        }
        return `
          <a class="rb-footer-fan-item rb-footer-fan-sport" style="${style}" href="/sport/live?sport=${encodeURIComponent(entry.slug)}" data-rb-sport-link="${entry.slug}">
            <span class="rb-footer-fan-img"><img src="${sportImage(entry.image)}" alt=""></span>
            <span data-rb-i18n="sport.${entry.slug}">${translatedSportLabel(entry)}</span>
          </a>
        `;
      }).join('');
      applyFrontendLanguage();
    };
    renderFanMenu();

    const setOpen = (open) => {
      document.body.classList.toggle('rb-footer-menu-open', open);
      localStorage.setItem(FOOTER_MENU_OPEN_KEY, open ? '1' : '0');
      const trigger = document.querySelector('[data-rb-footer-menu-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', String(open));
      if (open) renderFanMenu();
    };

    const trigger = document.querySelector('[data-rb-footer-menu-trigger]');
    if (trigger && !trigger.dataset.rbFooterMenuReady) {
      trigger.dataset.rbFooterMenuReady = 'true';
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(!document.body.classList.contains('rb-footer-menu-open'));
      });
    }

    if (fan && !fan.dataset.rbFooterFanReady) {
      fan.dataset.rbFooterFanReady = 'true';
      fan.addEventListener('click', (event) => {
        event.stopPropagation();
        const back = closest(event.target, '[data-rb-footer-back]');
        if (back) {
          event.preventDefault();
          renderFanMenu();
          return;
        }
        const category = closest(event.target, '[data-rb-footer-category]');
        if (category) {
          event.preventDefault();
          renderFanMenu(category.dataset.rbFooterCategory);
          return;
        }
        const link = closest(event.target, '[data-rb-sport-link]');
        if (link) {
          const sport = sportBySlug.get(link.dataset.rbSportLink);
          if (sport) localStorage.setItem(SPORT_SELECTION_KEY, JSON.stringify(sport));
          setOpen(false);
          return;
        }
        if (closest(event.target, '.rb-footer-fan-link')) setOpen(false);
      });
      document.addEventListener('click', (event) => {
        if (!document.body.classList.contains('rb-footer-menu-open')) return;
        if (closest(event.target, '[data-rb-footer-fan], [data-rb-footer-menu-trigger]')) return;
        setOpen(false);
      });
    }
  };

  const getInitialSport = () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('sport');
    if (slug && sportBySlug.has(slug)) return sportBySlug.get(slug);
    try {
      const saved = JSON.parse(localStorage.getItem(SPORT_SELECTION_KEY) || 'null');
      if (saved?.label) return saved;
    } catch {}
    return sportBySlug.get('football');
  };

  const renderSportContext = (sport) => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/betting' && !path.startsWith('/sport')) return;
    const selected = sport || getInitialSport();
    if (!selected?.label) return;
    document.querySelector('[data-rb-sport-context]')?.remove();
    document.body.dataset.rbActiveSport = selected.slug || 'sport';
    setupTopSportMenu();
    setupSportBettingPage(selected);
  };

  const stripLegacyDemoSportsContent = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/betting' && !path.startsWith('/sport')) return;

    const selectors = [
      '.dash-event-sports',
      '.sx-sports-swiper',
      '.sx-country-swiper',
      '#pmSportMenuSwiper',
      '.home-live-tabs',
      '.sx-match-list',
      '.sx-livematch-card',
      '.sx-prematch-card',
      '.sx-event-list-header',
      '.sportcountry-view',
      '.sportsbook-wrapper',
      'sportsbook',
      'app-sport',
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (node.closest('[data-rb-sport-page-betting]')) return;
        node.remove();
      });
    });
  };

  const stripHomeDemoSportsContent = () => {};
  const ensureHomeDemoCleanupObserver = () => {};

  const sliderKeyForPath = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/') return 'home';
    if (path.startsWith('/sport/')) return 'sportpage';
    if (path === '/betting') return 'betting';
    if (path === '/casino/live') return 'livecasino';
    if (path === '/casino/slot') return 'slot';
    if (path === '/casino/slotcategory47') return 'slotcategory47';
    if (path === '/casino/virtual') return 'virtual';
    if (path === '/casino/category') return 'casino';
    if (path === '/content/contacthelp') return 'contacthelp';
    if (path === '/content/lost_bonus') return 'lostbonus';
    if (path === '/point_system') return 'points';
    if (path === '/tournament') return 'tournament';
    return 'home';
  };

  const loadScriptOnce = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const setupPageSlider = async () => {
    if (!ENABLE_PAGE_SLIDER) {
      document.documentElement.classList.remove('rb-page-slider-pending');
      document.documentElement.classList.add('rb-page-slider-ready');
      return;
    }
    if (document.querySelector('[data-rb-page-slider]')) return;
    const key = sliderKeyForPath();
    try {
      await loadScriptOnce('/sliders/slider-runtime.js');
      await loadScriptOnce(`/sliders/${key}/slider.js`);
    } catch {
      // Slider assets are decorative; keep the page usable if a slider config is missing.
      document.documentElement.classList.remove('rb-page-slider-pending');
      document.documentElement.classList.add('rb-page-slider-ready');
    }
  };

  const activateWithin = (item, groupSelector, activeSelector) => {
    const group = closest(item, groupSelector);
    if (!group) return;
    group.querySelectorAll(activeSelector).forEach((el) => {
      el.classList.remove('active', 'rb-click-active');
    });
    item.classList.add('active', 'rb-click-active');
    const li = closest(item, 'li');
    if (li) li.classList.add('active', 'rb-click-active');
  };
  const SPORT_CONTROL_DEDUP_MS = 1200;
  let lastSportControlPressTs = 0;
  const handleSportControlPress = (event) => {
    const isClick = event.type === 'click';
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const isLiveLineRoute = currentPath === '/sport/live-line' || currentPath === '/live-line';
    if (isLiveLineRoute) return false;
    const onSportRoute = currentPath === '/betting' || currentPath.startsWith('/sport');
    if (isClick && lastSportControlPressTs > 0 && (Date.now() - lastSportControlPressTs) < SPORT_CONTROL_DEDUP_MS) return false;
    const submenuMount = closest(event.target, '[data-rb-sport-submenu]');
    if (submenuMount) {
      const lastScrollTs = Number(submenuMount.dataset.rbSubmenuLastScrollTs || 0);
      if (lastScrollTs > 0 && (Date.now() - lastScrollTs) < 260) return false;
    }
    const homeSubSportsMount = closest(event.target, '[data-rb-home-sub-sports]');
    if (homeSubSportsMount) {
      const lastScrollTs = Number(homeSubSportsMount.dataset.rbLastScrollTs || 0);
      if (lastScrollTs > 0 && (Date.now() - lastScrollTs) < 260) return false;
    }

    const topMenuTile = closest(event.target, '.dash-sports-slide, .sx-sport-list li, .sportcountry-view li, .sx-sports-swiper swiper-slide, .sx-country-swiper swiper-slide, a[data-rb-sport-slug]');
    if (topMenuTile && onSportRoute) {
      const topMenu = getTopSportMenu();
      const isInsideTopMenu = topMenu ? topMenu.contains(topMenuTile) : Boolean(closest(topMenuTile, '.sx-sports-swiper, .sx-country-swiper, .dash-event-sports, #pmSportMenuSwiper'));
      if (isInsideTopMenu) {
        event.preventDefault();
        event.stopPropagation();
        lastSportControlPressTs = Date.now();
        activateWithin(topMenuTile, 'swiper-container, ul, .dash-event-sports, .sx-sports-swiper, .sx-country-swiper', 'a, li, .dash-sports-slide, swiper-slide');
        const pickedSport = sportBySlug.get(topMenuTile.dataset.rbSportSlug || '') || sportFromText(topMenuTile.textContent) || null;
        if (!pickedSport?.slug || !pickedSport?.label) return true;
        const currentModeKey = document.querySelector('[data-rb-sport-page-betting]')?.dataset.rbSportPageMode || '';
        const modeOptions = sportPageModeOptions(pickedSport);
        const nextModeKey = modeOptions.some((option) => option.key === currentModeKey) ? currentModeKey : modeOptions[0]?.key;
        applySportSubmenuSelection(pickedSport, nextModeKey);
        return true;
      }
    }

    const odd = closest(event.target, '[data-rb-sport-page-bet-odd], [data-rb-home-bet-odd]');
    if (odd) {
      event.preventDefault();
      event.stopPropagation();
      const root = odd.closest('[data-rb-sport-page-betting]') || odd.closest('[data-rb-home-betting-board]') || document;
      return handleOddSelection(odd, root, event);
    }

    const submenuOption = closest(event.target, '[data-rb-sport-submenu-option]');
    if (submenuOption) {
      event.preventDefault();
      event.stopPropagation();
      lastSportControlPressTs = Date.now();
      const currentSport = sportBySlug.get(document.querySelector('[data-rb-sport-submenu]')?.dataset.rbSport || '');
      const topMenu = getTopSportMenu();
      const activeSport = topMenu?.querySelector('.dash-sports-slide.active, .dash-sports-slide.rb-click-active, a.active, a.rb-click-active');
      const sport = currentSport || sportFromText(activeSport?.textContent) || getInitialSport();
      if (!sport?.slug || !sport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      applySportSubmenuSelection(sport, submenuOption.dataset.rbSportSubmenuOption);
      return true;
    }

    const subSportOption = closest(event.target, '[data-rb-sport-submenu-sport]');
    if (subSportOption) {
      event.preventDefault();
      event.stopPropagation();
      lastSportControlPressTs = Date.now();
      const pickedSportSlug = subSportOption.dataset.rbSportSubmenuSport;
      const pickedSport = pickedSportSlug ? sportBySlug.get(pickedSportSlug) : null;
      if (!pickedSport?.slug || !pickedSport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      applySportSubmenuSelection(pickedSport, getSportSubmenu(pickedSport)[0]?.key || 'live');
      return true;
    }

    const homeMenu = closest(event.target, '[data-rb-home-sports]');
    const homeGroupButton = closest(event.target, '[data-rb-home-sport-group]');
    if (homeMenu && homeGroupButton) {
      event.preventDefault();
      event.stopPropagation();
      lastSportControlPressTs = Date.now();
      const mount = homeMenu.closest('[data-rb-sport-page-betting]');
      const groupsRow = closest(homeGroupButton, '[data-rb-home-sport-groups]');
      const groupKey = homeMenu.dataset.rbPendingHomeGroupKey
        || mount?.dataset?.rbPendingHomeGroupKey
        || homeGroupButton.dataset.rbHomeSportGroup;
      const resolvedButton = groupKey
        ? homeMenu.querySelector(`[data-rb-home-sport-group="${groupKey}"]`)
        : homeGroupButton;
      homeMenu.querySelectorAll('[data-rb-home-sport-group]').forEach((item) => item.classList.remove('active'));
      if (resolvedButton) resolvedButton.classList.add('active');
      const group = groupKey ? footerMenuGroupByKey.get(groupKey) : null;
      if (!group || !(group.sports || []).length) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      const firstSportSlug = (group.sports || [])[0];
      const firstSport = firstSportSlug ? sportBySlug.get(firstSportSlug) : null;
      if (!firstSport?.slug || !firstSport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      const renderer = mount && typeof mount.__rbRenderWithFixtures === 'function' ? mount.__rbRenderWithFixtures : null;
      if (mount) delete mount.dataset.rbPendingHomeGroupKey;
      delete homeMenu.dataset.rbPendingHomeGroupKey;
      if (renderer) {
        const pinnedGroupsScroll = firstFiniteNumber(
          readLogicalScrollLeft(groupsRow),
          mount.dataset.rbPinnedGroupScroll,
          homeMenu.dataset.rbPinnedGroupScroll,
          readLogicalScrollLeft(homeMenu.querySelector('[data-rb-home-sport-groups]'))
        );
        renderer(mount, {
          groupKey: group.key,
          sportSlug: firstSport.slug,
          modeKey: sportPageModeOptions(firstSport)[0]?.key,
          keepGroupScrollLeft: pinnedGroupsScroll,
          keepGroupKey: group.key,
        });
      } else {
        renderHomeSubSports(homeMenu, group.key, firstSport.slug);
      }
      return true;
    }

    const homeSubSportButton = closest(event.target, '[data-rb-home-sub-sport]');
    if (homeMenu && homeSubSportButton) {
      event.preventDefault();
      event.stopPropagation();
      lastSportControlPressTs = Date.now();
      const mount = homeMenu.closest('[data-rb-sport-page-betting]');
      const subSportsRow = closest(homeSubSportButton, '[data-rb-home-sub-sports]');
      const pickedSportSlug = homeMenu.dataset.rbPendingHomeSubSport
        || mount?.dataset?.rbPendingHomeSubSport
        || homeSubSportButton.dataset.rbHomeSubSport;
      const resolvedButton = pickedSportSlug
        ? homeMenu.querySelector(`[data-rb-home-sub-sport="${pickedSportSlug}"]`)
        : homeSubSportButton;
      homeMenu.querySelectorAll('[data-rb-home-sub-sport]').forEach((item) => item.classList.remove('active'));
      if (resolvedButton) resolvedButton.classList.add('active');
      const pickedSport = pickedSportSlug ? sportBySlug.get(pickedSportSlug) : null;
      if (!pickedSport?.slug || !pickedSport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      const group = sportPageGroupForSport(pickedSport);
      const renderer = mount && typeof mount.__rbRenderWithFixtures === 'function' ? mount.__rbRenderWithFixtures : null;
      const pinnedSubSportsScroll = firstFiniteNumber(
        readLogicalScrollLeft(subSportsRow),
        mount?.dataset?.rbPinnedSubSportsScroll,
        homeMenu.dataset.rbPinnedSubSportsScroll,
        readLogicalScrollLeft(homeMenu.querySelector('[data-rb-home-sub-sports]'))
      );
      if (mount) delete mount.dataset.rbPendingHomeSubSport;
      delete homeMenu.dataset.rbPendingHomeSubSport;
      if (renderer) {
        const currentModeKey = mount.dataset.rbSportPageMode || '';
        const modeOptions = sportPageModeOptions(pickedSport);
        const nextModeKey = modeOptions.some((option) => option.key === currentModeKey) ? currentModeKey : modeOptions[0]?.key;
        renderer(mount, {
          groupKey: group.key,
          sportSlug: pickedSport.slug,
          modeKey: nextModeKey,
          keepSubSportsScrollLeft: pinnedSubSportsScroll,
          keepSubSportKey: pickedSport.slug,
        });
      } else {
        renderHomeSubSports(homeMenu, group.key, pickedSport.slug);
      }
      return true;
    }

    const mount = closest(event.target, '[data-rb-sport-page-betting]');
    if (!mount) return false;
    const renderer = mount.__rbRenderWithFixtures;
    if (typeof renderer !== 'function') return false;

    const groupButton = closest(event.target, '[data-rb-sport-page-group]');
    if (groupButton) {
      event.preventDefault();
      event.stopPropagation();
      lastSportControlPressTs = Date.now();
      mount.querySelectorAll('[data-rb-sport-page-group]').forEach((item) => item.classList.remove('active'));
      groupButton.classList.add('active');
      const groupKey = groupButton.dataset.rbSportPageGroup;
      const group = groupKey ? footerMenuGroupByKey.get(groupKey) : null;
      if (!group || !(group.sports || []).length) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      const firstSportSlug = (group.sports || [])[0];
      const firstSport = firstSportSlug ? sportBySlug.get(firstSportSlug) : null;
      if (!firstSport?.slug || !firstSport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      renderer(mount, { groupKey: group.key, sportSlug: firstSport.slug, modeKey: sportPageModeOptions(firstSport)[0]?.key });
      return true;
    }

    const sportButton = closest(event.target, '[data-rb-sport-page-sport]');
    if (sportButton) {
      event.preventDefault();
      event.stopPropagation();
      lastSportControlPressTs = Date.now();
      mount.querySelectorAll('[data-rb-sport-page-sport]').forEach((item) => item.classList.remove('active'));
      sportButton.classList.add('active');
      const pickedSportSlug = sportButton.dataset.rbSportPageSport;
      const pickedSport = pickedSportSlug ? sportBySlug.get(pickedSportSlug) : null;
      if (!pickedSport?.slug || !pickedSport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      const group = sportPageGroupForSport(pickedSport);
      renderer(mount, { groupKey: group.key, sportSlug: pickedSport.slug, modeKey: sportPageModeOptions(pickedSport)[0]?.key });
      return true;
    }

    return false;
  };

  document.addEventListener('pointerup', (event) => {
    const genericOdd = closest(event.target, 'button[data-market][data-odds], [data-market][data-odds]');
    if (genericOdd) {
      event.preventDefault();
      event.stopPropagation();
      handleGenericOddSelection(genericOdd, event);
      return;
    }
    handleSportControlPress(event);
  }, true);
  const pinHomeGroupTapTarget = (event) => {
    const groupButton = closest(event.target, '[data-rb-home-sport-group]');
    if (!groupButton) return;
    const row = closest(groupButton, '[data-rb-home-sport-groups]');
    if (!row) return;
    const mount = closest(groupButton, '[data-rb-sport-page-betting]');
    const homeMenu = closest(groupButton, '[data-rb-home-sports]');
    const groupKey = groupButton.dataset.rbHomeSportGroup || '';
    const pinned = String(readLogicalScrollLeft(row) || 0);
    if (mount) mount.dataset.rbPinnedGroupScroll = pinned;
    if (homeMenu) homeMenu.dataset.rbPinnedGroupScroll = pinned;
    if (mount) mount.dataset.rbPendingHomeGroupKey = groupKey;
    if (homeMenu) homeMenu.dataset.rbPendingHomeGroupKey = groupKey;
  };
  const pinHomeSubSportTapTarget = (event) => {
    const subSportButton = closest(event.target, '[data-rb-home-sub-sport]');
    if (!subSportButton) return;
    const row = closest(subSportButton, '[data-rb-home-sub-sports]');
    if (!row) return;
    const mount = closest(subSportButton, '[data-rb-sport-page-betting]');
    const homeMenu = closest(subSportButton, '[data-rb-home-sports]');
    const sportKey = subSportButton.dataset.rbHomeSubSport || '';
    const pinned = String(readLogicalScrollLeft(row) || 0);
    if (mount) mount.dataset.rbPinnedSubSportsScroll = pinned;
    if (homeMenu) homeMenu.dataset.rbPinnedSubSportsScroll = pinned;
    if (mount) mount.dataset.rbPendingHomeSubSport = sportKey;
    if (homeMenu) homeMenu.dataset.rbPendingHomeSubSport = sportKey;
  };
  document.addEventListener('pointerdown', (event) => {
    pinHomeGroupTapTarget(event);
    pinHomeSubSportTapTarget(event);
  }, true);
  document.addEventListener('touchstart', (event) => {
    pinHomeGroupTapTarget(event);
    pinHomeSubSportTapTarget(event);
  }, { capture: true, passive: true });
  window.addEventListener('scroll', requestSyncSportSubmenuHitLayer, { passive: true });
  window.addEventListener('resize', requestSyncSportSubmenuHitLayer);
  window.addEventListener('resize', setupMobileFooter);

  document.addEventListener('click', (event) => {
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const currentSearch = window.location.search || '';
    const onSportRoute = currentPath === '/betting' || currentPath.startsWith('/sport');
    const knownSportInteractive = closest(
      event.target,
      [
        '.dash-sports-slide',
        '.sx-sport-list li',
        '.sportcountry-view li',
        '.sx-sports-swiper swiper-slide',
        '.sx-country-swiper swiper-slide',
        'a[data-rb-sport-slug]',
        '[data-rb-sport-page-bet-odd]',
        '[data-rb-home-bet-odd]',
        '[data-rb-sport-submenu-option]',
        '[data-rb-sport-submenu-sport]',
        '[data-rb-sport-page-group]',
        '[data-rb-sport-page-sport]',
        '[data-rb-home-sport-group]',
        '[data-rb-home-sub-sport]',
        '[data-rb-player-bets-close]',
        '[data-rb-player-bets-clear]',
        '[data-rb-player-account-link]',
        '.bm-betslip-btn a',
        '[data-rb-player-bets-toggle]',
        '#rb-site-header a',
        '.rb-mobile-footer a',
        '[data-rb-footer-fan] a',
        '.rb-footer-fan-item',
        '[data-rb-live-line-game]',
        '.rb-live-line-game-card',
        '[data-rb-live-line-market-toggle]',
        '.rb-live-line-market-btn',
        '[data-rb-live-line-pin]',
        '[data-rb-live-line-clear-bets]',
        '[data-rb-live-line-mini-slip]',
        '[data-rb-allow-nav]',
        'button',
        'input',
        'select',
        'textarea',
        'label',
      ].join(', ')
    );
    const rawLink = closest(event.target, 'a[href]');
    if (onSportRoute && !knownSportInteractive) {
      if (rawLink) event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const genericOdd = closest(event.target, 'button[data-market][data-odds], [data-market][data-odds]');
    if (genericOdd) {
      event.preventDefault();
      event.stopPropagation();
      handleGenericOddSelection(genericOdd, event);
      return;
    }
    if (handleSportControlPress(event)) return;
    const closePlayerBets = closest(event.target, '[data-rb-player-bets-close]');
    if (closePlayerBets) {
      event.preventDefault();
      document.querySelector('[data-rb-player-bets-card]')?.classList.remove('open');
      return;
    }

    const clearPlayerBets = closest(event.target, '[data-rb-player-bets-clear]');
    if (clearPlayerBets) {
      event.preventDefault();
      setPlayerBets([]);
      renderPlayerBetsCard(true);
      return;
    }

    const playerBetsTrigger = closest(event.target, '.bm-betslip-btn a, [data-rb-player-bets-toggle]');
    if (playerBetsTrigger) {
      event.preventDefault();
      renderPlayerBetsCard(true);
      return;
    }

    const link = closest(event.target, 'a[href]');
    if (link) {
      const href = link.getAttribute('href') || '';
      const allowNavLink = Boolean(
        closest(link, '#rb-site-header, .rb-mobile-footer, [data-rb-footer-fan], [data-rb-allow-nav]')
        || link.matches('[data-rb-player-account-link]')
        || link.classList.contains('rb-nav-link')
        || link.classList.contains('rb-dropdown-link')
        || link.classList.contains('rb-btn')
      );
      if (href === '' || href === '#' || href === 'javascript://' || href === 'javascript:void(0)') {
        event.preventDefault();
      }

      if (onSportRoute) {
        let nextPath = '';
        let nextSearch = '';
        if (internalRoute(href)) {
          try {
            const parsed = new URL(href, window.location.origin);
            nextPath = parsed.pathname.replace(/\/+$/, '') || '/';
            nextSearch = parsed.search || '';
          } catch {
            nextPath = href.split('?')[0].replace(/\/+$/, '') || '/';
          }
        } else if (/^https?:/i.test(href)) {
          try {
            const parsed = new URL(href);
            if (parsed.origin === window.location.origin) {
              nextPath = parsed.pathname.replace(/\/+$/, '') || '/';
              nextSearch = parsed.search || '';
            }
          } catch {}
        }
        const sameRoute = nextPath && nextPath === currentPath && nextSearch === currentSearch;
        if (sameRoute) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      if (
        closest(link, '.sx-sport-list, .sportcountry-view, .home-live-tabs, .market-filter, .dash-event-sports, .sx-sports-swiper, .sx-country-swiper')
      ) {
        activateWithin(link, 'ul, .market-filter, swiper-container, .dash-event-sports, .sx-sports-swiper, .sx-country-swiper', 'a, li, .dash-sports-slide, swiper-slide');
      }

      if (onSportRoute && internalRoute(href) && !allowNavLink) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (internalRoute(href) && !href.includes('_.html')) {
        return;
      }
    }

    const sportTile = closest(event.target, '.dash-sports-slide, .sx-sport-list li, .sportcountry-view li, .sx-sports-swiper swiper-slide, .sx-country-swiper swiper-slide');
    const isSportMenuTile = sportTile
      ? Boolean(closest(sportTile, '.sx-sport-list, .sportcountry-view, .dash-event-sports, .sx-sports-swiper, .sx-country-swiper, [data-rb-top-sport-menu]'))
      : false;
    if (sportTile && isSportMenuTile) {
      activateWithin(sportTile, 'swiper-container, ul, .dash-event-sports, .sx-sports-swiper, .sx-country-swiper', '.dash-sports-slide, li, swiper-slide, a');
    }

    const submenuOption = closest(event.target, '[data-rb-sport-submenu-option]');
    if (submenuOption) {
      event.preventDefault();
      event.stopPropagation();
      const currentSport = sportBySlug.get(document.querySelector('[data-rb-sport-submenu]')?.dataset.rbSport || '');
      const topMenu = getTopSportMenu();
      const activeSport = topMenu?.querySelector('.dash-sports-slide.active, .dash-sports-slide.rb-click-active, a.active, a.rb-click-active');
      const sport = currentSport || sportFromText(activeSport?.textContent) || getInitialSport();
      if (!sport?.slug || !sport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      applySportSubmenuSelection(sport, submenuOption.dataset.rbSportSubmenuOption);
    }

    const subSportOption = closest(event.target, '[data-rb-sport-submenu-sport]');
    if (subSportOption) {
      event.preventDefault();
      event.stopPropagation();
      const pickedSportSlug = subSportOption.dataset.rbSportSubmenuSport;
      const pickedSport = pickedSportSlug ? sportBySlug.get(pickedSportSlug) : null;
      if (!pickedSport?.slug || !pickedSport?.label) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      applySportSubmenuSelection(pickedSport, getSportSubmenu(pickedSport)[0]?.key || 'live');
    }

    const odd = closest(
      event.target,
      '.rb-odds button, .odd, .odd-btn, .market-odd, .bet-option, .sx-odd, .sx-bet-btn, .sx-market-odd, .sx-odd-cell, .odd-cell, [class*="odd-value"], [class*="market-odd"], [class*="selection"]'
    );
    if (odd && !closest(odd, '#royalbet-strapi-bridge')) {
      document.querySelectorAll('.rb-odd-selected').forEach((el) => el.classList.remove('rb-odd-selected'));
      odd.classList.add('rb-odd-selected');
    }
  }, true);
  document.addEventListener('submit', (event) => {
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const onSportRoute = currentPath === '/betting' || currentPath.startsWith('/sport');
    if (!onSportRoute) return;
    const form = event.target;
    if (!form || typeof form.getAttribute !== 'function') return;
    if (form.hasAttribute('data-rb-allow-submit')) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  document.addEventListener('input', (event) => {
    const stakeInput = closest(event.target, '[data-rb-player-bet-stake]');
    if (!stakeInput) return;
    onPlayerStakeInput(stakeInput);
  }, true);
  document.addEventListener('change', (event) => {
    const stakeInput = closest(event.target, '[data-rb-player-bet-stake]');
    if (!stakeInput) return;
    onPlayerStakeInput(stakeInput);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeVendorWarnings();
      setupLanguageSelector();
      setupBetslipToggle();
      setupMobileFooter();
      setupFooterSportFan();
      setupHomeSportsExplorer();
      setupHomeCasinoShowcase();
      setupCasinoPageExperience();
      renderPlayerBetsCard(false);
      if (ENABLE_PAGE_SLIDER) setupPageSlider();
      renderSportContext();
      stripLegacyDemoSportsContent();
      stripHomeDemoSportsContent();
      ensureHomeDemoCleanupObserver();
      requestSyncSportSubmenuHitLayer();
      preloadSiteTranslations().finally(() => applyFrontendLanguage(getSiteLanguage()));
    });
  } else {
    removeVendorWarnings();
    setupLanguageSelector();
    setupBetslipToggle();
    setupMobileFooter();
    setupFooterSportFan();
    setupHomeSportsExplorer();
    setupHomeCasinoShowcase();
    setupCasinoPageExperience();
    renderPlayerBetsCard(false);
    if (ENABLE_PAGE_SLIDER) setupPageSlider();
    renderSportContext();
    stripLegacyDemoSportsContent();
    stripHomeDemoSportsContent();
    ensureHomeDemoCleanupObserver();
    requestSyncSportSubmenuHitLayer();
    preloadSiteTranslations().finally(() => applyFrontendLanguage(getSiteLanguage()));
  }
  setTimeout(removeVendorWarnings, 400);
  setTimeout(removeVendorWarnings, 1200);
  setTimeout(setupLanguageSelector, 500);
  setTimeout(applyFrontendLanguage, 1300);
  setTimeout(setupBetslipToggle, 800);
  setTimeout(setupMobileFooter, 800);
  setTimeout(setupFooterSportFan, 900);
  setTimeout(setupHomeSportsExplorer, 900);
  setTimeout(setupHomeCasinoShowcase, 1000);
  setTimeout(() => renderPlayerBetsCard(false), 1100);
  if (ENABLE_PAGE_SLIDER) setTimeout(setupPageSlider, 800);
  setTimeout(renderSportContext, 1000);
  setTimeout(stripLegacyDemoSportsContent, 900);
  setTimeout(stripLegacyDemoSportsContent, 1600);
  setTimeout(stripHomeDemoSportsContent, 900);
  setTimeout(stripHomeDemoSportsContent, 1600);
  setTimeout(ensureHomeDemoCleanupObserver, 300);
  setTimeout(ensureHomeDemoCleanupObserver, 1300);
  setTimeout(setupHomeSportsExplorer, 1400);
  setTimeout(setupHomeCasinoShowcase, 1800);
  setTimeout(setupHomeCasinoShowcase, 2800);
  setTimeout(requestSyncSportSubmenuHitLayer, 700);
  setTimeout(requestSyncSportSubmenuHitLayer, 1400);
  setTimeout(requestSyncSportSubmenuHitLayer, 2400);
}());


