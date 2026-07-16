(function () {
  'use strict';

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isLiveLineRoute = path === '/sport/live-line' || path === '/live-line';
  if (!isLiveLineRoute) return;

  const config = window.RBLiveLineConfig;
  if (!config || !config.sportsBySlug) return;

  const resolveSpriteUrl = (slug) => {
    const key = String(slug || '').trim();
    if (!key) return '';
    const sport = config.sportsBySlug.get(key);
    return sport ? config.toImageUrl(sport.image) : '';
  };

  const applySprites = (root = document) => {
    root.querySelectorAll('[data-rb-sport-slug], [data-rb-home-sub-sport], [data-rb-home-sport-group]').forEach((node) => {
      const slug = node.getAttribute('data-rb-sport-slug')
        || node.getAttribute('data-rb-home-sub-sport')
        || node.getAttribute('data-rb-home-sport-group');
      const url = resolveSpriteUrl(slug);
      if (!url) return;
      node.style.setProperty('--rb-sport-sprite-url', 'url("' + url + '")');
      const img = node.querySelector('img');
      if (img && !String(img.getAttribute('src') || '').trim()) {
        img.setAttribute('src', url);
      }
    });
  };

  window.RBLiveLineSprites = Object.freeze({
    resolveSpriteUrl,
    applySprites
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applySprites(document), { once: true });
  } else {
    applySprites(document);
  }
})();
