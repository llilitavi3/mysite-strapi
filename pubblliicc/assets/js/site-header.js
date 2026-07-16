(function () {
  'use strict';

  const HEADER_HTML = `
  <header class="rb-header">
    <div class="rb-header-inner">
      <div class="rb-header-left">
        <a href="/" class="rb-logo">
          <div class="rb-logo-img"></div>
        </a>
        <nav>
          <ul class="rb-main-nav" id="rb-header-menu">
            <li class="rb-nav-item">
              <a href="/sport/pregame" class="rb-nav-link">
                <svg class="rb-nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>ספורט</span>
                <svg class="rb-dropdown-arrow" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
              </a>
              <ul class="rb-dropdown">
                <li><a href="/sport/pregame" class="rb-dropdown-link">טרום משחק</a></li>
                <li><a href="/sport/live" class="rb-dropdown-link">שידור חי</a></li>
                <li><a href="/sport/upcoming" class="rb-dropdown-link">בקרוב</a></li>
              </ul>
            </li>
            <li class="rb-nav-item">
              <a href="/casino/live" class="rb-nav-link">
                <svg class="rb-nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>
                <span>קזינו חי</span>
                <svg class="rb-dropdown-arrow" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
              </a>
              <ul class="rb-dropdown">
                <li><a href="/casino/live" class="rb-dropdown-link">רולטה חי</a></li>
                <li><a href="/casino/slot" class="rb-dropdown-link">סלוטים</a></li>
                <li><a href="/casino/category/46" class="rb-dropdown-link">משחקי פיצוץ</a></li>
              </ul>
            </li>
            <li class="rb-nav-item">
              <a href="/casino/virtual" class="rb-nav-link">
                <svg class="rb-nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>
                <span>וירטואלי</span>
              </a>
            </li>
            <li class="rb-nav-item">
              <a href="/tournament" class="rb-nav-link">
                <svg class="rb-nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
                <span>טורנירים</span>
              </a>
            </li>
            <li class="rb-nav-item">
              <a href="/point_system" class="rb-nav-link">
                <svg class="rb-nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>נקודות</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div class="rb-header-right">
        <div class="rb-header-actions">
          <a href="/account/login.html" class="rb-btn rb-btn-secondary">התחברות</a>
          <a href="/account/register.html" class="rb-btn rb-btn-primary">הרשמה</a>
        </div>
        <button class="rb-mobile-toggle" aria-label="Menu" aria-expanded="false" aria-controls="rb-header-menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="rb-header-language-slot" data-rb-header-language-slot></div>
    </div>
  </header>
  <style>
    .rb-header{position:sticky;top:0;z-index:1000;background:#8214149d;backdrop-filter:blur(10px);border-bottom:1px solid rgba(228,71,67,0.3);box-shadow:0 2px 20px rgba(0,0,0,0.5)}
    .rb-header-inner{max-width:1400px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:70px;gap:20px}
    .rb-header-left{display:flex;align-items:center;gap:12px}
    .rb-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff}
    .rb-logo-img{width:140px;height:50px;background:url('/assets/images/logo.png') no-repeat center/contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))}
    .rb-logo-text{font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,#e44743,#ff6b6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px}
    .rb-main-nav{display:flex;align-items:center;gap:4px;list-style:none}
    .rb-nav-item{position:relative}
    .rb-nav-link{display:flex;align-items:center;gap:8px;padding:10px 16px;color:#e0e0e0;text-decoration:none;font-size:0.9rem;font-weight:500;border-radius:8px;transition:all 0.2s ease;white-space:nowrap;cursor:pointer}
    .rb-nav-link:hover{background:#ff2558ce;color:#fff}
    .rb-nav-link.active{background:rgba(228,71,67,0.2);color:#e44743}
    .rb-nav-icon{width:18px;height:18px;opacity:0.8}
    .rb-dropdown-arrow{width:12px;height:12px;transition:transform 0.2s ease;opacity:0.6}
    .rb-nav-item:hover .rb-dropdown-arrow{transform:rotate(180deg);opacity:1}
    .rb-dropdown{position:absolute;top:100%;right:0;min-width:220px;background:rgba(20,20,20,0.98);backdrop-filter:blur(10px);border:1px solid rgba(228,71,67,0.2);border-radius:12px;padding:8px;opacity:0;visibility:hidden;transform:translateY(10px);transition:all 0.2s ease;box-shadow:0 10px 40px rgba(0,0,0,0.6);list-style:none}
    .rb-nav-item:hover .rb-dropdown{opacity:1;visibility:visible;transform:translateY(0)}
    .rb-dropdown-link{display:flex;align-items:center;gap:10px;padding:10px 12px;color:#ccc;text-decoration:none;font-size:0.85rem;border-radius:8px;transition:all 0.15s ease}
    .rb-dropdown-link:hover{background:rgba(228,71,67,0.15);color:#fff}
    .rb-dropdown-icon{width:16px;height:16px;opacity:0.7}
    .rb-header-right{display:flex;align-items:center;gap:12px}
    .rb-header-actions{display:flex;align-items:center;gap:10px}
    .rb-btn{padding:10px 20px;border-radius:8px;font-size:0.9rem;font-weight:600;text-decoration:none;transition:all 0.2s ease;cursor:pointer;border:none}
    .rb-btn-primary{background:linear-gradient(135deg,#e44743,#c73e3a);color:#fff;box-shadow:0 4px 15px rgba(228,71,67,0.4)}
    .rb-btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(228,71,67,0.5)}
    .rb-btn-secondary{background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.2)}
    .rb-btn-secondary:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.3)}
    .rb-mobile-toggle{display:none;flex-direction:column;gap:5px;padding:8px;background:none;border:none;cursor:pointer}
    .rb-mobile-toggle span{width:24px;height:2px;background:#fff;border-radius:2px;transition:all 0.3s ease}
    @media(max-width:1024px){
      .rb-main-nav{display:none}
      .rb-mobile-toggle{display:flex}
      .rb-header-right{gap:8px}
      .rb-btn{padding:8px 14px;font-size:0.85rem}
    }
    @media(max-width:640px){
      .rb-header-inner{height:60px;padding:0 12px}
      .rb-logo-img{width:100px;height:36px}
      .rb-logo-text{font-size:1.2rem}
      .rb-btn{padding:6px 12px;font-size:0.8rem}
      .rb-header-actions{gap:6px}
    }
  </style>
  `;
border-radius: 12px !important;                               
    border: 2px solid #44000063 !important;                         
    background-color: #3d021482 !important; 
    overflow: hidden !important;
    flex-shrink: 0 !important; 
  function injectHeader() {
    if (document.getElementById('rb-site-header')) return;
    const headerEl = document.createElement('div');
    headerEl.id = 'rb-site-header';
    headerEl.innerHTML = HEADER_HTML;
    document.body.prepend(headerEl);
    const languageSlot = headerEl.querySelector('[data-rb-header-language-slot]');
    const languageSwitcher = document.querySelector('[data-rb-language-switcher]');
    if (languageSlot && languageSwitcher && languageSwitcher.parentElement !== languageSlot) {
      languageSlot.appendChild(languageSwitcher);
    }
    const loginLink = headerEl.querySelector('.rb-btn-secondary');
    if (loginLink) {
      const appOrigin = window.location.origin;
      const loginUrl = new URL('/account/login.html', appOrigin);
      loginUrl.searchParams.set('appOrigin', appOrigin);
      loginLink.href = loginUrl.toString();
    }

    const mobileToggle = document.querySelector('.rb-mobile-toggle');
    if (mobileToggle) {
      const headerRoot = document.getElementById('rb-site-header');
      const closeMenu = () => {
        headerRoot?.classList.remove('rb-menu-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      };

      mobileToggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const nav = document.querySelector('.rb-main-nav');
        if (!nav) return;
        const isOpen = headerRoot?.classList.toggle('rb-menu-open');
        mobileToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
      });

      document.addEventListener('click', function (event) {
        if (!headerRoot?.classList.contains('rb-menu-open')) return;
        if (headerRoot.contains(event.target)) return;
        closeMenu();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeMenu();
      });

      document.querySelectorAll('.rb-main-nav a').forEach((link) => {
        link.addEventListener('click', closeMenu);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHeader);
  } else {
    injectHeader();
  }
})();
