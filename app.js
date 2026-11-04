(() => {
  const STORE_KEY = "inkLore.v1";
  const THEME_KEY = "inkLore.theme";

  // Secciones de cada historia, según el documento del proyecto
  const SECTIONS = [
    { key: "manuscrito", label: "Manuscrito", item: "Escena", ph: "Escribe una escena o capítulo" },
    { key: "personajes", label: "Personajes", item: "Personaje", ph: "Nombre y descripción del personaje" },
    { key: "universo", label: "Universo", item: "Elemento", ph: "Mundo, culturas, magia o sistemas" },
    { key: "cronologia", label: "Cronología", item: "Evento", ph: "Qué pasa y cuándo" },
    { key: "lugares", label: "Lugares", item: "Lugar", ph: "Nombre y descripción del lugar" },
    { key: "objetos", label: "Objetos", item: "Objeto", ph: "Artefactos y recursos" },
    { key: "lore", label: "Lore", item: "Secreto", ph: "Historia y secretos del universo" },
    { key: "archivo", label: "Archivo", item: "Referencia", ph: "Escenas descartadas, referencias, notas" },
  ];
  const TABS = [{ key: "resumen", label: "Resumen" }, ...SECTIONS];

  // Paleta del documento: lavanda, rosa, verde salvia y marfil
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

  const emptySections = () => Object.fromEntries(SECTIONS.map((s) => [s.key, []]));
  const emptyData = () => ({ version: 2, stories: [], ideas: [] });

  // Convierte datos de versiones anteriores al formato nuevo
  function migrate(d) {
    d.stories = (d.stories || []).map((s) => {
      if (!s.sections) {
        s.sections = emptySections();
        s.sections.manuscrito = s.scenes || [];
        s.sections.personajes = s.characters || [];
        s.sections.cronologia = s.plot || [];
        s.sections.archivo = s.notes || [];
        delete s.scenes; delete s.characters; delete s.plot; delete s.notes;
      } else {
        SECTIONS.forEach((x) => { s.sections[x.key] = s.sections[x.key] || []; });
      }
      s.tags = s.tags || [];
      s.favorite = !!s.favorite;
      return s;
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
    storyTab: "resumen",
    sheet: null,
    libTab: "historias",
    onlyFav: false,
    query: "",
    hist: [],
  };

  const app = document.getElementById("app");

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
    } catch (e) {
      toast("No se pudo guardar. Revisa el espacio del celular.");
    }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();

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
  const parseTags = (v) => v.split(",").map((x) => x.trim()).filter(Boolean);
  const snippet = (t) => (t.length > 70 ? t.slice(0, 70) + "…" : t);

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
      state.hist.push({ screen: state.screen, storyId: state.storyId, ideaId: state.ideaId, storyTab: state.storyTab });
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
    if (!t) return `<p class="empty">Busca en tus historias, secciones y notas.</p>`;
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
      SECTIONS.forEach((sec) => {
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

  function listEditor(s, sec, items) {
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

  function storyScreen() {
    const s = story(state.storyId);
    if (!s) return `<p class="empty">Esta historia ya no existe.</p>`;
    const t = state.storyTab;
    const related = state.data.ideas.filter((i) => i.storyId === s.id);

    let body;
    if (t === "resumen") {
      body = `
        <div class="panel"><h4>Sinopsis</h4><p>${esc(s.synopsis) || "Escribe una sinopsis con el botón ✎."}</p></div>
        ${SECTIONS.map((sec) => `
          <div class="list-row" data-act="setTab" data-tab="${sec.key}">
            <span>${sec.label}</span>
            <span class="count">${(s.sections[sec.key] || []).length} ›</span>
          </div>`).join("")}
        <div class="list-row add-row" data-act="noteForStory"><span>＋ Nueva nota para esta historia</span></div>
        ${related.length ? `
          <div class="section-head"><span>Notas relacionadas</span></div>
          <div class="notes">${related.map(noteHTML).join("")}</div>` : ""}`;
    } else {
      const sec = SECTIONS.find((x) => x.key === t) || SECTIONS[0];
      const items = s.sections[sec.key] || [];
      const words = sec.key === "manuscrito"
        ? items.join(" ").split(/\s+/).filter(Boolean).length
        : null;
      body = (words !== null ? `<p class="counter">${words} palabras</p>` : "") + listEditor(s, sec, items);
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

    // Buscador en vivo: actualiza solo los resultados, para no perder el foco del teclado
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

  // ---------- Acciones ----------
  const actions = {
    start: () => go("home"),
    back: () => back(),
    tab: (el) => {
      if (el.dataset.screen === "create") return openSheet("create");
      go(el.dataset.screen);
    },
    search: () => go("search"),

    openStory: (el) => go("story", { storyId: el.dataset.id, storyTab: "resumen" }, true),
    openStoryTab: (el) => go("story", { storyId: el.dataset.id, storyTab: el.dataset.tab }, true),
    openIdea: (el) => go("idea", { ideaId: el.dataset.id }, true),
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
          id: uid(), created: now(), favorite: false, sections: emptySections(), ...payload,
        });
      }
      save();
      state.sheet = null;
      toast("Historia guardada");
      render();
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

    exportStory: () => {
      const s = story(state.storyId);
      if (!s) return;
      const payload = {
        format: "ink-lore-story",
        version: 2,
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
