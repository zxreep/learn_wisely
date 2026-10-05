/* ============================================================
   EMBERDESK — STUDY BOARD (Canvas)
   Infinite pannable/zoomable canvas · widget drawer in 4
   categories (Hick's Law) · physical drag/drop · Focus Mode ·
   end-of-session summaries (peak–end rule) · variable rewards.
   ============================================================ */
window.SP = window.SP || {};

SP.board = (() => {
  const { el, esc, icon, uid, flameSVG, emberSVG, ringSVG } = SP.ui;
  const D = SP.data;
  const S = SP.state;

  let viewport, world, drawerEl, focusBar;
  let view = { x: 40, y: 20, s: 1 };
  let widgetEls = new Map();
  let zTop = 10;
  let focusMode = { active: false, widgetId: null };
  let preFocusView = null;
  let stacked = false;
  let mounted = null;

  /* ============================================================
     WIDGET REGISTRY
     ============================================================ */
  const FORMULA_SETS = {
    calc: { name: "Integration Formulas", items: [
      ["Power rule", "∫ xⁿ dx = xⁿ⁺¹/(n+1) + C,  n ≠ −1"],
      ["Exponential", "∫ eˣ dx = eˣ + C"],
      ["Sine / cosine", "∫ sin x dx = −cos x + C,  ∫ cos x dx = sin x + C"],
      ["Logarithm", "∫ dx / x = ln|x| + C"],
      ["Secant squared", "∫ sec²x dx = tan x + C"],
      ["By parts (LIATE)", "∫ u dv = uv − ∫ v du"],
      ["Arctangent", "∫ dx / (1 + x²) = arctan x + C"],
    ]},
    ochem: { name: "Reagent Quick Cards", items: [
      ["PCC", "1° alcohol → aldehyde (stops, anhydrous)"],
      ["NaBH₄", "aldehyde / ketone → alcohol (mild)"],
      ["LiAlH₄", "acid / ester → alcohol (strong)"],
      ["mCPBA", "alkene → epoxide"],
      ["H₂ / Pd-C", "alkene → alkane (syn)"],
      ["LDA, −78 °C", "kinetic enolate"],
      ["BH₃ then H₂O₂/OH⁻", "anti-Markovnikov alcohol"],
    ]},
    phys: { name: "Rotational Motion", items: [
      ["Torque", "τ = r F sinθ = Iα"],
      ["Moment of inertia", "I = Σ mᵢrᵢ²"],
      ["Angular momentum", "L = Iω (conserved if τ = 0)"],
      ["Rolling without slipping", "v = ωR"],
      ["Rolling KE", "K = ½mv² + ½Iω²"],
    ]},
  };

  const MINDMAPS = {
    "Meiosis vs Mitosis": ["Divisions: 1 vs 2", "Daughters: 2 vs 4", "Ploidy: 2n → n", "Crossing over: prophase I only", "Purpose: growth vs gametes"],
    "Which Convergence Test?": ["p-series: 1/nᵖ", "Ratio test: factorials", "Comparison: similar series", "Alternating: (−1)ⁿ", "Integral: decreasing f(x)"],
    "Organic Reaction Map": ["Substitution SN1/SN2", "Elimination E1/E2", "Addition to C=C", "Oxidation / reduction", "Aromatic EAS"],
  };

  const W = {
    note: {
      cat: "plan", name: "Sticky note", desc: "A scrap of paper for one thought", icon: "note",
      def: { w: 220, h: 210 }, min: { w: 170, h: 130 },
      defaults: () => ({ text: "", color: "yellow" }),
      render(w, body) { renderNote(w, body); },
    },
    todo: {
      cat: "plan", name: "To-do checklist", desc: "Small tasks, visible progress", icon: "checkSquare",
      def: { w: 290, h: 300 }, min: { w: 230, h: 180 },
      defaults: () => ({ title: "To-do", items: [{ text: "First task", done: false }] }),
      render(w, body) { renderTodo(w, body); },
    },
    schedule: {
      cat: "plan", name: "Today's schedule", desc: "Time blocks for the day", icon: "calendar",
      def: { w: 280, h: 250 }, min: { w: 230, h: 160 },
      defaults: () => ({ blocks: [
        { time: "16:30", text: "Flashcard review — Genetics (15 min)" },
        { time: "18:00", text: "Organic mechanisms practice (30 min)" },
        { time: "21:00", text: "Focus block + Late Night NEET room (45 min)" },
      ] }),
      render(w, body) { renderSchedule(w, body); },
    },
    countdown: {
      cat: "plan", name: "Exam countdown", desc: "Days left, in big honest numbers", icon: "hourglass",
      def: { w: 240, h: 210 }, min: { w: 200, h: 170 },
      defaults: () => ({ exam: "JEE Main attempt 1", date: D.futureDate(120) }),
      render(w, body) { renderCountdown(w, body); },
    },
    flashcards: {
      cat: "study", name: "Flashcard deck", desc: "Flip, mark, finish — with a recap", icon: "cards",
      def: { w: 300, h: 340 }, min: { w: 250, h: 260 },
      pick: "flashcards",
      defaults: () => ({ deckTitle: "Genetics Vocabulary", libId: "l2" }),
      render(w, body) { renderFlashcards(w, body); },
    },
    mindmap: {
      cat: "study", name: "Mindmap", desc: "One topic, one glance", icon: "network",
      def: { w: 360, h: 290 }, min: { w: 280, h: 220 },
      pick: "mindmap",
      defaults: () => ({ title: "Meiosis vs Mitosis" }),
      render(w, body) { renderMindmap(w, body); },
    },
    quiz: {
      cat: "study", name: "Mini quiz", desc: "A few questions, instant feedback", icon: "help",
      def: { w: 300, h: 330 }, min: { w: 250, h: 260 },
      pick: "quiz",
      defaults: () => ({ libId: "l4" }),
      render(w, body) { renderQuiz(w, body); },
    },
    notesview: {
      cat: "study", name: "Notes viewer", desc: "Read a library note right here", icon: "file",
      def: { w: 330, h: 320 }, min: { w: 260, h: 220 },
      pick: "notes",
      defaults: () => ({ libId: "l1" }),
      render(w, body) { renderNotesView(w, body); },
    },
    formulas: {
      cat: "study", name: "Formula sheet", desc: "The formulas you keep forgetting", icon: "sigma",
      def: { w: 300, h: 320 }, min: { w: 240, h: 220 },
      pick: "formula",
      defaults: () => ({ set: "calc" }),
      render(w, body) { renderFormulas(w, body); },
    },
    pomodoro: {
      cat: "focus", name: "Pomodoro timer", desc: "25 on, 5 off, with ambient sound", icon: "timer",
      def: { w: 250, h: 300 }, min: { w: 220, h: 240 },
      defaults: () => ({}),
      render(w, body) { renderPomodoro(w, body); },
      /* settings that used to sit under the dial as three permanent buttons */
      menu(w, redraw) {
        const st = w._pomo || { demo: false };
        return [
          { label: st.demo ? "Normal speed (25 min)" : "Demo speed (1 min)", icon: "timer",
            run: () => {
              st.demo = !st.demo;
              if (!st.running) st.remain = st.phase === "focus" ? (st.demo ? 60 : 1500) : 300;
              SP.ui.toast(st.demo ? "Demo speed: focus block is 1 minute" : "Normal speed: 25-minute focus blocks");
              redraw();
            } },
          { label: SP.sound.isOn() ? "Ambient rain: on" : "Ambient rain: off", icon: "sound", checked: SP.sound.isOn(),
            run: () => { const on = SP.sound.toggle("rain"); SP.ui.toast(on ? "Rain sounds on" : "Rain sounds off"); redraw(); } },
        ];
      },
    },
    habit: {
      cat: "focus", name: "Habit tracker", desc: "Two weeks of small honest dots", icon: "repeat",
      def: { w: 300, h: 250 }, min: { w: 250, h: 190 },
      defaults: () => ({ habit: "20 min/day commitment", done: [true, true, false, true, true, true, false, true, true, true, false, true, true, false] }),
      render(w, body) { renderHabit(w, body); },
    },
    streakw: {
      cat: "focus", name: "Streak tracker", desc: "Protect the flame", icon: "flame",
      def: { w: 250, h: 230 }, min: { w: 210, h: 190 },
      defaults: () => ({}),
      render(w, body) { renderStreakWidget(w, body); },
    },
    room: {
      cat: "social", name: "Study room shortcut", desc: "Jump straight into a live room", icon: "sofa",
      def: { w: 280, h: 210 }, min: { w: 230, h: 170 },
      defaults: () => ({ roomId: "r1" }),
      render(w, body) { renderRoomWidget(w, body); },
    },
    chatmini: {
      cat: "social", name: "Group chat", desc: "Last messages from your group", icon: "msg",
      def: { w: 280, h: 230 }, min: { w: 230, h: 170 },
      defaults: () => ({ groupId: "g1" }),
      render(w, body) { renderChatMini(w, body); },
    },
  };

  const DRAWER_CATS = [
    { id: "plan", label: "Plan" },
    { id: "study", label: "Study" },
    { id: "focus", label: "Focus" },
    { id: "social", label: "Social" },
  ];

  /* ============================================================
     MOUNT
     ============================================================ */
  function mount(container) {
    mounted = container;
    drawerEl = null;
    drawerOpen = false;
    container.innerHTML = "";
    container.classList.add("screen--flush");
    const wrap = el("div", { class: "board-wrap" });

    wrap.appendChild(buildBar());

    viewport = el("div", { class: "canvas-viewport", id: "canvas-viewport" });
    world = el("div", { class: "canvas-world" });
    viewport.appendChild(world);
    wrap.appendChild(viewport);

    container.appendChild(wrap);
    container.appendChild(buildZoom());

    setupCanvasGestures();
    renderBoard();
    if (stacked) applyStacked();
  }

  function unmount() {
    SP.ui.closeMenu();
    if (mounted) {
      mounted.classList.remove("screen--flush");
      mounted.classList.remove("is-stacked");
    }
    stopAllTimers();
    widgetEls.clear();
    mounted = null;
  }

  /* One bar, three zones: where am I · the single primary action · options.
     Board switching, stacking, focus and zoom used to be five always-on
     controls doing one job at a time; now they live behind two menus. */
  function buildBar() {
    const board = S.activeBoard();
    const bar = el("div", { class: "board-bar" });

    const sw = el("button", { class: "board-switch", "aria-haspopup": "menu", "aria-expanded": "false",
      "aria-label": `Board: ${board.name}. Switch or manage boards.`,
      onclick: () => SP.ui.menu(sw, boardMenuItems(), { align: "left" }) },
      el("span", { class: "board-switch-name" }, board.name),
      el("span", { class: "board-switch-count num" }, String(board.widgets.length)),
      el("span", { html: icon("chevronDown", 14) }));
    bar.appendChild(sw);

    bar.appendChild(el("div", { class: "spacer" }));

    /* pill two — the single primary action + view/canvas options.
       Search and streak left the bar; search lives in the view menu. */
    const add = el("button", { class: "bar-ic bar-ic--gold", id: "add-widget",
      "aria-label": "Add a widget", title: "Add a widget", html: icon("plus", 16), onclick: toggleDrawer });
    const more = el("button", { class: "bar-ic", "aria-label": "View and canvas options",
      title: "View and canvas options", html: icon("more", 18),
      onclick: () => SP.ui.menu(more, viewMenuItems(), { align: "right" }) });
    bar.appendChild(el("div", { class: "bar-pill--actions" }, add, el("span", { class: "pill-div" }), more));
    return bar;
  }

  function boardMenuItems() {
    const board = S.activeBoard();
    const items = S.s.boards.map(b => ({
      label: b.name, icon: "board", checked: b.id === S.s.activeBoardId,
      run: () => { S.s.activeBoardId = b.id; S.persistBoard(); rerender(); },
    }));
    items.push({ sep: true });
    items.push({ label: "New board…", icon: "plus", run: openNewBoard });
    if (S.s.boards.length > 1) items.push({ label: `Remove "${board.name}"`, icon: "trash", danger: true, run: () => closeBoard(board) });
    return items;
  }

  function viewMenuItems() {
    return [
      { label: "Search", icon: "search", run: () => SP.app.openPalette() },
      { sep: true },
      { label: "Stacked list view", icon: "list", checked: stacked, hint: "small screens", run: toggleStack },
      { label: focusMode.active ? "End Focus Mode" : "Focus Mode", icon: "focus", checked: focusMode.active, run: startFocusFlow },
      { sep: true },
      { label: "Reset zoom", icon: "zoomOut", run: () => { view = { x: 40, y: 20, s: 1 }; clampView(); applyTransform(); } },
      { label: "Fit widgets on screen", icon: "compass", run: fitWidgets },
    ];
  }

  function fitWidgets() {
    const board = S.activeBoard();
    if (!board.widgets.length) { SP.ui.toast("Nothing on this board to fit yet"); return; }
    const minX = Math.min(...board.widgets.map(w => w.x));
    const minY = Math.min(...board.widgets.map(w => w.y));
    const maxX = Math.max(...board.widgets.map(w => w.x + w.w));
    const maxY = Math.max(...board.widgets.map(w => w.y + w.h));
    const pad = 60, vw = viewport.clientWidth, vh = viewport.clientHeight;
    const s2 = Math.min(1.4, Math.max(0.4, Math.min((vw - pad * 2) / (maxX - minX), (vh - pad * 2) / (maxY - minY))));
    view.s = s2;
    view.x = pad - minX * s2 + (vw - pad * 2 - (maxX - minX) * s2) / 2;
    view.y = pad - minY * s2 + (vh - pad * 2 - (maxY - minY) * s2) / 2;
    clampView(); applyTransform();
    SP.ui.toast(`Zoomed to ${Math.round(s2 * 100)}% — all ${board.widgets.length} widgets on screen`);
  }

  function buildZoom() {
    // hover-revealed: the canvas stays empty until you ask for it
    const z = el("div", { class: "zoom-cluster" });
    z.appendChild(el("button", { "aria-label": "Zoom out", html: icon("zoomOut", 15), onclick: () => zoomBy(1 / 1.15) }));
    z.appendChild(el("button", { "aria-label": "Reset zoom to 100%", id: "zoom-label", onclick: () => { view.s = 1; clampView(); applyTransform(); } }, "100%"));
    z.appendChild(el("button", { "aria-label": "Zoom in", html: icon("zoomIn", 15), onclick: () => zoomBy(1.15) }));
    if (mounted) mounted.appendChild(z);
    return z;
  }

  /* ============================================================
     BOARD RENDER
     ============================================================ */
  function rerender() {
    if (!mounted) return;
    mount(mounted);
  }

  function renderBoard() {
    world.innerHTML = "";
    widgetEls.clear();
    const board = S.activeBoard();
    const existingStack = mounted.querySelector(".board-stack");
    if (existingStack) existingStack.remove();

    if (!board.widgets.length) {
      world.appendChild(buildEmptyState());
    } else {
      board.widgets.forEach(w => world.appendChild(buildWidget(w)));
    }
    applyTransform();
    if (stacked) applyStacked();
  }

  function buildEmptyState() {
    // an illustrated invitation — Ember pointing at the widget drawer
    const card = el("div", { class: "empty-card" },
      el("div", { html: emberSVG(110, { glow: S.s.profile.ember.glow, accessory: S.s.profile.ember.accessory, mood: "cheer" }) }),
      el("h3", {}, "Nothing here yet"),
      el("p", { class: "small muted" }, "Pull in your first widget — a checklist, a deck, a timer. This board is yours to arrange."),
      el("button", { class: "btn btn--primary", onclick: toggleDrawer }, "Add first widget")
    );
    const wrap = el("div", { class: "board-empty" }, card);
    return wrap;
  }

  function applyTransform() {
    if (!world) return;
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    const label = mounted && mounted.querySelector("#zoom-label");
    if (label) label.textContent = Math.round(view.s * 100) + "%";
  }

  function clampView() {
    view.s = Math.min(1.6, Math.max(0.5, view.s));
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const ww = 4000 * view.s, wh = 3000 * view.s;
    view.x = Math.min(200, Math.max(vw - ww + 200, view.x));
    view.y = Math.min(200, Math.max(vh - wh + 200, view.y));
  }

  function zoomBy(f, cx, cy) {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    cx = cx ?? vw / 2; cy = cy ?? vh / 2;
    const oldS = view.s;
    view.s = Math.min(1.6, Math.max(0.5, view.s * f));
    const wx = (cx - view.x) / oldS, wy = (cy - view.y) / oldS;
    view.x = cx - wx * view.s;
    view.y = cy - wy * view.s;
    clampView();
    applyTransform();
  }

  /* ---------- canvas gestures: pan, wheel zoom, pinch ---------- */
  function setupCanvasGestures() {
    const pointers = new Map();
    let pinchStart = null;

    viewport.addEventListener("pointerdown", e => {
      if (e.target.closest(".widget") || e.target.closest(".board-empty") || e.target.closest(".zoom-cluster")) return;
      // UI layers that live over the canvas must never pan it or fling the selection
      if (e.target.closest(".drawer") || e.target.closest(".focus-bar")) return;
      // tapping the bare canvas puts the widget chrome away again
      world.querySelectorAll(".widget.is-selected").forEach(n => n.classList.remove("is-selected"));
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: view.s,
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: { ...view } };
      } else if (pointers.size === 1) {
        viewport.classList.add("panning");
        if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
        const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        const move = ev => {
          if (pointers.size === 1) {
            view.x = start.vx + (ev.clientX - start.x);
            view.y = start.vy + (ev.clientY - start.y);
            clampView(); applyTransform();
          }
        };
        const up = ev => {
          pointers.delete(ev.pointerId);
          viewport.classList.remove("panning");
          viewport.removeEventListener("pointermove", move);
          viewport.removeEventListener("pointerup", up);
          viewport.removeEventListener("pointercancel", up);
        };
        viewport.addEventListener("pointermove", move);
        viewport.addEventListener("pointerup", up);
        viewport.addEventListener("pointercancel", up);
      }
    });

    viewport.addEventListener("pointermove", e => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const rect = viewport.getBoundingClientRect();
        zoomBy((dist / pinchStart.dist) * (pinchStart.s / view.s),
          pinchStart.mid.x - rect.left, pinchStart.mid.y - rect.top);
      }
    });
    const endPointer = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchStart = null; };
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);

    viewport.addEventListener("wheel", e => {
      if (e.target.closest(".widget-body") || e.target.closest(".board-empty")) return; // let widget content scroll
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });
  }

  /* ============================================================
     WIDGET BUILD + DRAG + RESIZE
     ============================================================ */
  function buildWidget(w) {
    const def = W[w.type];
    const node = el("div", {
      class: `widget widget--${w.type}`,
      "data-wid": w.id,
      tabindex: "0",
      role: "group",
      "aria-label": `${def.name} widget: ${widgetTitle(w)}`,
      style: { left: w.x + "px", top: w.y + "px", width: w.w + "px", height: w.h + "px", zIndex: zTop++, transform: `rotate(${w.rot || 0}deg)` },
    });

    // sticky notes become their paper color
    if (w.type === "note") node.style.background = `var(--stick-${w.config.color || "yellow"})`;

    /* Chrome appears only when the widget is pointed at, focused, or
       selected (tap, for touch). 14 widgets x 2 permanent buttons used to
       mean ~28 buttons on screen at all times. Now it is zero at rest. */
    const actions = el("div", { class: "widget-actions" });
    actions.appendChild(el("button", { class: "icon-btn", title: "Focus on this widget", "aria-label": "Focus on this widget",
      html: icon("focus", 14), onclick: e => { e.stopPropagation(); startFocus(w.id); } }));
    actions.appendChild(SP.ui.menuButton(() => widgetMenuItems(w), { label: `${def.name} options` }));

    const head = el("div", { class: "widget-head" },
      el("span", { class: "widget-icon", html: icon(def.icon, 15) }),
      el("span", { class: "widget-title" }, widgetTitle(w)),
      actions,
    );
    const body = el("div", { class: "widget-body" });
    const grip = el("div", { class: "widget-resize", "aria-hidden": "true" });

    node.appendChild(head);
    node.appendChild(body);
    node.appendChild(grip);
    def.render(w, body);

    attachDrag(node, head, w);
    attachResize(node, grip, w);
    attachKeyboardMove(node, w);
    node.addEventListener("pointerdown", () => {
      node.style.zIndex = zTop++;
      if (!node.classList.contains("is-selected")) {
        document.querySelectorAll(".widget.is-selected").forEach(n => n.classList.remove("is-selected"));
        node.classList.add("is-selected");
      }
    }, true);

    widgetEls.set(w.id, { node, body, w });
    return node;
  }

  /* Per-widget options. Type-specific rows come first, then the rare and
     destructive ones — all behind the single ⋯ on the widget head. */
  function widgetMenuItems(w) {
    const def = W[w.type];
    const items = [];
    if (def.menu) items.push(...def.menu(w, () => rerenderWidget(w.id)));
    if (w.type === "note") items.push({ label: "Change note tone", icon: "square", run: () => cycleNoteTone(w) });
    if (items.length) items.push({ sep: true });
    items.push({ label: "Focus on this widget", icon: "focus", run: () => startFocus(w.id) });
    items.push({ label: "Duplicate", icon: "copy", run: () => duplicateWidget(w) });
    items.push({ label: "Remove widget", icon: "trash", danger: true, run: () => removeWidget(w.id) });
    return items;
  }

  function cycleNoteTone(w) {
    const tones = ["yellow", "green", "blue", "pink"];
    const next = tones[(tones.indexOf(w.config.color || "yellow") + 1) % tones.length];
    w.config.color = next;
    S.persistBoard();
    const entry = widgetEls.get(w.id);
    if (entry) entry.node.style.background = `var(--stick-${next})`;
    SP.ui.toast("Note tone changed");
  }

  function duplicateWidget(w) {
    const copy = JSON.parse(JSON.stringify({ id: uid(), type: w.type, x: w.x + 24, y: w.y + 24, w: w.w, h: w.h, rot: w.rot || 0, config: w.config }));
    S.activeBoard().widgets.push(copy);
    S.persistBoard();
    if (world && !stacked) world.appendChild(buildWidget(copy));
    checkBoardBuilderBadge();
    SP.ui.toast(`${W[w.type].name} duplicated`);
  }

  function widgetTitle(w) {

    const c = w.config || {};
    switch (w.type) {
      case "note": return "Sticky note";
      case "todo": return c.title || "To-do";
      case "schedule": return "Today";
      case "countdown": return "Countdown";
      case "flashcards": return c.deckTitle || "Flashcards";
      case "mindmap": return c.title || "Mindmap";
      case "quiz": { const item = D.LIBRARY.find(l => l.id === c.libId); return item ? item.title.slice(0, 28) : "Mini quiz"; }
      case "notesview": { const item = D.LIBRARY.find(l => l.id === c.libId); return item ? item.title.slice(0, 28) : "Notes"; }
      case "formulas": return (FORMULA_SETS[c.set] || FORMULA_SETS.calc).name;
      case "pomodoro": return "Pomodoro";
      case "habit": return c.habit || "Habit";
      case "streakw": return "Streak";
      case "room": { const r = D.ROOMS.find(r => r.id === c.roomId); return r ? r.name : "Study room"; }
      case "chatmini": { const g = D.GROUPS.find(g => g.id === c.groupId); return g ? g.name : "Group chat"; }
      default: return "Widget";
    }
  }

  function rerenderWidget(wid) {
    const entry = widgetEls.get(wid);
    if (!entry) return;
    entry.body.innerHTML = "";
    W[entry.w.type].render(entry.w, entry.body);
    const t = entry.node.querySelector(".widget-title");
    if (t) t.textContent = widgetTitle(entry.w);
  }

  function attachDrag(node, handle, w) {
    handle.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      if (stacked) return;
      e.stopPropagation();
      e.preventDefault();
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
      const startX = e.clientX, startY = e.clientY;
      const ox = w.x, oy = w.y;
      let moved = false;
      node.style.zIndex = zTop++;

      const move = ev => {
        const dx = (ev.clientX - startX) / view.s;
        const dy = (ev.clientY - startY) / view.s;
        if (!moved && Math.hypot(dx, dy) < 3) return;
        if (!moved) { moved = true; node.classList.add("dragging"); node.style.transform = `rotate(${(w.rot || 0) * 0.4}deg) scale(1.03)`; }
        w.x = Math.max(-40, Math.min(4000 - 80, ox + dx));
        w.y = Math.max(-40, Math.min(3000 - 60, oy + dy));
        node.style.left = w.x + "px";
        node.style.top = w.y + "px";
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        if (moved) {
          // satisfying snap to an 8px grid
          w.x = Math.round(w.x / 8) * 8;
          w.y = Math.round(w.y / 8) * 8;
          node.classList.remove("dragging");
          node.classList.add("dropping");
          node.style.left = w.x + "px";
          node.style.top = w.y + "px";
          node.style.transform = `rotate(${w.rot || 0}deg)`;
          setTimeout(() => node.classList.remove("dropping"), 300);
          S.persistBoard();
          SP.board.checkBoardBuilderBadge && SP.board.checkBoardBuilderBadge();
        }
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }

  function attachResize(node, grip, w) {
    grip.addEventListener("pointerdown", e => {
      if (stacked) return;
      e.stopPropagation();
      e.preventDefault();
      if (grip.setPointerCapture) grip.setPointerCapture(e.pointerId);
      const startX = e.clientX, startY = e.clientY;
      const ow = w.w, oh = w.h;
      const min = W[w.type].min;
      const move = ev => {
        w.w = Math.max(min.w, ow + (ev.clientX - startX) / view.s);
        w.h = Math.max(min.h, oh + (ev.clientY - startY) / view.s);
        node.style.width = w.w + "px";
        node.style.height = w.h + "px";
      };
      const up = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
        w.w = Math.round(w.w / 8) * 8; w.h = Math.round(w.h / 8) * 8;
        node.style.width = w.w + "px"; node.style.height = w.h + "px";
        S.persistBoard();
        if (w.type === "flashcards" || w.type === "quiz") rerenderWidget(w.id);
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
    });
  }

  function attachKeyboardMove(node, w) {
    node.addEventListener("keydown", e => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if (e.target !== node) return; // typing inside widget content
      e.preventDefault();
      const stepSize = e.shiftKey ? 32 : 8;
      if (e.key === "ArrowUp") w.y -= stepSize;
      if (e.key === "ArrowDown") w.y += stepSize;
      if (e.key === "ArrowLeft") w.x -= stepSize;
      if (e.key === "ArrowRight") w.x += stepSize;
      node.style.left = w.x + "px";
      node.style.top = w.y + "px";
      S.persistBoard();
    });
  }

  function addWidget(type, x, y, config) {
    const board = S.activeBoard();
    const def = W[type];
    const cfg = Object.assign(def.defaults(), config || {});
    const rot = (Math.random() * 3 - 1.5);
    const w = {
      id: uid(), type,
      x: x ?? Math.round(((-view.x + viewport.clientWidth / 2) / view.s - def.def.w / 2) / 8) * 8,
      y: y ?? Math.round(((-view.y + viewport.clientHeight / 2) / view.s - def.def.h / 2) / 8) * 8,
      w: def.def.w, h: def.def.h, rot: +rot.toFixed(1), config: cfg,
    };
    board.widgets.push(w);
    S.s.stats.widgetsPlaced = (S.s.stats.widgetsPlaced || 0) + 1;
    S.persistBoard();
    if (stacked) { rerender(); }
    else {
      const empty = world.querySelector(".board-empty");
      if (empty) empty.remove();
      const node = buildWidget(w);
      node.classList.add("dropping");
      node.style.opacity = "0";
      world.appendChild(node);
      requestAnimationFrame(() => { node.style.opacity = "1"; });
      setTimeout(() => node.classList.remove("dropping"), 350);
    }
    checkBoardBuilderBadge();
    return w;
  }

  function removeWidget(wid) {
    const board = S.activeBoard();
    board.widgets = board.widgets.filter(w => w.id !== wid);
    S.persistBoard();
    const entry = widgetEls.get(wid);
    if (entry) {
      entry.node.style.transition = "transform 200ms var(--ease-out), opacity 200ms";
      entry.node.style.opacity = "0";
      entry.node.style.transform += " scale(0.9)";
      setTimeout(() => entry.node.remove(), 220);
      widgetEls.delete(wid);
    }
    if (!board.widgets.length && !stacked) world.appendChild(buildEmptyState());
    if (focusMode.widgetId === wid) endFocus();
  }

  function checkBoardBuilderBadge() {
    const total = S.s.boards.reduce((n, b) => n + b.widgets.length, 0);
    if (total >= 10 && !S.s.badgesEarned.includes("b9")) {
      const badge = S.earnBadge("b9");
      if (badge) setTimeout(() => badgeUnlockModal(badge), 600);
    }
  }

  /* ============================================================
     WIDGET DRAWER — 4 categories (Hick's Law)
     Click to add, or drag onto the canvas.
     ============================================================ */
  let drawerOpen = false;
  let drawerCat = "plan";

  function toggleDrawer() {
    if (drawerOpen) { closeDrawer(); return; }
    openDrawer();
  }

  function closeDrawer() {
    if (drawerEl) drawerEl.remove();
    drawerEl = null;
    drawerOpen = false;
  }

  function openDrawer() {
    if (drawerEl) drawerEl.remove();
    drawerEl = el("div", { class: "drawer", role: "dialog", "aria-label": "Widget drawer" });
    const head = el("div", { class: "drawer-head" },
      el("h3", {}, "Add a widget"),
      el("button", { class: "icon-btn", "aria-label": "Close widget drawer", html: icon("x", 16), onclick: closeDrawer }));
    const cats = el("div", { class: "drawer-cats", role: "tablist", "aria-label": "Widget categories" });
    const items = el("div", { class: "drawer-items" });
    drawerEl.appendChild(head);
    drawerEl.appendChild(cats);
    drawerEl.appendChild(items);
    viewport.appendChild(drawerEl);
    drawerOpen = true;
    renderDrawer();
  }

  /* (re)draw category tabs + item list in place */
  function renderDrawer() {
    if (!drawerEl) return;
    const cats = drawerEl.querySelector(".drawer-cats");
    const items = drawerEl.querySelector(".drawer-items");
    cats.innerHTML = "";
    items.innerHTML = "";
    DRAWER_CATS.forEach(c => {
      cats.appendChild(el("button", {
        class: "drawer-cat", role: "tab", "aria-selected": drawerCat === c.id,
        onclick: () => { drawerCat = c.id; renderDrawer(); },
      }, c.label));
    });
    Object.entries(W).filter(([, def]) => def.cat === drawerCat).forEach(([type, def]) => {
      const item = el("div", { class: "drawer-item", tabindex: "0", role: "button", "aria-label": `Add ${def.name}` },
        el("span", { class: "di-icon", html: icon(def.icon, 17) }),
        el("span", {}, el("span", { class: "di-name" }, def.name), el("br"), el("span", { class: "di-desc" }, def.desc)));
      item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tryAdd(type); } });
      attachDrawerDrag(item, type);
      items.appendChild(item);
    });
  }

  function tryAdd(type) {
    const def = W[type];
    if (def.pick) { closeDrawer(); pickContent(type, cfg => { addWidget(type, null, null, cfg); SP.ui.toast(`${def.name} added to board`); }); }
    else { closeDrawer(); addWidget(type); SP.ui.toast(`${def.name} added to board`); }
  }

  function attachDrawerDrag(item, type) {
    let ghost = null, dragging = false;
    item.addEventListener("pointerdown", e => {
      const startX = e.clientX, startY = e.clientY;
      const move = ev => {
        if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) {
          dragging = true;
          ghost = el("div", { class: "drawer-ghost widget", html: `<div class="widget-head"><span class="widget-icon">${icon(W[type].icon, 15)}</span><span class="widget-title">${W[type].name}</span></div><div class="widget-body small muted">Drop me anywhere on the board.</div>` });
          ghost.style.height = "80px";
          document.body.appendChild(ghost);
        }
        if (dragging && ghost) {
          ghost.style.left = ev.clientX + "px";
          ghost.style.top = ev.clientY + "px";
        }
      };
      const up = ev => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (ghost) { ghost.remove(); ghost = null; }
        if (dragging) {
          dragging = false;
          const rect = viewport.getBoundingClientRect();
          if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            const wx = (ev.clientX - rect.left - view.x) / view.s;
            const wy = (ev.clientY - rect.top - view.y) / view.s;
            const def = W[type];
            closeDrawer();
            if (def.pick) pickContent(type, cfg => addWidget(type, Math.round(wx - def.def.w / 2), Math.round(wy - 20), cfg));
            else addWidget(type, Math.round(wx - def.def.w / 2), Math.round(wy - 20));
            SP.ui.toast(`${W[type].name} added to board`);
          }
        } else {
          tryAdd(type);
        }
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  }

  /* content pickers for study widgets */
  function pickContent(type, cb) {
    let list, titleKey;
    if (type === "flashcards") { list = D.LIBRARY.filter(l => l.type === "flashcards"); titleKey = "Flashcard decks"; }
    else if (type === "quiz") { list = D.LIBRARY.filter(l => l.type === "quiz"); titleKey = "Quizzes"; }
    else if (type === "mindmap") { list = D.LIBRARY.filter(l => l.type === "mindmap"); titleKey = "Mindmaps"; }
    else if (type === "notesview") { list = D.LIBRARY.filter(l => l.type === "notes"); titleKey = "Notes"; }

    if (type === "formulas") {
      const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });
      const m = SP.ui.modal({ title: "Choose a formula sheet", body });
      Object.entries(FORMULA_SETS).forEach(([key, set]) => {
        body.appendChild(el("button", { class: "drawer-item", style: { width: "100%" }, onclick: () => { m.close(); cb({ set: key }); } },
          el("span", { class: "di-icon", html: icon("sigma", 17) }),
          el("span", {}, el("span", { class: "di-name" }, set.name), el("br"), el("span", { class: "di-desc" }, `${set.items.length} formulas`))));
      });
      return;
    }
    if (type === "countdown") {
      const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } });
      const nameInput = el("input", { class: "input", placeholder: "e.g. NEET 2027", value: "JEE Main attempt 1", "aria-label": "Exam name" });
      const dateInput = el("input", { class: "input", type: "date", value: D.futureDate(90), "aria-label": "Exam date" });
      const m = SP.ui.modal({
        title: "What are you counting down to?", body,
        foot: [el("button", { class: "btn btn--primary", onclick: () => { m.close(); cb({ exam: nameInput.value || "Exam day", date: dateInput.value }); } }, "Add countdown")],
      });
      body.appendChild(el("label", { class: "field-label" }, "Exam or event"), nameInput);
      body.appendChild(el("label", { class: "field-label" }, "Date"), dateInput);
      return;
    }

    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "50vh", overflowY: "auto" } });
    const m = SP.ui.modal({ title: `Choose from your library — ${titleKey}`, body });
    list.forEach(l => {
      body.appendChild(el("button", { class: "drawer-item", style: { width: "100%" }, onclick: () => { m.close(); cb(cfgFromLib(type, l)); } },
        el("span", { class: "di-icon", html: icon(D.CONTENT_TYPE_ICON[l.type] || "file", 17) }),
        el("span", {}, el("span", { class: "di-name" }, l.title), el("br"), el("span", { class: "di-desc" }, `${l.subject ? subjName(l.subject) : ""} — ${l.est}`))));
    });
  }

  function cfgFromLib(type, l) {
    if (type === "flashcards") return { deckTitle: l.title, libId: l.id };
    if (type === "mindmap") return { title: l.title };
    return { libId: l.id };
  }
  function subjName(id) { const s = D.SUBJECTS.find(x => x.id === id); return s ? s.name : ""; }

  /* ============================================================
     STACKED (small-screen) VIEW
     ============================================================ */
  function toggleStack() {
    stacked = !stacked;
    applyStacked();
    SP.ui.toast(stacked ? "Stacked list view — every widget in one column" : "Back to the canvas");
  }
  function applyStacked() {
    if (stacked) {
      viewport.style.display = "none";
      mounted.classList.add("is-stacked");
      const stack = el("div", { class: "board-stack" });
      const board = S.activeBoard();
      if (!board.widgets.length) {
        stack.appendChild(el("div", { class: "card" }, buildEmptyState()));
      } else {
        [...board.widgets].sort((a, b) => a.y - b.y || a.x - b.x)
          .forEach(w => { const entry = widgetEls.get(w.id); if (entry) stack.appendChild(entry.node); });
      }
      mounted.querySelector(".board-wrap").appendChild(stack);
    } else {
      viewport.style.display = "";
      mounted.classList.remove("is-stacked");
      const stack = mounted.querySelector(".board-stack");
      if (stack) stack.remove();
      S.activeBoard().widgets.forEach(w => { const entry = widgetEls.get(w.id); if (entry && !world.contains(entry.node)) world.appendChild(entry.node); });
    }
  }

  /* ============================================================
     NEW BOARD — template gallery
     ============================================================ */
  function openNewBoard() {
    const body = el("div", {});
    body.appendChild(el("label", { class: "field-label" }, "Board name"));
    const nameInput = el("input", { class: "input", value: "", placeholder: "e.g. Organic Chem Lab" });
    body.appendChild(nameInput);
    body.appendChild(el("label", { class: "field-label", style: { marginTop: "16px" } }, "Start from"));
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } });
    const m = SP.ui.modal({ title: "New board", body });
    D.BOARD_TEMPLATES.forEach(t => {
      grid.appendChild(el("button", {
        class: "card card--interactive", style: { textAlign: "left" },
        onclick: () => {
          const name = nameInput.value.trim() || t.name;
          const board = S.addBoard(name, templateWidgets(t.id));
          m.close();
          rerender();
          SP.ui.toast(`Board "${name}" created`);
        },
      },
        el("div", { class: "tpl-icon", html: icon(t.icon, 20) }),
        el("div", { style: { fontWeight: "700", fontSize: "14px" } }, t.name),
        el("div", { class: "small muted", style: { lineHeight: "1.4" } }, t.desc)));
    });
    body.appendChild(grid);
    setTimeout(() => nameInput.focus(), 50);
  }

  function templateWidgets(tid) {
    const mk = (type, x, y, config) => {
      const def = W[type];
      return { id: uid(), type, x, y, w: def.def.w, h: def.def.h, rot: +(Math.random() * 3 - 1.5).toFixed(1),
               config: Object.assign(def.defaults(), config || {}) };
    };
    if (tid === "countdown") return [
      mk("countdown", 60, 50, { exam: "NEET 2027", date: D.futureDate(140) }),
      mk("todo", 350, 40, { title: "Syllabus checkpoints", items: [
        { text: "Rotational Motion — full problem set", done: true },
        { text: "Human Physiology deck (30 cards)", done: false },
        { text: "Mock test 3 review", done: false } ] }),
      mk("formulas", 700, 60, { set: "phys" }),
    ];
    if (tid === "planner") return [
      mk("todo", 60, 40, { title: "Today", items: [{ text: "Morning review block", done: false }, { text: "Evening focus session", done: false }] }),
      mk("habit", 400, 50),
      mk("pomodoro", 750, 40),
    ];
    if (tid === "mindmap") return [
      mk("mindmap", 180, 60, { title: "Meiosis vs Mitosis" }),
      mk("note", 600, 40, { text: "Crossing over happens in prophase I — the exam loves this.", color: "green" }),
      mk("note", 620, 300, { text: "Compare daughter cell ploidy first, everything else follows.", color: "blue" }),
    ];
    return [];
  }

  function closeBoard(b) {
    SP.ui.confirmDialog({
      title: `Close "${b.name}"?`,
      text: "The board and its widgets will be removed. Your library items are untouched.",
      confirmLabel: "Remove board",
      danger: true,
      onConfirm: () => { S.removeBoard(b.id); rerender(); SP.ui.toast(`Board "${b.name}" removed`); },
    });
  }

  /* ============================================================
     FOCUS MODE — dim everything but one pinned widget
     ============================================================ */
  function startFocusFlow() {
    const board = S.activeBoard();
    if (focusMode.active) { endFocus(); return; }
    if (!board.widgets.length) { SP.ui.toast("Add a widget first — Focus Mode needs something to focus on"); return; }
    if (board.widgets.length === 1) { startFocus(board.widgets[0].id); return; }
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });
    const m = SP.ui.modal({ title: "Focus on which widget?", body });
    board.widgets.forEach(w => {
      body.appendChild(el("button", { class: "drawer-item", style: { width: "100%" }, onclick: () => { m.close(); startFocus(w.id); } },
        el("span", { class: "di-icon", html: icon(W[w.type].icon, 17) }),
        el("span", { class: "di-name" }, widgetTitle(w))));
    });
  }

  function startFocus(wid) {
    endFocus(true);
    focusMode = { active: true, widgetId: wid };
    preFocusView = { ...view };  // restored on endFocus so the canvas doesn't stay displaced
    // Focus Mode is a true full-screen view: body.in-focus hides the
    // sidebar, header, tab bar and board bar; the overlay is opaque.
    document.body.classList.add("in-focus");
    tryFullscreen(true);
    // overlay lives inside the (transformed) world; the pinned widget outranks it
    const overlay = el("div", { class: "focus-overlay", style: { background: "var(--bg)", pointerEvents: "auto", zIndex: "900" } });
    world.appendChild(overlay);
    const entry = widgetEls.get(wid);
    if (entry) {
      entry.node.style.zIndex = 950;
      entry.node.classList.add("pinned-focus");
      // center it gently
      const w = entry.w;
      const targetX = (viewport.clientWidth - w.w * view.s) / 2 - w.x * view.s;
      const targetY = (viewport.clientHeight - w.h * view.s) / 2 - w.y * view.s + 20;
      world.style.transition = "transform 420ms var(--ease-out)";
      view.x = targetX; view.y = targetY;
      applyTransform();
      setTimeout(() => { world.style.transition = ""; }, 450);
    }
    focusBar = el("div", { class: "focus-bar" },
      el("span", { class: "focus-dot" }),
      el("span", { class: "focus-label" }, "Focus Mode"),
      el("button", { class: "icon-btn", id: "focus-ambient", "aria-label": "Toggle ambient rain", title: "Ambient rain", html: icon("sound", 16), onclick: toggleAmbientFocus }),
      el("button", { class: "btn btn--sm", onclick: endFocus }, "End"));
    viewport.appendChild(focusBar);
    document.addEventListener("keydown", focusEsc);
  }

  function focusEsc(e) { if (e.key === "Escape") endFocus(); }

  /* Best-effort browser fullscreen. Guarded: jsdom and older browsers
     simply don't have it, and a rejected promise must never break focus. */
  function tryFullscreen(on) {
    const root = document.documentElement;
    try {
      if (on && typeof root.requestFullscreen === "function" && !document.fullscreenElement) {
        const r = root.requestFullscreen();
        if (r && typeof r.catch === "function") r.catch(() => {});
      } else if (!on && typeof document.exitFullscreen === "function" && document.fullscreenElement) {
        const r = document.exitFullscreen();
        if (r && typeof r.catch === "function") r.catch(() => {});
      }
    } catch (err) { /* fullscreen is a bonus, not a requirement */ }
  }

  function endFocus(silent) {
    if (!focusMode.active) return;
    const entry = widgetEls.get(focusMode.widgetId);
    if (entry) {
      entry.node.classList.remove("pinned-focus");
      entry.node.style.zIndex = zTop++;  // stop outranking the drawer/overlay after focus
    }
    // put the canvas back exactly where it was before focus centered it
    if (preFocusView) { view = preFocusView; preFocusView = null; clampView(); applyTransform(); }
    document.querySelectorAll(".focus-overlay, .focus-bar").forEach(n => n.remove());
    document.removeEventListener("keydown", focusEsc);
    document.body.classList.remove("in-focus");
    tryFullscreen(false);
    focusMode = { active: false, widgetId: null };
    SP.sound.stop();
    const ab = mounted && mounted.querySelector("#focus-ambient");
    if (ab) ab.classList.remove("on");
    if (!silent) SP.ui.toast("Focus session ended");
  }

  function toggleAmbientFocus(e) {
    const on = SP.sound.toggle("rain");
    e.currentTarget.classList.toggle("on", on);
    SP.ui.toast(on ? "Rain sounds on" : "Rain sounds off");
  }

  /* ============================================================
     WIDGET RENDERERS
     ============================================================ */

  /* ---- sticky note ---- */
  function renderNote(w, body) {
    const ta = el("textarea", { class: "note-area", placeholder: "One thought per note…", "aria-label": "Note text" });
    ta.value = w.config.text || "";
    let t;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { w.config.text = ta.value; S.persistBoard(); }, 400);
    });
    body.appendChild(ta);
  }

  /* ---- todo ---- */
  function renderTodo(w, body) {
    const redraw = () => {
      body.innerHTML = "";
      const items = w.config.items;
      const done = items.filter(i => i.done).length;
      body.appendChild(el("div", { class: "todo-progressline" },
        el("div", { class: "progress", html: `<div class="progress-fill" style="width:${items.length ? done / items.length * 100 : 0}%"></div>` }),
        el("span", { class: "num xs muted" }, `${done}/${items.length}`)));
      items.forEach((it, idx) => {
        body.appendChild(el("div", { class: `todo-item ${it.done ? "done" : ""}` },
          el("button", { class: "todo-check", role: "checkbox", "aria-checked": it.done, "aria-label": it.text,
            html: icon("check", 12), onclick: () => { it.done = !it.done; S.persistBoard(); redraw(); } }),
          el("span", { class: "todo-text" }, it.text),
          el("button", { class: "todo-del", title: "Delete task", "aria-label": `Delete task ${it.text}`, html: icon("x", 13),
            onclick: () => { items.splice(idx, 1); S.persistBoard(); redraw(); } })));
      });
      const input = el("input", { class: "input", placeholder: "Add a task…", "aria-label": "New task" });
      const add = () => {
        const v = input.value.trim();
        if (!v) return;
        items.push({ text: v, done: false });
        S.persistBoard();
        redraw();
      };
      const addBtn = el("button", { class: "btn btn--sm", "aria-label": "Add task", title: "Add task", html: icon("plus", 14), onclick: add });
      input.addEventListener("keydown", e => { if (e.key === "Enter") add(); });
      /* the + only exists once there is something to add */
      const sync = () => addBtn.classList.toggle("ready", input.value.trim().length > 0);
      input.addEventListener("input", sync);
      body.appendChild(el("div", { class: "todo-add" }, input, addBtn));
    };
    redraw();
  }

  /* ---- schedule ---- */
  function renderSchedule(w, body) {
    w.config.blocks.forEach(b => {
      body.appendChild(el("div", { style: { display: "flex", gap: "12px", padding: "9px 2px", borderBottom: "1px solid var(--border)" } },
        el("span", { class: "num", style: { fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", width: "42px", flex: "none" } }, b.time),
        el("span", { class: "small", style: { lineHeight: "1.45" } }, b.text)));
    });
  }

  /* ---- countdown ---- */
  function renderCountdown(w, body) {
    const days = SP.ui.daysUntil(w.config.date);
    body.appendChild(el("div", { class: "countdown-body" },
      el("div", { class: "countdown-exam" }, w.config.exam),
      el("div", { class: "countdown-days num" }, String(Math.max(0, days))),
      el("div", { class: "countdown-label" }, days === 1 ? "day left" : "days left"),
      el("div", { class: "countdown-date" }, new Date(w.config.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))));
  }

  /* ---- flashcards ---- */
  function renderFlashcards(w, body) {
    const lib = D.LIBRARY.find(l => l.id === w.config.libId && l.cards);
    const cards = lib ? lib.cards : [["Flip me", "This deck has no cards yet — create one in the Library."]];
    const session = w._session || (w._session = { i: 0, got: 0, miss: 0, flipped: false });
    const reset = () => { session.i = 0; session.got = 0; session.miss = 0; session.flipped = false; };
    const redraw = () => {
      body.innerHTML = "";
      if (session.i >= cards.length) { finishDeck(); return; }
      const card = cards[session.i];
      const stage = el("div", { class: "flashcard-stage" });
      const fc = el("div", { class: `flashcard ${session.flipped ? "flipped" : ""}`, role: "button", tabindex: "0", "aria-label": "Flip card" },
        el("div", { class: "fc-face" }, card[0]),
        el("div", { class: "fc-face back" }, card[1]));
      const flip = () => { session.flipped = !session.flipped; redraw(); };
      fc.addEventListener("click", flip);
      fc.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      stage.appendChild(fc);
      stage.appendChild(el("div", { class: "fc-count" }, `${session.i + 1} / ${cards.length}`));
      /* One decision at a time: before the flip there is only "Flip";
         "Missed / Got it" are dead buttons until you can see the back. */
      stage.appendChild(session.flipped
        ? el("div", { class: "fc-controls" },
            el("button", { class: "btn", onclick: () => advance(false) }, "Missed"),
            el("button", { class: "btn btn--primary", onclick: () => advance(true) }, "Got it"))
        : el("div", { class: "fc-controls" },
            el("button", { class: "btn btn--primary", onclick: flip }, "Flip card")));
      body.appendChild(stage);
    };
    const advance = got => {
      got ? session.got++ : session.miss++;
      session.i++;
      session.flipped = false;
      S.bumpQuest("q1", 1);
      S.s.stats.cardsReviewed++;
      redraw();
    };
    const finishDeck = () => {
      const total = session.got + session.miss;
      const acc = total ? Math.round(session.got / total * 100) : 0;
      const got = session.got;
      const deckTitle = w.config.deckTitle;
      reset();  // reset in place — a fresh object here would leave `session` stale and recurse forever
      sessionSummary({
        kind: "flashcards",
        title: `${deckTitle} — deck finished`,
        stats: [ { val: total, label: "cards reviewed" }, { val: acc + "%", label: "accuracy" }, { val: got, label: "remembered" } ],
        xp: 20 + got * 2,
        acc, total, got,
      });
      redraw();
    };
    redraw();
  }

  /* ---- mindmap ---- */
  function renderMindmap(w, body) {
    const title = w.config.title;
    const branches = MINDMAPS[title] || title.split(/[,:—-]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
    body.classList.add("mindmap-body");
    const pos = [[60, 34], [280, 34], [40, 168], [300, 168], [170, 12]];
    const lines = branches.map((b, i) => {
      const [bx, by] = pos[i % pos.length];
      return `<path d="M170 105 Q ${(170 + bx) / 2} ${(105 + by) / 2 - 14} ${bx} ${by}" stroke="var(--border-strong)" stroke-width="2" fill="none"/>`;
    }).join("");
    const nodes = branches.map((b, i) => {
      const [bx, by] = pos[i % pos.length];
      const wd = Math.min(120, 24 + b.length * 5.2);
      return `<g><rect x="${bx - wd / 2}" y="${by - 13}" width="${wd}" height="26" rx="8" fill="var(--bg-sunken)" stroke="var(--border-strong)"/>
        <text x="${bx}" y="${by + 4}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--ink)" font-family="var(--font-body)">${esc(b.length > 22 ? b.slice(0, 21) + "…" : b)}</text></g>`;
    }).join("");
    body.innerHTML = `<svg viewBox="0 0 340 200" role="img" aria-label="Mindmap: ${esc(title)}">
      ${lines}
      <rect x="88" y="86" width="164" height="38" rx="12" fill="var(--ink)" />
      <text x="170" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="var(--bg)" font-family="var(--font-display)">${esc(title.length > 24 ? title.slice(0, 23) + "…" : title)}</text>
      ${nodes}
    </svg>`;
  }

  /* ---- mini quiz ---- */
  function renderQuiz(w, body) {
    const lib = D.LIBRARY.find(l => l.id === w.config.libId && l.questions);
    const qs = lib ? lib.questions : [{ q: "No questions found for this quiz.", opts: ["Back to board"], a: 0 }];
    const session = w._qsession || (w._qsession = { i: 0, correct: 0, answered: false });
    const redraw = () => {
      body.innerHTML = "";
      if (session.i >= qs.length) { finishQuiz(); return; }
      const q = qs[session.i];
      body.appendChild(el("div", { class: "fc-count", style: { textAlign: "left", marginBottom: "8px" } }, `Question ${session.i + 1} of ${qs.length}`));
      body.appendChild(el("div", { class: "quiz-q" }, q.q));
      q.opts.forEach((opt, oi) => {
        const b = el("button", { class: "quiz-option" }, opt);
        b.addEventListener("click", () => {
          if (session.answered) return;
          session.answered = true;
          const correct = oi === q.a;
          if (correct) session.correct++;
          b.classList.add(correct ? "correct" : "wrong");
          if (!correct) body.querySelectorAll(".quiz-option")[q.a].classList.add("correct");
          setTimeout(() => { session.i++; session.answered = false; redraw(); }, 900);
        });
        body.appendChild(b);
      });
    };
    const finishQuiz = () => {
      const acc = Math.round(session.correct / qs.length * 100);
      const stats = { correct: session.correct, total: qs.length };
      session.i = 0; session.correct = 0; session.answered = false;  // reset in place, never reassign
      S.bumpQuest("q2", 1);
      sessionSummary({
        kind: "quiz",
        title: `${lib ? lib.title : "Quiz"} — results`,
        stats: [ { val: `${stats.correct}/${stats.total}`, label: "correct" }, { val: acc + "%", label: "accuracy" }, { val: qs.length, label: "questions" } ],
        xp: 15 + stats.correct * 5,
        acc, total: stats.total, got: stats.correct,
      });
      redraw();
    };
    redraw();
  }

  /* ---- notes viewer ---- */
  function renderNotesView(w, body) {
    const lib = D.LIBRARY.find(l => l.id === w.config.libId);
    if (!lib) { body.appendChild(el("p", { class: "small muted" }, "This note is no longer in your library.")); return; }
    body.appendChild(el("div", { class: "meta", style: { marginBottom: "8px" } },
      el("span", { class: "chunkest" }, lib.est), el("span", {}, lib.author)));
    body.appendChild(el("div", { class: "detail-body small", html: lib.body || "<p>Open this note in the Library to read the full version.</p>" }));
  }

  /* ---- formula sheet ---- */
  function renderFormulas(w, body) {
    const set = FORMULA_SETS[w.config.set] || FORMULA_SETS.calc;
    set.items.forEach(([name, expr]) => {
      body.appendChild(el("div", { class: "formula-item" },
        el("div", { class: "formula-name" }, name),
        el("div", { class: "formula-expr" }, expr)));
    });
  }

  /* ---- pomodoro ---- */
  const pomoTimers = new Map();
  function stopPomo(id) {
    const t = pomoTimers.get(id);
    if (t) { clearInterval(t); pomoTimers.delete(id); }
  }
  function renderPomodoro(w, body) {
    const st = w._pomo || (w._pomo = { phase: "focus", remain: 25 * 60, running: false, demo: false, doneToday: 0 });
    stopPomo(w.id);

    const redraw = () => {
      body.innerHTML = "";
      const total = st.phase === "focus" ? (st.demo ? 60 : 25 * 60) : 5 * 60;
      const pct = 1 - st.remain / total;
      const wrap = el("div", { class: "pomo-body" });
      wrap.appendChild(el("div", { class: `pomo-phase ${st.phase === "break" ? "break" : ""}` },
        st.phase === "focus" ? "focus block" : "short break"));
      const ringWrap = el("div", { class: "pomo-ring-wrap", html: ringSVG(pct, 130, 8, st.phase === "focus" ? "ring-fill--ember" : "ring-fill--moss") });
      const timeNode = el("div", { class: "pomo-time" }, SP.ui.fmtTimeLeft(st.remain * 1000));
      ringWrap.appendChild(timeNode);
      wrap.appendChild(ringWrap);
      /* Running: Pause + End. Stopped: Start. Reset, demo speed and rain
         now live in the widget's ⋯ menu — none of them are used mid-run. */
      const finish = () => { st.running = false; stopPomo(w.id); st.phase = "focus"; st.remain = st.demo ? 60 : 25 * 60; redraw(); SP.ui.toast("Timer reset"); };
      const full = st.phase === "focus" ? (st.demo ? 60 : 1500) : 300;
      wrap.appendChild(st.running
        ? el("div", { class: "pomo-controls" },
            el("button", { class: "btn btn--sm", onclick: () => { st.running = false; stopPomo(w.id); redraw(); }, html: icon("pause", 14) + "Pause" }),
            el("button", { class: "btn btn--sm btn--ghost", onclick: finish }, "End"))
        : el("div", { class: "pomo-controls" },
            el("button", { class: "btn btn--sm btn--primary", onclick: () => { st.running = true; startTicking(); redraw(); }, html: icon("play", 14) + (st.remain < full ? "Resume" : "Start") })));
      body.appendChild(wrap);
    };

    const startTicking = () => {
      const t = setInterval(() => {
        st.remain--;
        const timeNode = body.querySelector(".pomo-time");
        const ring = body.querySelector(".ring-fill");
        if (timeNode) timeNode.textContent = SP.ui.fmtTimeLeft(st.remain * 1000);
        const total = st.phase === "focus" ? (st.demo ? 60 : 25 * 60) : 5 * 60;
        if (ring) {
          const r = 61, c = 2 * Math.PI * r;
          ring.style.strokeDasharray = c.toFixed(1);
          ring.style.strokeDashoffset = (c * (st.remain / total)).toFixed(1);
        }
        if (st.remain <= 0) {
          if (st.phase === "focus") {
            st.phase = "break"; st.remain = 5 * 60; st.running = false; st.doneToday++;
            stopPomo(w.id);
            S.s.stats.sessions++;
            S.s.stats.hoursFocused = +(S.s.stats.hoursFocused + (st.demo ? 1 / 60 : 25 / 60)).toFixed(2);
            S.bumpQuest("q2", 1);
            sessionSummary({
              kind: "pomodoro",
              title: "Focus block complete",
              stats: [ { val: st.demo ? 1 : 25, label: "minutes focused" }, { val: st.doneToday, label: "sessions today" }, { val: S.s.stats.sessions, label: "all-time sessions" } ],
              xp: 40,
            });
            redraw();
          } else {
            st.phase = "focus"; st.remain = st.demo ? 60 : 25 * 60; st.running = false;
            stopPomo(w.id);
            SP.ui.toast("Break over — next focus block is ready");
            redraw();
          }
        }
      }, 1000);
      pomoTimers.set(w.id, t);
    };
    w._stopPomo = () => stopPomo(w.id);
    if (st.running) startTicking();
    redraw();
  }
  function stopAllTimers() { pomoTimers.forEach(t => clearInterval(t)); pomoTimers.clear(); }

  /* ---- habit tracker ---- */
  function renderHabit(w, body) {
    const done = w.config.done || [];
    const redraw = () => {
      body.innerHTML = "";
      const count = done.filter(Boolean).length;
      body.appendChild(el("div", { class: "habit-name-row" },
        el("span", { class: "small", style: { flex: "1", fontWeight: "600" } }, "Last 14 days"),
        el("span", { class: "num small", style: { color: "var(--moss)", fontWeight: "700" } }, `${count}/14`)));
      const days = el("div", { class: "habit-days" });
      ["M", "T", "W", "T", "F", "S", "S"].forEach(d => days.appendChild(el("span", {}, d)));
      body.appendChild(days);
      const grid = el("div", { class: "habit-grid" });
      for (let i = 0; i < 14; i++) {
        const isToday = i === 13;
        const cell = el("button", {
          class: `habit-cell ${done[i] ? "done" : ""} ${isToday ? "today" : ""}`,
          "aria-label": `Day ${i + 1}${done[i] ? ", done" : ""}${isToday ? " (today)" : ""}`,
          "aria-pressed": !!done[i],
          onclick: () => { done[i] = !done[i]; w.config.done = done; S.persistBoard(); redraw(); },
        });
        grid.appendChild(cell);
      }
      body.appendChild(grid);
    };
    redraw();
  }

  /* ---- streak widget ---- */
  function renderStreakWidget(w, body) {
    const st = S.s.streak;
    body.innerHTML = "";
    body.appendChild(el("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "6px 0 12px" } },
      el("span", { html: flameSVG(44, "flame--big") }),
      el("span", {},
        el("span", { class: "num", style: { fontSize: "34px", fontWeight: "700", lineHeight: "1" } }, String(st.count)),
        el("span", { class: "small muted", style: { display: "block" } }, st.studiedToday ? "day streak — fed today" : "day streak — not fed yet today"))));
    const dots = el("div", { style: { display: "flex", gap: "6px", marginBottom: "10px" } });
    ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => {
      const dayDone = i < 6 ? true : st.studiedToday; // last 6 days were a hot streak
      dots.appendChild(el("span", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: "1" } },
        el("span", { style: { width: "16px", height: "16px", borderRadius: "50%",
          background: dayDone ? "var(--ember)" : "var(--bg-sunken)",
          border: i === 6 && !st.studiedToday ? "1.5px dashed var(--ember-deep)" : "1px solid var(--border)" } }),
        el("span", { class: "xs faint" }, d)));
    });
    body.appendChild(dots);
    body.appendChild(el("div", { class: "freeze-chip" },
      el("span", { html: icon("snowflake", 13) }),
      el("span", {}, `${st.freezes} streak freeze${st.freezes === 1 ? "" : "s"} left — a missed day won't break you`)));
    if (!st.studiedToday) {
      body.appendChild(el("p", { class: "xs streak-warn" },
        "Don't lose your streak — finish any session today."));
    }
  }

  /* ---- room shortcut ---- */
  function renderRoomWidget(w, body) {
    const room = D.ROOMS.find(r => r.id === w.config.roomId) || D.ROOMS[0];
    body.appendChild(el("div", { class: "room-widget-body" },
      room.live ? el("span", { class: "live-pill" }, el("span", { class: "live-dot" }), `${room.people} people studying here now`) : el("span", { class: "small muted" }, "Room is quiet right now"),
      el("div", { style: { fontWeight: "700", fontSize: "14px" } }, room.name),
      el("div", { class: "xs muted" }, room.focus),
      room.members.length ? el("div", { class: "room-faces", html: room.members.slice(0, 5).map(m => SP.ui.avatarHTML(m.name, 26)).join("") }) : null,
      el("button", { class: "btn btn--sm btn--quiet", style: { width: "100%" }, onclick: () => { location.hash = `#/social/room/${room.id}`; } }, room.live ? "Join room" : "View room")));
  }

  /* ---- group chat mini ---- */
  function renderChatMini(w, body) {
    const g = D.GROUPS.find(x => x.id === w.config.groupId) || D.GROUPS[0];
    const last = g.messages.slice(-2);
    last.forEach(m => {
      body.appendChild(el("div", { style: { marginBottom: "10px" } },
        el("div", { class: "xs", style: { fontWeight: "800" } }, m.author, el("span", { class: "faint", style: { fontWeight: "500", marginLeft: "6px" } }, m.time)),
        el("div", { class: "small muted", style: { lineHeight: "1.45" } }, m.text.length > 90 ? m.text.slice(0, 88) + "…" : m.text)));
    });
    body.appendChild(el("button", { class: "btn btn--sm", style: { width: "100%" }, onclick: () => { location.hash = `#/social/groups`; } }, "Open chat"));
  }

  /* ============================================================
     SESSION SUMMARY (peak–end rule) + variable reward chest
     ============================================================ */
  function sessionSummary(opts) {
    const wasStudied = S.s.streak.studiedToday;
    const streakInfo = S.markStudiedToday();
    const emberLine = opts.kind === "flashcards"
      ? (opts.acc === 100 && opts.total >= 20 ? `${opts.total} cards, zero misses. That's a clean sweep.`
        : opts.acc >= 85 ? `Sharp recall — ${opts.got} of ${opts.total} on the first try.`
        : `Rough round. The ${opts.total - opts.got} misses go back into tomorrow's queue.`)
      : opts.kind === "quiz"
      ? (opts.acc === 100 ? "Every question, first try. Nothing to fix."
        : opts.acc >= 70 ? `${opts.got} of ${opts.total} — solid. Review the misses and they're yours.`
        : `${opts.got} of ${opts.total}. Wrong answers are just a study list in disguise.`)
      : (new Date().getHours() >= 22
        ? "Late session counts double in spirit. Go rest."
        : "One block down. The timer doesn't lie — neither does this recap.");

    const xpNode = el("span", { class: "xp-counter summary-xp", html: `+0 XP` });
    const bodyEl = el("div", {},
      el("div", { html: emberSVG(96, { glow: S.s.profile.ember.glow, accessory: S.s.profile.ember.accessory, mood: "cheer" }) }),
      el("h2", { style: { fontSize: "var(--text-xl)" } }, opts.title),
      el("div", { class: "summary-stats" },
        ...opts.stats.map(s => el("div", { class: "summary-stat" },
          el("div", { class: "ss-val" }, String(s.val)),
          el("div", { class: "ss-label" }, s.label)))),
      el("div", {}, xpNode),
      el("p", { class: "summary-ember-line" }, `“${emberLine}” — Ember`),
      streakInfo.streakUp
        ? el("p", { class: "summary-streak" }, el("span", { html: flameSVG(15) }), el("span", {}, `Streak extended — ${streakInfo.count} days`))
        : (wasStudied ? el("p", { class: "xs muted" }, "Today's streak was already safe.") : el("p", { class: "small", style: { color: "var(--moss)", fontWeight: "700" } }, "Today's streak cell is filled. Protected.")));

    const m = SP.ui.modal({
      class: "summary-modal",
      celebration: true,
      body: bodyEl,
      dismissable: false,
      foot: [el("button", { class: "btn btn--primary btn--lg", onclick: () => { m.close(); afterSummary(); } }, "Back to Board")],
    });
    SP.ui.sparkleBurst(m.el, 14);
    setTimeout(() => SP.ui.countUp(xpNode, opts.xp, { prefix: "+", suffix: " XP", duration: 900 }), 350);

    function afterSummary() {
      const res = S.addXP(opts.xp, { origin: opts.kind });
      SP.app.updateHeader();
      const chip = document.querySelector(".streak-chip");
      if (chip) { chip.classList.remove("pulse"); void chip.offsetWidth; chip.classList.add("pulse"); SP.ui.xpFloater(opts.xp, chip); }
      // night owl badge
      if (new Date().getHours() >= 22 && !S.s.badgesEarned.includes("b2")) {
        const b = S.earnBadge("b2");
        if (b) setTimeout(() => badgeUnlockModal(b), 700);
      }
      // variable reward: ~1 in 5 sessions opens a surprise chest
      if (Math.random() < 0.2) {
        setTimeout(() => surpriseChest(), 500);
      } else if (res.leveledUp) {
        setTimeout(() => levelUpModal(res.after.level), 500);
      }
    }
  }

  function surpriseChest() {
    let opened = false;
    const bonus = 15 + Math.floor(Math.random() * 46); // 15–60
    const chestEl = el("div", { class: "chest", role: "button", tabindex: "0", "aria-label": "Open surprise chest" });
    const draw = open => {
      chestEl.innerHTML = open
        ? `<svg width="110" height="110" viewBox="0 0 110 110"><rect x="18" y="52" width="74" height="42" rx="8" fill="var(--ink)"/><rect x="18" y="52" width="74" height="12" fill="var(--ink)" opacity="0.78"/><path d="M14 52 L28 22 H82 L96 52 Z" fill="var(--ink)" opacity="0.55" transform="rotate(-12 55 40) translate(0 -14)"/><rect x="48" y="60" width="14" height="16" rx="3" fill="var(--gold)"/><circle cx="55" cy="46" r="9" fill="var(--gold)"/><circle cx="55" cy="46" r="4" fill="var(--gold-bright)"/></svg>`
        : `<svg width="110" height="110" viewBox="0 0 110 110"><rect x="18" y="52" width="74" height="42" rx="8" fill="var(--ink)"/><rect x="18" y="52" width="74" height="12" fill="var(--ink)" opacity="0.78"/><path d="M14 52 Q55 30 96 52 L92 44 Q55 24 18 44 Z" fill="var(--ink)" opacity="0.55"/><rect x="48" y="52" width="14" height="20" rx="3" fill="var(--gold)"/><circle cx="55" cy="60" r="4.5" fill="var(--gold-bright)"/></svg>`;
    };
    draw(false);
    const reveal = el("div", { style: { minHeight: "52px" } });
    const m = SP.ui.modal({
      celebration: true,
      body: el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" } },
        el("h2", { style: { fontSize: "var(--text-xl)" } }, "Surprise chest!"),
        el("p", { class: "small muted" }, "Roughly one session in five hides a bonus. Tap to open."),
        chestEl, reveal),
      dismissable: false,
      foot: [el("button", { class: "btn btn--primary", id: "chest-done", disabled: true, onclick: () => m.close() }, "Keep the glow")],
    });
    const openIt = () => {
      if (opened) return;
      opened = true;
      chestEl.classList.add("opened");
      draw(true);
      SP.ui.sparkleBurst(m.el, 20);
      reveal.innerHTML = `<div class="summary-xp" style="justify-content:center">+${bonus} bonus XP</div>
        <p class="summary-ember-line">“Found some spare glow. It's yours.” — Ember</p>`;
      S.addXP(bonus, { origin: "chest" });
      SP.app.updateHeader();
      m.el.querySelector("#chest-done").disabled = false;
      const checkLevel = S.levelInfo();
      // level-up (if any) shows after chest closes
      m.el.querySelector("#chest-done").addEventListener("click", () => {
        const before = S.levelInfo(S.s.xp - bonus);
        if (checkLevel.level > before.level) setTimeout(() => levelUpModal(checkLevel.level), 400);
      });
    };
    chestEl.addEventListener("click", openIt);
    chestEl.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIt(); } });
  }

  function levelUpModal(level) {
    const m = SP.ui.modal({
      celebration: true,
      dismissable: true,
      body: el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", position: "relative", padding: "16px" } },
        el("div", { class: "levelup-rays" }),
        el("div", { html: emberSVG(110, { glow: S.s.profile.ember.glow, accessory: S.s.profile.ember.accessory, mood: "cheer" }) }),
        el("h2", {}, `Level ${level}`),
        el("p", { class: "small muted" }, "Your glow radius just got bigger. New badge tiers are within reach."),
        el("div", { class: "summary-xp", style: { justifyContent: "center" } }, `${SP.ui.fmtNum(S.s.xp)} total XP`)),
      foot: [el("button", { class: "btn btn--primary", onclick: () => m.close() }, "Nice")],
    });
    SP.ui.sparkleBurst(m.el, 24);
  }

  function badgeUnlockModal(badge) {
    const m = SP.ui.modal({
      celebration: true,
      body: el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" } },
        el("div", { class: "badge-tile", "data-tier": badge.tier, style: { border: "none", background: "none", cursor: "default" } },
          el("span", { class: "badge-medal badge-medal--lg", html: icon(badge.icon, 34) })), 
        el("h2", {}, `Badge unlocked — ${badge.name}`),
        el("p", { class: "small muted" }, badge.cond),
        el("span", { class: "badge-tier" }, `${badge.tier} (${badge.cat})`)),
      foot: [el("button", { class: "btn btn--primary", onclick: () => m.close() }, "Add to shelf")],
    });
    SP.ui.sparkleBurst(m.el, 16);
  }

  /* ---------- add a library item onto the board (from Library screen) ---------- */
  function addLibItemToBoard(libId) {
    const item = D.LIBRARY.find(l => l.id === libId);
    if (!item) return;
    const typeMap = { flashcards: "flashcards", quiz: "quiz", mindmap: "mindmap", notes: "notesview", summary: "notesview", cheatsheet: "formulas" };
    const type = typeMap[item.type];
    if (!type) { SP.ui.toast("This type opens best from the Library — Study now", "info"); return; }
    const cfg = cfgFromLib(type, item);
    if (type === "formulas") cfg.set = item.subject === "ochem" ? "ochem" : "calc";
    // board must exist; navigate there and place
    location.hash = "#/board";
    setTimeout(() => {
      const w = addWidget(type, null, null, cfg);
      SP.ui.toast(`Added to Board — ${item.title.slice(0, 30)}`);
      const entry = widgetEls.get(w.id);
      if (entry) {
        entry.node.style.transition = "transform 500ms var(--ease-spring)";
        entry.node.style.transform += " scale(1.04)";
        setTimeout(() => { entry.node.style.transform = `rotate(${w.rot}deg)`; }, 260);
      }
    }, 120);
  }

  return { mount, unmount, addWidget, addLibItemToBoard, sessionSummary, levelUpModal, badgeUnlockModal, W, rerender };
})();

/* ============================================================
   AMBIENT SOUND — WebAudio-generated rain (no external files)
   ============================================================ */
SP.sound = (() => {
  let ctx = null, nodes = null, on = false;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function start(kind) {
    const c = ensure();
    const bufferSize = 2 * c.sampleRate;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {           // brown-ish noise
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = c.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = kind === "rain" ? 900 : 500;
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.09, c.currentTime + 1.2);
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start();
    nodes = { src, gain };
    on = true;
  }
  function stop() {
    if (nodes) {
      const { src, gain } = nodes;
      try {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => { try { src.stop(); } catch (e) {} }, 600);
      } catch (e) {}
      nodes = null;
    }
    on = false;
  }
  function toggle(kind) { on ? stop() : start(kind || "rain"); return on; }
  return { start, stop, toggle, isOn: () => on };
})();
