# Ink Lore

Ink Lore es una app web instalable (PWA) para escritores de fanfics, novelas y universos narrativos. Escribe capítulos, crea fichas de personajes, arma tu mundo, conecta elementos entre sí y guarda ideas sueltas, todo en un solo lugar.

Tus datos se quedan en tu dispositivo. No hay cuentas ni nube.

## Funciones

- **Inicio:** historias recientes, favoritos, ideas rápidas y buscador.
- **Historias:** tipo, fandom, género, estado (personalizable), etiquetas, sinopsis y objetivo de palabras con barra de progreso.
- **Manuscrito:** capítulos con autoguardado, conteo de palabras, estado, notas privadas y reordenado.
- **Fichas:** personajes, mundo, trama, cronología y recursos, con campos editables.
- **Categorías propias:** crea las que necesite tu universo (criaturas, magia, facciones…).
- **Relaciones:** vincula fichas entre sí y mira en qué capítulos aparece cada elemento.
- **Bandeja de ideas:** captura ideas, asígnalas a una historia y conviértelas en capítulo.
- **Búsqueda global** en historias, capítulos, fichas, notas e ideas.
- **Exportación:** TXT, Word (.doc) e impresión a PDF.
- **Ajustes:** tema claro, oscuro o automático; copias de seguridad en JSON.

## Uso

### Probar en la computadora

Abre `index.html` en el navegador. Para que la instalación y el modo sin conexión funcionen, sírvela desde un servidor local:

```bash
python3 -m http.server 8000
```

Luego visita `http://localhost:8000`.

### Instalarla en el celular

1. Publica la carpeta en un hosting con HTTPS (GitHub Pages, Netlify, Cloudflare Pages…).
2. Abre el enlace en Chrome (Android) o Safari (iPhone).
3. Elige **Añadir a la pantalla de inicio** o **Instalar app**.

Después de la primera visita funciona sin conexión.

## Datos y copias de seguridad

Las historias se guardan en el almacenamiento del navegador de ese dispositivo. Si borras los datos del navegador o cambias de teléfono, se pierden.

Exporta una copia desde **Ajustes → Exportar copia (.json)** y guárdala en tu nube o correo. Para restaurarla, usa **Ajustes → Importar copia**. Esto reemplaza los datos actuales.

## Estructura

```
ink-lore/
├── index.html            App completa (HTML, CSS y JavaScript en un solo archivo)
├── manifest.webmanifest  Metadatos para instalarla como app
├── sw.js                 Service worker: caché y modo sin conexión
├── icon.svg              Icono vectorial
├── icon-192.png          Icono para instalación
├── icon-512.png          Icono para instalación
└── README.md
```

## Limitaciones conocidas

- Word se exporta como `.doc` (compatible con Word y Google Docs), no como `.docx` nativo.
- No hay escenas ni arcos dentro de los capítulos todavía.
- No hay portadas con imagen ni vista gráfica de relaciones o línea temporal.
- La cronología no separa orden narrativo de orden cronológico.
- Sin sincronización en la nube (prevista para una segunda etapa).

## Tecnología

HTML, CSS y JavaScript sin dependencias ni compilación.
