# Caps js — Catálogo de gorras

Página web estática de catálogo de gorras. Funciona abriendo `index.html` con doble clic. No requiere servidor ni conexión a internet (excepto para cargar la fuente Google Fonts).

## Cómo abrir

**Opción 1 — Doble clic:**
Abre `index.html` directamente en tu navegador.

**Opción 2 — Servidor local (recomendado para compartir en red):**
```bash
python -m http.server 8000
```
Luego abre `http://localhost:8000` en tu navegador.

---

## Lo primero que debes cambiar

Abre `js/config.js` y cambia estos valores:

```js
window.CONFIG = {
  marca: "Caps js",               // ← nombre de tu tienda
  eslogan: "Gorras para todos los días",
  whatsapp: "573108373303",       // ← tu número en formato internacional (solo dígitos)
  instagram: "https://www.instagram.com/capsjs.co/", // ← tu Instagram ("" para ocultarlo)
  horario: "Lunes a sábado, de 9:00AM a 8:00PM",
  cobertura: "Envíos a todo el país",
  moneda: "COP",                  // ← código ISO 4217 de tu moneda
  locale: "es-CO",                // ← locale de tu país (ej: es-MX, es-AR)
  ...
};
```

También cambia en `index.html`:
- `<title>` (línea 7)
- `<meta name="description">` (línea 8)
- Las etiquetas `og:title`, `og:description`, `og:url` (líneas 14–20)
- Los textos de las preguntas frecuentes (sección `#preguntas`)

---

## Cómo agregar una gorra

Abre `js/data.js` y copia uno de los objetos de `DATA.productos`. Cambia:

```js
{
  id: 'mi-nueva-gorra',           // único, minúsculas, sin tildes, con guiones
  nombre: 'Mi Nueva Gorra',
  tipo: 'snapback',               // snapback | trucker | dad | beisbolera | bucket
  precio: 50000,
  precioAntes: null,              // número si hay oferta, null si no
  etiqueta: null,                 // 'nuevo' | 'mas-vendida' | 'oferta' | null
  destacada: false,
  disponible: true,
  fecha: '2026-10-01',            // AAAA-MM-DD
  colores: [
    { id: 'negro' },
    { id: 'rojo', secundario: 'negro' }  // secundario = color de la visera/malla
  ],
  resumen: 'Máximo 90 caracteres.',
  descripcion: '2 o 3 frases únicas. Menciona material, ajuste y ocasión.',
  material: 'Poliéster y algodón',
  ajuste: 'Cierre snapback ajustable',
  visera: 'Plana',
  tallas: 'Única, de 54 a 60 cm',
  cuidado: 'Lavar a mano.',
  tags: ['clásica', 'diaria', 'unisex']
}
```

Los ids de color disponibles son: `rojo`, `azul-marino`, `mostaza`, `verde-oliva`, `rosa-palo`, `arena`, `hueso`, `negro`.

---

## Cómo poner fotos reales

1. Guarda las fotos en `assets/img/` — cuadradas, 1200×1200 px, fondo liso, menos de 200 KB cada una.
2. En el objeto del producto, agrega el campo `imagen` a la variante de color:

```js
colores: [
  { id: 'rojo', imagen: 'assets/img/mi-gorra-rojo.jpg' }
]
```

Si la foto no carga, la página vuelve al dibujo SVG automáticamente.

---

## Paleta de Diseño Visual (Dark Premium & Luxury)

La interfaz utiliza una estética oscura refinada con acentos dorados controlados (5–10%):

```css
:root {
  /* Fondos */
  --bg-deep:        #0A0A0A;  /* Fondo general / Body */
  --bg-section:     #0D0D0D;  /* Secciones alternas */
  --bg-card:        #121212;  /* Tarjetas, paneles y modales */
  --bg-inner:       #181818;  /* Escenarios e inputs internos */
  --bg-footer:      #080808;  /* Pie de página */

  /* Textos */
  --text-primary:   #F5F5F5;  /* Títulos y textos principales */
  --text-body:      #D0D0D0;  /* Párrafos cómodos de leer */
  --text-secondary: #B8B8B8;  /* Subtítulos y apoyo */
  --text-tertiary:  #8A8A8A;  /* Auxiliares y metadatos */

  /* Acento Dorado Exclusivo */
  --gold-primary:   #C9A227;  /* Dorado principal (botones, activos) */
  --gold-hover:     #D4AF37;  /* Dorado suave en hover */
  --gold-champagne: #E6D5A8;  /* Champagne sutil */
}
```

---

## Cómo crear la imagen para compartir en redes (og-image)

Crea un archivo `assets/og-image.png` de **1200×630 px** con:
- Fondo en negro profundo (`#0A0A0A`)
- El logotipo de la marca
- Tipografía en blanco/champagne
- Una gorra o las gorras destacadas

Esta imagen aparece cuando alguien comparte el enlace en WhatsApp, Instagram o Twitter.

---

## Cómo publicar en GitHub Pages con Dominio Personalizado

### 1. Subir a GitHub
1. Crea un repositorio en tu cuenta de GitHub (ej. `catalogo-gorras`).
2. Sube todos los archivos de esta carpeta a la rama `main`.
3. En tu repositorio, entra a **Settings → Pages**.
4. En **Build and deployment → Branch**, selecciona `main` y la carpeta `/(root)`. Haz clic en **Save**.
5. Tu catálogo ya estará publicado en: `https://<tu-usuario>.github.io/<tu-repositorio>/`.

### 2. Conectar tu Dominio Personalizado (ej. `capsjs.co` o `capsjs.com`)
1. En GitHub, dentro de **Settings → Pages**:
   - En el campo **Custom domain**, escribe tu dominio (por ejemplo: `capsjs.co`).
   - Haz clic en **Save**. Esto generará automáticamente un archivo `CNAME` en el repositorio.
2. En el panel de control de tu registrador donde compraste el dominio (Namecheap, Porkbun, GoDaddy, etc.), ve a la sección de **Gestión de DNS**:
   - Agrega **4 registros tipo A** para tu dominio raíz:
     - Tipo: `A` | Host/Nombre: `@` | Valor: `185.199.108.153`
     - Tipo: `A` | Host/Nombre: `@` | Valor: `185.199.109.153`
     - Tipo: `A` | Host/Nombre: `@` | Valor: `185.199.110.153`
     - Tipo: `A` | Host/Nombre: `@` | Valor: `185.199.111.153`
   - Agrega **1 registro CNAME** para el subdominio www:
     - Tipo: `CNAME` | Host/Nombre: `www` | Valor: `<tu-usuario>.github.io.`
3. Vuelve a **Settings → Pages** en GitHub y activa la casilla **Enforce HTTPS** (se habilita unos minutos después de propagarse el DNS y generará tu certificado de seguridad SSL gratis).

---

## Publicar gratis en Netlify (Alternativa rápida)
1. Entra a [netlify.com](https://netlify.com) y crea una cuenta.
2. Arrastra la carpeta entera al área de Netlify Drop.
3. En segundos tendrás una URL pública y puedes vincular tu dominio en **Domain settings**.

---

## Lista de comprobación antes de publicar

- [ ] Cambié `whatsapp` en `js/config.js`
- [ ] Cambié `instagram` (o lo dejé vacío para ocultarlo)
- [ ] Cambié `marca`, `moneda` y `locale` en `js/config.js`
- [ ] Actualicé el `<title>` y la descripción en `index.html`
- [ ] Actualicé las etiquetas Open Graph con la URL real del sitio
- [ ] Creé `assets/og-image.png` (1200×630 px)
- [ ] Reemplacé los textos de las preguntas frecuentes en `index.html`
- [ ] Probé en celular (Chrome móvil) y en computador
- [ ] Verifiqué que los enlaces de WhatsApp abren el chat con el mensaje correcto
- [ ] Los datos de ejemplo de gorras los reemplacé por los reales en `js/data.js`

---

## Estructura de archivos

```
catalogo-gorras/
  index.html          página principal
  css/
    styles.css        todos los estilos
  js/
    config.js         datos de la marca y mensajes de WhatsApp
    data.js           colores, tipos y productos
    cap-svg.js        dibujo de gorras en SVG
    app.js            lógica de la página
  assets/
    favicon.svg       ícono de la pestaña
    img/              carpeta para fotos reales (opcional)
  README.md           este archivo
```

---

*Hecho con HTML, CSS y JavaScript sin librerías externas.*
