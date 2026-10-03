// js/app.js
// Toda la lógica de la página. IIFE con "use strict".
// Variables globales únicas: CONFIG, DATA y CapSVG (definidas en los otros archivos).

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Escapa HTML para inserción segura */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Quita tildes y pasa a minúsculas para búsqueda */
  function normalizar(str) {
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** Formatea un precio usando locale y moneda de CONFIG */
  function formatearPrecio(valor) {
    try {
      return new Intl.NumberFormat(CONFIG.locale, {
        style: 'currency',
        currency: CONFIG.moneda,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(valor);
    } catch (e) {
      return '$ ' + valor.toLocaleString('es-CO');
    }
  }

  /** Debounce: ejecuta fn después de esperar ms */
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Interpola linealmente */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Construye la URL de WhatsApp con el mensaje ya formateado */
  function armarEnlaceWhatsApp(plantilla, vars) {
    let msg = plantilla;
    Object.entries(vars).forEach(([k, v]) => {
      msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
    });
    const num = CONFIG.whatsapp.replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
  }

  /** Primera letra de la marca para los parches SVG */
  const INICIAL = (CONFIG.marca || 'C').charAt(0).toUpperCase();

  /** Busca un color por id en DATA.colores */
  function colorPorId(id) {
    return DATA.colores.find(c => c.id === id) || DATA.colores[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  const estado = {
    q: '',
    tipo: '',
    color: '',
    orden: 'destacadas',
    pagina: 1,        // cuántas páginas se han cargado (12 por página)
    productoAbierto: null,   // id del producto en el modal
    colorModal: '',          // id del color elegido en el modal
    filtradosActuales: [],   // lista resultado del último filtrado
    focusOrigen: null        // elemento que abrió el modal (para devolver foco)
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RELLENAR ENLACES DESDE CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  function rellenarEnlaces() {
    const num = CONFIG.whatsapp.replace(/\D/g, '');
    const msgGeneral = CONFIG.mensajes.general.replace('{marca}', CONFIG.marca);
    const waUrl = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msgGeneral);

    // Todos los elementos con data-wa
    document.querySelectorAll('[data-wa]').forEach(el => {
      el.setAttribute('href', waUrl);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    });

    // Correo
    const email = 'hola@capsjs.co'; // valor de ejemplo
    document.querySelectorAll('[data-mail]').forEach(el => {
      el.setAttribute('href', 'mailto:' + email);
    });
    const emailLink = document.getElementById('contact-email-link');
    if (emailLink) emailLink.textContent = email;

    // Instagram
    if (CONFIG.instagram) {
      document.querySelectorAll('[data-ig]').forEach(el => {
        el.setAttribute('href', CONFIG.instagram);
      });
    } else {
      document.getElementById('contact-ig-item') && (document.getElementById('contact-ig-item').hidden = true);
      document.getElementById('footer-ig') && (document.getElementById('footer-ig').hidden = true);
    }

    // Horario y cobertura
    const horEl = document.getElementById('contact-horario');
    if (horEl) horEl.textContent = CONFIG.horario;
    const covEl = document.getElementById('contact-cobertura');
    if (covEl) covEl.textContent = CONFIG.cobertura;

    // Nombre de la marca en el logo (span de texto junto al logo)
    document.querySelectorAll('.header__logo-text, .footer__logo span').forEach(el => {
      el.textContent = CONFIG.marca;
    });

    // Año del pie de página
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Copyright
    document.querySelectorAll('.footer__copy').forEach(el => {
      el.textContent = '© ' + new Date().getFullYear() + ' ' + CONFIG.marca + '. Todos los derechos reservados.';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIO INTERACTIVO
  // ═══════════════════════════════════════════════════════════════════════════

  // Colores del inicio: los 8 de la paleta, en orden de la secuencia
  const HERO_COLORS = DATA.colores; // rojo primero según data.js

  let heroColorIdx = 0;
  let heroInteracted = false;
  let heroTiltRaf = null;
  let heroTiltActive = false;
  const tilt = { rx: 0, ry: 0, txWord: 0, tyWord: 0 };
  const tiltTarget = { rx: 0, ry: 0, txWord: 0, tyWord: 0 };
  let heroCapEl = null;
  let heroWordEl = null;
  let heroShadowEl = null;
  let heroHintEl = null;
  let heroSectionEl = null;

  function buildHeroStage() {
    const stage = document.getElementById('hero-stage');
    if (!stage) return;
    heroSectionEl = document.getElementById('inicio');

    // Palabra gigante
    heroWordEl = document.createElement('span');
    heroWordEl.className = 'hero__word';
    heroWordEl.setAttribute('aria-hidden', 'true');
    heroWordEl.textContent = 'gorras';
    heroWordEl.style.opacity = '0';
    stage.appendChild(heroWordEl);

    // Sombra de contacto
    heroShadowEl = document.createElement('span');
    heroShadowEl.className = 'hero__shadow';
    heroShadowEl.setAttribute('aria-hidden', 'true');
    stage.appendChild(heroShadowEl);

    // Botón de la gorra
    heroCapEl = document.createElement('button');
    heroCapEl.className = 'hero__cap';
    heroCapEl.setAttribute('aria-label', 'Cambiar el color de la gorra. Color actual: Rojo');
    heroCapEl.setAttribute('type', 'button');
    heroCapEl.setAttribute('role', 'img');

    const capInner = document.createElement('div');
    capInner.className = 'hero__cap-inner';
    capInner.style.willChange = 'auto';

    const colorObj = HERO_COLORS[0]; // rojo
    capInner.innerHTML = CapSVG.render('snapback', {
      etiqueta: 'Gorra snapback de color rojo',
      inicial: INICIAL
    });
    heroCapEl.appendChild(capInner);
    stage.appendChild(heroCapEl);

    // Etiqueta de color (sticker)
    const label = document.createElement('span');
    label.className = 'hero__color-label';
    label.setAttribute('aria-live', 'polite');
    label.textContent = 'Rojo';
    heroCapEl.appendChild(label);

    // Aplicar los tokens iniciales al hero section
    const tkns = CapSVG.tokens(colorObj.hex, null);
    CapSVG.apply(heroSectionEl, tkns);

    return { capInner, label };
  }

  function buildHeroPicker() {
    const pickerEl = document.getElementById('hero-picker');
    if (!pickerEl) return;

    const group = document.createElement('div');
    group.className = 'hero__picker-group';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Color de la gorra');

    HERO_COLORS.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'hero__picker-btn' + (i === 0 ? ' hero__picker-btn--active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', c.nombre);
      btn.setAttribute('tabindex', i === 0 ? '0' : '-1');
      btn.style.background = 'none';
      btn.style.opacity = '0';
      btn.style.transform = 'scale(0.6)';
      btn.dataset.idx = i;

      const circle = document.createElement('span');
      circle.style.cssText = 'width:36px;height:36px;border-radius:50%;background:' + c.hex +
        ';display:flex;align-items:center;justify-content:center;pointer-events:none;';

      const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      checkSvg.setAttribute('width', '18');
      checkSvg.setAttribute('height', '18');
      checkSvg.setAttribute('viewBox', '0 0 24 24');
      checkSvg.setAttribute('fill', 'none');
      checkSvg.setAttribute('stroke', CapSVG.luminancia(c.hex) > 0.5 ? '#111215' : '#FFFFFF');
      checkSvg.setAttribute('stroke-width', '3');
      checkSvg.setAttribute('stroke-linecap', 'round');
      checkSvg.setAttribute('aria-hidden', 'true');
      checkSvg.style.opacity = i === 0 ? '1' : '0';
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      checkSvg.appendChild(polyline);
      circle.appendChild(checkSvg);
      btn.appendChild(circle);
      group.appendChild(btn);
    });

    pickerEl.appendChild(group);
    heroHintEl = document.getElementById('hero-hint');

    // Delegación de eventos en el grupo
    group.addEventListener('click', function (e) {
      const btn = e.target.closest('.hero__picker-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      setHeroColor(idx, true);
    });

    // Navegación por teclado (flechas, Inicio, Fin)
    group.addEventListener('keydown', function (e) {
      const btns = Array.from(group.querySelectorAll('.hero__picker-btn'));
      const cur = btns.findIndex(b => b === document.activeElement);
      if (cur === -1) return;
      let next = cur;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (cur + 1) % btns.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (cur - 1 + btns.length) % btns.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = btns.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      btns.forEach((b, i) => b.setAttribute('tabindex', i === next ? '0' : '-1'));
      btns[next].focus();
      setHeroColor(next, true);
    });

    return group;
  }

  function setHeroColor(idx, fromUser) {
    if (fromUser) {
      heroInteracted = true;
      if (heroHintEl) heroHintEl.hidden = true;
    }

    heroColorIdx = idx;
    const colorObj = HERO_COLORS[idx];
    if (!colorObj) return;

    // Tokens y aplicación al hero
    const tkns = CapSVG.tokens(colorObj.hex, null);
    CapSVG.apply(heroSectionEl, tkns);

    // Actualizar etiqueta
    const label = heroSectionEl.querySelector('.hero__color-label');
    if (label) label.textContent = colorObj.nombre;

    // Actualizar aria-label del botón de la gorra
    if (heroCapEl) {
      heroCapEl.setAttribute('aria-label', 'Cambiar el color de la gorra. Color actual: ' + colorObj.nombre);
    }

    // Actualizar botón secundario del inicio
    const colorBtn = document.getElementById('hero-color-btn');
    if (colorBtn) {
      colorBtn.textContent = 'Ver las gorras en ' + colorObj.nombre.toLowerCase();
    }

    // Actualizar selector de colores
    const pickerBtns = document.querySelectorAll('.hero__picker-btn');
    pickerBtns.forEach((btn, i) => {
      const isActive = i === idx;
      btn.classList.toggle('hero__picker-btn--active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
      const check = btn.querySelector('svg');
      if (check) check.style.opacity = isActive ? '1' : '0';
    });

    // Animación "pop" de la gorra
    const capInner = heroCapEl && heroCapEl.querySelector('.hero__cap-inner');
    if (capInner && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      capInner.animate([
        { transform: 'scaleX(1.06) scaleY(0.94) ' + currentTiltTransform() },
        { transform: 'scaleX(1) scaleY(1) ' + currentTiltTransform() }
      ], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    }
  }

  function currentTiltTransform() {
    return 'rotateX(' + tilt.rx + 'deg) rotateY(' + tilt.ry + 'deg)';
  }

  // Inclinación con puntero (escritorio)
  function initHeroTilt() {
    if (!heroSectionEl) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mq.matches) return;

    heroSectionEl.addEventListener('mousemove', function (e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = heroSectionEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      tiltTarget.ry = ((e.clientX - cx) / (rect.width / 2)) * 14;
      tiltTarget.rx = -((e.clientY - cy) / (rect.height / 2)) * 10;
      tiltTarget.txWord = -tiltTarget.ry * 1.3;
      tiltTarget.tyWord = -tiltTarget.rx * 0.9;

      if (!heroTiltActive) {
        heroTiltActive = true;
        startTiltLoop();
      }
    }, { passive: true });

    heroSectionEl.addEventListener('mouseleave', function () {
      tiltTarget.rx = 0;
      tiltTarget.ry = 0;
      tiltTarget.txWord = 0;
      tiltTarget.tyWord = 0;
    }, { passive: true });
  }

  function startTiltLoop() {
    if (heroTiltRaf) return;

    function loop() {
      const speed = 0.12;
      tilt.rx = lerp(tilt.rx, tiltTarget.rx, speed);
      tilt.ry = lerp(tilt.ry, tiltTarget.ry, speed);
      tilt.txWord = lerp(tilt.txWord, tiltTarget.txWord, speed);
      tilt.tyWord = lerp(tilt.tyWord, tiltTarget.tyWord, speed);

      const capInner = heroCapEl && heroCapEl.querySelector('.hero__cap-inner');
      if (capInner) {
        capInner.style.transform = 'rotateX(' + tilt.rx.toFixed(3) + 'deg) rotateY(' + tilt.ry.toFixed(3) + 'deg)';
      }
      if (heroWordEl) {
        heroWordEl.style.transform = 'translate(' + tilt.txWord.toFixed(2) + 'px,' + tilt.tyWord.toFixed(2) + 'px)';
      }
      if (heroShadowEl) {
        const offsetX = -tilt.ry * 0.8;
        const wMod = 1 - Math.abs(tilt.ry) / 100 * 0.06;
        heroShadowEl.style.transform = 'translateX(calc(-50% + ' + offsetX.toFixed(2) + 'px))';
        heroShadowEl.style.width = (60 * wMod).toFixed(1) + '%';
      }

      const diff = Math.abs(tilt.rx - tiltTarget.rx) + Math.abs(tilt.ry - tiltTarget.ry);
      const isAtRest = tiltTarget.rx === 0 && tiltTarget.ry === 0;
      if (diff < 0.01 && isAtRest) {
        heroTiltActive = false;
        heroTiltRaf = null;
        const capInner2 = heroCapEl && heroCapEl.querySelector('.hero__cap-inner');
        if (capInner2) {
          capInner2.style.transform = '';
          capInner2.style.willChange = 'auto';
        }
        return;
      }

      heroTiltRaf = requestAnimationFrame(loop);
    }

    const capInner = heroCapEl && heroCapEl.querySelector('.hero__cap-inner');
    if (capInner) capInner.style.willChange = 'transform';
    heroTiltRaf = requestAnimationFrame(loop);
  }

  // Inclinación táctil (móvil)
  function initHeroTiltTouch() {
    const stage = document.getElementById('hero-stage');
    if (!stage) return;
    const mq = window.matchMedia('(pointer: coarse)');
    if (!mq.matches) return;

    let touching = false;

    stage.addEventListener('touchstart', function (e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      touching = true;
      if (!heroTiltActive) { heroTiltActive = true; startTiltLoop(); }
    }, { passive: true });

    stage.addEventListener('touchmove', function (e) {
      if (!touching) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const touch = e.touches[0];
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      tiltTarget.ry = ((touch.clientX - cx) / (rect.width / 2)) * 14;
      tiltTarget.rx = -((touch.clientY - cy) / (rect.height / 2)) * 10;
      tiltTarget.txWord = -tiltTarget.ry * 1.3;
      tiltTarget.tyWord = -tiltTarget.rx * 0.9;
    }, { passive: true });

    stage.addEventListener('touchend', function () {
      touching = false;
      tiltTarget.rx = 0; tiltTarget.ry = 0;
      tiltTarget.txWord = 0; tiltTarget.tyWord = 0;
    }, { passive: true });
  }

  // Clic en la gorra: cambia al siguiente color
  function initHeroCapClick() {
    if (!heroCapEl) return;
    heroCapEl.addEventListener('click', function () {
      const next = (heroColorIdx + 1) % HERO_COLORS.length;
      setHeroColor(next, true);
    });
    heroCapEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const next = (heroColorIdx + 1) % HERO_COLORS.length;
        setHeroColor(next, true);
      }
    });
  }

  // Botón secundario: filtra por color
  function initHeroColorBtn() {
    const btn = document.getElementById('hero-color-btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const colorObj = HERO_COLORS[heroColorIdx];
      estado.color = colorObj.id;
      estado.tipo = '';
      estado.q = '';
      estado.pagina = 1;
      applyFilters();
      actualizarURL();
      const catalogH2 = document.querySelector('#catalogo h2');
      if (catalogH2) {
        catalogH2.focus();
        catalogH2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Botón principal: scroll a catálogo
  function initHeroMainBtn() {
    const btn = document.querySelector('.hero__btn-main');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const catalog = document.getElementById('catalogo');
      if (catalog) catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Secuencia de carga (solo una vez, sin prefers-reduced-motion)
  function runHeroSequence() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Sin animación: todo aparece en rojo ya en su sitio
      setHeroColor(0, false);
      const pickerBtns = document.querySelectorAll('.hero__picker-btn');
      pickerBtns.forEach(b => {
        b.style.opacity = '1';
        b.style.transform = 'scale(1)';
      });
      if (heroWordEl) heroWordEl.style.opacity = '1';
      // Mostrar hint
      if (heroHintEl) {
        heroHintEl.hidden = false;
        heroHintEl.classList.add('hero__hint--visible');
      }
      return;
    }

    // Cualquier interacción cancela la secuencia
    let cancelled = false;
    const cancelOnInteract = () => { cancelled = true; };
    heroSectionEl && heroSectionEl.addEventListener('pointerdown', cancelOnInteract, { once: true });
    heroSectionEl && heroSectionEl.addEventListener('touchstart', cancelOnInteract, { once: true, passive: true });
    document.addEventListener('keydown', cancelOnInteract, { once: true });

    // La gorra comienza desplazada; los picker buttons ocultos
    const capInner = heroCapEl && heroCapEl.querySelector('.hero__cap-inner');
    if (capInner) {
      capInner.style.transition = 'none';
      capInner.style.transform = 'translateY(-14%) rotate(-9deg) scale(0.94)';
    }

    // t = 0: palabra y selector con opacidad 0
    if (heroWordEl) heroWordEl.style.opacity = '0';

    // t = 0-700ms: gorra baja con rebote; palabra aparece
    setTimeout(function () {
      if (cancelled) return;
      if (capInner) {
        capInner.style.transition = 'transform 700ms cubic-bezier(.3,1.4,.5,1)';
        capInner.style.transform = 'translateY(0) rotate(0deg) scale(1)';
      }
      if (heroWordEl) {
        heroWordEl.style.transition = 'opacity 500ms ease';
        heroWordEl.style.opacity = '1';
      }
    }, 50);

    // t = 200-520ms: botones aparecen uno a uno
    const pickerBtns = document.querySelectorAll('.hero__picker-btn');
    pickerBtns.forEach(function (btn, i) {
      setTimeout(function () {
        if (cancelled) return;
        btn.style.transition = 'opacity 220ms ease, transform 220ms cubic-bezier(.2,.8,.2,1)';
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
      }, 200 + i * 40);
    });

    // t = 450-1950ms: secuencia de colores (negro, mostaza, azul-marino) → rojo
    const secuencia = [
      { idx: DATA.colores.findIndex(c => c.id === 'negro'),       delay: 450  },
      { idx: DATA.colores.findIndex(c => c.id === 'mostaza'),     delay: 950  },
      { idx: DATA.colores.findIndex(c => c.id === 'azul-marino'), delay: 1450 },
      { idx: 0,                                                   delay: 1950 } // rojo
    ];
    secuencia.forEach(function (step) {
      setTimeout(function () {
        if (cancelled) return;
        setHeroColor(step.idx, false);
      }, step.delay);
    });

    // t = 2500ms: mostrar hint
    setTimeout(function () {
      if (cancelled) return;
      if (heroHintEl) {
        heroHintEl.hidden = false;
        heroHintEl.classList.add('hero__hint--visible');
      }
    }, 2500);

    // Si se cancela, restaurar todo al estado inicial
    const restoreAfterCancel = function () {
      if (!cancelled) return;
      document.removeEventListener('keydown', cancelOnInteract);
      if (capInner) {
        capInner.style.transition = 'none';
        capInner.style.transform = '';
      }
      if (heroWordEl) { heroWordEl.style.transition = 'none'; heroWordEl.style.opacity = '1'; }
      pickerBtns.forEach(function (btn) {
        btn.style.transition = 'none';
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
      });
      if (heroHintEl) heroHintEl.hidden = true;
    };
    setTimeout(restoreAfterCancel, 2600);
  }

  // Pausar el tilt cuando el inicio no es visible o la pestaña está oculta
  function initHeroVisibility() {
    if (!heroSectionEl) return;
    const obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting && heroTiltRaf) {
        cancelAnimationFrame(heroTiltRaf);
        heroTiltRaf = null;
        heroTiltActive = false;
      }
    }, { threshold: 0 });
    obs.observe(heroSectionEl);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && heroTiltRaf) {
        cancelAnimationFrame(heroTiltRaf);
        heroTiltRaf = null;
        heroTiltActive = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATÁLOGO: FILTROS, ORDEN, RENDER, PAGINACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  // Construir muestras de color en los filtros
  function buildColorFilters() {
    const container = document.getElementById('color-filters');
    if (!container) return;

    DATA.colores.forEach(function (c) {
      const btn = document.createElement('button');
      btn.className = 'color-swatch';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', c.nombre);
      btn.setAttribute('title', c.nombre);
      btn.setAttribute('tabindex', '-1');
      btn.dataset.color = c.id;
      btn.style.background = c.hex;

      const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      check.setAttribute('class', 'color-swatch__check');
      check.setAttribute('width', '14');
      check.setAttribute('height', '14');
      check.setAttribute('viewBox', '0 0 24 24');
      check.setAttribute('fill', 'none');
      check.setAttribute('stroke', CapSVG.luminancia(c.hex) > 0.5 ? '#111215' : '#FFFFFF');
      check.setAttribute('stroke-width', '3.5');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('aria-hidden', 'true');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', '20 6 9 17 4 12');
      check.appendChild(poly);
      btn.appendChild(check);

      container.appendChild(btn);
    });

    // El primer chip "Todos" debe estar en tabindex=0
    const todosBtn = container.querySelector('[data-color=""]');
    if (todosBtn) todosBtn.setAttribute('tabindex', '0');

    // Evento delegado
    container.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-color]');
      if (!btn) return;
      const colorId = btn.dataset.color;
      activateColorFilter(colorId);
    });

    container.addEventListener('keydown', function (e) {
      const allBtns = Array.from(container.querySelectorAll('[data-color]'));
      const cur = allBtns.findIndex(b => b === document.activeElement);
      if (cur === -1) return;
      let next = cur;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % allBtns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + allBtns.length) % allBtns.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = allBtns.length - 1;
      else return;
      e.preventDefault();
      allBtns.forEach((b, i) => b.setAttribute('tabindex', i === next ? '0' : '-1'));
      allBtns[next].focus();
      activateColorFilter(allBtns[next].dataset.color);
    });
  }

  function activateColorFilter(colorId) {
    estado.color = colorId;
    estado.pagina = 1;

    const container = document.getElementById('color-filters');
    if (!container) return;
    const allBtns = Array.from(container.querySelectorAll('[data-color]'));
    allBtns.forEach(function (b) {
      const isActive = b.dataset.color === colorId;
      b.setAttribute('aria-checked', isActive ? 'true' : 'false');
      b.setAttribute('tabindex', isActive ? '0' : '-1');
      b.classList.toggle('color-swatch--active', isActive);
      b.classList.toggle('chip--active', b.dataset.color === '' && isActive);
    });

    applyFilters();
    actualizarURL();
    actualizarBtnLimpiar();
  }

  function applyFilters() {
    const q = normalizar(estado.q);
    const tipo = estado.tipo;
    const colorId = estado.color;

    let resultados = DATA.productos.filter(function (p) {
      // Búsqueda
      if (q) {
        const palabras = q.split(/\s+/).filter(Boolean);
        const texto = normalizar([
          p.nombre,
          p.tipo,
          p.colores.map(c => colorPorId(c.id).nombre).join(' '),
          p.tags.join(' '),
          p.resumen
        ].join(' '));
        if (!palabras.every(w => texto.includes(w))) return false;
      }
      // Tipo
      if (tipo && p.tipo !== tipo) return false;
      // Color: coincide si alguna variante tiene ese color como principal
      if (colorId && !p.colores.some(c => c.id === colorId)) return false;
      return true;
    });

    // Orden
    const orden = estado.orden;
    resultados = resultados.slice().sort(function (a, b) {
      // Las agotadas siempre al final
      if (a.disponible !== b.disponible) return a.disponible ? -1 : 1;

      if (orden === 'destacadas') {
        if (a.destacada !== b.destacada) return a.destacada ? -1 : 1;
        return DATA.productos.indexOf(a) - DATA.productos.indexOf(b);
      }
      if (orden === 'nuevas') {
        return b.fecha.localeCompare(a.fecha);
      }
      if (orden === 'precio-asc') return a.precio - b.precio;
      if (orden === 'precio-desc') return b.precio - a.precio;
      if (orden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
      return 0;
    });

    estado.filtradosActuales = resultados;
    renderGrid(resultados);
    actualizarContador(resultados.length);
    actualizarBtnLimpiar();
  }

  function renderGrid(productos) {
    const grid = document.getElementById('product-grid');
    const noResults = document.getElementById('no-results');
    const paginacionEl = document.getElementById('pagination');
    if (!grid) return;

    grid.innerHTML = '';

    if (productos.length === 0) {
      noResults && (noResults.hidden = false);
      paginacionEl && (paginacionEl.hidden = true);
      // Actualizar el texto del estado sin resultados
      const noResultsText = document.getElementById('no-results-text');
      if (noResultsText) {
        noResultsText.textContent = 'Quita un filtro o limpia todos para ver las ' + DATA.productos.length + ' gorras.';
      }
      return;
    }

    noResults && (noResults.hidden = true);

    const visibles = productos.slice(0, estado.pagina * CONFIG.productosPorPagina);
    visibles.forEach(function (p) {
      grid.appendChild(crearTarjeta(p));
    });

    // Paginación
    if (productos.length > visibles.length) {
      paginacionEl && (paginacionEl.hidden = false);
      const info = document.getElementById('pagination-info');
      if (info) info.textContent = 'Mostrando ' + visibles.length + ' de ' + productos.length;
    } else {
      paginacionEl && (paginacionEl.hidden = true);
    }
  }

  function crearTarjeta(p) {
    // Color activo de la tarjeta: el del filtro si existe, si no el primero
    let colorActivo = estado.color
      ? p.colores.find(c => c.id === estado.color) || p.colores[0]
      : p.colores[0];

    const li = document.createElement('li');
    li.className = 'product-card' + (!p.disponible ? ' product-card--unavailable' : '');
    li.dataset.id = p.id;

    // Escenario
    const scene = document.createElement('div');
    scene.className = 'product-card__scene';

    // Etiqueta
    if (p.etiqueta) {
      const badge = document.createElement('span');
      badge.className = 'product-card__badge product-card__badge--' +
        (p.etiqueta === 'mas-vendida' ? 'vendida' : p.etiqueta);
      if (p.etiqueta === 'oferta' && p.precioAntes) {
        const pct = Math.round((1 - p.precio / p.precioAntes) * 100);
        badge.textContent = '-' + pct + '%';
      } else if (p.etiqueta === 'mas-vendida') {
        badge.textContent = 'Más vendida';
      } else if (p.etiqueta === 'nuevo') {
        badge.textContent = 'Nuevo';
      }
      scene.appendChild(badge);
    }
    if (!p.disponible) {
      const badge = document.createElement('span');
      badge.className = 'product-card__badge product-card__badge--agotada';
      badge.textContent = 'Agotada';
      scene.appendChild(badge);
    }

    // SVG o imagen
    const svgWrap = document.createElement('div');
    svgWrap.className = 'product-card__svg-wrap';

    const tipo = DATA.tipos.find(t => t.id === p.tipo);
    const ilustracion = tipo ? tipo.ilustracion : 'snapback';

    const colorPrincipal = colorPorId(colorActivo.id);
    const colorSec = colorActivo.secundario ? colorPorId(colorActivo.secundario).hex : null;
    const tkns = CapSVG.tokens(colorPrincipal.hex, colorSec);

    // Aplicar tokens al svgWrap
    Object.entries(tkns).forEach(([k, v]) => svgWrap.style.setProperty(k, v));

    if (colorActivo.imagen) {
      // Foto real
      const img = document.createElement('img');
      img.src = colorActivo.imagen;
      img.alt = esc(p.nombre) + ' en color ' + esc(colorPrincipal.nombre);
      img.width = 1200;
      img.height = 1200;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.className = 'product-card__img';
      img.onerror = function () {
        this.remove();
        svgWrap.innerHTML = CapSVG.render(ilustracion, { etiqueta: p.nombre, inicial: INICIAL });
      };
      scene.appendChild(img);
      svgWrap.setAttribute('aria-hidden', 'true');
    }

    svgWrap.innerHTML = CapSVG.render(ilustracion, {
      etiqueta: p.nombre + ' en color ' + colorPrincipal.nombre,
      inicial: INICIAL
    });
    scene.appendChild(svgWrap);
    li.appendChild(scene);

    // Cuerpo de la tarjeta
    const body = document.createElement('div');
    body.className = 'product-card__body';

    const h3 = document.createElement('h3');
    h3.style.position = 'relative';
    const nameBtn = document.createElement('button');
    nameBtn.className = 'product-card__name-btn';
    nameBtn.setAttribute('type', 'button');
    nameBtn.setAttribute('aria-label', 'Ver detalle de ' + esc(p.nombre));
    nameBtn.textContent = p.nombre;
    nameBtn.dataset.id = p.id;
    nameBtn.dataset.color = colorActivo.id;
    h3.appendChild(nameBtn);
    body.appendChild(h3);

    const typeEl = document.createElement('p');
    typeEl.className = 'product-card__type';
    typeEl.textContent = tipo ? tipo.nombre : p.tipo;
    body.appendChild(typeEl);

    const priceEl = document.createElement('p');
    priceEl.className = 'product-card__price';
    priceEl.textContent = formatearPrecio(p.precio);
    if (p.precioAntes) {
      const before = document.createElement('span');
      before.className = 'product-card__price-before';
      before.textContent = formatearPrecio(p.precioAntes);
      priceEl.appendChild(before);
    }
    body.appendChild(priceEl);

    // Puntos de color (máx 5 + "+N")
    if (p.colores.length > 1) {
      const colorsEl = document.createElement('div');
      colorsEl.className = 'product-card__colors';
      const maxDots = 5;
      p.colores.slice(0, maxDots).forEach(function (cv) {
        const colorDef = colorPorId(cv.id);
        const dot = document.createElement('button');
        dot.className = 'product-card__color-dot' + (cv.id === colorActivo.id ? ' product-card__color-dot--active' : '');
        dot.setAttribute('type', 'button');
        dot.setAttribute('aria-label', 'Ver en color ' + colorDef.nombre);
        dot.setAttribute('aria-pressed', cv.id === colorActivo.id ? 'true' : 'false');
        dot.dataset.colorId = cv.id;
        dot.dataset.productId = p.id;
        const inner = document.createElement('span');
        inner.className = 'product-card__color-dot-inner';
        inner.style.background = colorDef.hex;
        dot.appendChild(inner);
        colorsEl.appendChild(dot);
      });
      if (p.colores.length > maxDots) {
        const more = document.createElement('span');
        more.className = 'product-card__color-more';
        more.textContent = '+' + (p.colores.length - maxDots);
        colorsEl.appendChild(more);
      }
      body.appendChild(colorsEl);
    }

    li.appendChild(body);
    return li;
  }

  function actualizarContador(n) {
    const el = document.getElementById('catalog-count');
    if (!el) return;
    if (n === 0) el.textContent = 'No hay gorras';
    else if (n === 1) el.textContent = '1 gorra';
    else el.textContent = n + ' gorras';
  }

  function actualizarBtnLimpiar() {
    const hayFiltro = estado.q || estado.tipo || estado.color;
    const btn = document.getElementById('clear-filters');
    if (btn) btn.hidden = !hayFiltro;
  }

  function limpiarFiltros() {
    estado.q = '';
    estado.tipo = '';
    estado.color = '';
    estado.pagina = 1;

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) clearSearch.hidden = true;

    // Restablecer chips de tipo
    document.querySelectorAll('#type-filters .chip').forEach(function (c) {
      const isAll = c.dataset.type === '';
      c.classList.toggle('chip--active', isAll);
      c.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    });

    // Restablecer color
    const colorFilters = document.getElementById('color-filters');
    if (colorFilters) {
      colorFilters.querySelectorAll('[data-color]').forEach(function (b) {
        const isAll = b.dataset.color === '';
        b.setAttribute('aria-checked', isAll ? 'true' : 'false');
        b.setAttribute('tabindex', isAll ? '0' : '-1');
        b.classList.toggle('color-swatch--active', false);
        b.classList.toggle('chip--active', isAll);
      });
    }

    applyFilters();
    actualizarURL();
  }

  // Delegación de eventos en la cuadrícula y los filtros
  function initCatalogEvents() {
    // Tipo
    const typeFilters = document.getElementById('type-filters');
    if (typeFilters) {
      typeFilters.addEventListener('click', function (e) {
        const chip = e.target.closest('.chip[data-type]');
        if (!chip) return;
        const tipo = chip.dataset.type;
        estado.tipo = tipo;
        estado.pagina = 1;
        typeFilters.querySelectorAll('.chip').forEach(function (c) {
          const isActive = c.dataset.type === tipo;
          c.classList.toggle('chip--active', isActive);
          c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        applyFilters();
        actualizarURL();
      });
    }

    // Búsqueda
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    if (searchInput) {
      const buscar = debounce(function () {
        estado.q = searchInput.value.trim();
        estado.pagina = 1;
        clearSearch && (clearSearch.hidden = !estado.q);
        applyFilters();
        actualizarURL();
      }, 150);
      searchInput.addEventListener('input', buscar);
    }
    if (clearSearch) {
      clearSearch.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        estado.q = '';
        clearSearch.hidden = true;
        estado.pagina = 1;
        applyFilters();
        actualizarURL();
      });
    }

    // Ordenar
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        estado.orden = sortSelect.value;
        estado.pagina = 1;
        applyFilters();
        actualizarURL();
      });
    }

    // Limpiar filtros
    const clearFilters = document.getElementById('clear-filters');
    if (clearFilters) clearFilters.addEventListener('click', limpiarFiltros);
    const noResultsClear = document.getElementById('no-results-clear');
    if (noResultsClear) noResultsClear.addEventListener('click', limpiarFiltros);

    // Mostrar más
    const loadMore = document.getElementById('load-more');
    if (loadMore) {
      loadMore.addEventListener('click', function () {
        const prevCount = estado.pagina * CONFIG.productosPorPagina;
        estado.pagina++;
        renderGrid(estado.filtradosActuales);
        // Foco a la primera tarjeta nueva
        const allCards = document.querySelectorAll('.product-card');
        const newCard = allCards[prevCount];
        if (newCard) {
          const btn = newCard.querySelector('.product-card__name-btn');
          if (btn) btn.focus();
        }
      });
    }

    // Delegación en la cuadrícula
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        // Clic en botón de nombre (abrir modal)
        const nameBtn = e.target.closest('.product-card__name-btn');
        if (nameBtn) {
          const id = nameBtn.dataset.id;
          const color = nameBtn.dataset.color || '';
          abrirModal(id, color, nameBtn);
          return;
        }
        // Clic en punto de color
        const dot = e.target.closest('.product-card__color-dot');
        if (dot) {
          const productId = dot.dataset.productId;
          const colorId = dot.dataset.colorId;
          cambiarColorTarjeta(productId, colorId, dot);
        }
      });

      // Hover en puntos de color (escritorio)
      grid.addEventListener('mouseenter', function (e) {
        const dot = e.target.closest('.product-card__color-dot');
        if (!dot) return;
        const productId = dot.dataset.productId;
        const colorId = dot.dataset.colorId;
        cambiarColorTarjeta(productId, colorId, dot);
      }, true);
    }
  }

  function cambiarColorTarjeta(productId, colorId, dotEl) {
    const li = document.querySelector('.product-card[data-id="' + productId + '"]');
    if (!li) return;
    const p = DATA.productos.find(pr => pr.id === productId);
    if (!p) return;
    const colorVariant = p.colores.find(c => c.id === colorId);
    if (!colorVariant) return;

    const tipo = DATA.tipos.find(t => t.id === p.tipo);
    const ilustracion = tipo ? tipo.ilustracion : 'snapback';
    const colorPrincipal = colorPorId(colorVariant.id);
    const colorSec = colorVariant.secundario ? colorPorId(colorVariant.secundario).hex : null;
    const tkns = CapSVG.tokens(colorPrincipal.hex, colorSec);

    const svgWrap = li.querySelector('.product-card__svg-wrap');
    if (svgWrap) {
      Object.entries(tkns).forEach(([k, v]) => svgWrap.style.setProperty(k, v));
    }

    // Actualizar puntos activos
    li.querySelectorAll('.product-card__color-dot').forEach(function (d) {
      const isActive = d.dataset.colorId === colorId;
      d.classList.toggle('product-card__color-dot--active', isActive);
      d.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Actualizar data-color del botón de nombre para que el modal abra con este color
    const nameBtn = li.querySelector('.product-card__name-btn');
    if (nameBtn) nameBtn.dataset.color = colorId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL DE DETALLE
  // ═══════════════════════════════════════════════════════════════════════════

  let dialogKeyHandler = null;
  let dialogPointerHandler = null;

  function abrirModal(id, colorId, origenEl) {
    const p = DATA.productos.find(pr => pr.id === id);
    if (!p) return;

    const dialog = document.getElementById('product-dialog');
    if (!dialog) return;

    estado.productoAbierto = id;
    estado.colorModal = colorId || (p.colores[0] && p.colores[0].id);
    estado.focusOrigen = origenEl || document.activeElement;

    rellenarModal(p);
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';

    // URL
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('producto', id);
      history.pushState(null, '', url.toString());
    } catch (e) {}

    // Posición en la lista filtrada
    actualizarPosModal(id);

    // Cerrar con backdrop click
    dialog.addEventListener('click', function onBackdropClick(e) {
      if (e.target === dialog) {
        cerrarModal();
        dialog.removeEventListener('click', onBackdropClick);
      }
    });

    // Teclado: flechas para navegar, Esc está en el dialog nativo
    dialogKeyHandler = function (e) {
      if (e.key === 'ArrowLeft' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        navegarModal(-1);
      } else if (e.key === 'ArrowRight' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        navegarModal(1);
      }
    };
    dialog.addEventListener('keydown', dialogKeyHandler);

    // Inclinación en escritorio dentro del modal
    initModalTilt();
  }

  function cerrarModal() {
    const dialog = document.getElementById('product-dialog');
    if (!dialog || !dialog.open) return;

    dialog.classList.add('closing');
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
    setTimeout(function () {
      dialog.classList.remove('closing');
      dialog.close();
      document.documentElement.style.overflow = '';

      if (dialogKeyHandler) {
        dialog.removeEventListener('keydown', dialogKeyHandler);
        dialogKeyHandler = null;
      }

      // Devolver foco
      if (estado.focusOrigen) {
        try { estado.focusOrigen.focus(); } catch (e) {}
      }
      estado.productoAbierto = null;

      // URL
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('producto');
        history.pushState(null, '', url.toString());
      } catch (e) {}
    }, duration);
  }

  function rellenarModal(p) {
    const tipo = DATA.tipos.find(t => t.id === p.tipo);
    const ilustracion = tipo ? tipo.ilustracion : 'snapback';
    const colorVariant = p.colores.find(c => c.id === estado.colorModal) || p.colores[0];
    const colorPrincipal = colorPorId(colorVariant.id);
    const colorSec = colorVariant.secundario ? colorPorId(colorVariant.secundario).hex : null;
    const tkns = CapSVG.tokens(colorPrincipal.hex, colorSec);

    // Escenario
    const stage = document.getElementById('dialog-stage');
    if (stage) {
      CapSVG.apply(stage, tkns);
      if (colorVariant.imagen) {
        stage.innerHTML = '<img src="' + esc(colorVariant.imagen) + '" alt="' +
          esc(p.nombre) + ' en color ' + esc(colorPrincipal.nombre) + '" ' +
          'width="1200" height="1200" loading="lazy" decoding="async" ' +
          'style="width:100%;height:100%;object-fit:contain;padding:8%" ' +
          'onerror="this.remove();this.parentNode.innerHTML=\'' + CapSVG.render(ilustracion, { etiqueta: p.nombre, inicial: INICIAL }).replace(/'/g, "\\'") + '\'"/>';
      } else {
        stage.innerHTML = CapSVG.render(ilustracion, {
          etiqueta: p.nombre + ' en color ' + colorPrincipal.nombre,
          inicial: INICIAL
        });
      }
    }

    // Precio para la barra móvil
    const barPrice = document.getElementById('dialog-bar-price');
    if (barPrice) barPrice.textContent = formatearPrecio(p.precio);

    // Contenido
    const content = document.getElementById('dialog-content');
    if (!content) return;

    let html = '';

    // Tipo
    html += '<p class="dialog-type">' + esc(tipo ? tipo.nombre : p.tipo) + '</p>';

    // Nombre
    html += '<h2 class="dialog-name" id="dialog-title">' + esc(p.nombre) + '</h2>';

    // Precio
    html += '<div class="dialog-price">' + esc(formatearPrecio(p.precio));
    if (p.precioAntes) {
      const pct = Math.round((1 - p.precio / p.precioAntes) * 100);
      html += '<span class="dialog-price__before">' + esc(formatearPrecio(p.precioAntes)) + '</span>';
      html += '<span class="dialog-price__discount">-' + pct + '%</span>';
    }
    html += '</div>';

    // Resumen
    html += '<p class="dialog-summary">' + esc(p.resumen) + '</p>';

    // Descripción
    html += '<p class="dialog-desc">' + esc(p.descripcion) + '</p>';

    // Selector de color
    html += '<span class="dialog-color-label" id="dialog-color-lbl">Color: ' + esc(colorPrincipal.nombre) + '</span>';
    html += '<div class="dialog-color-group" role="radiogroup" aria-labelledby="dialog-color-lbl">';
    p.colores.forEach(function (cv) {
      const cd = colorPorId(cv.id);
      const isActive = cv.id === estado.colorModal;
      const contrastStroke = CapSVG.luminancia(cd.hex) > 0.5 ? '#111215' : '#FFFFFF';
      html += '<button class="dialog-color-swatch' + (isActive ? ' dialog-color-swatch--active' : '') +
        '" role="radio" aria-checked="' + (isActive ? 'true' : 'false') +
        '" aria-label="' + esc(cd.nombre) + '" data-color="' + esc(cv.id) + '"' +
        ' tabindex="' + (isActive ? '0' : '-1') + '">' +
        '<span class="dialog-color-swatch-inner" style="background:' + esc(cd.hex) + '"></span>' +
        '</button>';
    });
    html += '</div>';

    // Especificaciones
    html += '<dl class="dialog-specs">';
    html += '<dt>Material</dt><dd>' + esc(p.material) + '</dd>';
    html += '<dt>Ajuste</dt><dd>'   + esc(p.ajuste)   + '</dd>';
    html += '<dt>Visera</dt><dd>'   + esc(p.visera)   + '</dd>';
    html += '<dt>Tallas</dt><dd>'   + esc(p.tallas)   + '</dd>';
    html += '<dt>Cuidado</dt><dd>'  + esc(p.cuidado)  + '</dd>';
    html += '</dl>';

    // Botón WhatsApp o agotada
    if (!p.disponible) {
      html += '<p class="dialog-unavailable">Agotada</p>';
    }
    html += '<div class="dialog-wa-wrap">';
    const waUrl = construirWaProducto(p, colorPrincipal.nombre);
    const waText = p.disponible ? 'Pedir por WhatsApp' : 'Avísame cuando llegue';
    html += '<a href="' + esc(waUrl) + '" target="_blank" rel="noopener noreferrer" class="btn btn--whatsapp dialog-wa-btn">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>' +
      '</svg>' + esc(waText) + '</a>';
    html += '<p class="dialog-wa-note">Te respondemos con stock, envío y formas de pago.</p>';
    html += '</div>';

    // Actualizar barra móvil
    const barWa = document.getElementById('dialog-bar-wa');
    if (barWa) {
      barWa.href = waUrl;
      barWa.setAttribute('target', '_blank');
      barWa.setAttribute('rel', 'noopener noreferrer');
      barWa.textContent = waText;
    }

    content.innerHTML = html;

    // Eventos en el selector de color del modal
    const colorGroup = content.querySelector('.dialog-color-group');
    if (colorGroup) {
      colorGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-color]');
        if (!btn) return;
        cambiarColorModal(p, btn.dataset.color);
      });
      colorGroup.addEventListener('keydown', function (e) {
        const allBtns = Array.from(colorGroup.querySelectorAll('[data-color]'));
        const cur = allBtns.findIndex(b => b === document.activeElement);
        if (cur === -1) return;
        let next = cur;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % allBtns.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + allBtns.length) % allBtns.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = allBtns.length - 1;
        else return;
        e.preventDefault();
        allBtns.forEach((b, i) => b.setAttribute('tabindex', i === next ? '0' : '-1'));
        allBtns[next].focus();
        cambiarColorModal(p, allBtns[next].dataset.color);
      });
    }
  }

  function cambiarColorModal(p, colorId) {
    estado.colorModal = colorId;
    const tipo = DATA.tipos.find(t => t.id === p.tipo);
    const ilustracion = tipo ? tipo.ilustracion : 'snapback';
    const colorVariant = p.colores.find(c => c.id === colorId) || p.colores[0];
    const colorPrincipal = colorPorId(colorVariant.id);
    const colorSec = colorVariant.secundario ? colorPorId(colorVariant.secundario).hex : null;
    const tkns = CapSVG.tokens(colorPrincipal.hex, colorSec);

    // Actualizar escenario
    const stage = document.getElementById('dialog-stage');
    if (stage) {
      CapSVG.apply(stage, tkns);
      stage.innerHTML = CapSVG.render(ilustracion, {
        etiqueta: p.nombre + ' en color ' + colorPrincipal.nombre,
        inicial: INICIAL
      });
    }

    // Actualizar etiqueta de color
    const colorLbl = document.getElementById('dialog-color-lbl');
    if (colorLbl) colorLbl.textContent = 'Color: ' + colorPrincipal.nombre;

    // Actualizar selector
    const allSwatches = document.querySelectorAll('#dialog-content .dialog-color-swatch');
    allSwatches.forEach(function (sw) {
      const isActive = sw.dataset.color === colorId;
      sw.classList.toggle('dialog-color-swatch--active', isActive);
      sw.setAttribute('aria-checked', isActive ? 'true' : 'false');
      sw.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Actualizar enlace WhatsApp
    const waUrl = construirWaProducto(p, colorPrincipal.nombre);
    const waBtn = document.querySelector('.dialog-wa-btn');
    if (waBtn) waBtn.href = waUrl;
    const barWa = document.getElementById('dialog-bar-wa');
    if (barWa) barWa.href = waUrl;
  }

  function construirWaProducto(p, colorNombre) {
    const plantilla = p.disponible ? CONFIG.mensajes.producto : CONFIG.mensajes.agotada;

    // Si la página está publicada en línea (HTTP/HTTPS) o hay CONFIG.url, adjuntamos el enlace para la foto en WhatsApp
    let enlace = '';
    try {
      let base = CONFIG.url || '';
      if (!base && typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
        base = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
      }
      if (base) {
        enlace = base + '/?producto=' + encodeURIComponent(p.id);
      }
    } catch (e) {}

    return armarEnlaceWhatsApp(plantilla, {
      nombre: p.nombre,
      color: colorNombre,
      precio: formatearPrecio(p.precio),
      marca: CONFIG.marca,
      enlace: enlace ? ('\nVer gorra: ' + enlace) : ''
    });
  }

  function actualizarPosModal(id) {
    const idx = estado.filtradosActuales.findIndex(p => p.id === id);
    const pos = document.getElementById('dialog-pos');
    if (pos) pos.textContent = (idx + 1) + ' de ' + estado.filtradosActuales.length;
  }

  function navegarModal(dir) {
    const idx = estado.filtradosActuales.findIndex(p => p.id === estado.productoAbierto);
    if (idx === -1) return;
    const newIdx = (idx + dir + estado.filtradosActuales.length) % estado.filtradosActuales.length;
    const newProduct = estado.filtradosActuales[newIdx];
    if (!newProduct) return;
    estado.productoAbierto = newProduct.id;
    estado.colorModal = newProduct.colores[0] && newProduct.colores[0].id;
    rellenarModal(newProduct);
    actualizarPosModal(newProduct.id);
  }

  function initModalEvents() {
    const dialog = document.getElementById('product-dialog');
    if (!dialog) return;

    const closeBtn = document.getElementById('dialog-close');
    if (closeBtn) closeBtn.addEventListener('click', cerrarModal);

    const prevBtn = document.getElementById('dialog-prev');
    if (prevBtn) prevBtn.addEventListener('click', function () { navegarModal(-1); });

    const nextBtn = document.getElementById('dialog-next');
    if (nextBtn) nextBtn.addEventListener('click', function () { navegarModal(1); });

    dialog.addEventListener('close', function () {
      document.documentElement.style.overflow = '';
    });
  }

  // Inclinación de la gorra en el modal (escritorio)
  function initModalTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const stage = document.getElementById('dialog-stage');
    if (!stage) return;

    let rafId = null;
    const mt = { rx: 0, ry: 0 };
    const mtTarget = { rx: 0, ry: 0 };

    function loop() {
      mt.rx = lerp(mt.rx, mtTarget.rx, 0.12);
      mt.ry = lerp(mt.ry, mtTarget.ry, 0.12);
      const svg = stage.querySelector('svg');
      if (svg) {
        svg.style.transform = 'rotateX(' + mt.rx.toFixed(3) + 'deg) rotateY(' + mt.ry.toFixed(3) + 'deg)';
        svg.style.transformOrigin = 'center center';
      }
      const diff = Math.abs(mt.rx - mtTarget.rx) + Math.abs(mt.ry - mtTarget.ry);
      if (diff < 0.01 && mtTarget.rx === 0 && mtTarget.ry === 0) {
        cancelAnimationFrame(rafId);
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(loop);
    }

    function onMove(e) {
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mtTarget.ry = ((e.clientX - cx) / (rect.width / 2)) * 10;
      mtTarget.rx = -((e.clientY - cy) / (rect.height / 2)) * 8;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
    function onLeave() {
      mtTarget.rx = 0; mtTarget.ry = 0;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }

    stage.addEventListener('mousemove', onMove, { passive: true });
    stage.addEventListener('mouseleave', onLeave, { passive: true });

    // Limpiar al cerrar
    const dialog = document.getElementById('product-dialog');
    if (dialog) {
      dialog.addEventListener('close', function () {
        stage.removeEventListener('mousemove', onMove);
        stage.removeEventListener('mouseleave', onLeave);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }, { once: true });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENCABEZADO: SCROLL Y SCROLLSPY
  // ═══════════════════════════════════════════════════════════════════════════

  function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    // Scroll: fondo al pasar de 8px
    window.addEventListener('scroll', function () {
      header.classList.toggle('header--scrolled', window.scrollY > 8);
    }, { passive: true });

    // Scrollspy: marca el enlace activo con aria-current
    const sections = ['inicio', 'catalogo', 'como-pedir', 'preguntas', 'contacto'];
    const navLinks = document.querySelectorAll('.header__nav-link');

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(function (link) {
            const isActive = link.getAttribute('href') === '#' + id;
            link.setAttribute('aria-current', isActive ? 'true' : 'false');
          });
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MENÚ MÓVIL
  // ═══════════════════════════════════════════════════════════════════════════

  function initMobileMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const menuClose = document.getElementById('menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuBtn || !mobileMenu) return;

    let firstLink = null;

    function openMenu() {
      mobileMenu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
      firstLink = mobileMenu.querySelector('.mobile-menu__link');
      setTimeout(function () { if (firstLink) firstLink.focus(); }, 20);
    }

    function closeMenu() {
      mobileMenu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
      menuBtn.focus();
    }

    menuBtn.addEventListener('click', openMenu);
    if (menuClose) menuClose.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('.mobile-menu__link').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Cerrar con Esc
    mobileMenu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOTÓN FLOTANTE DE WHATSAPP
  // ═══════════════════════════════════════════════════════════════════════════

  function initFabWa() {
    const fab = document.getElementById('fab-wa');
    const hero = document.getElementById('inicio');
    if (!fab || !hero) return;

    const obs = new IntersectionObserver(function (entries) {
      fab.hidden = entries[0].isIntersecting;
    }, { threshold: 0 });
    obs.observe(hero);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // URL: LEER Y ESCRIBIR ESTADO
  // ═══════════════════════════════════════════════════════════════════════════

  function leerURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tipo = params.get('tipo') || '';
      const color = params.get('color') || '';
      const q = params.get('q') || '';
      const orden = params.get('orden') || 'destacadas';
      const productoId = params.get('producto') || '';

      estado.tipo = tipo;
      estado.color = color;
      estado.q = q;
      estado.orden = orden;

      // Actualizar UI de filtros
      if (q) {
        const si = document.getElementById('search-input');
        if (si) si.value = q;
        const cs = document.getElementById('clear-search');
        if (cs) cs.hidden = false;
      }
      if (tipo) {
        document.querySelectorAll('#type-filters .chip').forEach(function (c) {
          const isActive = c.dataset.type === tipo;
          c.classList.toggle('chip--active', isActive);
          c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }
      if (color) {
        const colorFilters = document.getElementById('color-filters');
        if (colorFilters) {
          colorFilters.querySelectorAll('[data-color]').forEach(function (b) {
            const isActive = b.dataset.color === color;
            b.setAttribute('aria-checked', isActive ? 'true' : 'false');
            b.setAttribute('tabindex', isActive ? '0' : '-1');
            b.classList.toggle('color-swatch--active', isActive);
            b.classList.toggle('chip--active', b.dataset.color === '' && !color);
          });
        }
      }
      if (orden !== 'destacadas') {
        const ss = document.getElementById('sort-select');
        if (ss) ss.value = orden;
      }

      applyFilters();

      // Abrir modal si hay producto en la URL
      if (productoId) {
        const p = DATA.productos.find(pr => pr.id === productoId);
        if (p) {
          setTimeout(function () {
            abrirModal(p.id, p.colores[0] && p.colores[0].id, null);
          }, 100);
        }
      }
    } catch (e) {
      applyFilters();
    }
  }

  function actualizarURL() {
    try {
      const url = new URL(window.location.href);
      if (estado.tipo) url.searchParams.set('tipo', estado.tipo);
      else url.searchParams.delete('tipo');
      if (estado.color) url.searchParams.set('color', estado.color);
      else url.searchParams.delete('color');
      if (estado.q) url.searchParams.set('q', estado.q);
      else url.searchParams.delete('q');
      if (estado.orden !== 'destacadas') url.searchParams.set('orden', estado.orden);
      else url.searchParams.delete('orden');
      history.replaceState(null, '', url.toString());
    } catch (e) { /* file:// puede bloquear history */ }
  }

  // Botón Atrás del navegador: cierra el modal
  window.addEventListener('popstate', function () {
    const dialog = document.getElementById('product-dialog');
    if (dialog && dialog.open) cerrarModal();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUMEN DEL CATÁLOGO
  // ═══════════════════════════════════════════════════════════════════════════
  function actualizarResumenCatalogo() {
    const el = document.getElementById('catalog-summary');
    if (!el) return;
    const nProd = DATA.productos.length;
    const nTipos = DATA.tipos.length;
    const nColores = DATA.colores.length;
    el.textContent = nProd + ' gorras en ' + nTipos + ' tipos y ' + nColores + ' colores.';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JSON-LD: DATOS ESTRUCTURADOS
  // ═══════════════════════════════════════════════════════════════════════════
  function inyectarJsonLD() {
    try {
      const items = DATA.productos.map(function (p, i) {
        const item = {
          '@type': 'ListItem',
          'position': i + 1,
          'item': {
            '@type': 'Product',
            'name': p.nombre,
            'description': p.descripcion,
            'brand': { '@type': 'Brand', 'name': CONFIG.marca },
            'offers': {
              '@type': 'Offer',
              'price': p.precio.toFixed(2),
              'priceCurrency': CONFIG.moneda,
              'availability': p.disponible
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock'
            }
          }
        };
        return item;
      });

      const ld = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': CONFIG.marca + ' — Catálogo de gorras',
        'itemListElement': items
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(ld);
      document.head.appendChild(script);
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // prefers-reduced-motion: escucha cambios en vivo
  // ═══════════════════════════════════════════════════════════════════════════
  function initReducedMotion() {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', function (e) {
      if (e.matches && heroTiltRaf) {
        cancelAnimationFrame(heroTiltRaf);
        heroTiltRaf = null;
        heroTiltActive = false;
        // Restablecer la gorra al reposo
        const capInner = heroCapEl && heroCapEl.querySelector('.hero__cap-inner');
        if (capInner) capInner.style.transform = '';
        if (heroWordEl) heroWordEl.style.transform = '';
        if (heroShadowEl) { heroShadowEl.style.transform = ''; heroShadowEl.style.width = '60%'; }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT: punto de entrada
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    // 1. Rellenar datos de la marca
    rellenarEnlaces();

    // 2. Actualizar resumen del catálogo
    actualizarResumenCatalogo();

    // 3. Construir el inicio
    buildHeroStage();
    buildHeroPicker();
    initHeroCapClick();
    initHeroColorBtn();
    initHeroMainBtn();
    initHeroTilt();
    initHeroTiltTouch();
    initHeroVisibility();

    // 4. Construir filtros de color
    buildColorFilters();

    // 5. Leer URL y renderizar catálogo
    leerURL();

    // 6. Inicializar eventos del catálogo
    initCatalogEvents();

    // 7. Inicializar modal
    initModalEvents();

    // 8. Encabezado y menú
    initHeader();
    initMobileMenu();

    // 9. Botón flotante
    initFabWa();

    // 10. JSON-LD
    inyectarJsonLD();

    // 11. Reducción de movimiento
    initReducedMotion();

    // 12. Secuencia de carga del inicio (al final, para no bloquear el render)
    runHeroSequence();
  }

  // Esperar a que el DOM y los scripts con defer estén listos
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
