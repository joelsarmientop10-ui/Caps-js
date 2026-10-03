// js/cap-svg.js
// Dibuja gorras en SVG por código. Expone el objeto global CapSVG.
// Todas las gorras usan variables CSS para el color; basta con cambiar las variables en el contenedor.

(function () {
  'use strict';

  // Contador global para IDs únicos en cada SVG
  let _uid = 0;
  function uid() { return ++_uid; }

  // ─── Utilidades de color ─────────────────────────────────────────────────────

  /** Convierte hex a { r, g, b } en rango 0-255 */
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const big = parseInt(h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h, 16);
    return { r: (big >> 16) & 255, g: (big >> 8) & 255, b: big & 255 };
  }

  /** Convierte { r, g, b } a hex */
  function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => {
      const h = Math.round(Math.max(0, Math.min(255, v))).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  /** Mezcla dos colores hex con factor t (0=a, 1=b) */
  function mezclar(a, b, t) {
    const ca = hexToRgb(a), cb = hexToRgb(b);
    return rgbToHex({
      r: ca.r * (1 - t) + cb.r * t,
      g: ca.g * (1 - t) + cb.g * t,
      b: ca.b * (1 - t) + cb.b * t
    });
  }

  /** Luminancia relativa WCAG de un color hex */
  function luminancia(hex) {
    const { r, g, b } = hexToRgb(hex);
    const [rs, gs, bs] = [r, g, b].map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /** Calcula las 9 variables CSS de color para el escenario del inicio */
  function tokens(principal, secundario) {
    const lum = luminancia(principal);
    const visor = secundario ? secundario : mezclar(principal, '#000000', 0.12);
    // En la estética Dark Luxury, el fondo del hero es #0A0A0A con un matiz sutil del color (10%)
    const heroBg = mezclar(principal, '#0A0A0A', 0.90);
    // La palabra gigante "gorras" es una marca de agua oscura y elegante
    const heroWordFinal = mezclar(principal, '#181818', 0.85);

    return {
      '--cap-main':        principal,
      '--cap-shade':       mezclar(principal, '#000000', 0.28),
      '--cap-light':       mezclar(principal, '#FFFFFF', 0.18),
      '--cap-outline':     mezclar(principal, '#0A0A0A', 0.70),
      '--cap-visor':       visor,
      '--cap-visor-shade': mezclar(visor, '#000000', 0.30),
      '--cap-detail':      lum > 0.45 ? '#0A0A0A' : '#F5F5F5',
      '--hero-bg':         heroBg,
      '--hero-word':       heroWordFinal
    };
  }

  /** Aplica tokens CSS a un elemento DOM */
  function apply(elemento, tks) {
    Object.entries(tks).forEach(([k, v]) => elemento.style.setProperty(k, v));
  }

  // ─── Plantillas SVG por tipo ─────────────────────────────────────────────────

  /** Snapback: copa alta estructurada, visera plana, correa trasera con broches */
  function svgSnapback(id, etiqueta, inicial) {
    return `<svg viewBox="0 0 480 360" width="100%" role="img" aria-label="${etiqueta}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <!-- cierre trasero snapback -->
  <rect x="58" y="210" width="52" height="14" rx="4" fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="2"/>
  <circle cx="70" cy="217" r="5" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="100" cy="217" r="5" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- copa principal -->
  <path d="M90,224 C75,224 62,210 60,190 L55,130 C53,100 80,68 160,60 C200,56 240,56 280,60 C360,68 395,100 392,130 L387,190 C385,210 370,224 355,224 Z"
    fill="var(--cap-main)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <!-- sombra copa trasera -->
  <path d="M90,224 C75,224 62,210 60,190 L58,150 C58,150 80,170 115,190 Z"
    fill="var(--cap-shade)" opacity="0.6"/>
  <!-- costuras con puntadas -->
  <path d="M165,64 C160,110 158,155 160,220" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <path d="M240,60 C238,108 237,155 238,224" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <path d="M315,64 C318,110 320,155 317,220" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <!-- luz superior izquierda -->
  <ellipse cx="175" cy="88" rx="32" ry="16" fill="var(--cap-light)" opacity="0.70" transform="rotate(-20,175,88)"/>
  <!-- botón superior -->
  <circle cx="223" cy="62" r="10" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="2"/>
  <!-- ojales -->
  <circle cx="148" cy="145" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="295" cy="148" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- parche frontal con inicial -->
  <rect x="188" y="112" width="72" height="46" rx="6" fill="var(--cap-shade)"/>
  <text x="224" y="144" font-family="Archivo,system-ui,sans-serif" font-weight="800" font-size="30"
    fill="var(--cap-detail)" text-anchor="middle" dominant-baseline="auto">${inicial}</text>
  <!-- visera plana -->
  <path d="M100,226 C90,226 70,228 55,240 C45,248 50,258 75,258 L350,258 C375,258 380,248 370,240 C355,228 335,226 325,226 Z"
    fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <!-- cara inferior visera -->
  <path d="M75,258 L350,258 C375,258 380,248 370,240 L360,242 C348,252 80,252 65,242 Z"
    fill="var(--cap-visor-shade)" opacity="0.8"/>
  <!-- puntadas visera -->
  <path d="M80,250 C120,246 340,246 365,250" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.6"/>
  <path d="M90,244 C125,241 335,241 355,244" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.4"/>
  <!-- unión copa-visera -->
  <path d="M100,226 L325,226" stroke="var(--cap-shade)" stroke-width="2" fill="none"/>
</svg>`;
  }

  /** Trucker: frente de espuma + malla trasera con patrón de puntos */
  function svgTrucker(id, etiqueta, inicial) {
    const n = uid();
    return `<svg viewBox="0 0 480 360" width="100%" role="img" aria-label="${etiqueta}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <defs>
    <pattern id="mesh-${n}" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.4" fill="rgba(0,0,0,0.25)"/>
    </pattern>
    <clipPath id="cp-back-${n}">
      <path d="M90,224 C75,224 62,210 60,190 L55,130 C53,100 75,68 155,62 L170,62 L160,222 Z"/>
    </clipPath>
  </defs>
  <!-- cierre trasero -->
  <rect x="58" y="210" width="52" height="14" rx="4" fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="2"/>
  <circle cx="70" cy="217" r="5" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="100" cy="217" r="5" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- copa completa (base) -->
  <path d="M90,224 C75,224 62,210 60,190 L55,130 C53,100 80,68 160,60 C200,56 240,56 280,60 C360,68 395,100 392,130 L387,190 C385,210 370,224 355,224 Z"
    fill="var(--cap-main)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <!-- malla trasera encima del color -->
  <path d="M90,224 C75,224 62,210 60,190 L55,130 C53,100 75,68 155,62 L170,62 L160,222 Z"
    fill="var(--cap-visor)"/>
  <path d="M90,224 C75,224 62,210 60,190 L55,130 C53,100 75,68 155,62 L170,62 L160,222 Z"
    fill="url(#mesh-${n})" clip-path="url(#cp-back-${n})"/>
  <!-- sombra trasera -->
  <path d="M155,62 L170,62 L160,222 L145,222 C100,210 65,185 58,155 Z"
    fill="var(--cap-shade)" opacity="0.3"/>
  <!-- costuras con puntadas -->
  <path d="M240,60 C238,108 237,155 238,224" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <path d="M315,64 C318,110 320,155 317,220" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <!-- luz -->
  <ellipse cx="230" cy="88" rx="38" ry="18" fill="var(--cap-light)" opacity="0.65" transform="rotate(-18,230,88)"/>
  <!-- botón superior -->
  <circle cx="240" cy="62" r="10" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="2"/>
  <!-- ojales -->
  <circle cx="200" cy="145" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="300" cy="148" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- parche frontal con inicial -->
  <rect x="200" y="112" width="72" height="46" rx="6" fill="var(--cap-shade)"/>
  <text x="236" y="144" font-family="Archivo,system-ui,sans-serif" font-weight="800" font-size="30"
    fill="var(--cap-detail)" text-anchor="middle" dominant-baseline="auto">${inicial}</text>
  <!-- visera ligeramente curva -->
  <path d="M105,228 C90,229 68,232 52,244 C42,252 48,262 72,262 L350,262 C374,262 380,252 370,244 C354,232 335,229 318,228 Z"
    fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M72,262 L350,262 C374,262 380,252 370,244 L360,246 C345,256 78,256 64,246 Z"
    fill="var(--cap-visor-shade)" opacity="0.8"/>
  <path d="M80,254 C120,250 338,250 365,254" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.6"/>
  <path d="M90,248 C125,245 335,245 358,248" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.4"/>
  <!-- unión copa-visera -->
  <path d="M108,228 L315,228" stroke="var(--cap-shade)" stroke-width="2" fill="none"/>
</svg>`;
  }

  /** Dad hat: copa baja y blanda, visera curva, hebilla metálica */
  function svgDad(id, etiqueta, inicial) {
    return `<svg viewBox="0 0 480 360" width="100%" role="img" aria-label="${etiqueta}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <!-- hebilla metálica trasera -->
  <rect x="58" y="215" width="48" height="12" rx="3" fill="#B8BFC9" stroke="#8A93A1" stroke-width="1.5"/>
  <rect x="74" y="213" width="16" height="16" rx="2" fill="#9AA2B0" stroke="#8A93A1" stroke-width="1"/>
  <!-- copa baja y blanda (altura ~70% de snapback) -->
  <path d="M95,236 C80,236 66,222 64,202 L60,152 C58,128 82,96 160,88 C196,85 240,84 284,88 C360,96 398,128 396,152 L392,202 C390,222 376,236 362,236 Z"
    fill="var(--cap-main)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <!-- caída suave de la copa -->
  <path d="M95,236 C80,236 66,222 64,202 L62,172 C65,185 90,210 115,222 Z"
    fill="var(--cap-shade)" opacity="0.5"/>
  <!-- costuras suaves -->
  <path d="M168,92 C164,132 162,172 164,232" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.5"/>
  <path d="M240,88 C238,130 237,170 238,232" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.5"/>
  <path d="M312,92 C315,132 317,172 314,232" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.5"/>
  <!-- luz -->
  <ellipse cx="185" cy="108" rx="30" ry="14" fill="var(--cap-light)" opacity="0.65" transform="rotate(-22,185,108)"/>
  <!-- botón superior (más bajo) -->
  <circle cx="228" cy="88" r="9" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="2"/>
  <!-- ojales -->
  <circle cx="152" cy="158" r="4" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="300" cy="160" r="4" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- parche con inicial -->
  <rect x="194" y="128" width="68" height="44" rx="6" fill="var(--cap-shade)"/>
  <text x="228" y="158" font-family="Archivo,system-ui,sans-serif" font-weight="800" font-size="28"
    fill="var(--cap-detail)" text-anchor="middle" dominant-baseline="auto">${inicial}</text>
  <!-- visera curva dad hat -->
  <path d="M110,238 C95,240 72,244 56,258 C46,267 52,278 76,278 L345,278 C370,278 376,267 366,258 C350,244 328,240 315,238 Z"
    fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M76,278 L345,278 C370,278 376,267 366,258 L356,261 C338,272 84,272 68,261 Z"
    fill="var(--cap-visor-shade)" opacity="0.8"/>
  <path d="M84,268 C122,264 332,264 358,268" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.6"/>
  <!-- unión copa-visera -->
  <path d="M112,238 L312,238" stroke="var(--cap-shade)" stroke-width="2" fill="none"/>
</svg>`;
  }

  /** Fitted / Beisbolera: copa estructurada y redondeada, visera curva, parte trasera cerrada */
  function svgFitted(id, etiqueta, inicial) {
    return `<svg viewBox="0 0 480 360" width="100%" role="img" aria-label="${etiqueta}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <!-- costura central trasera -->
  <path d="M68,218 C65,195 64,162 66,128" fill="none" stroke="var(--cap-outline)" stroke-width="2.5"
    stroke-dasharray="6 4" opacity="0.7"/>
  <!-- parche rectangular lateral pequeño -->
  <rect x="68" y="155" width="28" height="18" rx="3" fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- copa estructurada redondeada -->
  <path d="M92,228 C76,228 63,214 61,193 L56,135 C54,105 80,72 158,62 C198,58 242,57 282,62 C358,72 394,105 392,135 L387,193 C385,214 370,228 354,228 Z"
    fill="var(--cap-main)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <!-- sombra trasera -->
  <path d="M92,228 C76,228 63,214 61,193 L58,155 C68,178 95,212 118,224 Z"
    fill="var(--cap-shade)" opacity="0.6"/>
  <!-- costuras 6 paneles -->
  <path d="M162,65 C158,112 156,158 158,224" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <path d="M240,60 C238,108 237,155 238,224" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <path d="M318,65 C320,112 322,158 320,224" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <!-- luz más pronunciada (copa redondeada) -->
  <ellipse cx="192" cy="85" rx="36" ry="18" fill="var(--cap-light)" opacity="0.70" transform="rotate(-25,192,85)"/>
  <!-- botón superior redondeado -->
  <circle cx="223" cy="60" r="11" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="2"/>
  <!-- ojales -->
  <circle cx="150" cy="148" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="298" cy="150" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- parche frontal con inicial -->
  <rect x="188" y="114" width="72" height="46" rx="6" fill="var(--cap-shade)"/>
  <text x="224" y="146" font-family="Archivo,system-ui,sans-serif" font-weight="800" font-size="30"
    fill="var(--cap-detail)" text-anchor="middle" dominant-baseline="auto">${inicial}</text>
  <!-- visera curva fitted -->
  <path d="M108,230 C94,231 72,235 56,248 C46,257 52,268 76,268 L350,268 C374,268 380,257 370,248 C354,235 334,231 318,230 Z"
    fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M76,268 L350,268 C374,268 380,257 370,248 L360,251 C344,262 80,262 66,251 Z"
    fill="var(--cap-visor-shade)" opacity="0.8"/>
  <path d="M84,259 C122,255 336,255 362,259" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.6"/>
  <path d="M93,252 C126,249 332,249 354,252" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="5 3" opacity="0.4"/>
  <!-- unión copa-visera -->
  <path d="M110,230 L316,230" stroke="var(--cap-shade)" stroke-width="2" fill="none"/>
</svg>`;
  }

  /** Bucket hat: sin visera frontal, ala caída en todo el contorno, puntadas en el ala */
  function svgBucket(id, etiqueta, inicial) {
    return `<svg viewBox="0 0 480 360" width="100%" role="img" aria-label="${etiqueta}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <!-- ala caída (elipse alargada bajo la copa) -->
  <ellipse cx="224" cy="264" rx="185" ry="26"
    fill="var(--cap-visor)" stroke="var(--cap-outline)" stroke-width="3"/>
  <!-- cara inferior del ala -->
  <ellipse cx="224" cy="268" rx="178" ry="20" fill="var(--cap-visor-shade)" opacity="0.7"/>
  <!-- puntadas del ala (2 filas) -->
  <ellipse cx="224" cy="264" rx="162" ry="18" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="6 4" opacity="0.6"/>
  <ellipse cx="224" cy="264" rx="145" ry="14" fill="none" stroke="var(--cap-outline)" stroke-width="1.5"
    stroke-dasharray="6 4" opacity="0.4"/>
  <!-- copa en trapecio redondeado -->
  <path d="M100,248 C88,248 76,235 74,212 L70,152 C68,120 98,78 170,68 C200,64 248,63 278,68 C350,78 380,120 378,152 L374,212 C372,235 360,248 348,248 Z"
    fill="var(--cap-main)" stroke="var(--cap-outline)" stroke-width="3" stroke-linejoin="round"/>
  <!-- sombra lateral -->
  <path d="M100,248 C88,248 76,235 74,212 L72,172 C80,192 105,228 128,242 Z"
    fill="var(--cap-shade)" opacity="0.55"/>
  <!-- costuras verticales -->
  <path d="M172,70 C168,118 166,166 168,244" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <path d="M248,66 C246,114 245,162 246,244" fill="none" stroke="var(--cap-outline)" stroke-width="2"
    stroke-dasharray="5 4" opacity="0.55"/>
  <!-- luz -->
  <ellipse cx="182" cy="98" rx="32" ry="15" fill="var(--cap-light)" opacity="0.65" transform="rotate(-20,182,98)"/>
  <!-- botón superior (pequeño, bucket style) -->
  <circle cx="224" cy="68" r="10" fill="var(--cap-shade)" stroke="var(--cap-outline)" stroke-width="2"/>
  <!-- ojales en la copa (2 visibles) -->
  <circle cx="155" cy="158" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <circle cx="300" cy="162" r="5" fill="var(--cap-light)" stroke="var(--cap-outline)" stroke-width="1.5"/>
  <!-- parche con inicial -->
  <rect x="192" y="124" width="68" height="44" rx="6" fill="var(--cap-shade)"/>
  <text x="226" y="154" font-family="Archivo,system-ui,sans-serif" font-weight="800" font-size="28"
    fill="var(--cap-detail)" text-anchor="middle" dominant-baseline="auto">${inicial}</text>
  <!-- unión copa-ala -->
  <path d="M102,248 L346,248" stroke="var(--cap-shade)" stroke-width="2" fill="none"/>
</svg>`;
  }

  // ─── Función principal de render ────────────────────────────────────────────

  /**
   * CapSVG.render(tipo, opciones)
   * tipo: 'snapback' | 'trucker' | 'dad' | 'fitted' | 'bucket'
   * opciones: { etiqueta, inicial }
   * Devuelve el texto del SVG listo para insertar con innerHTML en un contenedor de confianza.
   */
  function render(tipo, opciones) {
    const etiqueta = opciones.etiqueta || 'Gorra';
    const inicial = opciones.inicial || 'C';
    const id = uid();
    switch (tipo) {
      case 'trucker':  return svgTrucker(id, etiqueta, inicial);
      case 'dad':      return svgDad(id, etiqueta, inicial);
      case 'fitted':   return svgFitted(id, etiqueta, inicial);
      case 'bucket':   return svgBucket(id, etiqueta, inicial);
      case 'snapback':
      default:         return svgSnapback(id, etiqueta, inicial);
    }
  }

  // ─── Exportar el objeto global ───────────────────────────────────────────────
  window.CapSVG = { render, tokens, apply, mezclar, luminancia };

}());
