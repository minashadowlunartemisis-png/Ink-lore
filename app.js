"use strict";

/* ==========================================================================
   ARKEION — archivo personal de idiomas
   Cada idioma tiene cinco secciones: Vocabulario, Gramática, Frases y
   expresiones, Apuntes libres y Bitácora. Todo se guarda en localStorage.
   ========================================================================== */

const KEY = "arkeion.v2";

const SECTIONS = {
  vocab:   { name: "Vocabulario",         sub: "Mi diccionario personal",             add: "+ Nueva palabra" },
  grammar: { name: "Gramática",           sub: "Reglas con mis propias palabras",     add: "+ Nuevo tema" },
  phrases: { name: "Frases y expresiones", sub: "Organizadas por significado y uso",  add: "+ Nueva frase" },
  notes:   { name: "Apuntes libres",      sub: "Lo que no encaja en otro lugar",      add: "+ Nuevo apunte" },
  journal: { name: "Bitácora",            sub: "Mi diario de aprendizaje, sin métricas", add: "+ Nueva entrada" },
};
const SECTION_ORDER = ["vocab", "grammar", "phrases", "notes", "journal"];

const POS = ["", "Sustantivo", "Verbo", "Adjetivo", "Adverbio", "Expresión", "Otro"];

const STATUS = {
  learning: "🌱 La estoy aprendiendo",
  help: "💡 La recuerdo con ayuda",
  solo: "✦ La recuerdo sin ayuda",
};

/* Campos de cada tipo de apunte. Son la fuente de verdad para editor,
   lectura, búsqueda e importación. */
const FIELDS = {
  vocab: [
    { key: "word", label: "Palabra", required: true, placeholder: "p. ej. 食べる" },
    { key: "pronunciation", label: "Pronunciación", placeholder: "p. ej. taberu" },
    { key: "pos", label: "Tipo de palabra", type: "select", options: POS, optionLabels: { "": "—" } },
    { key: "meaning", label: "Significado", type: "textarea", rows: 2 },
    { key: "example", label: "Oración de ejemplo", type: "textarea", rows: 2 },
    { key: "exampleTr", label: "Traducción del ejemplo", type: "textarea", rows: 2 },
    { key: "related", label: "Palabras relacionadas", placeholder: "separadas por comas" },
    { key: "association", label: "Dibujo, imagen o asociación personal", type: "textarea", rows: 2 },
    { key: "personal", label: "Notas personales", type: "textarea", rows: 2 },
    { key: "status", label: "Cómo la recuerdo", type: "select", options: Object.keys(STATUS), optionLabels: STATUS },
  ],
  grammar: [
    { key: "title", label: "Tema", required: true, placeholder: "p. ej. Pasado simple" },
    { key: "explanation", label: "Explicación con mis palabras", type: "textarea", rows: 3 },
    { key: "rule", label: "Regla o estructura", type: "textarea", rows: 2 },
    { key: "examples", label: "Ejemplos", type: "textarea", rows: 3 },
    { key: "mistakes", label: "Errores que debo evitar", type: "textarea", rows: 2 },
    { key: "practice", label: "Ejercicio o nota de práctica", type: "textarea", rows: 2 },
  ],
  phrases: [
    { key: "phrase", label: "Frase", required: true, placeholder: "p. ej. Good morning" },
    { key: "meaning", label: "Significado o traducción", type: "textarea", rows: 2 },
    { key: "category", label: "Categoría", type: "category" },
    { key: "situation", label: "Situación en la que se usa", type: "textarea", rows: 2 },
    { key: "example", label: "Mi ejemplo", type: "textarea", rows: 2 },
  ],
  notes: [
    { key: "title", label: "Título", required: true },
    { key: "content", label: "Contenido", type: "textarea", rows: 5 },
    { key: "personal", label: "Notas personales", type: "textarea", rows: 3 },
  ],
  journal: [
    { key: "date", label: "Fecha", type: "date", required: true },
    { key: "learned", label: "¿Qué aprendí hoy?", type: "textarea", rows: 2 },
    { key: "difficult", label: "¿Qué encontré difícil?", type: "textarea", rows: 2 },
    { key: "review", label: "¿Qué quiero repasar?", type: "textarea", rows: 2 },
    { key: "discovered", label: "¿Qué descubrí?", type: "textarea", rows: 2 },
  ],
};

const TITLE_KEY = { vocab: "word", grammar: "title", phrases: "phrase", notes: "title", journal: "date" };
const SUB_KEY = { vocab: "meaning", grammar: "explanation", phrases: "meaning", notes: "content", journal: "learned" };

/* ---------- Utilidades ---------- */

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const now = () => new Date().toISOString();
const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const fmtDay = (ymd) =>
  ymd
    ? new Date(ymd + "T12:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Sin fecha";
const sigil = (name) => (name.trim()[0] || "·").toUpperCase();
const preview = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 90);
const itemTitle = (item) => (item.kind === "journal" ? fmtDay(item.date) : item[TITLE_KEY[item.kind]] || "Sin título");
const itemMatches = (item, term) =>
  FIELDS[item.kind].some((f) => String(item[f.key] ?? "").toLowerCase().includes(term));
const block = (title, text) =>
  text && String(text).trim()
    ? `<section class="block"><h3>${esc(title)}</h3><div class="text">${esc(text)}</div></section>`
    : "";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let toastTimer;
function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ---------- Almacenamiento ---------- */

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (data && data.version === 2 && Array.isArray(data.languages)) return data;
  } catch (_) { /* datos dañados: empezamos de cero */ }
  return { version: 2, languages: [] };
}

let db = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (_) {
    toast("No se pudo guardar. Revisa el espacio disponible del navegador.");
  }
}

const getLang = (id) => db.languages.find((l) => l.id === id);

function findItem(id) {
  for (const lang of db.languages) {
    const item = lang.items.find((i) => i.id === id);
    if (item) return { lang, item };
  }
  return null;
}

function sortedItems(lang, kind) {
  const list = lang.items.filter((i) => i.kind === kind);
  if (kind === "journal") return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (kind === "vocab") return list.sort((a, b) => (a.word || "").localeCompare(b.word || "", "es"));
  return list.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
}

/* ---------- Navegación ---------- */

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [head, a, b, c] = parts;

  if (!head) return viewArchive();
  if (head === "ajustes") return viewSettings();
  if (head === "herramientas") return a === "repaso" ? viewReview(b) : viewTools();
  if (head === "lang" && a && b) return viewSection(a, b);
  if (head === "lang" && a) return viewLanguage(a);
  if (head === "item" && a === "nuevo") return viewEditor(null, b, c);
  if (head === "item" && a && b === "editar") return viewEditor(a);
  if (head === "item" && a) return viewItem(a);
  notFound();
}

function setTop(title, backHref) {
  const back = $("#back");
  back.classList.toggle("hidden", !backHref);
  back.onclick = () => { location.hash = backHref; };
  document.title = title === "Archivo" ? "ARKEION" : `${title} · ARKEION`;
}

function notFound() {
  setTop("No encontrado", "#/");
  app.innerHTML = `
    <p class="empty">Esta página no existe en tu archivo.</p>
    <a class="btn" href="#/">Volver al archivo</a>`;
}

/* ---------- Componentes ---------- */

function itemRow(item, prefix = "") {
  const badge = item.kind === "vocab" && item.status
    ? `<span class="badge">${esc(STATUS[item.status] || "")}</span>`
    : "";
  const sub = item[SUB_KEY[item.kind]] || (item.kind === "vocab" ? item.pronunciation : "") || "";
  return `
    <a class="row note-row" href="#/item/${esc(item.id)}">
      <span class="item-head">
        <span class="note-title">${esc(itemTitle(item))}</span>${badge}
      </span>
      <span class="note-preview">${esc(prefix + preview(sub))}</span>
    </a>`;
}

const listOf = (items, emptyMsg) =>
  items.length ? `<div class="list">${items.map((i) => itemRow(i)).join("")}</div>` : `<p class="empty">${esc(emptyMsg)}</p>`;

/* ---------- Vistas ---------- */

function viewArchive() {
  setTop("Archivo");
  const langs = db.languages;

  app.innerHTML = `
    <section class="intro">
      <p class="kicker">Biblioteca personal</p>
      <h1>Archivo</h1>
      <p class="motto">ARKEION no te dice qué aprender. Guarda lo que tú decides aprender.</p>
    </section>

    ${langs.length
      ? `<div class="grid">${langs
          .map((l) => `
            <a class="card" href="#/lang/${esc(l.id)}">
              <span class="sigil">${esc(sigil(l.name))}</span>
              <span class="card-title">${esc(l.name)}</span>
              <span class="card-meta">${l.items.length} ${l.items.length === 1 ? "entrada" : "entradas"}</span>
            </a>`)
          .join("")}</div>`
      : `<p class="empty">Tu archivo está vacío. Añade el primer idioma para comenzar.</p>`}

    <div class="list">
      <a class="row" href="#/herramientas"><span>✦ Herramientas de estudio</span><span class="count">›</span></a>
    </div>

    <form id="addLang" class="panel">
      <label class="field">Nuevo idioma
        <input name="name" required maxlength="40" autocomplete="off"
               placeholder="p. ej. Japonés, Coreano, Inglés">
      </label>
      <button class="btn primary" type="submit">+ Añadir idioma</button>
    </form>`;

  $("#addLang").onsubmit = (e) => {
    e.preventDefault();
    const name = String(new FormData(e.target).get("name")).trim();
    if (!name) return;
    if (db.languages.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      toast("Ese idioma ya está en tu archivo");
      return;
    }
    const lang = { id: uid(), name, created: now(), phraseCategories: ["General"], items: [] };
    db.languages.push(lang);
    save();
    location.hash = `#/lang/${lang.id}`;
  };
}

function viewLanguage(lid) {
  const lang = getLang(lid);
  if (!lang) return notFound();
  setTop(lang.name, "#/");

  const total = lang.items.length;
  app.innerHTML = `
    <section class="intro">
      <p class="kicker">Idioma</p>
      <h1>${esc(lang.name)}</h1>
      <p class="motto">${total} ${total === 1 ? "entrada guardada" : "entradas guardadas"}</p>
    </section>

    <input class="search" id="q" type="search" autocomplete="off" placeholder="Buscar en ${esc(lang.name)}…">
    <div id="results"></div>

    <div id="sections" class="stack">
      <h2 class="section-title">Secciones</h2>
      <div class="list">
        ${SECTION_ORDER.map((k) => `
          <a class="row" href="#/lang/${esc(lang.id)}/${k}">
            <span>${SECTIONS[k].name}</span>
            <span class="count">${lang.items.filter((i) => i.kind === k).length}</span>
          </a>`).join("")}
      </div>
    </div>

    <button class="btn danger wide" id="delLang" type="button">Eliminar idioma</button>`;

  $("#q").oninput = (e) => {
    const term = e.target.value.trim().toLowerCase();
    $("#sections").classList.toggle("hidden", !!term);
    $("#results").innerHTML = term
      ? lang.items.filter((i) => itemMatches(i, term)).map((i) => itemRow(i, `${SECTIONS[i.kind].name} · `)).join("") ||
        `<p class="empty">Sin coincidencias</p>`
      : "";
    if (term) $("#results").innerHTML = `<div class="list">${$("#results").innerHTML}</div>`;
  };

  $("#delLang").onclick = () => {
    if (!confirm(`¿Eliminar "${lang.name}" y todas sus entradas? No se puede deshacer.`)) return;
    db.languages = db.languages.filter((l) => l.id !== lang.id);
    save();
    location.hash = "#/";
  };
}

function viewSection(lid, kind) {
  const lang = getLang(lid);
  if (!lang || !SECTIONS[kind]) return notFound();
  setTop(SECTIONS[kind].name, `#/lang/${lang.id}`);

  const items = sortedItems(lang, kind);
  let body;

  if (kind === "phrases") {
    const cats = [...new Set([...lang.phraseCategories, ...items.map((i) => i.category || "General")])];
    body = cats
      .map((cat) => {
        const group = items.filter((i) => (i.category || "General") === cat);
        return group.length
          ? `<h2 class="section-title">${esc(cat)}</h2><div class="list">${group.map((i) => itemRow(i)).join("")}</div>`
          : "";
      })
      .join("") || `<p class="empty">Aún no hay frases guardadas.</p>`;
  } else {
    body = listOf(items, `Aún no hay nada en ${SECTIONS[kind].name.toLowerCase()}.`);
  }

  app.innerHTML = `
    <section class="intro">
      <p class="kicker">${esc(lang.name)}</p>
      <h1>${SECTIONS[kind].name}</h1>
      <p class="motto">${SECTIONS[kind].sub}</p>
    </section>

    <a class="btn primary wide" href="#/item/nuevo/${esc(lang.id)}/${kind}">${SECTIONS[kind].add}</a>

    ${body}`;
}

function viewItem(iid) {
  const found = findItem(iid);
  if (!found) return notFound();
  const { lang, item } = found;
  const title = itemTitle(item);
  setTop(title, `#/lang/${lang.id}/${item.kind}`);

  const skip = item.kind === "vocab" ? ["pronunciation", "status"] : [];
  const body = FIELDS[item.kind]
    .filter((f) => f.key !== TITLE_KEY[item.kind] && !skip.includes(f.key))
    .map((f) => {
      let val = item[f.key];
      if (f.optionLabels && f.optionLabels[val]) val = f.optionLabels[val];
      return block(f.label, val);
    })
    .join("");

  app.innerHTML = `
    <article class="page">
      <div>
        <p class="kicker">${esc(lang.name)} · ${SECTIONS[item.kind].name}</p>
        <h1>${esc(title)}</h1>
        ${item.kind === "vocab" && item.pronunciation ? `<p class="pron">${esc(item.pronunciation)}</p>` : ""}
      </div>
      ${item.kind === "vocab" && item.status ? `<p class="badge">${esc(STATUS[item.status])}</p>` : ""}
      ${body}
      <p class="stamp">Creado el ${fmtDate(item.created)} · Modificado el ${fmtDate(item.updated)}</p>
    </article>

    <div class="actions">
      <a class="btn primary" href="#/item/${esc(item.id)}/editar">Editar</a>
      <button class="btn danger" id="delItem" type="button">Eliminar</button>
    </div>`;

  $("#delItem").onclick = () => {
    if (!confirm("¿Eliminar este apunte? No se puede deshacer.")) return;
    lang.items = lang.items.filter((i) => i.id !== item.id);
    save();
    location.hash = `#/lang/${lang.id}/${item.kind}`;
  };
}

function viewEditor(iid, lid, kind) {
  let lang, item, back;

  if (iid) {
    const found = findItem(iid);
    if (!found) return notFound();
    ({ lang, item } = found);
    kind = item.kind;
    back = `#/item/${item.id}`;
  } else {
    lang = getLang(lid);
    if (!lang || !SECTIONS[kind]) return notFound();
    item = {};
    back = `#/lang/${lang.id}/${kind}`;
  }

  const title = iid ? `Editar · ${SECTIONS[kind].name}` : SECTIONS[kind].add.replace("+ ", "");
  setTop(title, back);

  const fieldsHtml = FIELDS[kind]
    .map((f) => {
      let val = item[f.key];
      if (val === undefined) {
        if (f.key === "status") val = "learning";
        else if (f.key === "category") val = "General";
        else if (f.key === "date") val = today();
        else val = "";
      }
      const label = `<span>${esc(f.label)}</span>`;
      const req = f.required ? "required" : "";
      const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : "";

      if (f.type === "textarea") {
        return `<label class="field">${label}
          <textarea name="${f.key}" rows="${f.rows || 3}" ${ph}>${esc(val)}</textarea></label>`;
      }
      if (f.type === "select") {
        return `<label class="field">${label}
          <select name="${f.key}">
            ${f.options
              .map((o) => {
                const text = f.optionLabels && f.optionLabels[o] !== undefined ? f.optionLabels[o] : o;
                return `<option value="${esc(o)}" ${o === val ? "selected" : ""}>${esc(text)}</option>`;
              })
              .join("")}
          </select></label>`;
      }
      if (f.type === "category") {
        return `<label class="field">${label}
          <input name="category" value="${esc(val)}" list="catList" maxlength="40" autocomplete="off">
          <datalist id="catList">${lang.phraseCategories.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        </label>`;
      }
      const type = f.type === "date" ? "date" : "text";
      return `<label class="field">${label}
        <input name="${f.key}" type="${type}" value="${esc(val)}" maxlength="200" ${req} ${ph}></label>`;
    })
    .join("");

  app.innerHTML = `
    <form id="itemForm" class="editor">
      <p class="kicker">${esc(lang.name)} · ${SECTIONS[kind].name}</p>
      ${fieldsHtml}
      <div class="actions">
        <button class="btn primary" type="submit">Guardar</button>
        <a class="btn" href="${back}">Cancelar</a>
      </div>
    </form>`;

  $("#itemForm").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    for (const f of FIELDS[kind]) data[f.key] = String(fd.get(f.key) ?? "").trim();

    const missing = FIELDS[kind].find((f) => f.required && !data[f.key]);
    if (missing) {
      toast(`Falta: ${missing.label}`);
      return;
    }

    if (kind === "phrases") {
      data.category = data.category || "General";
      if (!lang.phraseCategories.includes(data.category)) lang.phraseCategories.push(data.category);
    }

    const t = now();
    let target;
    if (iid) {
      Object.assign(item, data, { updated: t });
      target = item;
    } else {
      target = { id: uid(), kind, languageId: lang.id, ...data, created: t, updated: t };
      lang.items.push(target);
    }
    save();
    location.hash = `#/item/${target.id}`;
  };
}

/* ---------- Herramientas ---------- */

function viewTools() {
  setTop("Herramientas", "#/");
  const vocabCount = (l) => l.items.filter((i) => i.kind === "vocab").length;

  app.innerHTML = `
    <section class="intro">
      <p class="kicker">Estudio</p>
      <h1>Herramientas</h1>
      <p class="motto">Herramientas para volver a lo que guardaste.</p>
    </section>

    <section class="stack">
      <h2 class="section-title">Repaso de vocabulario</h2>
      <div class="list">
        <a class="row" href="#/herramientas/repaso/all"><span>Todos los idiomas</span><span class="count">›</span></a>
        ${db.languages
          .map((l) => `<a class="row" href="#/herramientas/repaso/${esc(l.id)}">
              <span>${esc(l.name)}</span><span class="count">${vocabCount(l)}</span></a>`)
          .join("")}
      </div>
    </section>

    <section class="stack">
      <h2 class="section-title">Búsqueda general</h2>
      <input class="search" id="gq" type="search" autocomplete="off" placeholder="Buscar en todos tus idiomas…">
      <div id="gresults"></div>
    </section>

    <section class="stack">
      <h2 class="section-title">Próximamente</h2>
      <div class="list">
        <div class="row"><span>Actividades interactivas</span><span class="count">pronto</span></div>
      </div>
    </section>`;

  $("#gq").oninput = (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (!term) {
      $("#gresults").innerHTML = "";
      return;
    }
    const hits = [];
    for (const lang of db.languages) {
      for (const item of lang.items) {
        if (itemMatches(item, term)) hits.push(itemRow(item, `${lang.name} · ${SECTIONS[item.kind].name} · `));
      }
    }
    $("#gresults").innerHTML = hits.length
      ? `<div class="list">${hits.join("")}</div>`
      : `<p class="empty">Sin coincidencias</p>`;
  };
}

function viewReview(lid) {
  const langs = lid === "all" ? db.languages : [getLang(lid)].filter(Boolean);
  if (!langs.length) return notFound();
  setTop("Repaso de vocabulario", "#/herramientas");

  const pool = shuffle(
    langs.flatMap((l) => l.items.filter((i) => i.kind === "vocab").map((item) => ({ lang: l, item })))
  );

  if (!pool.length) {
    setTop("Repaso de vocabulario", "#/herramientas");
    app.innerHTML = `
      <section class="intro"><p class="kicker">Herramientas</p><h1>Repaso</h1></section>
      <p class="empty">Aún no hay palabras en tu diccionario.</p>`;
    return;
  }

  let index = 0;
  let revealed = false;

  const next = () => {
    index = (index + 1) % pool.length;
    revealed = false;
    draw();
  };

  const draw = () => {
    const { lang, item } = pool[index];

    app.innerHTML = `
      <section class="intro">
        <p class="kicker">${esc(lang.name)} · Repaso</p>
        <h1>${esc(item.word)}</h1>
        ${item.pronunciation ? `<p class="pron">${esc(item.pronunciation)}</p>` : ""}
      </section>

      ${revealed
        ? `<section class="stack">
             ${block("Significado", item.meaning)}
             ${block("Ejemplo", item.example)}
             ${block("Traducción del ejemplo", item.exampleTr)}
             ${block("Asociación personal", item.association)}
           </section>
           <h2 class="section-title">¿Cómo la recuerdas?</h2>
           <div class="review-actions">
             ${Object.entries(STATUS)
               .map(([k, label]) => `<button class="btn ${k === item.status ? "primary" : ""}" data-status="${k}" type="button">${label}</button>`)
               .join("")}
           </div>
           <button class="btn wide" id="skip" type="button">Siguiente</button>`
        : `<button class="btn primary wide" id="reveal" type="button">Mostrar significado</button>`}`;

    if (!revealed) {
      $("#reveal").onclick = () => {
        revealed = true;
        draw();
      };
    } else {
      app.querySelectorAll("[data-status]").forEach((btn) => {
        btn.onclick = () => {
          item.status = btn.dataset.status;
          item.updated = now();
          save();
          next();
        };
      });
      $("#skip").onclick = next;
    }
  };

  draw();
}

/* ---------- Ajustes ---------- */

function viewSettings() {
  setTop("Ajustes", "#/");
  const totalItems = db.languages.reduce((sum, l) => sum + l.items.length, 0);

  app.innerHTML = `
    <section class="intro">
      <p class="kicker">Configuración</p>
      <h1>Ajustes</h1>
      <p class="motto">Tu archivo vive solo en este dispositivo. Exporta una copia de seguridad de vez en cuando.</p>
    </section>

    <div class="list">
      <div class="row"><span>Idiomas</span><span class="count">${db.languages.length}</span></div>
      <div class="row"><span>Entradas</span><span class="count">${totalItems}</span></div>
    </div>

    <section class="stack">
      <h2 class="section-title">Copia de seguridad</h2>
      <button class="btn primary wide" id="export" type="button">Exportar archivo (.json)</button>
      <label class="btn wide file-btn">Importar archivo (.json)
        <input id="import" type="file" accept="application/json,.json">
      </label>
      <p class="hint">Importar reemplaza el contenido actual del archivo.</p>
    </section>

    <section class="stack">
      <h2 class="section-title">Zona peligrosa</h2>
      <button class="btn danger wide" id="wipe" type="button">Borrar todo el archivo</button>
    </section>`;

  $("#export").onclick = exportData;
  $("#import").onchange = importData;
  $("#wipe").onclick = () => {
    if (!confirm("¿Borrar TODO el archivo? Esta acción no se puede deshacer.")) return;
    db = { version: 2, languages: [] };
    save();
    location.hash = "#/";
  };
}

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arkeion-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeLanguage(l) {
  const items = (Array.isArray(l.items) ? l.items : [])
    .filter((i) => i && i.id && Object.hasOwn(FIELDS, i.kind))
    .map((i) => ({ ...i, languageId: String(l.id) }));
  const cats = Array.isArray(l.phraseCategories) && l.phraseCategories.length
    ? l.phraseCategories.map(String)
    : ["General"];
  return {
    id: String(l.id ?? uid()),
    name: String(l.name ?? "Sin nombre"),
    created: l.created ?? now(),
    phraseCategories: [...new Set(cats)],
    items,
  };
}

async function importData(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.languages)) throw new Error("formato inválido");
    if (data.version !== 2) {
      toast("Este archivo es de una versión anterior de ARKEION");
      return;
    }
    const languages = data.languages.map(sanitizeLanguage);
    const count = languages.reduce((sum, l) => sum + l.items.length, 0);
    if (!confirm(`Se reemplazará tu archivo actual por ${languages.length} idioma(s) y ${count} entrada(s). ¿Continuar?`)) return;
    db = { version: 2, languages };
    save();
    toast("Archivo importado");
    route();
  } catch (_) {
    toast("No se pudo importar: el archivo no es válido");
  }
}

/* ---------- Arranque ---------- */

window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
