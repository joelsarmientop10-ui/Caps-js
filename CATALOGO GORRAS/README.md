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
  precio: 29.90,
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

## Cómo cambiar los colores de la marca

Edita las variables en la sección `:root` de `css/styles.css`:

```css
:root {
  --tiza:    #F7F8F6;   /* fondo principal */
  --marino:  #14264B;   /* texto y botones primarios */
  --amarillo:#FFC83D;   /* WhatsApp y etiqueta "Más vendida" */
  --rojo:    #C42336;   /* ofertas */
  ...
}
```

---

## Cómo crear la imagen para compartir en redes (og-image)

Crea un archivo `assets/og-image.png` de **1200×630 px** con:
- Fondo en el color de la marca (`#14264B`)
- El nombre de la tienda en tipografía grande
- Una gorra o las gorras destacadas

Esta imagen aparece cuando alguien comparte el enlace en WhatsApp, Instagram o Twitter.

---

## Cómo publicar gratis

**GitHub Pages:**
1. Crea un repositorio en GitHub y sube todos los archivos.
2. Ve a *Settings → Pages → Source* y selecciona la rama `main`.
3. Tu página quedará en `https://tu-usuario.github.io/nombre-del-repo`.

**Netlify:**
1. Entra a [netlify.com](https://netlify.com) y crea una cuenta.
2. Arrastra la carpeta entera al área de Netlify Drop.
3. En segundos tendrás una URL pública.

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
