(function () {
  'use strict';

  const normalizePath = () => window.location.pathname.replace(/\/+$/, '') || '/';
  const isLiveLinePath = () => {
    const path = normalizePath();
    return path === '/sport/live-line' || path === '/live-line';
  };
  if (!isLiveLinePath()) return;

  const TAB_SELECTOR = [
    '.rb-home-sport-group',
    '[data-rb-home-sport-group]',
    '.rb-home-sub-sport',
    '[data-rb-home-sub-sport]',
    '.rb-sport-submenu-sport',
    '[data-rb-sport-submenu-sport]',
    '.rb-sport-submenu-tabs button',
    '.rb-sport-submenu-tabs a',
    '.rb-home-sports-groups button',
    '.rb-home-sub-sports button',
    '.rb-home-sports-groups a',
    '.rb-home-sub-sports a',
    '.dash-sports-slide',
    '.sx-sport-list li',
    '.sx-sport-list li a',
    '.sx-sports-swiper swiper-slide',
    '.sx-sports-swiper swiper-slide a',
    '.sportcountry-view li'
  ].join(', ');

  const ICON_SELECTOR = [
    '.rb-home-sport-group > span',
    '.rb-home-sub-sport > span',
    '.rb-sport-submenu-sport > span',
    '.dash-sports-slide > span:first-child',
    '.sx-sport-list li > span:first-child',
    '.sx-sports-swiper swiper-slide > span:first-child',
    '.sportcountry-view li > span:first-child'
  ].join(', ');
  const BLOCK_BG_SELECTOR = [
    '.rb-home-betting-head',
    '.rb-home-betting-board',
    '.rb-home-betting-layout',
    '.rb-home-betting-events',
    '.rb-sport-page-events',
    '.rb-sport-page-event',
    '.rb-home-betting-slide.rb-sport-page-event'
  ].join(', ');

  const collectRoots = () => {
    const roots = [document];
    const queue = [document.documentElement];
    while (queue.length) {
      const node = queue.shift();
      if (!node || !node.querySelectorAll) continue;
      node.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) {
          roots.push(el.shadowRoot);
          queue.push(el.shadowRoot);
        }
      });
    }
    return roots;
  };

  const LIVE_LINE_TAB_BG = '#56090989';

  const applyOnRoot = (root) => {
    root.querySelectorAll(TAB_SELECTOR).forEach((tab) => {
      const rect = tab.getBoundingClientRect();
      if (!tab.dataset.rbLiveLineOrigWidth && rect.width > 0) {
        tab.dataset.rbLiveLineOrigWidth = String(rect.width);
      }
      const originalWidth = Number(tab.dataset.rbLiveLineOrigWidth || 0);
      const targetWidth = originalWidth > 0 ? Math.max(44, Math.round(originalWidth * 0.6)) : 84;
      tab.style.setProperty('width', `${targetWidth}px`, 'important');
      tab.style.setProperty('min-width', `${targetWidth}px`, 'important');
      tab.style.setProperty('max-width', `${targetWidth}px`, 'important');
      tab.style.setProperty('flex-basis', `${targetWidth}px`, 'important');
      tab.style.setProperty('flex-grow', '0', 'important');
      tab.style.setProperty('flex-shrink', '0', 'important');
      tab.style.setProperty('background-color', LIVE_LINE_TAB_BG, 'important');
      tab.style.setProperty('background-image', 'none', 'important');

      const directLink = tab.matches('a, button') ? tab : tab.querySelector(':scope > a, :scope > button');
      if (directLink) {
        directLink.style.setProperty('width', '100%', 'important');
        directLink.style.setProperty('min-width', '0', 'important');
        directLink.style.setProperty('max-width', '100%', 'important');
        directLink.style.setProperty('background-color', LIVE_LINE_TAB_BG, 'important');
        directLink.style.setProperty('background-image', 'none', 'important');
      }
      tab.style.setProperty('overflow', 'hidden', 'important');
    });

    root.querySelectorAll(ICON_SELECTOR).forEach((iconWrap) => {
      iconWrap.style.setProperty('background', 'transparent', 'important');
      iconWrap.style.setProperty('border-color', 'transparent', 'important');
      iconWrap.style.setProperty('box-shadow', 'none', 'important');
    });

    root.querySelectorAll(BLOCK_BG_SELECTOR).forEach((block) => {
      block.style.setProperty('background', '#56090989', 'important');
      block.style.setProperty('background-color', '#56090989', 'important');
      block.style.setProperty('background-image', 'none', 'important');
    });

    root.querySelectorAll(TAB_SELECTOR + ' img').forEach((img) => {
      const wrap = img.parentElement;
      if (!wrap) return;
      wrap.style.setProperty('background', 'transparent', 'important');
      wrap.style.setProperty('border-color', 'transparent', 'important');
      wrap.style.setProperty('box-shadow', 'none', 'important');
    });
  };

  const applyOverrides = () => {
    collectRoots().forEach((root) => applyOnRoot(root));
  };

  let rafId = 0;
  const schedule = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      applyOverrides();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyOverrides, { once: true });
  } else {
    applyOverrides();
  }

  window.addEventListener('resize', schedule, { passive: true });
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  window.setInterval(applyOverrides, 1200);
})();
