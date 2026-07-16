(function () {
  'use strict';

  const ensureStyle = () => {
    if (document.getElementById('royalbet-page-slider-style')) return;
    const style = document.createElement('style');
    style.id = 'royalbet-page-slider-style';
    style.textContent = `
      .rb-page-slider {
        width: min(1290px, calc(100vw - 32px));
        margin: 18px auto 22px;
        border: 1px solid rgba(174, 48, 47, .42);
        border-radius: 8px;
        background: rgba(7, 3, 3, .78);
        overflow: hidden;
        box-shadow: 0 18px 40px rgba(0, 0, 0, .34), 0 0 24px rgba(174, 48, 47, .16);
        position: relative;
        direction: ltr;
      }
      .rb-page-slider-track {
        display: flex;
        width: calc(var(--rb-slide-count, 1) * 100%);
        direction: ltr;
        transition: transform .55s ease;
        will-change: transform;
      }
      .rb-page-slider-slide {
        flex: 0 0 calc(100% / var(--rb-slide-count, 1));
        aspect-ratio: 1290 / 438;
        min-height: 220px;
        max-height: 438px;
        background: #060303;
        direction: rtl;
      }
      .rb-page-slider-slide img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: fill;
      }
      .rb-page-slider-dots {
        position: absolute;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 2;
      }
      .rb-page-slider-dot {
        width: 10px;
        height: 10px;
        border: 1px solid rgba(255, 255, 255, .72);
        border-radius: 999px;
        background: rgba(255, 255, 255, .62);
        padding: 0;
      }
      .rb-page-slider-dot.active {
        background: #e44743;
        border-color: #fff;
      }
      body.rb-has-page-slider-home .main-slider {
        display: none !important;
      }
      @media (max-width: 900px) {
        .rb-page-slider {
          width: 100%;
          margin: 0 auto 16px;
          border-right: 0;
          border-left: 0;
          border-radius: 0;
        }
        .rb-page-slider-slide {
          aspect-ratio: 16 / 9;
          min-height: 0;
          max-height: none;
        }
        .rb-page-slider-dots {
          bottom: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const findMountPoint = () => {
    return document.querySelector('.app-main-content, app-main, app-root, main') || document.body;
  };

  const buildSlider = (config) => {
    const images = Array.isArray(config.images) ? config.images.filter(Boolean) : [];
    if (!images.length || document.querySelector('[data-rb-page-slider]')) return;
    ensureStyle();

    const slider = document.createElement('section');
    slider.className = 'rb-page-slider';
    slider.dataset.rbPageSlider = config.key || 'page';
    slider.setAttribute('aria-label', config.label || 'Page slider');
    document.body.classList.add(`rb-has-page-slider-${config.key || 'page'}`);
    document.documentElement.classList.remove('rb-page-slider-pending');
    document.documentElement.classList.add('rb-page-slider-ready');
    const renderImages = images.length > 1 ? images.concat(images[0]) : images;
    slider.innerHTML = `
      <div class="rb-page-slider-track">
        ${renderImages.map((src, index) => `
          <div class="rb-page-slider-slide">
            <img src="${src}" alt="${config.label || 'RoyalBet'} ${(index % images.length) + 1}" loading="${index === 0 ? 'eager' : 'lazy'}">
          </div>
        `).join('')}
      </div>
      <div class="rb-page-slider-dots">
        ${images.map((_, index) => `<button class="rb-page-slider-dot${index === 0 ? ' active' : ''}" type="button" aria-label="Slide ${index + 1}"></button>`).join('')}
      </div>
    `;

    const mount = findMountPoint();
    mount.parentNode.insertBefore(slider, mount);

    const track = slider.querySelector('.rb-page-slider-track');
    const dots = Array.from(slider.querySelectorAll('.rb-page-slider-dot'));
    track.style.setProperty('--rb-slide-count', String(renderImages.length));
    let active = 0;
    let isSnapping = false;
    const setTrackTransition = (enabled) => {
      track.style.transition = enabled ? '' : 'none';
    };
    const updateDots = () => {
      const dotActive = active % images.length;
      dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === dotActive));
    };
    const go = (index) => {
      if (isSnapping) return;
      active = index;
      setTrackTransition(true);
      track.style.transform = `translateX(${-active * (100 / renderImages.length)}%)`;
      updateDots();
    };
    track.addEventListener('transitionend', () => {
      if (active !== images.length) return;
      isSnapping = true;
      active = 0;
      setTrackTransition(false);
      track.style.transform = 'translateX(0)';
      updateDots();
      track.offsetHeight;
      requestAnimationFrame(() => {
        setTrackTransition(true);
        isSnapping = false;
      });
    });
    dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));
    if (images.length > 1) setInterval(() => go(active + 1), config.interval || 5200);
  };

  window.RoyalBetRenderSlider = buildSlider;
}());
