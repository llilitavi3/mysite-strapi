(function () {
  'use strict';

  var TOKEN_KEYS = ['royalbet_api_jwt', 'jwt', 'token'];
  var USER_KEYS = ['royalbet_user', 'user'];

  function getSafeStorage(kind) {
    try {
      if (kind === 'session' && window.sessionStorage) return window.sessionStorage;
      if (kind === 'local' && window.localStorage) return window.localStorage;
    } catch (_) {}
    return null;
  }

  function readFirst(keys) {
    var session = getSafeStorage('session');
    var local = getSafeStorage('local');
    var i;
    if (session) {
      for (i = 0; i < keys.length; i += 1) {
        var sv = session.getItem(keys[i]);
        if (typeof sv === 'string' && sv) return sv;
      }
    }
    if (local) {
      for (i = 0; i < keys.length; i += 1) {
        var lv = local.getItem(keys[i]);
        if (typeof lv === 'string' && lv) return lv;
      }
    }
    return '';
  }

  function writeAll(keys, value, useSession) {
    var session = getSafeStorage('session');
    var local = getSafeStorage('local');
    var i;
    if (useSession && session) {
      for (i = 0; i < keys.length; i += 1) session.setItem(keys[i], value);
    }
    if (local) {
      for (i = 0; i < keys.length; i += 1) local.removeItem(keys[i]);
    }
  }

  function clearAll(keys) {
    var session = getSafeStorage('session');
    var local = getSafeStorage('local');
    var i;
    if (session) {
      for (i = 0; i < keys.length; i += 1) session.removeItem(keys[i]);
    }
    if (local) {
      for (i = 0; i < keys.length; i += 1) local.removeItem(keys[i]);
    }
  }

  function safeOrigin(raw, fallback) {
    var defaultOrigin = fallback || window.location.origin;
    if (!raw) return defaultOrigin;
    try {
      var parsed = new URL(raw, window.location.origin);
      if (!/^https?:$/i.test(parsed.protocol)) return defaultOrigin;
      return parsed.origin;
    } catch (_) {
      return defaultOrigin;
    }
  }

  function safeNextPath(path) {
    if (typeof path !== 'string') return '';
    if (!path.startsWith('/')) return '';
    if (path.startsWith('//')) return '';
    if (path.indexOf('\\') !== -1) return '';
    return path;
  }

  function rateLimit(scope, maxAttempts, windowMs) {
    var key = 'rb_rate_' + String(scope || 'default');
    var max = Number(maxAttempts || 10);
    var ttl = Number(windowMs || 60000);
    var store = getSafeStorage('session') || getSafeStorage('local');
    if (!store) return true;
    try {
      var now = Date.now();
      var raw = store.getItem(key);
      var state = raw ? JSON.parse(raw) : null;
      if (!state || typeof state !== 'object' || !Array.isArray(state.hits)) {
        state = { hits: [] };
      }
      state.hits = state.hits.filter(function (ts) {
        return Number(ts) > now - ttl;
      });
      if (state.hits.length >= max) {
        store.setItem(key, JSON.stringify(state));
        return false;
      }
      state.hits.push(now);
      store.setItem(key, JSON.stringify(state));
      return true;
    } catch (_) {
      return true;
    }
  }

  function sanitizeText(value, maxLen) {
    var raw = String(value == null ? '' : value);
    var compact = raw.replace(/\s+/g, ' ').trim();
    var max = Number(maxLen || 300);
    if (max < 1) max = 1;
    if (compact.length > max) compact = compact.slice(0, max);
    return compact;
  }

  function toAmount(value, min, max) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    var low = Number(min || 1);
    var high = Number(max || 1000000);
    if (n < low || n > high) return null;
    return Math.round(n * 100) / 100;
  }

  function setToken(token) {
    if (!token || typeof token !== 'string') return;
    writeAll(TOKEN_KEYS, token, true);
  }

  function getToken() {
    return readFirst(TOKEN_KEYS);
  }

  function setUser(user) {
    var payload = '{}';
    try {
      payload = JSON.stringify(user || {});
    } catch (_) {}
    writeAll(USER_KEYS, payload, true);
  }

  function getUser() {
    var raw = readFirst(USER_KEYS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }

  function clearAuth() {
    clearAll(TOKEN_KEYS.concat(USER_KEYS));
  }

  function migrateLegacyLocalStorage() {
    var local = getSafeStorage('local');
    if (!local) return;
    var token = getToken();
    if (token) setToken(token);
    var user = getUser();
    if (user && typeof user === 'object') setUser(user);
  }

  window.RBSecurity = {
    getToken: getToken,
    setToken: setToken,
    getUser: getUser,
    setUser: setUser,
    clearAuth: clearAuth,
    safeOrigin: safeOrigin,
    safeNextPath: safeNextPath,
    rateLimit: rateLimit,
    sanitizeText: sanitizeText,
    toAmount: toAmount,
    migrateLegacyLocalStorage: migrateLegacyLocalStorage
  };

  migrateLegacyLocalStorage();
})();
