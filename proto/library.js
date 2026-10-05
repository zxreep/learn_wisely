/* ============================================================
   EMBERDESK — LIBRARY
   Subject → Topic → Content type. Chunked cards with visible
   time/size estimates. My Library / Explore. Quick-create tools.
   "Add to Board" and "Study now" on every detail view.
   ============================================================ */
window.SP = window.SP || {};

SP.library = (() => {
  const { el, esc, icon, uid, emberSVG } = SP.ui;
  const D = SP.data;
  const S = SP.state;

  let tab = "explore";        // explore | mine
  let subjectFilter = null;   // subject id
  let topicFilter = null;
  let typeFilter = null;
  let query = "";
  let currentFolder = null;   // My Library file-manager: folder id or null (root)
  let container = null;

  function mount(c) {
    container = c;
    c.innerHTML = "";
    c.classList.remove("screen--flush");
    const page = el("div", { class: "page page--wide" });
    c.appendChild(page);
    route(page);
  }

  function route(page) {
    const m = location.hash.match(/#\/library\/item\/(\w+)/);
    if (m) { renderDetail(page, m[1]); return; }
    renderMain(page);
  }

  /* ============================================================
     MAIN LIST VIEW
     ============================================================ */
  function renderMain(page) {
    page.innerHTML = "";
    page.appendChild(el("div", { class: "screen-head" },
      el("h1", {}, "Library"),
      el("div", { class: "tabs", role: "tablist" },
        el("button", { class: "tab-btn", role: "tab", "aria-selected": tab === "mine", onclick: () => switchTab("mine") }, "My Library"),
        el("button", { class: "tab-btn", role: "tab", "aria-selected": tab === "explore", onclick: () => switchTab("explore") }, "Explore"))));

    if (tab === "mine") renderMine(page);
    else renderExplore(page);
  }

  function switchTab(t) {
    tab = t;
    // brief loading state — content "fetches"
    const page = container.querySelector(".page");
    page.innerHTML = "";
    page.appendChild(el("h1", {}, "Library"));
    page.appendChild(SP.ui.skeletonGrid(6, 150));
    setTimeout(() => mount(container), 320);
  }

  /* ---------- My Library — a file manager ----------
     iOS Files model: folder tiles + item cards, breadcrumbs on the way
     down, ⋯ menus for move/rename/delete, drag-and-drop or picker for
     uploads, and create tools (write, build, or let AI draft). Items
     live in folders via library.places; folders are a tree in
     library.folders. Null folder = the root. */
  function fmFolders() {
    const lib = S.s.library;
    let changed = false;
    if (!Array.isArray(lib.folders)) { lib.folders = []; changed = true; }
    // legacy builds stored decorative string tags — promote them
    lib.folders = lib.folders.map(f => {
      if (typeof f === "string") { changed = true; return { id: "f-" + uid().slice(0, 6), name: f, parent: null }; }
      return f;
    });
    if (!lib.places) { lib.places = {}; changed = true; }
    if (changed) S.save();
    return lib.folders;
  }
  const folderById = id => fmFolders().find(f => f.id === id) || null;
  const childrenOf = pid => fmFolders().filter(f => (f.parent || null) === pid);
  const itemsIn = fid => myItems().filter(l => (S.s.library.places[l.id] || null) === fid);

  function folderPath(id) {
    const path = [];
    let cur = folderById(id), guard = 0;
    while (cur && guard++ < 10) { path.unshift(cur); cur = cur.parent ? folderById(cur.parent) : null; }
    return path;
  }

  function renderMine(page) {
    fmFolders();
    if (currentFolder && !folderById(currentFolder)) currentFolder = null; // stale after a delete elsewhere

    // spaced-repetition review queue
    const due = allItems().filter(l => l.reviewDue).reduce((n, l) => n + l.reviewDue, 0);
    if (due > 0) {
      page.appendChild(el("div", { class: "review-banner" },
        el("div", {},
          el("div", { class: "rb-count" }, String(due)),
          el("div", { class: "small muted" }, "cards due for review today")),
        el("div", { class: "spacer" }),
        el("button", { class: "btn btn--quiet", onclick: startReview }, "Start review")));
    }

    if (currentFolder) page.appendChild(crumbsBar());

    const kids = childrenOf(currentFolder);
    const items = itemsIn(currentFolder);
    const label = currentFolder ? folderById(currentFolder).name : "My Library";

    /* one New button; the menu carries folders, uploads, tools and AI */
    const newBtn = el("button", { class: "btn btn--primary", "aria-haspopup": "menu", "aria-expanded": "false",
      onclick: () => SP.ui.menu(newBtn, createMenuItems(), { align: "left" }), html: icon("plus", 15) + "<span>New</span>" });
    page.appendChild(el("div", { class: "section-head" },
      el("h2", {}, label),
      el("span", { class: "section-sub" }, `${items.length} item${items.length === 1 ? "" : "s"} · ${kids.length} folder${kids.length === 1 ? "" : "s"}`),
      el("div", { class: "spacer" }), newBtn));

    if (kids.length) {
      const grid = el("div", { class: "fm-folder-grid" });
      kids.forEach(f => grid.appendChild(folderTile(f)));
      page.appendChild(grid);
    }
    if (items.length) renderGrid(page, items);
    else if (!kids.length) {
      page.appendChild(el("div", { class: "empty-state" },
        el("div", { html: emberSVG(84, { glow: S.s.profile.ember.glow, mood: "calm" }) }),
        el("h3", {}, currentFolder ? "This folder is empty" : "Nothing here yet"),
        el("p", {}, currentFolder
          ? "Drop files here, upload something, or create with the tools — everything stays in this folder."
          : "Drag files anywhere here to upload, save items from Explore, or create with the tools — AI drafts included.")));
    }

    /* drop files anywhere on the view */
    page.addEventListener("dragover", e => { e.preventDefault(); page.classList.add("fm-dragging"); });
    page.addEventListener("dragleave", e => { if (e.target === page) page.classList.remove("fm-dragging"); });
    page.addEventListener("drop", e => {
      e.preventDefault();
      page.classList.remove("fm-dragging");
      if (e.dataTransfer && e.dataTransfer.files.length) handleFiles([...e.dataTransfer.files]);
    });
  }

  function crumbsBar() {
    const path = folderPath(currentFolder);
    if (!path.length) return null;
    const backTo = path.length > 1 ? path[path.length - 2] : null;
    const cur = path[path.length - 1];
    const bar = el("div", { class: "fm-crumbs" },
      el("button", { class: "fm-crumb-back",
        onclick: () => { currentFolder = backTo ? backTo.id : null; mount(container); },
        html: icon("chevronLeft", 14) + `<span>${esc(backTo ? backTo.name : "My Library")}</span>` }));
    if (cur) bar.appendChild(el("span", { class: "fm-crumb-cur" }, cur.name));
    return bar;
  }

  function folderTile(f) {
    const count = itemsIn(f.id).length + childrenOf(f.id).length;
    const kebab = el("button", { class: "icon-btn icon-btn--xs fm-tile-kebab", "aria-haspopup": "menu", "aria-expanded": "false",
      "aria-label": `Options for folder ${f.name}`, html: icon("more", 14),
      onclick: e => { e.stopPropagation(); SP.ui.menu(kebab, [
        { label: "Rename…", icon: "pencil", run: () => renameThing("folder", f) },
        { sep: true },
        { label: "Delete folder", icon: "trash", danger: true, run: () => deleteFolder(f) },
      ]); } });
    return el("div", { class: "fm-folder-tile" },
      el("button", { class: "fm-folder-open", onclick: () => { currentFolder = f.id; mount(container); }, "aria-label": `Open folder ${f.name}` },
        el("span", { class: "fm-folder-ic", html: icon("folder", 20) }),
        el("span", { class: "fm-folder-meta" },
          el("span", { class: "fm-folder-name" }, f.name),
          el("span", { class: "xs muted" }, `${count} item${count === 1 ? "" : "s"}`)),
        el("span", { class: "fm-folder-chev", html: icon("chevronRight", 14) })),
      kebab);
  }

  function createMenuItems() {
    return [
      { label: "New folder", icon: "folder", hint: "inside this one", run: addFolder },
      { label: "Upload files", icon: "up", hint: "text · images · PDF", run: () => ensureFileInput().click() },
      { sep: true },
      { label: "New note", icon: "pencil", hint: "write it here", run: openNoteEditor },
      { label: "Flashcard deck", icon: "cards", hint: "type pairs", run: openFlashcardGenerator },
      { label: "Mindmap builder", icon: "network", hint: "topic + branches", run: openMindmapBuilder },
      { sep: true },
      { label: "Create with AI", icon: "sparkle", hint: "topic → draft", run: openAIGenerator },
      { label: "AI quiz from a note", icon: "book", hint: "from your writing", run: openQuizGenerator },
    ];
  }

  function myItems() {
    const createdIds = new Set(S.s.library.created.map(c => c.id));
    // saved may contain ids of items you also created — map them once,
    // otherwise every created note/deck appeared twice in My Library
    const saved = S.s.library.saved
      .filter(id => !createdIds.has(id))
      .map(id => allItems().find(l => l.id === id))
      .filter(Boolean);
    return [...S.s.library.created, ...saved];
  }

  function allItems() {
    return [...D.LIBRARY, ...S.s.library.created];
  }

  function startReview() {
    // pull the first deck with cards due and open a study session
    const deck = myItems().find(l => l.reviewDue && l.cards);
    if (deck) studyNow(deck);
    else SP.ui.toast("No deck with cards is ready — check back after your next session");
  }

  function addFolder() {
    const m = SP.ui.modal({ title: currentFolder ? "New subfolder" : "New folder" });
    const input = el("input", { class: "input", placeholder: "e.g. JEE Physics formulas", "aria-label": "Folder name" });
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none", marginTop: "8px" } }, "Give the folder a name first.");
    m.body.appendChild(input); m.body.appendChild(err);
    const foot = el("div", { class: "modal-foot" },
      el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
      el("button", { class: "btn btn--primary", onclick: () => {
        const v = input.value.trim();
        if (!v) { err.style.display = ""; input.focus(); return; }
        fmFolders().push({ id: "f-" + uid().slice(0, 6), name: v, parent: currentFolder });
        S.save();
        m.close();
        SP.ui.toast(`Folder "${v}" created`);
        mount(container);
      } }, "Create folder"));
    m.el.appendChild(foot);
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- uploads: picker + drag-and-drop ----------
     Text files are parsed into a readable note; images, PDFs and audio
     are kept as data URLs with an inline preview / download. Sizes are
     capped so localStorage stays healthy; over-limit files get a clear
     error toast instead of failing silently. */
  const FILE_KINDS = {
    image: { label: "Image", icon: "camera", cap: 1.5 * 1024 * 1024 },
    pdf:   { label: "PDF",  icon: "file",   cap: 3 * 1024 * 1024 },
    text:  { label: "Text", icon: "note",   cap: 300 * 1024 },
    audio: { label: "Audio", icon: "sound", cap: 2 * 1024 * 1024 },
    other: { label: "File", icon: "file",   cap: 2 * 1024 * 1024 },
  };
  function fileKind(f) {
    const t = (f.type || "").toLowerCase(), n = (f.name || "").toLowerCase();
    if (t.startsWith("image/")) return "image";
    if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
    if (t.startsWith("text/") || /\.(txt|md|csv|json)$/.test(n)) return "text";
    if (t.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/.test(n)) return "audio";
    return "other";
  }
  function fmtSize(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }
  let fileInput = null;
  function ensureFileInput() {
    if (fileInput) return fileInput;
    fileInput = el("input", { type: "file", multiple: true,
      accept: ".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.m4a",
      style: { display: "none" }, "aria-hidden": "true", tabindex: "-1" });
    fileInput.addEventListener("change", () => { handleFiles([...fileInput.files]); fileInput.value = ""; });
    document.body.appendChild(fileInput);
    return fileInput;
  }
  function handleFiles(files) {
    if (!files.length) return;
    let okCount = 0, pending = files.length;
    const done = () => { if (--pending === 0) finishUploadBatch(okCount); };
    files.forEach(f => {
      const kind = fileKind(f), meta = FILE_KINDS[kind];
      if (f.size > meta.cap) {
        SP.ui.toast(`"${f.name.slice(0, 24)}" is ${fmtSize(f.size)} — ${meta.label.toLowerCase()} uploads cap at ${fmtSize(meta.cap)}`, "error");
        done();
        return;
      }
      const reader = new FileReader();
      const isText = kind === "text";
      reader.onload = () => {
        const item = {
          id: uid(), subject: "mine", topic: "Uploads", type: "file", fileKind: kind,
          mime: f.type || "", size: f.size, title: f.name, est: fmtSize(f.size),
          author: "Uploaded", mine: true,
        };
        if (isText) {
          item.text = String(reader.result || "").slice(0, 200000);
          item.body = `<pre class="fm-filepre">${esc(item.text)}</pre>`;
          item.est = `${fmtSize(f.size)} · ${Math.max(1, Math.round(item.text.split(/\s+/).length / 200))} min read`;
        } else {
          item.dataUrl = String(reader.result || "");
        }
        S.addCreated(item);
        S.s.library.places[item.id] = currentFolder;
        S.save();
        okCount++;
        done();
      };
      reader.onerror = () => { SP.ui.toast(`"${f.name.slice(0, 24)}" could not be read`, "error"); done(); };
      if (isText) reader.readAsText(f); else reader.readAsDataURL(f);
    });
  }
  function finishUploadBatch(n) {
    if (n > 0) SP.ui.toast(n === 1 ? "File uploaded to My Library" : `${n} files uploaded to My Library`, "gold");
    tab = "mine";
    if (container) mount(container);
  }

  /* ---------- Create with AI: topic → draft ----------
     The demo generator composes real, structured study material from
     the topic string (same spirit as the coach). Everything it makes
     is private to My Library and fully studyable — decks review, quizzes
     score, summaries read. */
  function openAIGenerator() {
    const kinds = [
      { id: "summary", label: "Summary", icon: "note", hint: "a readable briefing" },
      { id: "flashcards", label: "Flashcards", icon: "cards", hint: "a 6-card deck" },
      { id: "quiz", label: "Quiz", icon: "help", hint: "4 questions" },
      { id: "cheatsheet", label: "Cheat sheet", icon: "sigma", hint: "one-pager" },
    ];
    let kind = "summary";
    const chips = kinds.map(k => el("button", {
      class: "chip", "aria-pressed": String(k.id === kind), type: "button",
      onclick: () => { kind = k.id; chips.forEach((c, i) => c.setAttribute("aria-pressed", String(kinds[i].id === kind))); },
    },
      el("span", {}, k.label),
      el("span", { class: "muted xs", style: { display: "block", fontWeight: "400" } }, k.hint)));
    const topic = el("input", { class: "input", placeholder: "Topic, e.g. Photosynthesis light reactions", "aria-label": "Topic" });
    const subjectSel = el("select", { class: "input", "aria-label": "Subject" });
    D.SUBJECTS.forEach(s => subjectSel.appendChild(el("option", { value: s.id }, s.name)));
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none" } }, "Tell Ember what to generate — a topic is enough.");
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
      el("p", { class: "small muted" }, "Describe a topic — Ember drafts it into real, studyable structure. Everything stays private in My Library."),
      el("label", { class: "field-label" }, "Type"),
      el("div", { class: "fm-chip-row" }, ...chips),
      el("label", { class: "field-label" }, "Subject"), subjectSel,
      el("label", { class: "field-label" }, "Topic"), topic, err);
    const m = SP.ui.modal({
      title: "Create with AI", body,
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: "btn btn--primary", onclick: () => {
          if (!topic.value.trim()) { err.style.display = ""; topic.focus(); return; }
          runGenerate(kind, topic.value.trim(), subjectSel.value, m);
        } }, "Generate")],
    });
    setTimeout(() => topic.focus(), 60);
  }

  function runGenerate(kind, topicText, subjectId, modal) {
    modal.body.innerHTML = "";
    modal.el.querySelector(".modal-foot").style.display = "none";
    modal.body.appendChild(el("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" } },
      el("div", { style: { display: "flex", gap: "10px", alignItems: "center" } },
        el("div", { html: emberSVG(48, { glow: S.s.profile.ember.glow, mood: "calm" }) }),
        el("span", { class: "small muted" }, `Ember is drafting your ${(D.CONTENT_TYPE_LABEL[kind] || kind).toLowerCase()} on ${topicText}…`)),
      SP.ui.skeletonCard(40), SP.ui.skeletonCard(40), SP.ui.skeletonCard(40)));
    setTimeout(() => {
      const item = aiCompose(kind, topicText, subjectId);
      S.addCreated(item);
      S.s.library.places[item.id] = currentFolder;
      S.saveItem(item.id);
      modal.close();
      SP.ui.toast(`${D.CONTENT_TYPE_LABEL[kind] || "Draft"} generated — saved to My Library`, "gold");
      tab = "mine";
      mount(container);
    }, 1500);
  }

  function aiCompose(kind, topicText, subjectId) {
    const T = topicText.charAt(0).toUpperCase() + topicText.slice(1);
    const sub = D.SUBJECTS.find(s => s.id === subjectId);
    const subName = sub ? sub.name : "General";
    if (kind === "flashcards") {
      const cards = [
        [`What drives ${topicText}?`, "The core mechanism examiners expect you to name first."],
        [`${T} in one sentence`, "Say it aloud without notes — if you stall, reread the summary."],
        [`Key term: ${topicText}`, "Define it, then give one worked example."],
        [`Where ${topicText} breaks down`, "Edge cases and exceptions — favourite exam territory."],
        [`${T} ↔ the bigger picture`, "Connect it to one earlier topic and one still ahead."],
        [`Self-check on ${topicText}`, "Explain it to an imaginary classmate in under a minute."],
      ];
      return { id: uid(), subject: subjectId, topic: "AI Decks", type: "flashcards", title: `${T} — AI deck`, est: `${cards.length}-card deck`, author: "Ember AI", mine: true, cards, reviewDue: cards.length };
    }
    if (kind === "quiz") {
      const questions = [
        { q: `Which statement best captures ${topicText}?`, opts: [`The core principle behind ${topicText}`, "An unrelated definition", "A formatting rule", "None of these"], a: 0 },
        { q: `You're stuck on ${topicText} — what's the fastest check?`, opts: ["Reread everything", "Explain it aloud from memory", "Skip it entirely", "Copy the headings"], a: 1 },
        { q: `What will ${subName} exams most likely ask about ${topicText}?`, opts: ["The exception to the rule", "The date it was discovered", "The author's name", "The page number"], a: 0 },
        { q: `Which study move cements ${topicText} fastest?`, opts: ["Highlighting", "A practice question under time", "Rereading twice", "Rewriting verbatim"], a: 1 },
      ];
      return { id: uid(), subject: subjectId, topic: "AI Quizzes", type: "quiz", title: `${T} — AI quiz`, est: `${questions.length} questions, ${questions.length} min`, author: "Ember AI", mine: true, questions };
    }
    if (kind === "cheatsheet") {
      const body = `<h3>${T} — the one-pager</h3><ul>`
        + `<li><strong>The one thing to memorize:</strong> the central rule of ${topicText}, verbatim.</li>`
        + `<li><strong>Three-step method:</strong> name it → show it → check the edge case.</li>`
        + `<li><strong>What graders look for:</strong> precise ${subName} terms, used correctly.</li>`
        + `<li><strong>Trap to avoid:</strong> the plausible-but-wrong second option.</li>`
        + `<li><strong>Last-minute drill:</strong> one full example, start to finish, no notes.</li></ul>`;
      return { id: uid(), subject: subjectId, topic: "AI Sheets", type: "cheatsheet", title: `${T} — cheat sheet`, est: "1-page sheet", author: "Ember AI", mine: true, body };
    }
    const body = `<p><strong>${T}</strong> sits inside ${subName} as one of its load-bearing ideas. Get this right and neighbouring topics get cheaper — the same vocabulary and logic recycle.</p>`
      + `<p>The reliable way through it: state the core idea in one sentence, attach one worked example, then stress-test it against the classic exception. If the example wobbles, the understanding isn't there yet.</p><ul>`
      + `<li><strong>Anchor:</strong> one sentence that defines ${topicText} without jargon.</li>`
      + `<li><strong>Example:</strong> one you can rebuild from memory.</li>`
      + `<li><strong>Edge:</strong> the case that breaks the naive version.</li></ul>`
      + `<p>Follow-up move: turn the anchor sentence into a flashcard and the edge case into a quiz question — both are one tap away in this library.</p>`;
    return { id: uid(), subject: subjectId, topic: "AI Summaries", type: "summary", title: `${T} — AI summary`, est: "3 min read", author: "Ember AI", mine: true, body };
  }

  /* ---------- move / rename / delete ---------- */
  function openMoveTo(l) {
    const here = S.s.library.places[l.id] || null;
    const mk = (fid, name, depth) => el("button", { class: `fm-move-row ${here === fid ? "current" : ""}`,
      style: { paddingLeft: `${12 + depth * 18}px` },
      onclick: () => {
        if (fid) S.s.library.places[l.id] = fid; else delete S.s.library.places[l.id];
        S.save();
        m.close();
        SP.ui.toast(fid ? `Moved to ${name}` : "Moved to My Library");
        mount(container);
      } },
      el("span", { class: "fm-move-ic", html: icon("folder", 15) }),
      el("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" } }, name),
      here === fid ? el("span", { class: "fm-move-check", html: icon("check", 15) }) : null);
    const rows = [mk(null, "My Library", 0)];
    const walk = (pid, depth) => childrenOf(pid).forEach(f => {
      rows.push(mk(f.id, f.name, depth));
      if (depth < 3) walk(f.id, depth + 1);
    });
    walk(null, 1);
    const m = SP.ui.modal({ title: `Move “${l.title.slice(0, 30)}”`, body: el("div", { style: { display: "flex", flexDirection: "column", gap: "4px" } }, ...rows) });
  }

  function renameThing(kindTag, ref) {
    const isFolder = kindTag === "folder";
    const m0 = SP.ui.modal({ title: isFolder ? "Rename folder" : "Rename" });
    const input = el("input", { class: "input", value: isFolder ? ref.name : ref.title, "aria-label": "New name" });
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none", marginTop: "8px" } }, "A name is needed.");
    m0.body.appendChild(input); m0.body.appendChild(err);
    const foot = el("div", { class: "modal-foot" },
      el("button", { class: "btn btn--ghost", onclick: () => m0.close() }, "Cancel"),
      el("button", { class: "btn btn--primary", onclick: () => {
        const v = input.value.trim();
        if (!v) { err.style.display = ""; input.focus(); return; }
        if (isFolder) ref.name = v; else ref.title = v;
        S.save();
        m0.close();
        SP.ui.toast("Renamed");
        mount(container);
      } }, "Rename"));
    m0.el.appendChild(foot);
    setTimeout(() => { input.focus(); input.select(); }, 60);
  }

  function deleteFolder(f) {
    const n = itemsIn(f.id).length + childrenOf(f.id).length;
    SP.ui.confirmDialog({
      title: `Delete “${f.name}”?`,
      text: n ? `${n} item${n === 1 ? "" : "s"} and subfolder${n === 1 ? "" : "s"} inside will move up one level — nothing is deleted from your library.` : "The folder is empty — it will simply disappear.",
      confirmLabel: "Delete folder", danger: true,
      onConfirm: () => {
        const parent = f.parent || null;
        S.s.library.folders = fmFolders().filter(x => x.id !== f.id);
        S.s.library.folders.forEach(x => { if (x.parent === f.id) x.parent = parent; });
        Object.keys(S.s.library.places).forEach(k => { if (S.s.library.places[k] === f.id) S.s.library.places[k] = parent; });
        if (currentFolder === f.id) currentFolder = parent;
        S.save();
        SP.ui.toast(`Folder “${f.name}” deleted`);
        mount(container);
      },
    });
  }

  function removeItem(l) {
    const created = S.s.library.created.some(c => c.id === l.id);
    SP.ui.confirmDialog({
      title: `${created ? "Delete" : "Remove"} “${l.title.slice(0, 32)}”?`,
      text: created ? "This deletes it from your library. Explore keeps any public original." : "It leaves My Library but stays in Explore, so you can save it again.",
      confirmLabel: created ? "Delete" : "Remove", danger: true,
      onConfirm: () => {
        if (created) S.s.library.created = S.s.library.created.filter(c => c.id !== l.id);
        S.unsaveItem(l.id);
        delete S.s.library.places[l.id];
        S.save();
        SP.ui.toast(created ? "Deleted" : "Removed from My Library");
        mount(container);
      },
    });
  }

  function itemMenu(l, trigger) {
    const created = S.s.library.created.some(c => c.id === l.id);
    SP.ui.menu(trigger, [
      { label: "Open", icon: "eye", run: () => { location.hash = `#/library/item/${l.id}`; } },
      ...(l.cards ? [{ label: "Study now", icon: "play", run: () => studyNow(l) }] : []),
      { label: "Move to…", icon: "folder", run: () => openMoveTo(l) },
      ...(created ? [{ label: "Rename…", icon: "pencil", run: () => renameThing("item", l) }] : []),
      { sep: true },
      { label: created ? "Delete" : "Remove from My Library", icon: "trash", danger: true, run: () => removeItem(l) },
    ]);
  }

  /* one place that knows how to label/icon an item (files included) */
  function typeMeta(l) {
    if (l.type === "file") {
      const k = FILE_KINDS[l.fileKind] || FILE_KINDS.other;
      return { label: k.label, icon: k.icon };
    }
    return { label: D.CONTENT_TYPE_LABEL[l.type] || l.type, icon: D.CONTENT_TYPE_ICON[l.type] || "file" };
  }

  /* ---------- Explore ---------- */
  function renderExplore(page) {
    const layout = el("div", { class: "lib-layout" });
    layout.appendChild(buildSubjectTree());
    const right = el("div", {});

    /* search + one filter control (was eight always-visible type tabs) */
    const searchWrap = el("div", { class: "lib-search" },
      el("span", { class: "lib-search-icon", html: icon("search", 15) }),
      el("input", { class: "input", placeholder: "Search the library…", "aria-label": "Search library", value: query,
        oninput: e => { query = e.target.value; refreshResults(); } }));
    if (query) searchWrap.appendChild(el("button", { class: "icon-btn icon-btn--xs", "aria-label": "Clear search",
      html: icon("x", 14), onclick: () => { query = ""; mount(container); } }));
    const typeBtn = el("button", { class: `btn btn--sm filter-btn ${typeFilter ? "is-on" : ""}`, "aria-haspopup": "menu", "aria-expanded": "false",
      onclick: () => SP.ui.menu(typeBtn, typeMenuItems()),
      html: icon("filter", 14) + `<span>${esc(typeFilter ? D.CONTENT_TYPE_LABEL[typeFilter] : "All types")}</span>` });
    right.appendChild(el("div", { class: "lib-controls" }, searchWrap, typeBtn));

    const resultsWrap = el("div", { id: "lib-results" });
    right.appendChild(resultsWrap);
    layout.appendChild(right);
    page.appendChild(layout);
    refreshResults();
  }

  function buildSubjectTree() {
    const side = el("div", { class: "lib-sidebar" });
    side.appendChild(el("button", { class: "lib-subject", style: { fontWeight: subjectFilter ? "400" : "700" }, onclick: () => { subjectFilter = null; topicFilter = null; mount(container); } },
      "All subjects"));
    D.SUBJECTS.forEach(sub => {
      const count = D.LIBRARY.filter(l => l.subject === sub.id && l.explore).length;
      const open = subjectFilter === sub.id;
      const btn = el("button", { class: "lib-subject", "aria-expanded": open, onclick: () => { subjectFilter = open ? null : sub.id; topicFilter = null; mount(container); } },
        el("span", { class: "lib-subject-icon", html: icon(sub.icon, 15) }), el("span", { class: "lib-subject-name" }, sub.name), el("span", { class: "count num" }, String(count)),
        el("span", { html: icon(open ? "chevronDown" : "chevronRight", 13) }));
      side.appendChild(btn);
      if (open) {
        const topics = [...new Set(D.LIBRARY.filter(l => l.subject === sub.id).map(l => l.topic))];
        const tw = el("div", { class: "lib-topics" });
        topics.forEach(t => {
          tw.appendChild(el("button", { class: `lib-topic ${topicFilter === t ? "active" : ""}`, onclick: () => { topicFilter = topicFilter === t ? null : t; mount(container); } }, t));
        });
        side.appendChild(tw);
      }
    });
    return side;
  }

  function typeMenuItems() {
    const types = [null, "notes", "flashcards", "quiz", "mindmap", "video", "paper", "cheatsheet", "summary"];
    const pool = D.LIBRARY.filter(l => l.explore);   // hints must match what Explore actually lists
    return types.map(t => ({
      label: t ? D.CONTENT_TYPE_LABEL[t] : "All types",
      icon: t ? (D.CONTENT_TYPE_ICON[t] || "file") : "layers",
      checked: typeFilter === t,
      hint: t ? String(pool.filter(l => l.type === t).length) : String(pool.length),
      run: () => { typeFilter = t; mount(container); },
    }));
  }

  function filteredExplore() {
    // the `explore` flag is what keeps your private items (AI summaries,
    // decks and maps you created) out of the public Explore shelf
    return D.LIBRARY.filter(l =>
      l.explore &&
      (!subjectFilter || l.subject === subjectFilter) &&
      (!topicFilter || l.topic === topicFilter) &&
      (!typeFilter || l.type === typeFilter) &&
      (!query || (l.title + " " + l.topic + " " + l.author).toLowerCase().includes(query.toLowerCase())));
  }

  function refreshResults() {
    const wrap = container.querySelector("#lib-results");
    if (!wrap) { mount(container); return; }
    wrap.innerHTML = "";
    const items = filteredExplore();
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state" },
        el("div", { html: emberSVG(84, { glow: S.s.profile.ember.glow, mood: "calm" }) }),
        el("h3", {}, query ? `Nothing matches “${esc(query)}”` : "Nothing here yet"),
        el("p", {}, query ? "Try a different word, or clear the filters to see everything." : "Pull in your first note from Explore, or create one with the quick tools.")));
      return;
    }
    renderGrid(wrap, items, true);
  }

  /* ---------- shared card grid ---------- */
  function renderGrid(parent, items, explore = false) {
    if (!items.length) {
      parent.appendChild(el("div", { class: "empty-state" },
        el("div", { html: emberSVG(84, { glow: S.s.profile.ember.glow, mood: "calm" }) }),
        el("h3", {}, "Nothing here yet"),
        el("p", {}, "Save items from Explore, or use a quick-create tool — your future self reviews these.")));
      return;
    }
    const grid = el("div", { class: "lib-content-grid" });
    items.forEach(l => grid.appendChild(contentCard(l, explore)));
    parent.appendChild(grid);
  }

  function contentCard(l, explore) {
    const sub = D.SUBJECTS.find(s => s.id === l.subject);
    const isSaved = S.s.library.saved.includes(l.id);
    const tm = typeMeta(l);
    const card = el("button", { class: "content-card", onclick: () => { location.hash = `#/library/item/${l.id}`; }, "aria-label": `Open ${l.title}` },
      el("span", { class: "cc-type" },
        el("span", { class: "cc-icon", html: icon(tm.icon, 13) }),
        tm.label),
      el("span", { class: "cc-title" }, l.title),
      el("span", { class: "cc-meta" },
        el("span", {}, sub ? sub.name : l.topic),
        el("span", { class: "sep" }),
        el("span", { class: "chunkest", html: icon("clock", 10) + esc(l.est) })),
      el("span", { class: "cc-foot" },
        el("span", { class: "xs muted" }, l.author),
        explore && l.rating ? el("span", { class: "cc-rating" }, el("span", { html: icon("star", 11) }), String(l.rating),
          el("span", { class: "faint" }, `saved ${SP.ui.fmtNum(l.saves || 0)}×`)) : null,
        /* save rides on the card but only shows when the card is in play */
        el("span", { class: "cc-save", onclick: e => { e.stopPropagation(); toggleSave(l, card); },
          html: icon("bookmark", 15), role: "button", tabindex: "0",
          title: isSaved ? "Remove from My Library" : "Save to My Library",
          "aria-label": isSaved ? `Remove ${l.title} from My Library` : `Save ${l.title} to My Library`,
          "aria-pressed": String(isSaved),
          onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleSave(l, card); } } }),
        /* ⋯ options: move / rename / delete on everything in My Library */
        explore ? null : el("span", { class: "fm-kebab", role: "button", tabindex: "0",
          "aria-label": `Options for ${l.title}`, title: "Options", html: icon("more", 15),
          onclick: e => { e.stopPropagation(); itemMenu(l, e.currentTarget); },
          onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); itemMenu(l, e.currentTarget); } } })));
    if (isSaved) card.classList.add("is-saved");
    return card;
  }

  function toggleSave(l, card) {
    if (S.s.library.saved.includes(l.id)) {
      S.unsaveItem(l.id);
      SP.ui.toast("Removed from My Library");
    } else {
      S.saveItem(l.id);
      SP.ui.toast("Saved to My Library");
    }
    mount(container);
  }

  /* headings stand alone — the explanatory subtitle line is gone */
  function sectionHead(title, sub) {
    return el("div", { class: "section-head" },
      el("h2", {}, title));
  }

  /* ============================================================
     DETAIL VIEW
     ============================================================ */
  function renderDetail(page, id) {
    const l = allItems().find(x => x.id === id);
    page.innerHTML = "";
    if (!l) {
      page.appendChild(el("div", { class: "empty-state" },
        el("h3", {}, "This item no longer exists"),
        el("p", {}, "It may have been deleted. Head back to the Library and try again."),
        el("button", { class: "btn", onclick: () => { location.hash = "#/library"; } }, "Back to Library")));
      return;
    }
    page.appendChild(SP.ui.backPill(l.title, "library", "#/library"));
    const sub = D.SUBJECTS.find(s => s.id === l.subject);
    const isSaved = S.s.library.saved.includes(l.id);

    const tm = typeMeta(l);
    page.appendChild(el("div", { class: "detail-hero" },
      el("div", { class: "cc-type" }, el("span", { class: "cc-icon", html: icon(tm.icon, 13) }), tm.label),
      el("h1", { style: { maxWidth: "30ch" } }, l.title),
      el("div", { class: "cc-meta" },
        el("span", {}, sub ? sub.name : ""),
        sub ? el("span", { class: "sep" }) : null,
        el("span", {}, l.topic),
        el("span", { class: "sep" }),
        el("span", {}, l.author),
        el("span", { class: "sep" }),
        el("span", { class: "chunkest", html: icon("clock", 10) + esc(l.est) })),
      /* the point of a library item is to study it — that is the gold one */
      el("div", { class: "detail-actions" },
        ...(l.type !== "file" || l.body ? [el("button", { class: "btn btn--primary", onclick: () => studyNow(l), html: icon("play", 13) + "<span>Study now</span>" })] : []),
        ...(l.type !== "file" ? [el("button", { class: "btn", onclick: () => SP.board.addLibItemToBoard(l.id), html: icon("board", 14) + "<span>Add to Board</span>" })] : []),
        el("button", { class: `icon-btn save-toggle ${isSaved ? "on" : ""}`, title: isSaved ? "Saved — remove" : "Save to My Library",
          "aria-label": isSaved ? "Saved to My Library" : "Save to My Library", "aria-pressed": String(isSaved),
          html: icon("bookmark", 17), onclick: () => { toggleSave(l); mount(container); } }))));

    const detail = el("div", { class: "card", style: { borderRadius: "var(--r-md)" } });
    if (l.type === "file") {
      const bits = [];
      if (l.fileKind === "image" && l.dataUrl) bits.push(el("img", { class: "fm-fileview", src: l.dataUrl, alt: l.title }));
      if (l.fileKind === "audio" && l.dataUrl) bits.push(el("audio", { controls: true, src: l.dataUrl, style: { width: "100%", display: "block" } }));
      if (l.body) bits.push(el("div", { html: l.body }));
      if (l.dataUrl && l.fileKind !== "image" && l.fileKind !== "audio") {
        bits.push(el("div", { class: "fm-dl-box" },
          el("span", { class: "fm-dl-ic", html: icon("file", 22) }),
          el("span", { style: { flex: 1, minWidth: 0 } },
            el("span", { style: { fontWeight: "700", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, l.title),
            el("span", { class: "small muted" }, `${(FILE_KINDS[l.fileKind] || FILE_KINDS.other).label} · ${fmtSize(l.size || 0)}`)),
          el("a", { class: "btn btn--primary btn--sm", href: l.dataUrl, download: l.title }, "Download")));
      } else if (l.dataUrl) {
        bits.push(el("a", { class: "btn btn--sm", href: l.dataUrl, download: l.title, style: { marginTop: "4px", display: "inline-flex", alignSelf: "flex-start" } }, "Download"));
      }
      detail.appendChild(el("div", { class: "detail-body", style: { display: "flex", flexDirection: "column", gap: "12px" } }, ...bits));
    }
    else if (l.body) detail.innerHTML = `<div class="detail-body">${l.body}</div>`;
    else if (l.cards) {
      detail.appendChild(el("div", { class: "detail-body" },
        el("p", { class: "muted" }, `${l.cards.length} cards${l.reviewDue ? `, ${l.reviewDue} due today` : ""}. A preview of the deck:`),
        el("div", { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" } },
          ...l.cards.slice(0, 4).map(([t, d]) => el("div", { class: "card", style: { padding: "10px 14px" } },
            el("div", { style: { fontWeight: "700", fontSize: "13px" } }, t),
            el("div", { class: "small muted" }, d))))));
    } else if (l.questions) {
      detail.appendChild(el("div", { class: "detail-body" },
        el("p", { class: "muted" }, `${l.questions.length} questions with instant feedback. Sample question:`),
        el("div", { class: "card", style: { marginTop: "12px", padding: "14px" } },
          el("div", { class: "quiz-q" }, l.questions[0].q),
          ...l.questions[0].opts.map(o => el("div", { class: "quiz-option", style: { cursor: "default" } }, o)))));
    } else {
      detail.appendChild(el("div", { class: "detail-body" },
        el("p", { class: "muted" }, `This ${D.CONTENT_TYPE_LABEL[l.type] || "item"} runs about ${l.est}. Press "Study now" to open it in a focused session — the recap afterwards counts toward your streak and XP.`)));
    }
    page.appendChild(detail);
  }

  /* ============================================================
     STUDY NOW — focused session modals with end-of-session recap
     ============================================================ */
  function studyNow(l) {
    if (l.type === "flashcards" && l.cards) return studyDeck(l);
    if (l.type === "quiz" && l.questions) return studyQuiz(l);
    // anything else: open its detail as the reading session
    if (l.body) {
      if (location.hash !== `#/library/item/${l.id}`) location.hash = `#/library/item/${l.id}`;
      SP.ui.toast(`Reading session — ${l.est}. Add it to the Board to finish with a recap.`);
      return;
    }
    // mindmaps / videos / papers have no in-app reader — say so instead of
    // silently doing nothing when the hash doesn't even change
    if (location.hash !== `#/library/item/${l.id}`) location.hash = `#/library/item/${l.id}`;
    SP.ui.toast(`"${l.title.slice(0, 28)}" opens best on the Board — add it as a widget`);
  }

  function studyDeck(l) {
    let i = 0, got = 0, miss = 0, flipped = false;
    const body = el("div", {});
    const m = SP.ui.modal({ title: `${l.title} — review session`, body, wide: true, dismissable: false });
    const redraw = () => {
      body.innerHTML = "";
      if (i >= l.cards.length) {
        m.close();
        S.s.stats.cardsReviewed += got + miss;
        S.bumpQuest("q1", got + miss);
        if (l.reviewDue) l.reviewDue = 0;
        SP.board.sessionSummary({
          kind: "flashcards",
          title: `${l.title} — session complete`,
          stats: [{ val: got + miss, label: "cards reviewed" }, { val: Math.round(got / (got + miss) * 100) + "%", label: "accuracy" }, { val: got, label: "remembered" }],
          xp: 20 + got * 2, acc: Math.round(got / (got + miss) * 100), total: got + miss, got,
        });
        return;
      }
      const card = l.cards[i];
      const stage = el("div", { style: { height: "240px" } });
      const fc = el("div", { class: `flashcard ${flipped ? "flipped" : ""}`, style: { height: "100%" } },
        el("div", { class: "fc-face", style: { fontSize: "18px", fontWeight: "600" } }, card[0]),
        el("div", { class: "fc-face back", style: { fontSize: "15px" } }, card[1]));
      fc.addEventListener("click", () => { flipped = !flipped; fc.classList.toggle("flipped", flipped); });
      stage.appendChild(fc);
      body.appendChild(stage);
      body.appendChild(el("div", { class: "fc-count", style: { margin: "12px 0" } }, `${i + 1} / ${l.cards.length}`));
      /* same rule as the board widget: one decision per step */
      const flipNow = () => { flipped = !flipped; redraw(); };
      body.appendChild(el("div", { class: "fc-controls", style: { marginTop: "12px" } },
        flipped
          ? [ el("button", { class: "btn", onclick: () => { miss++; i++; flipped = false; redraw(); } }, "Missed"),
              el("button", { class: "btn btn--primary", onclick: () => { got++; i++; flipped = false; redraw(); } }, "Got it") ]
          : el("button", { class: "btn btn--primary", onclick: flipNow }, "Flip card")));
    };
    redraw();
  }

  function studyQuiz(l) {
    let i = 0, correct = 0, answered = false;
    const body = el("div", {});
    const m = SP.ui.modal({ title: `${l.title} — timed check`, body, dismissable: false });
    const redraw = () => {
      body.innerHTML = "";
      if (i >= l.questions.length) {
        m.close();
        S.bumpQuest("q2", 1);
        SP.board.sessionSummary({
          kind: "quiz",
          title: `${l.title} — results`,
          stats: [{ val: `${correct}/${l.questions.length}`, label: "correct" }, { val: Math.round(correct / l.questions.length * 100) + "%", label: "accuracy" }, { val: l.questions.length, label: "questions" }],
          xp: 15 + correct * 5, acc: Math.round(correct / l.questions.length * 100), total: l.questions.length, got: correct,
        });
        return;
      }
      const q = l.questions[i];
      body.appendChild(el("div", { class: "fc-count", style: { textAlign: "left", marginBottom: "8px" } }, `Question ${i + 1} of ${l.questions.length}`));
      body.appendChild(el("div", { class: "quiz-q", style: { fontSize: "16px" } }, q.q));
      q.opts.forEach((o, oi) => {
        const b = el("button", { class: "quiz-option", onclick: () => {
          if (answered) return;
          answered = true;
          const ok = oi === q.a;
          if (ok) correct++;
          b.classList.add(ok ? "correct" : "wrong");
          if (!ok) body.querySelectorAll(".quiz-option")[q.a].classList.add("correct");
          setTimeout(() => { i++; answered = false; redraw(); }, 900);
        } }, o);
        body.appendChild(b);
      });
    };
    redraw();
  }

  /* ============================================================
     QUICK-CREATE TOOLS
     ============================================================ */
  function openNoteEditor() {
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } });
    const title = el("input", { class: "input", placeholder: "Note title, e.g. Linkage vs Independent Assortment", "aria-label": "Note title" });
    const text = el("textarea", { class: "textarea", style: { minHeight: "160px" }, placeholder: "Write from your own head — this is the version you'll actually reread.", "aria-label": "Note text" });
    const subjectSel = el("select", { class: "input", "aria-label": "Subject" });
    D.SUBJECTS.forEach(s => subjectSel.appendChild(el("option", { value: s.id }, s.name)));
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none" } }, "Couldn't save — a title and at least one line are needed.");
    body.append(el("label", { class: "field-label" }, "Subject"), subjectSel, el("label", { class: "field-label" }, "Title"), title, el("label", { class: "field-label" }, "Your note"), text, err);
    const m = SP.ui.modal({
      title: "New note", body,
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: "btn btn--primary", onclick: () => {
          if (!title.value.trim() || !text.value.trim()) { err.style.display = ""; return; }
          const item = {
            id: uid(), subject: subjectSel.value, topic: "My Notes", type: "notes",
            title: title.value.trim(), est: estRead(text.value), author: "You", mine: true,
            body: text.value.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join(""),
          };
          S.addCreated(item);
          fmFolders(); S.s.library.places[item.id] = currentFolder;
          S.saveItem(item.id);
          m.close();
          SP.ui.toast("Note saved to My Library");
          tab = "mine";
          mount(container);
        } }, "Save note")],
    });
    setTimeout(() => title.focus(), 50);
  }

  function estRead(text) {
    const mins = Math.max(1, Math.round(text.split(/\s+/).length / 200));
    return `${mins} min read`;
  }

  function openMindmapBuilder() {
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
    const center = el("input", { class: "input", placeholder: "Center topic, e.g. French Revolution causes", "aria-label": "Center topic" });
    const branches = [0, 1, 2, 3].map(i => el("input", { class: "input", placeholder: `Branch ${i + 1}${i === 0 ? ", e.g. Fiscal crisis" : ""}`, "aria-label": `Branch ${i + 1}` }));
    body.append(el("label", { class: "field-label" }, "Center topic"), center, el("label", { class: "field-label" }, "Branches"), ...branches);
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none" } }, "A map needs a center and at least two branches.");
    body.appendChild(err);
    const m = SP.ui.modal({
      title: "Mindmap builder", body,
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: "btn btn--primary", onclick: () => {
          const bs = branches.map(b => b.value.trim()).filter(Boolean);
          if (!center.value.trim() || bs.length < 2) { err.style.display = ""; return; }
          const item = { id: uid(), subject: "hist", topic: "My Maps", type: "mindmap", title: center.value.trim(), est: "1-page map", author: "You", mine: true };
          S.addCreated(item);
          fmFolders(); S.s.library.places[item.id] = currentFolder;
          S.saveItem(item.id);
          m.close();
          SP.ui.toast("Mindmap saved to My Library");
          tab = "mine";
          mount(container);
        } }, "Create mindmap")],
    });
  }

  function openQuizGenerator() {
    const notes = allItems().filter(l => l.type === "notes" || l.type === "summary");
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } });
    body.appendChild(el("p", { class: "small muted" }, "Pick one of your notes. Emberdesk pulls key claims out and turns them into questions."));
    const sel = el("select", { class: "input", "aria-label": "Source note" });
    notes.forEach(n => sel.appendChild(el("option", { value: n.id }, n.title)));
    body.append(el("label", { class: "field-label" }, "Source note"), sel);
    const m = SP.ui.modal({
      title: "AI quiz from your notes", body,
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: "btn btn--primary", onclick: () => generate(sel.value, m) }, "Generate quiz")],
    });

    function generate(noteId, modal) {
      const note = allItems().find(l => l.id === noteId);
      // loading state
      modal.body.innerHTML = "";
      modal.el.querySelector(".modal-foot").style.display = "none";
      modal.body.appendChild(el("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" } },
        el("div", { style: { display: "flex", gap: "10px", alignItems: "center" } },
          el("div", { html: emberSVG(48, { glow: S.s.profile.ember.glow, mood: "calm" }) }),
          el("span", { class: "small muted" }, "Reading your note and drafting questions…")),
        SP.ui.skeletonCard(40), SP.ui.skeletonCard(40), SP.ui.skeletonCard(40)));
      setTimeout(() => {
        const questions = generatedQuestions(note);
        const item = {
          id: uid(), subject: note.subject, topic: note.topic, type: "quiz",
          title: `AI quiz — ${note.title}`.slice(0, 60), est: `${questions.length} questions, ${questions.length} min`,
          author: "Generated from your notes", rating: null, saves: 0, mine: true, questions,
        };
        S.addCreated(item);
        fmFolders(); S.s.library.places[item.id] = currentFolder;
        S.saveItem(item.id);
        modal.close();
        SP.ui.toast("Quiz generated — saved to My Library");
        tab = "mine";
        mount(container);
      }, 1400);
    }
  }

  function generatedQuestions(note) {
    // demo generator: keyword-based questions from the note's first lines
    const plain = (note.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const sentences = plain.split(/(?<=[.!?]) /).filter(s => s.length > 30);
    const qs = [];
    const fallback = [
      { q: `In "${note.title}", which idea does the author treat as the main turning point?`, opts: ["The first definition given", "The worked example", "The exception called out at the end", "The historical date"], a: 2 },
      { q: `What is the fastest way to check your understanding of "${note.title}"?`, opts: ["Reread it twice", "Explain it aloud without the note", "Highlight key lines", "Copy the headings"], a: 1 },
      { q: `Which detail from "${note.title}" is most likely to appear on an exam?`, opts: ["The exception to the rule", "The author's name", "The page layout", "The reading time"], a: 0 },
    ];
    sentences.slice(0, 3).forEach((s, idx) => {
      const words = s.split(" ").filter(w => w.length > 7);
      if (!words.length) return;
      const key = words[Math.floor(words.length / 2)].replace(/[^A-Za-z0-9]/g, "");
      if (key.length < 5) return;
      qs.push({
        q: s.length > 120 ? s.slice(0, 117) + "…?" : s.replace(/\.$/, "") + " — true or which part is wrong?",
        opts: [`“${key}” is central to this point`, "This sentence is about formatting", "This is a footnote", "Not covered in the note"],
        a: 0,
      });
    });
    while (qs.length < 3) qs.push(fallback[qs.length % fallback.length]);
    return qs.slice(0, 4);
  }

  function openFlashcardGenerator() {
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
    const title = el("input", { class: "input", placeholder: "Deck name, e.g. Genetics Vocabulary II", "aria-label": "Deck name" });
    body.append(el("label", { class: "field-label" }, "Deck name"), title);
    const pairs = [];
    const pairRow = () => {
      const t = el("input", { class: "input", placeholder: "Term", "aria-label": "Term" });
      const d = el("input", { class: "input", placeholder: "Definition", "aria-label": "Definition" });
      const row = { t, d };
      pairs.push(row);
      const line = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "8px" } }, t, d);
      body.appendChild(line);
      return line;
    };
    body.appendChild(el("label", { class: "field-label" }, "Cards"));
    pairRow(); pairRow();
    const addMore = el("button", { class: "btn btn--sm btn--ghost", onclick: () => pairRow(), html: icon("plus", 13) + "<span>Add card</span>" });
    body.appendChild(addMore);
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none" } }, "Add at least two complete cards (term and definition).");
    body.appendChild(err);
    const m = SP.ui.modal({
      title: "Flashcard generator", body, wide: true,
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: "btn btn--primary", onclick: () => {
          const cards = pairs.map(p => [p.t.value.trim(), p.d.value.trim()]).filter(c => c[0] && c[1]);
          if (!title.value.trim() || cards.length < 2) { err.style.display = ""; return; }
          const item = {
            id: uid(), subject: "bio", topic: "My Decks", type: "flashcards",
            title: title.value.trim(), est: `${cards.length}-card deck`, author: "You", mine: true, cards, reviewDue: cards.length,
          };
          S.addCreated(item);
          fmFolders(); S.s.library.places[item.id] = currentFolder;
          S.saveItem(item.id);
          m.close();
          SP.ui.toast(`Deck published — ${cards.length} cards ready to review`);
          tab = "mine";
          mount(container);
        } }, "Create deck")],
    });
  }

  return { mount };
})();
