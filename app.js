(() => {
  const STORE_KEY = "inkLore.v1";
  const THEME_KEY = "inkLore.theme";

  // Secciones de lista dentro de cada historia
  const LIST_SECTIONS = [
    { key: "manuscrito", label: "Manuscrito", item: "Escena", ph: "Escribe una escena o capítulo" },
    { key: "cronologia", label: "Cronología", item: "Evento", ph: "Qué pasa y cuándo" },
    { key: "lugares", label: "Lugares", item: "Lugar", ph: "Nombre y descripción del lugar" },
    { key: "objetos", label: "Objetos", item: "Objeto", ph: "Artefactos y recursos" },
    { key: "lore", label: "Lore", item: "Secreto", ph: "Historia y secretos del universo" },
    { key: "archivo", label: "Archivo", item: "Referencia", ph: "Escenas descartadas, referencias, notas" },
  ];

  // Apartados del universo, según el documento
  const UNI_SUBS = [
    { key: "geografia", label: "Geografía" },
    { key: "paises", label: "Países y ciudades" },
    { key: "historia", label: "Historia y civilizaciones" },
    { key: "culturas", label: "Culturas y sociedades" },
    { key: "politica", label: "Política y religiones" },
    { key: "flora", label: "Flora y fauna" },
    { key: "tecnologia", label: "Tecnología" },
    { key: "economia", label: "Economía" },
    { key: "idiomas", label: "Idiomas" },
    { key: "magia", label: "Sistemas mágicos" },
    { key: "otros", label: "Otros" },
  ];

  // Campos de la ficha de personaje, según el documento
  const CHAR_FIELDS = [
    { key: "name", label: "Nombre", ph: "Nombre completo" },
    { key: "alias", label: "Alias", ph: "Apodos o nombres alternos" },
    { key: "age", label: "Edad", ph: "Edad o edad aproximada" },
    { key: "pronouns", label: "Sexo y pronombres", ph: "ella, él, elle..." },
    { key: "species", label: "Raza, especie o subraza", ph: "Humana, elfo, dragón..." },
    { key: "appearance", label: "Apariencia física", ta: true },
    { key: "personality", label: "Personalidad y psicología", ta: true },
    { key: "abilities", label: "Habilidades y poderes", ta: true },
    { key: "weaknesses", label: "Debilidades y limitaciones", ta: true },
    { key: "history", label: "Historia y antecedentes", ta: true },
    { key: "family", label: "Familia y relaciones", ta: true },
    { key: "items", label: "Objetos y pertenencias", ta: true },
    { key: "status", label: "Estado", select: ["vivo", "herido", "desaparecido", "fallecido", "otro"] },
    { key: "evolution", label: "Evolución a lo largo de los capítulos", ta: true },
  ];

  const TABS = [
    { key: "resumen", label: "Resumen" },
    { key: "personajes", label: "Personajes" },
    { key: "universo", label: "Universo" },
    ...LIST_SECTIONS.map((x) => ({ key: x.key, label: x.label })),
  ];

  const COVERS = ["#E9DDF4", "#F6E3EA", "#E3EEE9", "#F3E6CF", "#DCE6F5", "#EDE3D9"];
  const NOTES = ["#F6E3EA", "#FFF1C9", "#E3EEE9", "#E9DDF4", "#DDEFFB"];

  const TABBAR = [
    ["home", "⌂", "Inicio"],
    ["library", "▤", "Biblioteca"],
    ["create", "+", "Crear"],
    ["search", "⌕", "Buscar"],
    ["profile", "☺", "Perfil"],
  ];
  const TAB_SCREENS = ["home", "library", "search", "profile"];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  const now = () => new Date().toISOString();

  const emptyLists = () => Object.fromEntries(LIST_SECTIONS.map((s) => [s.key, []]));
  const emptyData = () => ({ version: 3, stories: [], ideas: [] });

  function newChar(data = {}) {
    const base = Object.fromEntries(CHAR_FIELDS.map((f) => [f.key, f.key === "status" ? "vivo" : ""]));
    return { id: uid(), ...base, ...data };
  }

  // Convierte datos de versiones anteriores al formato nuevo
  function migrate(d) {
    d.stories = (d.stories || []).map((s) => {
      const v1 = !s.sections;
      const sec = s.sections || {};
      const strs = (k) => (Array.isArray(sec[k]) ? sec[k] : []);

      const chars = [];
      if (Array.isArray(s.characters)) {
        s.characters.forEach((c) => chars.push(typeof c === "string" ? newChar({ name: c }) : newChar(c)));
      }
      strs("personajes").forEach((t) => chars.push(newChar({ name: t })));

      const uni = { ...(s.universe || {}) };
      strs("universo").forEach((t) => { uni.otros = [...(uni.otros || []), t]; });

      const lists = emptyLists();
      LIST_SECTIONS.forEach((x) => { lists[x.key] = [...strs(x.key)]; });
      if (v1) {
        lists.manuscrito = s.scenes || [];
        lists.cronologia = s.plot || [];
        lists.archivo = s.notes || [];
      }

      const { scenes, plot, notes, characters, sections, universe, ...rest } = s;
      return {
        ...rest,
        sections: lists,
        characters: chars,
        universe: uni,
        tags: s.tags || [],
        favorite: !!s.favorite,
      };
    });
    d.ideas = (d.ideas || []).map((i) => ({ ...i, tags: i.tags || [], favorite: !!i.favorite }));
    return d;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return migrate(raw ? JSON.parse(raw) : emptyData());
    } catch (e) {
      return emptyData();
    }
  }

  const state = {
    data: load(),
    screen: "welcome",
    storyId: null,
    ideaId: null,
    charId: null,
    storyTab: "resumen",
    sheet: null,
    libTab: "historias",
    onlyFav: false,
    query: "",
    hist: [],
    uniOpen: {},
  };

  const app = document.getElementById("app");

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
    } catch (e) {
      toast("No se pudo guardar. Revisa el espacio del celular.");
    }
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const hash = (str) => {
    let h = 0;
    for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
  };
  const coverColor = (id) => COVERS[hash(id) % COVERS.length];
  const noteColor = (id) => NOTES[hash(id) % NOTES.length];
  const noteTilt = (id) => ((hash(id) % 5) - 2) * 0.7;

  const byRecent = (a, b) => (b.updated || "").localeCompare(a.updated || "");
  const story = (id) => state.data.stories.find((s) => s.id === id);
  const idea = (id) => state.data.ideas.find((i) => i.id === id);
  const char = (s, id) => (s ? s.characters.find((c) => c.id === id) : undefined);
  const parseTags = (v) => v.split(",").map((x) => x.trim()).filter(Boolean);
  const snippet = (t) => (t.length > 70 ? t.slice(0, 70) + "…" : t);
  const uniCount = (s) => Object.values(s.universe || {}).reduce((n, a) => n + (a || []).length, 0);

  function toast(msg) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function ago(iso) {
    if (!iso) return "";
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return "Actualizado hoy";
    if (d === 1) return "Actualizado hace 1 día";
    if (d < 7) return `Actualizado hace ${d} días`;
    const w = Math.floor(d / 7);
    return w === 1 ? "Actualizado hace 1 semana" : `Actualizado hace ${w} semanas`;
  }

  function dateLabel(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; }
  }
  function applyTheme(t) {
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  // Navegación: las pantallas de detalle se apilan para que "←" regrese donde estabas
  function go(screen, extra = {}, stack = false) {
    if (stack) {
      state.hist.push({ screen: state.screen, storyId: state.storyId, ideaId: state.ideaId, charId: state.charId, storyTab: state.storyTab });
    } else {
      state.hist = [];
    }
    Object.assign(state, { screen, sheet: null }, extra);
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    const p = state.hist.pop() || { screen: "home" };
    Object.assign(state, {
      screen: p.screen,
      storyId: p.storyId ?? null,
      ideaId: p.ideaId ?? null,
      charId: p.charId ?? null,
      storyTab: p.storyTab || "resumen",
      sheet: null,
    });
    render();
    window.scrollTo(0, 0);
  }

  function openSheet(name) {
    state.sheet = name;
    render();
  }

  // ---------- Componentes ----------
  const coverHTML = (s) => `
    <div class="cover" style="background:${coverColor(s.id)}" data-act="openStory" data-id="${s.id}">
      ${s.favorite ? '<span class="cover-star">★</span>' : ""}
      <div class="cover-title serif">${esc(s.title)}</div>
      <div class="cover-author">${esc(s.author || "")}</div>
    </div>`;

  const addCoverHTML = `
    <div class="cover add" data-act="sheetNewStory">
      <span>+</span><small>Nueva historia</small>
    </div>`;

  const noteHTML = (i) => `
    <div class="note" style="background:${noteColor(i.id)};transform:rotate(${noteTilt(i.id)}deg)" data-act="openIdea" data-id="${i.id}">
      <div class="note-title">${esc(i.title)}</div>
      <div class="note-body">${esc((i.description || i.notes || "").slice(0, 80))}</div>
    </div>`;

  const addNoteHTML = `
    <div class="note add" data-act="sheetNewIdea">
      <span>+</span><small>Nueva nota</small>
    </div>`;

  const charCard = (s, c) => `
    <div class="list-row" data-act="openChar" data-sid="${s.id}" data-id="${c.id}">
      <span><b>${esc(c.name || "Sin nombre")}</b><br>
      <small class="muted">${[c.alias, c.species, c.status].filter(Boolean).map(esc).join(" · ")}</small></span>
      <span class="count">›</span>
    </div>`;

  const btnRow = (saveAct) => `
    <div class="btn-row">
      <button class="btn-ghost" data-act="closeSheet">Cancelar</button>
      <button class="btn-primary" data-act="${saveAct}">Guardar</button>
    </div>`;

  // ---------- Pantallas ----------
  function welcome() {
    return `
      <section class="welcome">
        <div class="logo serif">Ink<br><span>Lore</span></div>
        <p class="tagline">Tu libreta de ideas<br>para fanfics</p>
        <button class="btn-primary big" data-act="start">Comenzar</button>
        <button class="link-btn" data-act="start">Ya tengo cuenta</button>
      </section>`;
  }

  function homeScreen() {
    const stories = [...state.data.stories].sort(byRecent);
    const ideas = [...state.data.ideas].sort(byRecent);
    return `
      <header class="topbar">
        <div>
          <h1 class="screen-title serif">¡Hola, escritora!</h1>
          <p class="subtitle">¿Qué historia vamos a crear hoy?</p>
        </div>
      </header>
      <div class="section-head"><span>Mis historias</span></div>
      <div class="covers">${stories.map(coverHTML).join("")}${addCoverHTML}</div>
      <div class="section-head"><span>Notas rápidas</span></div>
      <div class="notes">${ideas.map(noteHTML).join("")}${addNoteHTML}</div>`;
  }

  function libraryScreen() {
    const isStories = state.libTab === "historias";
    const stories = state.data.stories.filter((s) => !state.onlyFav || s.favorite).sort(byRecent);
    const notes = state.data.ideas.filter((i) => !state.onlyFav || i.favorite).sort(byRecent);

    let body;
    if (isStories) {
      if (!stories.length && state.onlyFav) body = `<p class="empty">No tienes historias favoritas.</p>`;
      else body = `<div class="covers">${stories.map(coverHTML).join("")}${state.onlyFav ? "" : addCoverHTML}</div>`;
      if (!state.data.stories.length) {
        body += `<p class="empty">Aún no tienes historias.</p>
                 <div class="btn-row"><button class="btn-ghost" data-act="importStory">📥 Importar una historia</button></div>`;
      }
    } else {
      if (!notes.length && state.onlyFav) body = `<p class="empty">No tienes notas favoritas.</p>`;
      else body = `<div class="notes">${notes.map(noteHTML).join("")}${state.onlyFav ? "" : addNoteHTML}</div>`;
    }

    return `
      <header class="topbar">
        <div>
          <h1 class="screen-title serif">Biblioteca</h1>
          <p class="subtitle">Todas tus historias y notas</p>
        </div>
      </header>
      <div class="segment">
        <button class="${isStories ? "on" : ""}" data-act="libTab" data-tab="historias">Historias</button>
        <button class="${!isStories ? "on" : ""}" data-act="libTab" data-tab="notas">Notas</button>
      </div>
      <div class="chips">
        <button class="chip ${state.onlyFav ? "on" : ""}" data-act="toggleFav">★ Solo favoritas</button>
      </div>
      ${body}`;
  }

  function searchScreen() {
    return `
      <header class="topbar">
        <div>
          <h1 class="screen-title serif">Buscar</h1>
          <p class="subtitle">Personajes, lugares, notas y más</p>
        </div>
      </header>
      <input id="q" type="search" placeholder="Escribe para buscar…" value="${esc(state.query)}">
      <div id="results" class="results">${resultsHTML(state.query)}</div>`;
  }

  function resultsHTML(q) {
    const t = q.trim().toLowerCase();
    if (!t) return `<p class="empty">Busca en tus historias, personajes, universo y notas.</p>`;
    const hit = (...vals) => vals.some((v) => String(v ?? "").toLowerCase().includes(t));
    const rows = [];

    state.data.stories.forEach((s) => {
      if (hit(s.title, s.author, s.synopsis, ...(s.tags || []))) {
        rows.push(`
          <div class="list-row" data-act="openStory" data-id="${s.id}">
            <span><b>${esc(s.title)}</b><br><small class="muted">Historia · ${esc(s.author || "")}</small></span>
            <span class="count">›</span>
          </div>`);
      }
      s.characters.forEach((c) => {
        if (hit(c.name, c.alias, c.species, c.appearance, c.personality, c.abilities, c.history, c.family)) {
          rows.push(`
            <div class="list-row" data-act="openChar" data-sid="${s.id}" data-id="${c.id}">
              <span><b>${esc(c.name || "Sin nombre")}</b><br><small class="muted">Personaje · ${esc(s.title)}</small></span>
              <span class="count">›</span>
            </div>`);
        }
      });
      UNI_SUBS.forEach((sub) => {
        (s.universe[sub.key] || []).forEach((txt) => {
          if (!hit(txt)) return;
          rows.push(`
            <div class="list-row" data-act="openStoryTab" data-id="${s.id}" data-tab="universo">
              <span><b>${esc(snippet(txt))}</b><br><small class="muted">Universo · ${sub.label} · ${esc(s.title)}</small></span>
              <span class="count">›</span>
            </div>`);
        });
      });
      LIST_SECTIONS.forEach((sec) => {
        (s.sections[sec.key] || []).forEach((txt) => {
          if (!hit(txt)) return;
          rows.push(`
            <div class="list-row" data-act="openStoryTab" data-id="${s.id}" data-tab="${sec.key}">
              <span><b>${esc(snippet(txt))}</b><br><small class="muted">${sec.label} · ${esc(s.title)}</small></span>
              <span class="count">›</span>
            </div>`);
        });
      });
    });

    state.data.ideas.forEach((i) => {
      if (hit(i.title, i.description, i.notes, ...(i.tags || []))) {
        rows.push(`
          <div class="list-row" data-act="openIdea" data-id="${i.id}">
            <span><b>${esc(i.title)}</b><br><small class="muted">Nota</small></span>
            <span class="count">›</span>
          </div>`);
      }
    });

    return rows.length
      ? rows.slice(0, 50).join("")
      : `<p class="empty">Sin resultados para "${esc(q)}".</p>`;
  }

  function profileScreen() {
    const theme = currentTheme();
    const opts = [["auto", "Automático"], ["light", "Claro"], ["dark", "Oscuro"]];
    return `
      <header class="topbar">
        <div>
          <h1 class="screen-title serif">Perfil</h1>
          <p class="subtitle">Tus datos se guardan en este celular</p>
        </div>
      </header>
      <div class="panel">
        <h4>Apariencia</h4>
        <div class="segment">
          ${opts.map(([k, l]) => `<button class="${theme === k ? "on" : ""}" data-act="setTheme" data-theme="${k}">${l}</button>`).join("")}
        </div>
      </div>
      <div class="panel">
        <h4>Respaldos</h4>
        <p>Cada historia tiene su respaldo. Ábrela, toca ⋮ y elige Exportar. Para recuperarla en otro celular, usa Importar en esa misma opción.</p>
      </div>
      <div class="panel">
        <h4>Resumen</h4>
        <p>${state.data.stories.length} historias · ${state.data.ideas.length} notas</p>
      </div>
      <div class="btn-row">
        <button class="btn-danger" data-act="wipe">Borrar todo</button>
      </div>`;
  }

  function listEditor(sec, items) {
    return `
      ${items.map((it, idx) => `
        <div class="panel">
          <div class="panel-head">
            <h4>${sec.item} ${idx + 1}</h4>
            <button class="link-btn" data-act="delItem" data-key="${sec.key}" data-idx="${idx}">Eliminar</button>
          </div>
          <p>${esc(it)}</p>
        </div>`).join("")}
      <div class="panel">
        <textarea id="newItem" placeholder="${sec.ph}"></textarea>
        <div class="btn-row">
          <button class="btn-primary" data-act="addItem" data-key="${sec.key}">Agregar</button>
        </div>
      </div>`;
  }

  function universeBody(s) {
    return `
      <p class="hint">Organiza tu mundo por apartados. Toca uno para abrirlo.</p>
      ${UNI_SUBS.map((sub) => {
        const items = s.universe[sub.key] || [];
        const open = state.uniOpen[sub.key] ?? items.length > 0;
        return `
          <details class="panel uni" data-sub="${sub.key}" ${open ? "open" : ""}>
            <summary><span>${sub.label}</span><span class="count">${items.length}</span></summary>
            <div class="uni-body">
              ${items.map((t, idx) => `
                <div class="uni-item">
                  <p>${esc(t)}</p>
                  <button class="link-btn" data-act="delUni" data-sub="${sub.key}" data-idx="${idx}">Eliminar</button>
                </div>`).join("")}
              <textarea id="uni_${sub.key}" placeholder="Agregar a ${esc(sub.label.toLowerCase())}"></textarea>
              <div class="btn-row"><button class="btn-primary" data-act="addUni" data-sub="${sub.key}">Agregar</button></div>
            </div>
          </details>`;
      }).join("")}`;
  }

  function storyScreen() {
    const s = story(state.storyId);
    if (!s) return `<p class="empty">Esta historia ya no existe.</p>`;
    const t = state.storyTab;
    const related = state.data.ideas.filter((i) => i.storyId === s.id);

    let body;
    if (t === "resumen") {
      const rows = [
        ["personajes", "Personajes", s.characters.length],
        ["universo", "Universo", uniCount(s)],
        ...LIST_SECTIONS.map((x) => [x.key, x.label, (s.sections[x.key] || []).length]),
      ];
      body = `
        <div class="panel"><h4>Sinopsis</h4><p>${esc(s.synopsis) || "Escribe una sinopsis con el botón ✎."}</p></div>
        ${rows.map(([k, l, n]) => `
          <div class="list-row" data-act="setTab" data-tab="${k}">
            <span>${l}</span><span class="count">${n} ›</span>
          </div>`).join("")}
        <div class="list-row add-row" data-act="noteForStory"><span>＋ Nueva nota para esta historia</span></div>
        ${related.length ? `
          <div class="section-head"><span>Notas relacionadas</span></div>
          <div class="notes">${related.map(noteHTML).join("")}</div>` : ""}`;
    } else if (t === "personajes") {
      body = `
        ${s.characters.map((c) => charCard(s, c)).join("")}
        <div class="list-row add-row" data-act="addChar"><span>＋ Nuevo personaje</span></div>
        ${s.characters.length ? "" : `<p class="empty">Aún no tienes personajes. Crea su ficha con el botón de arriba.</p>`}`;
    } else if (t === "universo") {
      body = universeBody(s);
    } else {
      const sec = LIST_SECTIONS.find((x) => x.key === t) || LIST_SECTIONS[0];
      const items = s.sections[sec.key] || [];
      const words = sec.key === "manuscrito"
        ? items.join(" ").split(/\s+/).filter(Boolean).length
        : null;
      body = (words !== null ? `<p class="counter">${words} palabras</p>` : "") + listEditor(sec, items);
    }

    return `
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Volver">←</button>
        <div class="actions">
          <button class="icon-btn" data-act="favStory" aria-label="Favorito">${s.favorite ? "★" : "☆"}</button>
          <button class="icon-btn" data-act="editStory" aria-label="Editar">✎</button>
          <button class="icon-btn" data-act="storyMenu" aria-label="Más">⋮</button>
        </div>
      </header>
      <div class="hero">
        <div class="hero-cover" style="background:${coverColor(s.id)}">
          <div class="cover-title serif">${esc(s.title)}</div>
        </div>
        <div class="author">${esc(s.author || "Sin autor")}</div>
      </div>
      <div class="chips">${(s.tags || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
      <div class="tabs">
        ${TABS.map((x) => `<button class="${x.key === t ? "active" : ""}" data-act="setTab" data-tab="${x.key}">${x.label}</button>`).join("")}
      </div>
      ${body}`;
  }

  function characterScreen() {
    const s = story(state.storyId);
    const c = char(s, state.charId);
    if (!c) return `<p class="empty">Esta ficha ya no existe.</p>`;
    const fields = CHAR_FIELDS.filter((f) => !["name", "alias", "status"].includes(f.key) && c[f.key]);
    return `
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Volver">←</button>
        <div class="actions">
          <button class="icon-btn" data-act="editChar" aria-label="Editar">✎</button>
        </div>
      </header>
      <div class="hero">
        <div class="hero-cover" style="background:${coverColor(c.id)}">
          <div class="cover-title serif">${esc(c.name || "Sin nombre")}</div>
        </div>
        <div class="author">${esc(c.alias || "")}</div>
        <div class="chips">
          <span class="chip">${esc(c.status || "vivo")}</span>
          ${c.age ? `<span class="chip">Edad: ${esc(c.age)}</span>` : ""}
          ${c.pronouns ? `<span class="chip">${esc(c.pronouns)}</span>` : ""}
        </div>
      </div>
      ${fields.map((f) => `<div class="panel"><h4>${f.label}</h4><p>${esc(c[f.key])}</p></div>`).join("") ||
        `<p class="empty">La ficha está vacía. Toca ✎ para completarla.</p>`}
      <div class="btn-row">
        <button class="btn-danger" data-act="delChar">Eliminar personaje</button>
      </div>`;
  }

  function ideaScreen() {
    const i = idea(state.ideaId);
    if (!i) return `<p class="empty">Esta nota ya no existe.</p>`;
    const linked = i.storyId && story(i.storyId);
    return `
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Volver">←</button>
        <div class="actions">
          <button class="icon-btn" data-act="favIdea" aria-label="Favorito">${i.favorite ? "★" : "☆"}</button>
          <button class="icon-btn" data-act="editIdea" aria-label="Editar">✎</button>
        </div>
      </header>
      <div class="note big" style="background:${noteColor(i.id)}">
        <div class="note-title serif">${esc(i.title)}</div>
        <div class="chips">${(i.tags || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
      </div>
      <div class="panel"><h4>Descripción</h4><p>${esc(i.description) || "Sin descripción."}</p></div>
      <div class="panel"><h4>Notas</h4><p>${esc(i.notes) || "Sin notas."}</p></div>
      ${linked ? `
        <div class="panel">
          <h4>Relacionada con</h4>
          <div class="list-row" data-act="openStory" data-id="${linked.id}" style="margin:0">
            <span>${esc(linked.title)}</span><span class="count">›</span>
          </div>
        </div>` : ""}
      <p class="subtitle small">Creada el ${dateLabel(i.created)} · ${ago(i.updated)}</p>
      <div class="btn-row">
        <button class="btn-danger" data-act="delIdea">Eliminar nota</button>
      </div>`;
  }

  // ---------- Hojas ----------
  function sheetHTML() {
    const s = state.sheet;

    if (s === "newStory" || s === "editStory") {
      const st = s === "editStory" ? story(state.storyId) || {} : {};
      return `
        <h3 class="serif">${s === "newStory" ? "Nueva historia" : "Editar historia"}</h3>
        <div class="form">
          <label>Título<input id="f_title" value="${esc(st.title)}" placeholder="El legado de las estrellas"></label>
          <label>Fandom / autor original<input id="f_author" value="${esc(st.author)}" placeholder="Harry Potter"></label>
          <label>Sinopsis<textarea id="f_synopsis" placeholder="Una nueva generación descubre...">${esc(st.synopsis)}</textarea></label>
          <label>Etiquetas (separadas por coma)<input id="f_tags" value="${esc((st.tags || []).join(", "))}" placeholder="Aventura, Misterio"></label>
          ${btnRow("saveStory")}
        </div>`;
    }

    if (s === "charForm") {
      const c = state.charId ? char(story(state.storyId), state.charId) || {} : {};
      return `
        <h3 class="serif">${state.charId ? "Ficha de personaje" : "Nuevo personaje"}</h3>
        <div class="form">
          ${CHAR_FIELDS.map((f) => {
            if (f.select) {
              const cur = c[f.key] || "vivo";
              return `<label>${f.label}<select id="c_${f.key}">${f.select.map((o) => `<option value="${o}" ${cur === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
            }
            if (f.ta) return `<label>${f.label}<textarea id="c_${f.key}">${esc(c[f.key])}</textarea></label>`;
            return `<label>${f.label}<input id="c_${f.key}" value="${esc(c[f.key])}" placeholder="${esc(f.ph || "")}"></label>`;
          }).join("")}
          ${btnRow("saveChar")}
        </div>`;
    }

    if (s === "newIdea" || s === "editIdea") {
      const i = s === "editIdea" ? idea(state.ideaId) || {} : {};
      const preset = state.screen === "story" ? state.storyId : null;
      const current = i.storyId !== undefined ? i.storyId : preset;
      const opts = [...state.data.stories]
        .sort(byRecent)
        .map((st) => `<option value="${st.id}" ${st.id === current ? "selected" : ""}>${esc(st.title)}</option>`)
        .join("");
      return `
        <h3 class="serif">${s === "newIdea" ? "Nueva nota" : "Editar nota"}</h3>
        <div class="form">
          <label>Título<input id="f_title" value="${esc(i.title)}" placeholder="La carta que nunca llegó"></label>
          <label>Descripción<textarea id="f_desc" placeholder="¿De qué trata?">${esc(i.description)}</textarea></label>
          <label>Notas<textarea id="f_notes" placeholder="Pensamientos sueltos">${esc(i.notes)}</textarea></label>
          <label>Etiquetas (separadas por coma)<input id="f_tags" value="${esc((i.tags || []).join(", "))}" placeholder="Escena, Emocional"></label>
          <label>Relacionar con una historia<select id="f_story"><option value="">Ninguna</option>${opts}</select></label>
          ${btnRow("saveIdea")}
        </div>`;
    }

    if (s === "create") {
      return `
        <h3 class="serif">Crear</h3>
        <div class="list-row" data-act="sheetNewStory"><span>📖 Nueva historia</span></div>
        <div class="list-row" data-act="sheetNewIdea"><span>💡 Nueva nota</span></div>
        <div class="btn-row"><button class="btn-ghost" data-act="closeSheet">Cerrar</button></div>`;
    }

    if (s === "storyMenu") {
      return `
        <h3 class="serif">Esta historia</h3>
        <div class="list-row" data-act="editStory"><span>✎ Editar datos</span></div>
        <div class="list-row" data-act="exportStory"><span>📤 Exportar esta historia</span></div>
        <div class="list-row" data-act="importStory"><span>📥 Importar una historia</span></div>
        <div class="list-row" data-act="delStory"><span class="danger-text">🗑 Eliminar historia</span></div>
        <div class="btn-row"><button class="btn-ghost" data-act="closeSheet">Cerrar</button></div>`;
    }

    return "";
  }

  // ---------- Render ----------
  function content() {
    switch (state.screen) {
      case "welcome": return welcome();
      case "home": return homeScreen();
      case "library": return libraryScreen();
      case "search": return searchScreen();
      case "profile": return profileScreen();
      case "story": return storyScreen();
      case "character": return characterScreen();
      case "idea": return ideaScreen();
      default: return homeScreen();
    }
  }

  function render() {
    const onTabs = TAB_SCREENS.includes(state.screen);
    const tabbar = onTabs
      ? `<nav class="tabbar">
          ${TABBAR.map(([k, g, l]) => `
            <button class="${state.screen === k ? "active" : ""} ${k === "create" ? "create" : ""}" data-act="tab" data-screen="${k}">
              <span class="glyph">${g}</span><span>${l}</span>
            </button>`).join("")}
        </nav>`
      : "";

    app.innerHTML = `
      <div class="page ${onTabs ? "with-tabbar" : ""}">${content()}</div>
      ${tabbar}
      ${state.sheet
        ? `<div class="sheet-backdrop" data-act="backdrop"><div class="sheet">${sheetHTML()}</div></div>`
        : ""}`;

    if (state.screen === "search") {
      const q = document.getElementById("q");
      const r = document.getElementById("results");
      if (q && r) {
        q.addEventListener("input", (e) => {
          state.query = e.target.value;
          r.innerHTML = resultsHTML(state.query);
        });
      }
    }
  }

  // Recuerda qué apartados del universo quedaron abiertos
  app.addEventListener("toggle", (e) => {
    const d = e.target;
    if (d && d.dataset && d.dataset.sub) state.uniOpen[d.dataset.sub] = d.open;
  }, true);

  // ---------- Acciones ----------
  const actions = {
    start: () => go("home"),
    back: () => back(),
    tab: (el) => {
      if (el.dataset.screen === "create") return openSheet("create");
      go(el.dataset.screen);
    },

    openStory: (el) => go("story", { storyId: el.dataset.id, storyTab: "resumen" }, true),
    openStoryTab: (el) => go("story", { storyId: el.dataset.id, storyTab: el.dataset.tab }, true),
    openIdea: (el) => go("idea", { ideaId: el.dataset.id }, true),
    openChar: (el) => go("character", { storyId: el.dataset.sid, charId: el.dataset.id }, true),
    setTab: (el) => { state.storyTab = el.dataset.tab; render(); },

    libTab: (el) => { state.libTab = el.dataset.tab; render(); },
    toggleFav: () => { state.onlyFav = !state.onlyFav; render(); },

    setTheme: (el) => {
      try { localStorage.setItem(THEME_KEY, el.dataset.theme); } catch (e) {}
      applyTheme(el.dataset.theme);
      render();
    },

    sheetNewStory: () => openSheet("newStory"),
    sheetNewIdea: () => openSheet("newIdea"),
    noteForStory: () => openSheet("newIdea"),
    addChar: () => { state.charId = null; openSheet("charForm"); },
    editChar: () => openSheet("charForm"),
    editStory: () => openSheet("editStory"),
    editIdea: () => openSheet("editIdea"),
    storyMenu: () => openSheet("storyMenu"),
    closeSheet: () => { state.sheet = null; render(); },
    backdrop: (el, ev) => { if (ev.target === el) actions.closeSheet(); },

    favStory: () => {
      const s = story(state.storyId);
      s.favorite = !s.favorite;
      save(); render();
    },
    favIdea: () => {
      const i = idea(state.ideaId);
      i.favorite = !i.favorite;
      save(); render();
    },

    saveStory: () => {
      const editing = state.sheet === "editStory";
      const title = document.getElementById("f_title").value.trim();
      if (!title) return toast("Ponle un título a la historia");
      const payload = {
        title,
        author: document.getElementById("f_author").value.trim(),
        synopsis: document.getElementById("f_synopsis").value.trim(),
        tags: parseTags(document.getElementById("f_tags").value),
        updated: now(),
      };
      if (editing) {
        Object.assign(story(state.storyId), payload);
      } else {
        state.data.stories.unshift({
          id: uid(), created: now(), favorite: false,
          sections: emptyLists(), characters: [], universe: {},
          ...payload,
        });
      }
      save();
      state.sheet = null;
      toast("Historia guardada");
      render();
    },

    saveChar: () => {
      const name = document.getElementById("c_name").value.trim();
      if (!name) return toast("Escribe el nombre del personaje");
      const data = {};
      CHAR_FIELDS.forEach((f) => { data[f.key] = document.getElementById("c_" + f.key).value.trim(); });
      data.updated = now();
      const s = story(state.storyId);
      if (state.charId) Object.assign(char(s, state.charId), data);
      else s.characters.push(newChar(data));
      s.updated = now();
      save();
      state.sheet = null;
      toast("Ficha guardada");
      render();
    },

    delChar: () => {
      if (!confirm("¿Eliminar este personaje?")) return;
      const s = story(state.storyId);
      s.characters = s.characters.filter((c) => c.id !== state.charId);
      s.updated = now();
      save();
      back();
      toast("Personaje eliminado");
    },

    saveIdea: () => {
      const editing = state.sheet === "editIdea";
      const title = document.getElementById("f_title").value.trim();
      if (!title) return toast("Escribe el título de la nota");
      const payload = {
        title,
        description: document.getElementById("f_desc").value.trim(),
        notes: document.getElementById("f_notes").value.trim(),
        tags: parseTags(document.getElementById("f_tags").value),
        storyId: document.getElementById("f_story").value || null,
        updated: now(),
      };
      if (editing) {
        Object.assign(idea(state.ideaId), payload);
      } else {
        state.data.ideas.unshift({ id: uid(), created: now(), favorite: false, ...payload });
      }
      save();
      state.sheet = null;
      toast(editing ? "Nota actualizada" : "Nota guardada");
      render();
    },

    delIdea: () => {
      if (!confirm("¿Eliminar esta nota?")) return;
      state.data.ideas = state.data.ideas.filter((i) => i.id !== state.ideaId);
      save();
      go("home");
      toast("Nota eliminada");
    },

    delStory: () => {
      if (!confirm("¿Eliminar esta historia? Sus notas se conservarán.")) return;
      state.data.stories = state.data.stories.filter((s) => s.id !== state.storyId);
      state.data.ideas.forEach((i) => { if (i.storyId === state.storyId) i.storyId = null; });
      save();
      go("library");
      toast("Historia eliminada");
    },

    addItem: (el) => {
      const txt = document.getElementById("newItem").value.trim();
      if (!txt) return toast("Escribe algo primero");
      const s = story(state.storyId);
      s.sections[el.dataset.key] = [...(s.sections[el.dataset.key] || []), txt];
      s.updated = now();
      save(); render();
    },

    delItem: (el) => {
      const s = story(state.storyId);
      s.sections[el.dataset.key].splice(Number(el.dataset.idx), 1);
      s.updated = now();
      save(); render();
    },

    addUni: (el) => {
      const field = document.getElementById("uni_" + el.dataset.sub);
      const txt = field.value.trim();
      if (!txt) return toast("Escribe algo primero");
      const s = story(state.storyId);
      s.universe[el.dataset.sub] = [...(s.universe[el.dataset.sub] || []), txt];
      state.uniOpen[el.dataset.sub] = true;
      s.updated = now();
      save(); render();
    },

    delUni: (el) => {
      const s = story(state.storyId);
      s.universe[el.dataset.sub].splice(Number(el.dataset.idx), 1);
      s.updated = now();
      save(); render();
    },

    exportStory: () => {
      const s = story(state.storyId);
      if (!s) return;
      const payload = {
        format: "ink-lore-story",
        version: 3,
        story: s,
        notes: state.data.ideas.filter((i) => i.storyId === s.id),
      };
      const slug = s.title
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "historia";
      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `ink-lore-${slug}.json`
      );
      state.sheet = null;
      render();
      toast("Historia exportada");
    },

    importStory: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (data.format !== "ink-lore-story" || !data.story || !data.story.title) {
              throw new Error("formato");
            }
            const newId = uid();
            const st = migrate({ stories: [data.story], ideas: [] }).stories[0];
            state.data.stories.unshift({ ...st, id: newId, updated: now() });
            (data.notes || []).forEach((n) => {
              state.data.ideas.unshift({ ...n, id: uid(), storyId: newId, updated: now() });
            });
            save();
            go("story", { storyId: newId, storyTab: "resumen" });
            toast("Historia importada");
          } catch (e) {
            toast("Ese archivo no es una historia de Ink Lore");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    wipe: () => {
      if (!confirm("¿Borrar todas las historias y notas de este celular?")) return;
      state.data = emptyData();
      save(); render();
      toast("Datos borrados");
    },
  };

  // ---------- Eventos ----------
  app.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, ev);
  });

  // ---------- Arranque ----------
  applyTheme(currentTheme());
  state.screen = state.data.stories.length || state.data.ideas.length ? "home" : "welcome";
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
