(() => {
  const STORE_KEY = "inkLore.v1";
  const TABS = ["Resumen", "Personajes", "Trama", "Notas", "Escenas"];

  // ---------- Almacenamiento (en el propio celular) ----------
  const emptyData = () => ({ version: 1, stories: [], ideas: [] });

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : emptyData();
    } catch (e) {
      return emptyData();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
    } catch (e) {
      toast("No se pudo guardar. Revisa el espacio del celular.");
    }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();

  // ---------- Estado ----------
  const state = {
    data: load(),
    screen: "welcome",   // welcome | home | story | idea | newStory | newIdea
    tab: "home",         // home | explore | favorites | profile
    storyId: null,
    ideaId: null,
    storyTab: "Resumen",
    editing: false,
    sheet: null,         // "newStory" | "newIdea" | "menu" | null
  };

  const app = document.getElementById("app");

  // ---------- Utilidades ----------
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
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

  const story = (id) => state.data.stories.find((s) => s.id === id);
  const idea = (id) => state.data.ideas.find((i) => i.id === id);

  // ---------- Navegación ----------
  function go(screen, extra = {}) {
    Object.assign(state, { screen, editing: false, sheet: null }, extra);
    if (screen === "home" || screen === "explore" || screen === "favorites" || screen === "profile") {
      state.tab = screen;
    }
    render();
    window.scrollTo(0, 0);
  }

  // ---------- Pantallas ----------
  function welcome() {
    return `
      <section class="welcome">
        <div class="logo serif">Ink<br><span>Lore</span></div>
        <p class="tagline">Tu libreta de ideas<br>para fanfics</p>
        <button class="btn-primary" data-act="start">Comenzar</button>
        <button class="link-btn" data-act="start" style="color:var(--accent)">Ya tengo cuenta</button>
      </section>`;
  }

  function homeTab() {
    const stories = [...state.data.stories].sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
    const ideas = [...state.data.ideas].sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
    const storyCards = stories.length
      ? stories.slice(0, 5).map((s, i) => `
          <div class="card" data-act="openStory" data-id="${s.id}">
            <div class="thumb ${i % 2 ? "pink" : ""}">📖</div>
            <div class="card-body">
              <div class="card-title">${esc(s.title)}</div>
              <div class="card-meta">${esc(s.author || "Sin autor")}</div>
              <div class="card-meta">${ago(s.updated)}</div>
            </div>
          </div>`).join("")
      : `<p class="empty">Aún no tienes historias. Toca + para crear la primera.</p>`;

    const ideaBox = ideas.length
      ? `<div class="idea-card" data-act="openIdea" data-id="${ideas[0].id}">
           <div class="card-body">
             <div class="card-title">${esc(ideas[0].title)}</div>
             <div class="card-meta">Idea reciente</div>
           </div>
           <button class="icon-btn" data-act="newIdea" aria-label="Nueva idea">+</button>
         </div>`
      : `<div class="idea-card" data-act="newIdea">
           <div class="card-body">
             <div class="card-title">Nueva idea</div>
             <div class="card-meta">Anota una idea rápida antes de que se escape</div>
           </div>
           <button class="icon-btn" data-act="newIdea" aria-label="Nueva idea">+</button>
         </div>`;

    return `
      <div class="topbar">
        <button class="icon-btn" data-act="menu" aria-label="Menú">☰</button>
        <button class="icon-btn" data-act="search" aria-label="Buscar">⌕</button>
      </div>
      <h1 class="screen-title serif">¡Hola, escritora!</h1>
      <p class="subtitle">¿Qué historia vamos a crear hoy?</p>
      <div class="section-head"><span>Mis historias</span>
        ${stories.length > 5 ? `<button class="link-btn" data-act="allStories">Ver todas</button>` : ""}
      </div>
      ${storyCards}
      <div class="section-head"><span>Ideas rápidas</span></div>
      ${ideaBox}`;
  }

  function exploreTab() {
    return `
      <h1 class="screen-title serif">Explorar</h1>
      <p class="subtitle">Todas tus historias, en un solo lugar</p>
      <div class="section-head"><span>Historias (${state.data.stories.length})</span></div>
      ${state.data.stories.map((s) => `
        <div class="card" data-act="openStory" data-id="${s.id}">
          <div class="thumb">📖</div>
          <div class="card-body">
            <div class="card-title">${esc(s.title)}</div>
            <div class="card-meta">${esc(s.author || "Sin autor")}</div>
          </div>
        </div>`).join("") || `<p class="empty">Todavía no hay historias.</p>`}
      <div class="section-head"><span>Ideas (${state.data.ideas.length})</span></div>
      ${state.data.ideas.map((i) => `
        <div class="list-row" data-act="openIdea" data-id="${i.id}">
          <span>${esc(i.title)}</span><span class="count">›</span>
        </div>`).join("") || `<p class="empty">Sin ideas guardadas.</p>`}`;
  }

  function favoritesTab() {
    const favs = state.data.stories.filter((s) => s.favorite);
    const favIdeas = state.data.ideas.filter((i) => i.favorite);
    return `
      <h1 class="screen-title serif">Favoritos</h1>
      <p class="subtitle">Lo que más te gusta</p>
      <div class="section-head"><span>Historias</span></div>
      ${favs.map((s) => `
        <div class="card" data-act="openStory" data-id="${s.id}">
          <div class="thumb">⭐</div>
          <div class="card-body"><div class="card-title">${esc(s.title)}</div></div>
        </div>`).join("") || `<p class="empty">Marca historias con ⭐ para verlas aquí.</p>`}
      <div class="section-head"><span>Ideas</span></div>
      ${favIdeas.map((i) => `
        <div class="list-row" data-act="openIdea" data-id="${i.id}">
          <span>${esc(i.title)}</span><span class="count">›</span>
        </div>`).join("") || `<p class="empty">Sin ideas favoritas.</p>`}`;
  }

  function profileTab() {
    return `
      <h1 class="screen-title serif">Perfil</h1>
      <p class="subtitle">Tus datos se guardan en este celular</p>
      <div class="panel">
        <h4>Respaldo</h4>
        <p>Exporta tus historias a un archivo y guárdalo en Google Drive o envíatelo por correo. Para recuperarlas, usa Importar.</p>
        <div class="btn-row">
          <button class="btn-ghost" data-act="export">Exportar</button>
          <button class="btn-ghost" data-act="import">Importar</button>
        </div>
      </div>
      <div class="panel">
        <h4>Cuenta</h4>
        <p>${state.data.stories.length} historias · ${state.data.ideas.length} ideas</p>
      </div>
      <div class="btn-row">
        <button class="btn-danger" data-act="wipe">Borrar todo</button>
      </div>`;
  }

  function storyDetail() {
    const s = story(state.storyId);
    if (!s) return `<p class="empty">Esta historia ya no existe.</p>`;
    const counts = {
      Personajes: (s.characters || []).length,
      Trama: (s.plot || []).length,
      Notas: (s.notes || []).length,
      Escenas: (s.scenes || []).length,
    };
    const t = state.storyTab;
    let body = "";
    if (t === "Resumen") {
      body = `
        <div class="panel"><h4>Sinopsis</h4><p>${esc(s.synopsis) || "<span class='subtitle'>Escribe una sinopsis.</span>"}</p></div>
        ${[["Personajes", "👥"], ["Trama", "✓"], ["Notas", "📝"], ["Escenas", "🎬"]].map(([k, ic]) => `
          <div class="list-row" data-act="setTab" data-tab="${k}"><span>${ic} ${k}</span><span class="count">${counts[k]} ›</span></div>`).join("")}`;
    } else if (t === "Personajes") {
      body = listEditor(s, "characters", "Personaje", "Nombre del personaje");
    } else if (t === "Trama") {
      body = listEditor(s, "plot", "Evento", "Qué pasa");
    } else if (t === "Notas") {
      body = listEditor(s, "notes", "Nota", "Escribe una nota");
    } else if (t === "Escenas") {
      body = listEditor(s, "scenes", "Escena", "Describe la escena");
    } else {
      body = `<p class="empty">Próximamente</p>`;
    }

    return `
      <div class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Volver">←</button>
        <div style="display:flex;gap:8px">
          <button class="icon-btn" data-act="favStory" aria-label="Favorito">${s.favorite ? "★" : "☆"}</button>
          <button class="icon-btn" data-act="editStory" aria-label="Editar">✎</button>
          <button class="icon-btn" data-act="menuStory" aria-label="Más">⋮</button>
        </div>
      </div>
      <div class="hero">
        <div class="thumb">📖</div>
        <h2 class="serif">${esc(s.title)}</h2>
        <div class="author">${esc(s.author || "Sin autor")}</div>
      </div>
      <div class="chips">${(s.tags || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
      <div class="tabs">${TABS.map((k) => `<button class="${k === t ? "active" : ""}" data-act="setTab" data-tab="${k}">${k}</button>`).join("")}</div>
      ${body}`;
  }

  function listEditor(s, key, label, placeholder) {
    const items = s[key] || [];
    return `
      ${items.map((it, idx) => `
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <h4 style="margin:0">${label} ${idx + 1}</h4>
            <button class="link-btn" data-act="delItem" data-key="${key}" data-idx="${idx}">Eliminar</button>
          </div>
          <p>${esc(it)}</p>
        </div>`).join("")}
      <div class="panel">
        <textarea id="newItem" placeholder="${placeholder}"></textarea>
        <div class="btn-row"><button class="btn-primary" style="margin-top:0" data-act="addItem" data-key="${key}">Agregar</button></div>
      </div>`;
  }

  function ideaDetail() {
    const i = idea(state.ideaId);
    if (!i) return `<p class="empty">Esta idea ya no existe.</p>`;
    return `
      <div class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Volver">←</button>
        <div style="display:flex;gap:8px">
          <button class="icon-btn" data-act="favIdea" aria-label="Favorito">${i.favorite ? "★" : "☆"}</button>
          <button class="icon-btn" data-act="editIdea" aria-label="Editar">✎</button>
        </div>
      </div>
      <div class="hero">
        <div class="thumb pink" style="font-size:36px">💡</div>
        <div class="author" style="color:var(--pink)">IDEA</div>
        <h2 class="serif" style="text-align:center">${esc(i.title)}</h2>
      </div>
      <div class="chips">${(i.tags || []).map((g) => `<span class="chip pink">${esc(g)}</span>`).join("")}</div>
      <div class="panel"><h4>Descripción</h4><p>${esc(i.description) || "Sin descripción."}</p></div>
      <div class="panel"><h4>Notas</h4><p>${esc(i.notes) || "Sin notas."}</p></div>
      ${i.storyId && story(i.storyId) ? `
        <div class="panel"><h4>Relacionado con</h4>
          <div class="list-row" data-act="openStory" data-id="${i.storyId}" style="margin:0"><span>${esc(story(i.storyId).title)}</span><span class="count">›</span></div>
        </div>` : ""}
      <p class="subtitle" style="font-size:13px;margin-top:12px">Creada el ${dateLabel(i.created)} · ${ago(i.updated)}</p>
      <button class="fab" style="background:var(--pink)" data-act="editIdea" aria-label="Editar">✎</button>`;
  }

  // ---------- Hojas (formularios) ----------
  function sheetHTML() {
    if (state.sheet === "newStory" || state.sheet === "editStory") {
      const s = state.sheet === "editStory" ? story(state.storyId) : {};
      return `
        <h3 class="serif">${state.sheet === "newStory" ? "Nueva historia" : "Editar historia"}</h3>
        <div class="form">
          <label>Título<input id="f_title" value="${esc(s.title)}" placeholder="El legado de las estrellas"></label>
          <label>Fandom / autor original<input id="f_author" value="${esc(s.author)}" placeholder="Harry Potter"></label>
          <label>Sinopsis<textarea id="f_synopsis" placeholder="Una nueva generación descubre...">${esc(s.synopsis)}</textarea></label>
          <label>Etiquetas (separadas por coma)<input id="f_tags" value="${esc((s.tags || []).join(", "))}" placeholder="Aventura, Misterio"></label>
          <div class="btn-row">
            <button class="btn-ghost" data-act="closeSheet">Cancelar</button>
            <button class="btn-primary" style="margin-top:0" data-act="saveStory">Guardar</button>
          </div>
        </div>`;
    }
    if (state.sheet === "newIdea" || state.sheet === "editIdea") {
      const i = state.sheet === "editIdea" ? idea(state.ideaId) : {};
      const opts = state.data.stories.map((s) =>
        `<option value="${s.id}" ${s.id === i.storyId ? "selected" : ""}>${esc(s.title)}</option>`).join("");
      return `
        <h3 class="serif">${state.sheet === "newIdea" ? "Nueva idea" : "Editar idea"}</h3>
        <div class="form">
          <label>Título de la idea<input id="f_title" value="${esc(i.title)}" placeholder="La carta que nunca llegó"></label>
          <label>Descripción<textarea id="f_desc" placeholder="¿De qué trata?">${esc(i.description)}</textarea></label>
          <label>Notas<textarea id="f_notes" placeholder="Pensamientos sueltos">${esc(i.notes)}</textarea></label>
          <label>Etiquetas (separadas por coma)<input id="f_tags" value="${esc((i.tags || []).join(", "))}" placeholder="Escena, Emocional"></label>
          <label>Relacionar con una historia<select id="f_story"><option value="">Ninguna</option>${opts}</select></label>
          <div class="btn-row">
            <button class="btn-ghost" data-act="closeSheet">Cancelar</button>
            <button class="btn-primary" style="margin-top:0" data-act="saveIdea">Guardar</button>
          </div>
        </div>`;
    }
    if (state.sheet === "menu") {
      return `
        <h3 class="serif">Menú</h3>
        <div class="list-row" data-act="sheetNewStory"><span>📖 Nueva historia</span></div>
        <div class="list-row" data-act="sheetNewIdea"><span>💡 Nueva idea</span></div>
        <div class="list-row" data-act="export"><span>📤 Exportar respaldo</span></div>
        <div class="list-row" data-act="import"><span>📥 Importar respaldo</span></div>
        <div class="btn-row"><button class="btn-ghost" data-act="closeSheet">Cerrar</button></div>`;
    }
    if (state.sheet === "storyMenu") {
      return `
        <h3 class="serif">Historia</h3>
        <div class="list-row" data-act="editStory"><span>✎ Editar datos</span></div>
        <div class="list-row" data-act="delStory"><span style="color:#B0425F">🗑 Eliminar historia</span></div>
        <div class="btn-row"><button class="btn-ghost" data-act="closeSheet">Cerrar</button></div>`;
    }
    return "";
  }

  // ---------- Render ----------
  function content() {
    switch (state.screen) {
      case "welcome": return welcome();
      case "story": return storyDetail();
      case "idea": return ideaDetail();
      default:
        if (state.tab === "explore") return exploreTab();
        if (state.tab === "favorites") return favoritesTab();
        if (state.tab === "profile") return profileTab();
        return homeTab();
    }
  }

  function render() {
    const showTabs = state.screen !== "welcome" && state.screen !== "story" && state.screen !== "idea";
    const fab = showTabs && state.tab === "home"
      ? `<button class="fab" data-act="sheetNewStory" aria-label="Nueva historia">+</button>`
      : showTabs && state.tab === "explore"
      ? `<button class="fab" data-act="sheetNewStory" aria-label="Nueva historia">+</button>`
      : "";
    const tabbar = showTabs ? `
      <nav class="tabbar">
        ${[["home", "⌂", "Inicio"], ["explore", "◎", "Explorar"], ["favorites", "♡", "Favoritos"], ["profile", "☺", "Perfil"]]
          .map(([k, g, l]) => `<button class="${state.tab === k ? "active" : ""}" data-act="tab" data-tab="${k}"><span class="glyph">${g}</span>${l}</button>`).join("")}
      </nav>` : "";

    const detailFab = state.screen === "story"
      ? `<button class="fab" data-act="sheetNewIdea" aria-label="Nueva idea">+</button>` : "";

    app.innerHTML = `
      <div class="${showTabs ? "with-tabbar" : ""}">${content()}</div>
      ${state.screen === "idea" ? "" : (fab || detailFab)}
      ${tabbar}
      ${state.sheet ? `<div class="sheet-backdrop" data-act="backdrop"><div class="sheet" onclick="event.stopPropagation()">${sheetHTML()}</div></div>` : ""}
    `;
  }

  // ---------- Acciones ----------
  function parseTags(v) {
    return v.split(",").map((x) => x.trim()).filter(Boolean);
  }

  function upsertStory(data, id) {
    const t = document.getElementById("f_title").value.trim();
    if (!t) return toast("Ponle un título a la historia");
    const payload = {
      title: t,
      author: document.getElementById("f_author").value.trim(),
      synopsis: document.getElementById("f_synopsis").value.trim(),
      tags: parseTags(document.getElementById("f_tags").value),
      updated: now(),
    };
    if (id) {
      Object.assign(story(id), payload);
    } else {
      state.data.stories.unshift({
        id: uid(), created: now(), favorite: false,
        characters: [], plot: [], notes: [], scenes: [],
        ...payload,
      });
    }
    save();
    toast("Historia guardada");
    return true;
  }

  const actions = {
    start: () => go("home", { tab: "home" }),
    back: () => go(state.screen === "story" || state.screen === "idea" ? "home" : "home", { tab: "home" }),
    tab: (el) => go("home", { tab: el.dataset.tab }),
    openStory: (el) => go("story", { storyId: el.dataset.id, storyTab: "Resumen" }),
    openIdea: (el) => go("idea", { ideaId: el.dataset.id }),
    setTab: (el) => { state.storyTab = el.dataset.tab; render(); window.scrollTo(0, 0); },
    newIdea: () => { state.sheet = "newIdea"; render(); },
    sheetNewIdea: () => { state.sheet = "newIdea"; render(); },
    sheetNewStory: () => { state.sheet = "newStory"; render(); },
    editStory: () => { state.sheet = "editStory"; render(); },
    menuStory: () => { state.sheet = "storyMenu"; render(); },
    menu: () => { state.sheet = "menu"; render(); },
    search: () => toast("Búsqueda: próximamente"),
    allStories: () => go("home", { tab: "explore" }),
    closeSheet: () => { state.sheet = null; render(); },
    backdrop: (el, ev) => { if (ev.target === el) { state.sheet = null; render(); } },

    favStory: () => {
      const s = story(state.storyId);
      s.favorite = !s.favorite; save(); render();
    },
    favIdea: () => {
      const i = idea(state.ideaId);
      i.favorite = !i.favorite; save(); render();
    },

    saveStory: () => {
      const editing = state.sheet === "editStory";
      if (upsertStory(state.data, editing ? state.storyId : null) === true) {
        state.sheet = null; render();
      }
    },

    saveIdea: () => {
      const editing = state.sheet === "editIdea";
      const title = document.getElementById("f_title").value.trim();
      if (!title) return toast("Escribe el título de la idea");
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
        state.sheet = null; render();
      } else {
        const id = uid();
        state.data.ideas.unshift({ id, created: now(), favorite: false, ...payload });
        // Si se creó desde una historia, la relacionamos automáticamente
        if (state.screen === "story" && !payload.storyId) state.data.ideas[0].storyId = state.storyId;
        save();
        state.sheet = null;
        toast("Idea guardada");
        render();
      }
    },

    addItem: (el) => {
      const txt = document.getElementById("newItem").value.trim();
      if (!txt) return toast("Escribe algo primero");
      const s = story(state.storyId);
      s[el.dataset.key] = [...(s[el.dataset.key] || []), txt];
      s.updated = now();
      save(); render();
    },

    delItem: (el) => {
      const s = story(state.storyId);
      s[el.dataset.key].splice(Number(el.dataset.idx), 1);
      s.updated = now();
      save(); render();
    },

    delStory: () => {
      if (!confirm("¿Eliminar esta historia? No se puede deshacer.")) return;
      state.data.stories = state.data.stories.filter((s) => s.id !== state.storyId);
      state.data.ideas.forEach((i) => { if (i.storyId === state.storyId) i.storyId = null; });
      save();
      go("home", { tab: "home" });
      toast("Historia eliminada");
    },

    export: () => {
      const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fecha = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ink-lore-respaldo-${fecha}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Respaldo descargado");
    },

    import: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            if (!Array.isArray(parsed.stories) || !Array.isArray(parsed.ideas)) throw new Error();
            if (!confirm("Esto reemplazará tus datos actuales con el respaldo. ¿Continuar?")) return;
            state.data = parsed;
            save(); render();
            toast("Respaldo importado");
          } catch (e) {
            toast("El archivo no es un respaldo válido");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    wipe: () => {
      if (!confirm("¿Borrar todas las historias e ideas de este celular?")) return;
      state.data = emptyData();
      save(); render();
      toast("Datos borrados");
    },
  };

  // ---------- Eventos (delegación) ----------
  app.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, ev);
  });

  // Sheets también usan clics dentro del backdrop
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest(".sheet-backdrop");
    if (el && ev.target === el) actions.closeSheet();
  });

  // Enter en el campo "newItem" no envía; el botón Agregar sí.

  // Arranque: si ya hay datos, entrar directo al inicio
  state.screen = state.data.stories.length || state.data.ideas.length ? "home" : "welcome";
  state.tab = "home";
  render();

  // Registrar service worker para uso sin internet y para instalar la app
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
