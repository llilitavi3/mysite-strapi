(function () {


  'use strict';





  const DEFAULT_API = 'https://addapi.royalbet88.live';


  const STORAGE_KEY = 'royalbet_api_jwt';


  const COLLAPSED_KEY = 'royalbet_bridge_collapsed';


  const rootId = 'royalbet-strapi-bridge';


  const ME_CACHE_TTL_MS = 15000;


  const BETS_CACHE_TTL_MS = 15000;


  if (window.self !== window.top) return;


  const defaultApiBase = () => {


    if (window.ROYALBET_API_BASE) return window.ROYALBET_API_BASE;


    if (['localhost', 'localhost'].includes(window.location.hostname)) return 'http://localhost:1337';


    return DEFAULT_API;


  };


  const state = {


    apiBase: defaultApiBase(),


    collapsed: localStorage.getItem(COLLAPSED_KEY) !== '0',


    user: null,


    fixtures: [],


    bets: [],


    selectedBet: null,


    playerView: 'profile',


  };


  let loadMeInFlight = null;


  let loadBetsInFlight = null;


  let lastMeFetchAt = 0;


  let lastBetsFetchAt = 0;





  const isDemoFixtureLike = (attrs) => {


    const text = [


      attrs?.fixture_id,


      attrs?.home_team,


      attrs?.away_team,


      attrs?.league_name,


      attrs?.sport_title,


      attrs?.sport_key,


      attrs?.bookmaker,


      attrs?.provider,


    ].filter(Boolean).join(' ').toLowerCase();





    if (attrs?.is_demo || attrs?.is_mock || attrs?.demo === true || attrs?.mock === true || attrs?.test === true) {


      return true;


    }





    if (!text) return false;


    return /(royal tel aviv|jerusalem crown|red haifa|ashdod 88|\b(?:demo|mock|test|sample|dummy|sandbox|qa)\b| )/i.test(text);


  };





  const qs = (selector, scope = document) => scope.querySelector(selector);


  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));


  const AUTH_TOKEN_KEYS = [STORAGE_KEY, 'jwt', 'token'];


  const USER_KEYS = ['royalbet_user', 'user'];


  const token = () => {


    if (window.RBSecurity && typeof window.RBSecurity.getToken === 'function') {


      return window.RBSecurity.getToken();


    }


    return AUTH_TOKEN_KEYS.map((key) => sessionStorage.getItem(key) || localStorage.getItem(key)).find(Boolean) || '';


  };


  const readStoredUser = () => {


    if (window.RBSecurity && typeof window.RBSecurity.getUser === 'function') {


      const user = window.RBSecurity.getUser();


      if (user && typeof user === 'object' && Object.keys(user).length) return user;


    }


    for (const key of USER_KEYS) {


      try {


        const value = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null');


        if (value && typeof value === 'object') return value;


      } catch {


        // Ignore bad cached auth state and try the next key.


      }


    }


    return null;


  };


  const saveAuth = (jwt, user) => {


    if (jwt && window.RBSecurity && typeof window.RBSecurity.setToken === 'function') {


      window.RBSecurity.setToken(jwt);


    } else if (jwt) {


      AUTH_TOKEN_KEYS.forEach((key) => sessionStorage.setItem(key, jwt));


    }


    if (user && window.RBSecurity && typeof window.RBSecurity.setUser === 'function') {


      window.RBSecurity.setUser(user);


    } else if (user) {


      USER_KEYS.forEach((key) => sessionStorage.setItem(key, JSON.stringify(user)));


    }


  };


  const clearAuth = () => {


    if (window.RBSecurity && typeof window.RBSecurity.clearAuth === 'function') {


      window.RBSecurity.clearAuth();


      lastMeFetchAt = 0;


      lastBetsFetchAt = 0;


      return;


    }


    [...AUTH_TOKEN_KEYS, ...USER_KEYS].forEach((key) => {


      sessionStorage.removeItem(key);


      localStorage.removeItem(key);


    });


    lastMeFetchAt = 0;


    lastBetsFetchAt = 0;


  };


  const money = (value) => Number(value || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });


  const dateTime = (value) => {


    if (!value) return '-';


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) return '-';


    return date.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });


  };


  const initials = (user) => {


    const base = String(user?.username || user?.email || 'RB').trim();


    return base.slice(0, 2).toUpperCase();


  };


  const roleLabel = (role) => {


    const type = role?.type || role || 'player';


    return ({ player: '', agent: '', master: '', admin: '' })[type] || type;


  };


  const marketLabel = (market, prediction) => {


    if (prediction) return prediction;


    return ({ home: '1', draw: 'X', away: '2' })[market] || market || '-';


  };


  const statusLabel = (status) => {


    const key = String(status || 'pending').toLowerCase();


    return ({ pending: '', won: '', lost: '', void: '', canceled: '', open: '' })[key] || status || '';


  };


  const isRealOddValue = (value) => {


    const parsed = Number(value);


    return Number.isFinite(parsed) && parsed > 1;


  };


  const realFixtureMarkets = (attrs) => [


    { market: 'home', label: '1', odds: attrs?.odds_home },


    { market: 'draw', label: 'X', odds: attrs?.odds_draw },


    { market: 'away', label: '2', odds: attrs?.odds_away },


  ].filter((item) => isRealOddValue(item.odds));


  const glossaryState = {


    loadedByLocale: new Map(),


    activeLocale: '',


    terms: new Map(),


  };


  const LANGUAGE_KEY = 'royalbet_site_language';


  const supportedLocales = new Set(['he', 'en', 'es', 'fr', 'ar']);


  const currentLocale = () => {


    const raw = String(localStorage.getItem(LANGUAGE_KEY) || 'he').trim().toLowerCase();


    return supportedLocales.has(raw) ? raw : 'he';


  };


  const normalizeGlossaryKey = (value) => String(value || '')


    .toLowerCase()


    .replace(/[_/]+/g, ' ')


    .replace(/[^\p{L}\p{N}+\-.\s]/gu, ' ')


    .replace(/\s+/g, ' ')


    .trim();


  const applyGlossaryTerms = (terms) => {


    const next = new Map();


    Object.entries(terms || {}).forEach(([rawKey, rawValue]) => {


      const key = normalizeGlossaryKey(rawKey);


      const value = typeof rawValue === 'string' ? rawValue.trim() : '';


      if (key && value) next.set(key, value);


    });


    glossaryState.terms = next;


    glossaryState.activeLocale = currentLocale();


    glossaryState.loadedByLocale.set(glossaryState.activeLocale, next);


  };


  const translateTerm = (value, fallback = '') => {


    if (value == null || value === '') return fallback || '';


    const raw = String(value).trim();


    if (!raw) return fallback || '';


    const direct = glossaryState.terms.get(normalizeGlossaryKey(raw));


    if (direct) return direct;


    const parts = raw.split(/(\s+|\/|\\|\||,|:|\(|\)|\[|\]|\{|\}|-)/g);


    let replaced = 0;


    const merged = parts.map((part) => {


      const key = normalizeGlossaryKey(part);


      if (!key) return part;


      const hit = glossaryState.terms.get(key);


      if (!hit) return part;


      replaced += 1;


      return hit;


    }).join('');


    return replaced > 0 ? merged : (fallback || raw);


  };


  const loadGlossary = async () => {


    const locale = currentLocale();


    const cached = glossaryState.loadedByLocale.get(locale);


    if (cached) {


      glossaryState.activeLocale = locale;


      glossaryState.terms = cached;


      return glossaryState.terms;


    }


    try {


      const body = await api(`/api/public-glossary?locale=${encodeURIComponent(locale)}`);


      const terms = body?.data?.terms || body?.terms || body?.data?.sportGlossary?.terms || body?.data?.sportGlossary || {};


      applyGlossaryTerms(terms);


    } catch {


      applyGlossaryTerms({});


    }


    return glossaryState.terms;


  };


  const api = async (path, options = {}) => {


    const headers = {


      Accept: 'application/json',


      ...(options.body ? { 'Content-Type': 'application/json' } : {}),


      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),


      ...(options.headers || {}),


    };





    let response;


    try {


      response = await fetch(`${state.apiBase}${path}`, {


        credentials: 'include',


        ...options,


        headers,


      });


    } catch (error) {


      throw new Error(`   -Strapi (${state.apiBase}).     .`);


    }





    const contentType = response.headers.get('content-type') || '';


    const body = contentType.includes('application/json') ? await response.json() : await response.text();


    if (!response.ok) {


      const message = typeof body === 'string' ? body : body?.error?.message || body?.message || 'Request failed';


      throw new Error(message);


    }


    return body;


  };





  const setStatus = (message, tone = 'muted') => {


    const el = qs('[data-rb-status]');


    if (!el) return;


    el.textContent = message;


    el.dataset.tone = tone;


  };





  const html = () => `


    <section class="rb-panel" dir="rtl">


      <div class="rb-top">


        <div>


          <strong>RoyalBet Live</strong>


        </div>


        <div class="rb-actions">


          <div class="rb-user" data-rb-user></div>


          <button class="rb-toggle" data-rb-toggle type="button" aria-expanded="false">


            <span data-rb-toggle-label></span>


          </button>


        </div>


      </div>


      <div class="rb-auth" data-rb-auth>


        <input data-rb-identifier placeholder="   " autocomplete="username">


        <input data-rb-password placeholder="" type="password" autocomplete="current-password">


        <input data-rb-email placeholder=" " autocomplete="email">


        <button data-rb-login></button>


        <button data-rb-register></button>


      </div>


      <div class="rb-message" data-rb-status data-tone="muted"> -Strapi...</div>


      <div class="rb-player" data-rb-player hidden>


        <div class="rb-player-tabs" role="tablist" aria-label=" ">


          <button data-rb-player-view="profile" type="button"></button>


          <button data-rb-player-view="bets" type="button"> </button>


        </div>


        <div class="rb-profile-view" data-rb-profile-view>


          <div class="rb-profile-head">


            <div class="rb-avatar" data-rb-avatar>RB</div>


            <div>


              <strong data-rb-profile-name></strong>


              <span data-rb-profile-email>-</span>


            </div>


          </div>


          <div class="rb-profile-grid">


            <div><span></span><strong data-rb-profile-balance>0</strong></div>


            <div><span></span><strong data-rb-profile-role></strong></div>


            <div><span></span><strong data-rb-profile-agent>-</strong></div>


            <div><span></span><strong data-rb-profile-updated>-</strong></div>


          </div>


          <div class="rb-profile-stats">


            <div><span></span><strong data-rb-stat-count>0</strong></div>


            <div><span></span><strong data-rb-stat-open>0</strong></div>


            <div><span>" </span><strong data-rb-stat-stake>0</strong></div>


          </div>


        </div>


        <div class="rb-bets-view" data-rb-bets-view hidden>


          <div class="rb-bets-list" data-rb-bets-list></div>


        </div>


      </div>


      <div class="rb-bet">


        <div class="rb-fixtures" data-rb-fixtures></div>


        <div class="rb-slip">


          <strong> </strong>


          <div data-rb-selection>   </div>


          <input data-rb-stake placeholder="" type="number" min="1" step="1">


          <button data-rb-place disabled> </button>


          <button data-rb-logout hidden></button>


        </div>


      </div>


    </section>


  `;





  const css = () => {


    const style = document.createElement('style');


    style.textContent = `


      #${rootId} {


        position: fixed;


        right: 14px;


        bottom: 14px;


        z-index: 0;


        width: min(420px, calc(100vw - 28px));


        font-family: inherit;


      }


      #${rootId} .rb-panel {


        background:


          radial-gradient(circle at 50% -20%, #ae302f75, transparent 42%),


          linear-gradient(135deg, rgba(6, 3, 3, .98), rgba(34, 6, 7, .96) 58%, rgba(8, 3, 3, .98));


        border: 1px solid #ae2f2f7e;


        border-radius: 14px;


        color: #fff;


        box-shadow:


          inset 0 0 0 1px rgba(255, 255, 255, .04),


          0 20px 56px rgba(0, 0, 0, .42),


          0 0 34px rgba(174, 48, 47, .24);


        overflow: auto;


        max-height: min(540px, calc(100vh - 108px));


      }


      #${rootId} .rb-top,


      #${rootId} .rb-auth,


      #${rootId} .rb-bet,


      #${rootId} .rb-slip {


        display: flex;


        gap: 8px;


        align-items: center;


      }


      #${rootId} .rb-top {


        justify-content: space-between;


        padding: 8px 10px;


        border-bottom: 1px solid rgba(174, 48, 47, .32);


      }


      #${rootId}[data-collapsed="true"] {


        width: min(330px, calc(100vw - 28px));


      }


      #${rootId}[data-collapsed="true"] .rb-auth,


      #${rootId}[data-collapsed="true"] .rb-bet {


        display: none;


      }


      #${rootId}[data-collapsed="true"] .rb-top {


        border-bottom: 0;


      }


      #${rootId} .rb-actions {


        display: flex;


        align-items: center;


        gap: 8px;


      }


      #${rootId} [data-rb-status] {


        display: block;


        color: #cbb9b8;


        font-size: 12px;


      }


      #${rootId} .rb-message {


        padding: 6px 10px;


        border-bottom: 1px solid rgba(174, 48, 47, .22);


        background: rgba(0, 0, 0, .18);


        min-height: 28px;


      }


      #${rootId} .rb-player {


        padding: 8px 10px;


        border-bottom: 1px solid rgba(174, 48, 47, .22);


        background: #00000029;


      }


      #${rootId}[data-collapsed="true"] .rb-player {


        display: none;


      }


      #${rootId} .rb-player-tabs {


        display: grid;


        grid-template-columns: 1fr 1fr;


        gap: 6px;


        margin-bottom: 8px;


      }


      #${rootId} .rb-player-tabs button {


        height: 30px;


        background: #ffffff12;


        border: 1px solid rgba(174, 48, 47, .34);


        font-size: 12px;


      }


      #${rootId} .rb-player-tabs button.active {


        background: linear-gradient(180deg, #e4464378, #ae302f 58%, #671211);


        border-color: rgba(255, 255, 255, .36);


      }


      #${rootId} .rb-profile-head {


        display: grid;


        grid-template-columns: 44px 1fr;


        gap: 8px;


        align-items: center;


        margin-bottom: 8px;


      }


      #${rootId} .rb-avatar {


        width: 44px;


        height: 44px;


        border-radius: 999px;


        display: grid;


        place-items: center;


        background:


          radial-gradient(circle at 35% 25%, #ffffff3d, transparent 32%),


          linear-gradient(180deg, #e44743, #7a1514);


        border: 1px solid rgba(255, 255, 255, .28);


        font-weight: 600;


        letter-spacing: 0;


      }


      #${rootId} .rb-profile-head strong,


      #${rootId} .rb-profile-head span {


        display: block;


      }


      #${rootId} .rb-profile-head span {


        color: #d0bcbb;


        font-size: 11px;


        overflow: hidden;


        text-overflow: ellipsis;


      }


      #${rootId} .rb-profile-grid,


      #${rootId} .rb-profile-stats {


        display: grid;


        grid-template-columns: repeat(2, minmax(0, 1fr));


        gap: 6px;


      }


      #${rootId} .rb-profile-stats {


        grid-template-columns: repeat(3, minmax(0, 1fr));


        margin-top: 6px;


      }


      #${rootId} .rb-profile-grid div,


      #${rootId} .rb-profile-stats div {


        min-width: 0;


        border: 1px solid rgba(174, 48, 47, .24);


        border-radius: 7px;


        background: rgba(5, 2, 2, .48);


        padding: 6px;


      }


      #${rootId} .rb-profile-grid span,


      #${rootId} .rb-profile-stats span {


        display: block;


        color: #c9b1b0;


        font-size: 10px;


        line-height: 1.2;


      }


      #${rootId} .rb-profile-grid strong,


      #${rootId} .rb-profile-stats strong {


        display: block;


        margin-top: 3px;


        font-size: 12px;


        line-height: 1.2;


        overflow: hidden;


        text-overflow: ellipsis;


        white-space: nowrap;


      }


      #${rootId} .rb-bets-list {


        display: grid;


        gap: 6px;


        max-height: 160px;


        overflow: auto;


        padding-inline-end: 2px;


      }


      #${rootId} .rb-bet-row {


        border: 1px solid rgba(174, 48, 47, .26);


        border-radius: 8px;


        background: rgba(5, 2, 2, .52);


        padding: 7px;


      }


      #${rootId} .rb-bet-row-top {


        display: flex;


        justify-content: space-between;


        gap: 8px;


        font-size: 12px;


        line-height: 1.25;


      }


      #${rootId} .rb-bet-row-meta {


        display: grid;


        grid-template-columns: repeat(4, minmax(0, 1fr));


        gap: 4px;


        margin-top: 6px;


        color: #d8c9c8;


        font-size: 10px;


      }


      #${rootId} .rb-bet-row-meta span {


        background: rgba(255, 255, 255, .06);


        border-radius: 5px;


        padding: 4px;


        text-align: center;


      }


      #${rootId}[data-collapsed="true"] .rb-message {


        display: none;


      }


      #${rootId} [data-tone="ok"] { color: #ffd1d0; }


      #${rootId} [data-tone="warn"] { color: #ffcf5c; }


      #${rootId} [data-tone="error"] { color: #ff6b6b; }


      #${rootId} .rb-user {


        background: rgba(174, 48, 47, .16);


        border: 1px solid rgba(174, 48, 47, .34);


        border-radius: 6px;


        padding: 8px 10px;


        white-space: nowrap;


      }


      #${rootId} .rb-toggle {


        min-width: 58px;


      }


      #${rootId} .rb-auth {


        padding: 8px 10px;


        border-bottom: 1px solid rgba(174, 48, 47, .26);


        flex-wrap: wrap;


      }


      #${rootId} input {


        min-width: 118px;


        height: 32px;


        border-radius: 6px;


        border: 1px solid rgba(174, 48, 47, .34);


        background: #090304c7;


        color: #fff;


        padding: 0 10px;


      }


      #${rootId} input::placeholder { color: #c4adac; }


      #${rootId} button {


        height: 32px;


        border: 0;


        border-radius: 6px;


        background: linear-gradient(180deg, #e44743, #ae302f 58%, #671211);


        color: #fff;


        padding: 0 12px;


        cursor: pointer;


        font-weight: 500;


      }


      #${rootId} button:disabled {


        cursor: not-allowed;


        opacity: .5;


      }


      #${rootId} .rb-bet {


        align-items: stretch;


        flex-direction: column;


        padding: 8px 10px 10px;


        max-height: 386px;


        overflow: auto;


      }


      #${rootId} .rb-fixtures {


        display: grid;


        grid-template-columns: 1fr;


        gap: 6px;


        flex: none;


      }


      #${rootId} .rb-match {


        background: rgba(12, 4, 5, .72);


        border: 1px solid rgba(174, 48, 47, .3);


        border-radius: 8px;


        padding: 7px;


      }


      #${rootId} .rb-match-title {


        font-size: 11px;


        line-height: 1.35;


        margin-bottom: 5px;


        min-height: auto;


      }


      #${rootId} .rb-odds {


        display: grid;


        grid-template-columns: repeat(3, 1fr);


        gap: 5px;


      }


      #${rootId} .rb-odds button {


        background: rgba(255, 255, 255, .08);


        border: 1px solid rgba(174, 48, 47, .32);


        font-size: 11px;


        padding: 0 5px;


      }


      #${rootId} .rb-odds button.active {


        background: linear-gradient(180deg, #f0eeee, #cfc4c3);


        border-color: rgba(255, 255, 255, .72);


        color: #5b0d0c;


      }


      #${rootId} .rb-slip {


        width: 100%;


        align-items: stretch;


        flex-direction: column;


        background: rgba(5, 2, 2, .56);


        border: 1px solid rgba(174, 48, 47, .28);


        border-radius: 8px;


        padding: 8px;


        order: -1;


      }


      #${rootId} .rb-slip input,


      #${rootId} .rb-slip button {


        width: 100%;


      }


            @media (max-width: 900px) {


        #${rootId} {


          right: 12px;


          left: 12px;


          /*            */


          bottom: 90px;


          /*             */


          width: min(390px, calc(100vw - 24px));


          margin: 0 auto;


        }


        #${rootId}[data-collapsed="true"] {


          right: 12px;


          left: auto;


          top: 50%;


          bottom: auto;


          width: 58px;


          transform: translateY(-50%);


        }


        #${rootId} .rb-panel {


          /*            */


          max-height: min(340px, calc(100vh - 180px));


        }


        #${rootId}[data-collapsed="true"] .rb-panel {


          width: 58px;


          height: 58px;


          border-radius: 999px;


          overflow: hidden;


          background:


            radial-gradient(circle at 35% 25%, #ffffff38, transparent 30%),


            linear-gradient(180deg, #e44743f5, #ae302ff5 58%, rgba(80, 10, 10, .98));


          box-shadow: 0 12px 28px rgba(0, 0, 0, .36), 0 0 22px rgba(174, 48, 47, .28);


        }


        #${rootId} .rb-top {


          padding: 6px 8px;


        }


        #${rootId}[data-collapsed="true"] .rb-top {


          width: 58px;


          height: 58px;


          min-height: 58px;


          padding: 0;


          justify-content: center;


        }


        #${rootId}[data-collapsed="true"] .rb-top > div:first-child {


          display: none;


        }


        #${rootId}[data-collapsed="true"] .rb-top strong {


          font-size: 18px;


          white-space: nowrap;


        }


        #${rootId}[data-collapsed="true"] .rb-actions {


          margin: 0;


        }


        #${rootId}[data-collapsed="true"] .rb-toggle {


          width: 58px;


          min-width: 58px;


          height: 58px;


          border-radius: 999px;


          padding: 0;


          font-size: 0;


          box-shadow: none;


        }


        #${rootId}[data-collapsed="true"] .rb-toggle::before {


          content: "+";


          font-size: 30px;


          line-height: 1;


        }


        #${rootId} .rb-user {


          display: none;


        }


        #${rootId} .rb-auth {


          display: grid;


          grid-template-columns: 1fr 1fr;


          gap: 6px;


          padding: 6px 8px;


        }


        #${rootId} .rb-auth input {


          min-width: 0;


          width: 100%;


          height: 28px;


          padding: 0 8px;


          font-size: 12px;


        }





        #${rootId} .rb-auth button {


          height: 30px;


          padding: 0 8px;


          font-size: 12px;


        }


        #${rootId} .rb-message {


          padding: 5px 8px;


          min-height: 24px;


          font-size: 11px;


        }


        #${rootId} .rb-player {


          padding: 6px 8px;


        }


        #${rootId} .rb-player-tabs {


          margin-bottom: 6px;


        }


        #${rootId} .rb-player-tabs button {


          height: 26px;


          font-size: 11px;


        }


        #${rootId} .rb-profile-head {


          grid-template-columns: 34px 1fr;


          margin-bottom: 6px;


        }


        #${rootId} .rb-avatar {


          width: 34px;


          height: 34px;


          font-size: 12px;


        }


        #${rootId} .rb-profile-grid div,


        #${rootId} .rb-profile-stats div {


          padding: 5px;


        }


        #${rootId} .rb-bets-list {


          max-height: 110px;


        }


        #${rootId} .rb-bet {


          flex-direction: column;


          max-height: 132px;


          padding: 6px 8px 8px;


          gap: 6px;


        }


        #${rootId} .rb-fixtures {


          grid-template-columns: 1fr;


          width: 100%;


          align-self: stretch;


          max-height: 52px;


          overflow: hidden;


        }


        #${rootId} .rb-fixtures [data-rb-fixture]:nth-child(n+2) {


          display: none;


        }


        #${rootId} .rb-slip {


          width: 100%;


          padding: 6px;


          gap: 5px;


        }


        #${rootId} .rb-slip strong {


          font-size: 12px;


        }


        #${rootId} [data-rb-selection] {


          font-size: 11px;


          line-height: 1.25;


        }


        #${rootId} .rb-slip input,


        #${rootId} .rb-slip button {


          height: 28px;


          font-size: 12px;


        }


        #${rootId} .rb-match {


          padding: 5px;


        }


        #${rootId} .rb-match-title {


          display: none;


        }


        #${rootId} .rb-odds {


          grid-template-columns: repeat(3, minmax(0, 1fr));


          gap: 4px;


        }


        #${rootId} .rb-odds button {


          height: 26px;


          min-width: 0;


          padding: 0 6px;


          font-size: 11px;


        }


      }


    `;


    document.head.appendChild(style);


  };





  const setCollapsed = (collapsed) => {


    state.collapsed = collapsed;


    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');


    const root = qs(`#${rootId}`);


    const toggle = qs('[data-rb-toggle]');


    const label = qs('[data-rb-toggle-label]');


    if (root) root.dataset.collapsed = String(collapsed);


    if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));


    if (label) label.textContent = collapsed ? '' : '';


  };





  const renderPlayer = () => {


    const playerEl = qs('[data-rb-player]');


    if (!playerEl) return;


    playerEl.hidden = !state.user;


    if (!state.user) return;





    const profileView = qs('[data-rb-profile-view]');


    const betsView = qs('[data-rb-bets-view]');


    if (profileView) profileView.hidden = state.playerView !== 'profile';


    if (betsView) betsView.hidden = state.playerView !== 'bets';


    qsa('[data-rb-player-view]').forEach((button) => {


      button.classList.toggle('active', button.dataset.rbPlayerView === state.playerView);


    });





    const role = state.user.role?.type || state.user.role || 'player';


    const agent = state.user.agent?.username || state.user.agent?.email || '-';


    const openCount = state.bets.filter((bet) => ['pending', 'open'].includes(String(bet.status || '').toLowerCase())).length;


    const totalStake = state.bets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);





    const setText = (selector, value) => {


      const el = qs(selector);


      if (el) el.textContent = String(value);


    };





    setText('[data-rb-avatar]', initials(state.user));


    setText('[data-rb-profile-name]', state.user.username || '');


    setText('[data-rb-profile-email]', state.user.email || '-');


    setText('[data-rb-profile-balance]', money(state.user.balance));


    setText('[data-rb-profile-role]', roleLabel(role));


    setText('[data-rb-profile-agent]', agent);


    setText('[data-rb-profile-updated]', dateTime(state.user.updatedAt || state.user.createdAt));


    setText('[data-rb-stat-count]', state.bets.length);


    setText('[data-rb-stat-open]', openCount);


    setText('[data-rb-stat-stake]', money(totalStake));





    const list = qs('[data-rb-bets-list]');


    if (!list) return;


    if (!state.bets.length) {


      list.innerHTML = '<div class="rb-bet-row">   .</div>';


      return;


    }





    list.innerHTML = state.bets.map((bet) => `


  <article class="rb-bet-row">


    <div class="rb-bet-row-top">


      <strong>${bet.home_team || ' '} - ${bet.away_team || ' '}</strong>


      <span class="rb-status-${bet.status}">${statusLabel(bet.status)}</span>


    </div>


    <div class="rb-bet-row-meta">


      <span>${marketLabel(bet.predictionKey, bet.prediction)}</span>


      <span>: ${money(bet.odds)}</span>


      <span> : ${money(bet.stake)}</span>


      <span> : ${money(bet.potential_return)}</span>


    </div>


  </article>


`).join('');


  };





  const setPlayerView = (view) => {


    state.playerView = view === 'bets' ? 'bets' : 'profile';


    renderPlayer();


  };





  const renderUser = () => {


    const userEl = qs('[data-rb-user]');


    const authEl = qs('[data-rb-auth]');


    const logoutEl = qs('[data-rb-logout]');


    if (!userEl || !authEl || !logoutEl) return;





    if (!state.user) {


      userEl.textContent = '';


      authEl.hidden = false;


      logoutEl.hidden = true;


      renderPlayer();


      return;


    }





    const role = state.user.role?.type || state.user.role || 'player';


    userEl.textContent = `${state.user.username || state.user.email} |  ${money(state.user.balance)} | ${role}`;


    authEl.hidden = true;


    logoutEl.hidden = false;


    renderPlayer();


  };





  const selectBet = (fixture, market, odds, button) => {


    state.selectedBet = { fixture, market, odds: Number(odds) };


    qsa('.rb-odds button').forEach((item) => item.classList.remove('active'));


    button.classList.add('active');


    const attrs = fixture?.attributes || fixture || {};


    const home = translateTerm(attrs.home_team, attrs.home_team || '\u05d1\u05d9\u05ea');


    const away = translateTerm(attrs.away_team, attrs.away_team || '\u05d7\u05d5\u05e5');


    qs('[data-rb-selection]').textContent = `${home} - ${away} | ${marketLabel(market)} @ ${odds}`;


    qs('[data-rb-place]').disabled = false;


  };





    const renderFixtures = () => {


    const el = qs('[data-rb-fixtures]');


    if (!el) return;


    


    const allFixtures = state.fixtures || [];


    if (!allFixtures.length) {


      el.innerHTML = '<div class="rb-match">    .</div>';


      return;


    }





    const organizedSports = {};





    allFixtures.forEach((fixture) => {


      const attrs = fixture.attributes || fixture;


      const home = attrs.home_team || '\u05d1\u05d9\u05ea';


      const away = attrs.away_team || '\u05d7\u05d5\u05e5';


      const displayHome = translateTerm(home, home);


      const displayAway = translateTerm(away, away);


      const fixtureId = String(attrs.fixture_id || '');





      let sportCategory = '\u26bd \u05db\u05d3\u05d5\u05e8\u05d2\u05dc';


      let subLeague = '\u05db\u05dc\u05dc\u05d9';





      if (fixtureId.includes('basketball') || home.includes('NBA') || away.includes('NBA')) {


        sportCategory = '\ud83c\udfc0 \u05db\u05d3\u05d5\u05e8\u05e1\u05dc';


        subLeague = 'NBA';


      } else if (fixtureId.includes('tennis') || fixtureId.includes('wimbledon')) {


        sportCategory = '\ud83c\udfbe \u05d8\u05e0\u05d9\u05e1';


        subLeague = '\u05d5\u05d5\u05d9\u05de\u05d1\u05dc\u05d3\u05d5\u05df';


      } else if (fixtureId.includes('nfl')) {


        sportCategory = '\ud83c\udfc8 \u05e4\u05d5\u05d8\u05d1\u05d5\u05dc';


        subLeague = 'NFL';


      } else {


        subLeague = '\u05de\u05e9\u05d7\u05e7\u05d9\u05dd \u05e7\u05e8\u05d5\u05d1\u05d9\u05dd';


      }





      const sourceSportName = String(attrs.sport_title || attrs.sport_key || '').replace(/_/g, ' ').trim();


      if (sourceSportName) {


        const icon = String(sportCategory || '').split(' ')[0] || '\u26bd';


        const translatedSport = translateTerm(sourceSportName, sourceSportName);


        sportCategory = `${icon} ${translatedSport}`.trim();


      }


      subLeague = translateTerm(attrs.league_name || subLeague, attrs.league_name || subLeague);





      if (!organizedSports[sportCategory]) organizedSports[sportCategory] = {};


      if (!organizedSports[sportCategory][subLeague]) organizedSports[sportCategory][subLeague] = [];





      organizedSports[sportCategory][subLeague].push({


        item: fixture,


        attrs: {


          ...attrs,


          display_home_team: displayHome,


          display_away_team: displayAway,


        },


      });


    });





    let htmlOutput = '';


    let globalIndex = 0;


    const flatMapping = {};





    Object.keys(organizedSports).forEach((sportName) => {


      htmlOutput += `<div class="rb-sport-header" style="background: rgba(174, 48, 47, .35); padding: 6px 10px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; border-radius: 6px; color: #ffcf5c; font-size: 12px; border: 1px solid rgba(174, 48, 47, .4); text-align: right;">${sportName}</div>`;


      


      Object.keys(organizedSports[sportName]).forEach((leagueName) => {


        htmlOutput += `<div class="rb-league-header" style="padding: 4px 8px; font-size: 11px; color: #d8c9c8; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(174, 48, 47, .16); font-style: italic; margin-bottom: 4px; text-align: right;"> ${leagueName}</div>`;


        


        organizedSports[sportName][leagueName].forEach((game) => {


          const currentIndex = globalIndex++;


          flatMapping[currentIndex] = game.item;


          const markets = realFixtureMarkets(game.attrs);





          htmlOutput += `


            <article class="rb-match" data-rb-fixture="${currentIndex}" style="margin-bottom: 5px; border-right: 3px solid #ae302f; border-left: none; background: rgba(12, 4, 5, .85);">


              <div class="rb-match-title" style="font-size: 11px; padding: 4px 2px; text-align: right; color: #fff;">${game.attrs.display_home_team} - ${game.attrs.display_away_team}</div>


              <div class="rb-odds" style="display: grid; grid-template-columns: repeat(${Math.max(1, markets.length)}, 1fr); gap: 5px;">


                ${markets.map((market) => `<button data-market="${market.market}" data-odds="${Number(market.odds).toFixed(2)}" style="font-size: 10px;">${market.label} (${Number(market.odds).toFixed(2)})</button>`).join('')}


              </div>


            </article>


          `;


        });


      });


    });





    el.innerHTML = htmlOutput;





    qsa('[data-rb-fixture]').forEach((card) => {


      const fixtureIdx = Number(card.dataset.rbFixture);


      const originalFixture = flatMapping[fixtureIdx];


      const attrs = originalFixture?.attributes || originalFixture || {};


      


      qsa('[data-market]', card).forEach((button) => {


        button.addEventListener('click', () => {


          selectBet(originalFixture, button.dataset.market, button.dataset.odds, button);


        });


      });


    });


  };





  const loadMe = async (preserveUser = false, force = false) => {


    if (!token()) {


      loadMeInFlight = null;


      lastMeFetchAt = 0;


      state.user = null;


      state.bets = [];


      renderUser();


      return;


    }


    if (!force && loadMeInFlight) {


      return loadMeInFlight;


    }


    if (!force && state.user && (Date.now() - lastMeFetchAt) < ME_CACHE_TTL_MS) {


      renderUser();


      return state.user;


    }


    loadMeInFlight = (async () => {


      try {


        const body = await api('/api/public-auth/me');


        state.user = body?.user || body;


        saveAuth(token(), state.user);


        renderUser();


      } catch {


        try {


          const body = await api('/api/users/me');


          state.user = body?.user || body;


          saveAuth(token(), state.user);


          renderUser();


          lastMeFetchAt = Date.now();


          return state.user;


        } catch {


          const cachedUser = readStoredUser();


          if (cachedUser) {


            state.user = cachedUser;


            renderUser();


            lastMeFetchAt = Date.now();


            return state.user;


          }


        }


        if (preserveUser && state.user) {


          renderUser();


          lastMeFetchAt = Date.now();


          return state.user;


        }


        state.user = null;


        state.bets = [];


        renderUser();


        setStatus(' ,    .     .', 'warn');


      }


      lastMeFetchAt = Date.now();


      return state.user;


    })().finally(() => {


      loadMeInFlight = null;


    });


    return loadMeInFlight;


  };





  const loadBets = async (force = false) => {


    if (!token() || !state.user) {


      loadBetsInFlight = null;


      lastBetsFetchAt = 0;


      state.bets = [];


      renderPlayer();


      return;


    }


    if (!force && loadBetsInFlight) {


      return loadBetsInFlight;


    }


    if (!force && lastBetsFetchAt && (Date.now() - lastBetsFetchAt) < BETS_CACHE_TTL_MS) {


      renderPlayer();


      return state.bets;


    }





    loadBetsInFlight = (async () => {


      try {


        const body = await api('/api/bets/my');


        state.bets = Array.isArray(body?.data) ? body.data : [];


        renderPlayer();


      } catch (error) {


        state.bets = [];


        renderPlayer();


        setStatus(`   : ${error.message}`, 'warn');


      }


      lastBetsFetchAt = Date.now();


      return state.bets;


    })().finally(() => {


      loadBetsInFlight = null;


    });


    return loadBetsInFlight;


  };





  const loadFixtures = async () => {


    try {


      await loadGlossary();


      const locale = currentLocale();


      let body;


      try {


        body = await api(`/api/public-fixtures?locale=${encodeURIComponent(locale)}`);


      } catch {


        body = await api('/api/public-fixtures');


      }


      const fixtures = Array.isArray(body?.data) ? body.data : [];


      state.fixtures = fixtures.filter((fixture) => !isDemoFixtureLike(fixture?.attributes || fixture || {}));


      renderFixtures();


      setStatus(` -Strapi | ${state.fixtures.length}  `, 'ok');


    } catch (error) {


      renderFixtures();


      setStatus(`Strapi  : ${error.message}`, 'error');


    }


  };





  const login = async () => {


    const identifier = qs('[data-rb-identifier]').value.trim();


    const password = qs('[data-rb-password]').value;


    if (!identifier || !password) {


      setStatus('  / ', 'warn');



      return;


    }


    const body = await api('/api/public-auth/login', {


      method: 'POST',


      body: JSON.stringify({ identifier, password }),


    });


    saveAuth(body.jwt, body.user);


    state.user = body.user;


    renderUser();


    await loadMe(true, true);


    await loadBets(true);


    setStatus(' ', 'ok');


  };





  const register = async () => {


    const username = qs('[data-rb-identifier]').value.trim();


    const email = qs('[data-rb-email]').value.trim();


    const password = qs('[data-rb-password]').value;


    if (!username || !email || !password) {


      setStatus('   ,  ', 'warn');


      return;


    }


    const body = await api('/api/public-auth/register', {


      method: 'POST',


      body: JSON.stringify({ username, email, password }),


    });


    saveAuth(body.jwt, body.user);


    state.user = body.user;


    renderUser();


    await loadMe(true, true);


    await loadBets(true);


    setStatus('  ', 'ok');


  };





  const placeBet = async () => {


    if (!state.selectedBet) return;


    if (!state.user) {


      if (token()) await loadMe(true, true);


    }


    if (!state.user) {


      setStatus('    ', 'warn');


      return;


    }





    const stake = Number(qs('[data-rb-stake]').value);


    if (!Number.isFinite(stake) || stake <= 0) {


      setStatus('   ', 'warn');


      return;


    }





    const { fixture, market } = state.selectedBet;


    const result = await api('/api/bets/place', {


      method: 'POST',


      body: JSON.stringify({


        fixture_id: String(fixture.fixture_id || fixture.id),


        market,


        stake,


      }),


    });


    const placedBet = result?.data?.bet || {};


    const updatedUser = result?.data?.user;


    const potentialReturn = Number(placedBet.potential_return || 0);


    if (updatedUser) state.user = { ...state.user, ...updatedUser };


    renderUser();


    await loadBets(true);


    setStatus(`  |   ${money(potentialReturn)}`, 'ok');


    qs('[data-rb-stake]').value = '';


  };





  const mount = async () => {


    if (qs(`#${rootId}`)) return;


    css();


    const root = document.createElement('div');


    root.id = rootId;


    root.innerHTML = html();


    root.dataset.collapsed = String(state.collapsed);





    const target = qs('.app-main-content') || qs('app-root') || document.body;


    target.parentNode.insertBefore(root, target);





    qs('[data-rb-login]').addEventListener('click', () => login().catch((error) => setStatus(error.message, 'error')));


    qs('[data-rb-register]').addEventListener('click', () => register().catch((error) => setStatus(error.message, 'error')));


    qs('[data-rb-place]').addEventListener('click', () => placeBet().catch((error) => setStatus(error.message, 'error')));


    qs('[data-rb-toggle]').addEventListener('click', () => setCollapsed(!state.collapsed));


    qsa('[data-rb-player-view]').forEach((button) => {


      button.addEventListener('click', () => setPlayerView(button.dataset.rbPlayerView));


    });


    qs('[data-rb-logout]').addEventListener('click', () => {


      clearAuth();


      state.user = null;


      state.bets = [];


      renderUser();


      setStatus('', 'ok');


    });





    qsa('.header-account-btn a').forEach((link) => {


      const text = link.textContent || '';


      if (text.includes('')) link.addEventListener('click', (event) => {


        event.preventDefault();


        setCollapsed(false);


        qs('[data-rb-identifier]').focus();


      });


      if (text.includes('')) link.addEventListener('click', (event) => {


        event.preventDefault();


        setCollapsed(false);


        qs('[data-rb-email]').focus();


      });


    });





    setCollapsed(state.collapsed);


    await Promise.all([loadMe(), loadFixtures()]);


    await loadBets();


  };





  if (document.readyState === 'loading') {


    document.addEventListener('DOMContentLoaded', mount);


  } else {


    mount();


  }


}());


