# ARKEION

> ARKEION no te dice qué aprender. Guarda lo que tú decides aprender.

Archivo personal para aprender uno o varios idiomas. Cada idioma es su propio
archivo con cinco secciones:

| Sección | Qué guarda |
|---|---|
| 📖 Vocabulario | Mi diccionario: palabra, pronunciación, tipo, significado, ejemplo, traducción, relacionadas, asociación personal, notas y cómo la recuerdo (🌱 / 💡 / ✦) |
| 📜 Gramática | Tema, explicación con mis palabras, regla, ejemplos, errores que debo evitar y práctica |
| 💬 Frases y expresiones | Frase, significado, categoría (que tú creas), situación de uso y mi ejemplo |
| 📝 Apuntes libres | Cualquier cosa: explicaciones de un video, notas de clase, reglas culturales |
| 🌙 Bitácora | Diario opcional por fecha: qué aprendí, qué fue difícil, qué repasar, qué descubrí. Sin métricas |

Herramientas de estudio (fuera de cada idioma):

- **Repaso de vocabulario:** muestra una palabra, revelas el significado y marcas cómo la recuerdas.
- **Búsqueda general:** busca en todos los idiomas y secciones.
- **Actividades interactivas:** pendiente.

Es una PWA estática: HTML, CSS y JavaScript sin dependencias ni servidor.
Los datos se guardan en el navegador del dispositivo.

## Estructura de archivos

```
arkeion/
├── index.html            # Estructura de la app
├── styles.css            # Estética "The Ancient Library"
├── app.js                # Idiomas, secciones, entradas, repaso y búsqueda
├── sw.js                 # Service worker (uso sin conexión)
├── manifest.webmanifest  # Instalación en el celular
└── icon.svg              # Sello Α
```

## Ejecutar en local

```bash
cd arkeion
python3 -m http.server 8080
```

Abre http://localhost:8080 en el navegador.

## Publicar en GitHub Pages

1. Crea un repositorio vacío en GitHub, por ejemplo `arkeion`.
2. Desde esta carpeta:

   ```bash
   git init -b main
   git add .
   git commit -m "ARKEION: primera versión"
   git remote add origin https://github.com/TU-USUARIO/arkeion.git
   git push -u origin main
   ```

3. En el repositorio: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
4. La app quedará en `https://TU-USUARIO.github.io/arkeion/`.
5. En el celular, ábrela en el navegador y elige **Añadir a pantalla de inicio**.

## Datos y copias de seguridad

- Todo se guarda en `localStorage` del navegador, bajo la clave `arkeion.v2`.
- La versión 2 usa una estructura nueva. Los datos de la versión 1 (`arkeion.v1`) no se migran.
- Ajustes → **Exportar** descarga un `.json` con todo tu archivo.
- Ajustes → **Importar** reemplaza el archivo actual por el de un `.json` exportado (solo versión 2).
- Si borras los datos del navegador, pierdes el archivo: exporta de vez en cuando.

## Actualizar la app

Cuando cambies archivos, sube el número de `CACHE` en `sw.js` (por ejemplo,
`arkeion-v3`) para que los dispositivos reciban la nueva versión.

## Próximos pasos posibles

- Actividades interactivas basadas en tus propios apuntes.
- Editar o renombrar categorías de frases y moverlas entre ellas.
- Etiquetas y filtros por entrada.
