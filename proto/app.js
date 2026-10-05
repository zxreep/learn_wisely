/* ============================================================
   EMBERDESK — APP SHELL & ROUTER
   Sidebar (desktop) / bottom tab bar (mobile) · persistent
   streak + level in the header · ⌘K command search · boot.
   ============================================================ */
window.SP = window.SP || {};

SP.app = (() => {
  const { el, esc, icon, flameSVG, avatarHTML, fmtNum } = SP.ui;
  const S = SP.state;

  let screen, sidebar, currentScreen = null;

  const NAV = [
    { id: "board", label: "Board", hash: "#/board", icon: "board" },
    { id: "social", label: "Social", hash: "#/social", icon: "social" },
    { id: "library", label: "Library", hash: "#/library", icon: "library" },
    { id: "coach", label: "Coach", hash: "#/coach", icon: "sparkle" },
    { id: "profile", label: "Profile", hash: "#/profile", icon: "user" },
  ];

  function boot() {
    S.load();
    S.applyTheme();
    buildShell();
    bindGlobals();
    start();
    // hide boot skeleton once the first screen has painted
    requestAnimationFrame(() => {
      setTimeout(() => {
        const b = document.getElementById("boot");
        if (b) { b.classList.add("hidden"); setTimeout(() => b.remove(), 600); }
      }, 350);
    });
  }

  function start(fromOnboarding) {
    if (!S.s.onboarded) {
      document.body.classList.add("in-onboarding");
      screen.innerHTML = "";
      SP.onboarding.mount(screen);
      currentScreen = "onboarding";
      return;
    }
    document.body.classList.remove("in-onboarding");
    dailyLoginBonus();
    route();
    updateHeader();
  }

  function dailyLoginBonus() {
    const today = S.todayStr();
    if (S.s.lastLogin !== today) {
      S.s.lastLogin = today;
      S.addXP(10, { origin: "login" });
      setTimeout(() => SP.ui.toast("Daily login — +10 XP", "gold"), 900);
    }
  }

  /* ============================================================
     SHELL
     ============================================================ */
  function buildShell() {
    const app = document.getElementById("app");
    app.innerHTML = "";

    // ---- sidebar (desktop) ----
    sidebar = el("aside", { class: "sidebar", id: "sidebar", "aria-label": "Main navigation" });
    const brand = el("div", { class: "brand" },
      el("span", { html: fireflyMark(24) }),
      el("span", { class: "brand-name" }, "ember", el("em", {}, "desk")));
    sidebar.appendChild(brand);
    sidebar.appendChild(el("button", { class: "nav-item", id: "search-btn", "aria-label": "Search everything",
      onclick: openPalette, html: icon("search", 18) + '<span class="nav-label">Search</span>' }));
    NAV.forEach(n => sidebar.appendChild(navButton(n)));
    sidebar.appendChild(el("div", { class: "sidebar-spacer" }));
    sidebar.appendChild(el("div", { class: "sidebar-foot" },
      el("button", { class: "nav-item", id: "collapse-btn", "aria-label": "Collapse sidebar",
        html: icon("menu", 17) + '<span class="nav-label">Collapse</span>', onclick: () => sidebar.classList.toggle("collapsed") }),
      el("button", { class: "nav-item", id: "theme-toggle-side", onclick: cycleTheme,
        html: icon("moon", 17) + '<span class="nav-label">Night-study mode</span>' })));
    app.appendChild(sidebar);

    // ---- main column (no persistent top bar; each screen owns its title) ----
    const main = el("div", { class: "main-col" });
    screen = el("main", { class: "screen", id: "screen" });
    main.appendChild(screen);
    app.appendChild(main);

    // ---- mobile tab bar ----
    const tabbar = el("nav", { class: "tabbar", id: "tabbar", "aria-label": "Main navigation" });
    NAV.forEach(n => {
      tabbar.appendChild(el("button", { class: "tab-item", "data-nav": n.id, onclick: () => go(n.hash) },
        el("span", { html: icon(n.icon, 20) }),
        el("span", {}, n.label)));
    });
    document.body.appendChild(tabbar);

    updateHeader();
  }

  function navButton(n) {
    return el("button", { class: "nav-item", "data-nav": n.id, onclick: () => go(n.hash),
      html: icon(n.icon, 18) + `<span class="nav-label">${n.label}</span>` });
  }

  function fireflyMark(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="15" r="5.6" fill="var(--gold)" opacity="0.20"/>
      <ellipse cx="12" cy="15" rx="3" ry="3.6" fill="var(--gold)"/>
      <ellipse cx="12" cy="9.6" rx="3.4" ry="3.2" fill="var(--ink)"/>
      <path d="M8.4 7.6q-3.4-2.2-4.6-.4 3 .8 4.6 1.6zM15.6 7.6q3.4-2.2 4.6-.4-3 .8-4.6 1.6z" fill="var(--ink)" opacity="0.55"/>
      <path d="M10.2 5.8q-.6-2-2.2-2.6M13.8 5.8q.6-2 2.2-2.6" stroke="var(--ink)" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    </svg>`;
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function cycleTheme() {
    const cur = S.s.settings.theme;
    const nextTheme = cur === "light" ? "dark" : cur === "dark" ? "system" : "light";
    S.s.settings.theme = nextTheme;
    S.applyTheme();
    S.save();
    updateHeader();
    const label = nextTheme === "system" ? "system theme" : nextTheme === "dark" ? "night-study mode on" : "daylight mode on";
    SP.ui.toast(label);
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function route() {
    const h = location.hash || "#/board";
    // leaving board/social — clean up timers
    if (currentScreen === "board" && !h.startsWith("#/board")) SP.board.unmount();
    if (currentScreen === "social" && !h.startsWith("#/social")) SP.social.stopRoomTimer();

    let navId = "board";
    screen.classList.remove("screen--flush");

    if (h.startsWith("#/board")) { navId = "board"; currentScreen = "board"; SP.board.mount(screen); }
    else if (h.startsWith("#/library")) { navId = "library"; currentScreen = "library"; SP.library.mount(screen); }
    else if (h.startsWith("#/social")) { navId = "social"; currentScreen = "social"; SP.social.mount(screen); }
    else if (h.startsWith("#/coach")) { navId = "coach"; currentScreen = "coach"; SP.profile.mountCoach(screen); }
    else if (h.startsWith("#/settings")) { navId = "profile"; currentScreen = "settings"; SP.profile.mountSettings(screen); }
    else if (h.startsWith("#/leaderboard")) { navId = "profile"; currentScreen = "leaderboard"; SP.profile.mountLeaderboard(screen); }
    else if (h.startsWith("#/profile")) { navId = "profile"; currentScreen = "profile"; SP.profile.mount(screen); }
    else if (h.startsWith("#/onboarding")) { S.s.onboarded = false; start(); return; }
    else { navId = "board"; currentScreen = "board"; SP.board.mount(screen); }

    // header title
    const titles = { board: "Study Board", library: "Library", social: "Social", coach: "Coach", leaderboard: "Leaderboard", settings: "Settings", profile: "Profile" };
    const t = document.getElementById("header-title");
    if (t) t.textContent = titles[navId];

    // active states
    document.querySelectorAll("[data-nav]").forEach(b => b.classList.toggle("active", b.dataset.nav === navId));
    // AI mode is immersive — the bottom nav steps aside
    document.body.classList.toggle("coach-mode", navId === "coach");
    // sub-pages (children of a tab) replace the bar with a back pill
    const isSub = /#\/social\/community\/|#\/social\/room\/|#\/leaderboard|#\/settings|#\/coach|#\/library\/item\//.test(h);
    document.body.classList.toggle("subpage", isSub);
    screen.scrollTop = 0;

    // iOS route transition: detail pages push in from the right, tab
    // switches cross-fade with a slight rise (restart via reflow)
    screen.classList.remove("push-in", "fade-rise");
    void screen.offsetWidth;
    screen.classList.add(isSub ? "push-in" : "fade-rise");
  }

  /* ============================================================
     HEADER (persistent streak + level)
     ============================================================ */
  function updateHeader() {
    const st = S.s.streak;
    const chip = document.getElementById("streak-chip");
    if (chip) {
      chip.querySelector(".streak-count").textContent = String(st.count);
      const hour = new Date().getHours();
      const atRisk = !st.studiedToday && hour >= 18;
      chip.classList.toggle("at-risk", atRisk);
      chip.title = st.studiedToday
        ? `Streak fed today — ${st.count} days`
        : atRisk
          ? `Don't lose your streak — finish any session today (${st.count} days at stake)`
          : `${st.count}-day streak — today's session still open`;
    }
    // level + XP now ride on the avatar ring instead of a second chip
    const li = S.levelInfo();
    const av = document.getElementById("avatar-btn");
    if (av) {
      av.innerHTML = avatarHTML(S.s.profile.name, 32, { color: S.s.profile.avatarColor, level: li })
        + `<span class="avatar-level num">${li.level}</span>`;
      av.title = `${S.s.profile.name} — Level ${li.level}, ${fmtNum(S.s.xp)} XP`;
    }
    const side = document.getElementById("theme-toggle-side");
    if (side) {
      const dark = S.resolvedTheme() === "dark";
      side.innerHTML = icon(dark ? "sun" : "moon", 17) + '<span class="nav-label">Night-study mode</span>';
      side.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark night-study theme");
    }
  }

  /* ============================================================
     ⌘K COMMAND PALETTE
     ============================================================ */
  function paletteItems(q) {
    const items = [];
    const matches = (s) => !q || s.toLowerCase().includes(q.toLowerCase());
    NAV.forEach(n => { if (matches(n.label)) items.push({ kind: "Screen", label: n.label, icon: n.icon, run: () => go(n.hash) }); });
    S.s.boards.forEach(b => { if (matches(b.name)) items.push({ kind: "Board", label: b.name, icon: "board", run: () => { S.s.activeBoardId = b.id; S.persistBoard(); go("#/board"); SP.board.rerender(); } }); });
    [...SP.data.LIBRARY, ...S.s.library.created].forEach(l => {
      if (matches(l.title)) items.push({ kind: SP.data.CONTENT_TYPE_LABEL[l.type] || "Item", label: l.title, icon: "library", run: () => go(`#/library/item/${l.id}`) });
    });
    SP.data.COMMUNITIES.forEach(c => { if (matches(c.name)) items.push({ kind: "Community", label: c.name, icon: "users", run: () => go(`#/social/community/${c.id}`) }); });
    SP.data.ROOMS.forEach(r => { if (matches(r.name)) items.push({ kind: r.live ? "Live room" : "Room", label: r.name, icon: "clock", run: () => go(`#/social/room/${r.id}`) }); });
    if (matches("theme")) items.push({ kind: "Action", label: "Toggle night-study mode", icon: "moon", run: cycleTheme });
    if (matches("focus")) items.push({ kind: "Action", label: "Start Focus Mode on the Board", icon: "focus", run: () => go("#/board") });
    return items.slice(0, 12);
  }

  function openPalette() {
    if (document.querySelector(".palette-backdrop")) return;
    const backdrop = el("div", { class: "palette-backdrop" });
    const pal = el("div", { class: "palette", role: "dialog", "aria-label": "Command search" });
    const input = el("input", { class: "palette-input", placeholder: "Jump to a note, community, room, board…", "aria-label": "Search" });
    const list = el("div", { class: "palette-list", role: "listbox" });
    pal.append(input, list);
    backdrop.appendChild(pal);
    document.body.appendChild(backdrop);
    let cursor = 0, items = [];

    const draw = () => {
      items = paletteItems(input.value.trim());
      list.innerHTML = "";
      if (!items.length) {
        list.appendChild(el("p", { class: "small faint", style: { padding: "16px", textAlign: "center" } }, `Nothing matches “${esc(input.value)}” — try “Genetics”, “room”, or “board”.`));
        return;
      }
      items.forEach((it, i) => {
        list.appendChild(el("button", {
          class: `palette-item ${i === cursor ? "cursor" : ""}`, role: "option", "aria-selected": i === cursor,
          onmousemove: () => { if (cursor !== i) { cursor = i; draw(); } },  // redraw only when the hovered row actually changes
          onclick: () => close(it.run),
          html: icon(it.icon, 16) + `<span>${esc(it.label)}</span><span class="palette-kind">${it.kind}</span>`,
        }));
      });
    };
    const close = (run) => { backdrop.remove(); document.removeEventListener("keydown", keys); if (run) run(); };
    const keys = e => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") { e.preventDefault(); cursor = Math.min(items.length - 1, cursor + 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cursor = Math.max(0, cursor - 1); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); const it = items[cursor]; close(it && it.run); }
    };
    input.addEventListener("input", () => { cursor = 0; draw(); });
    document.addEventListener("keydown", keys);
    backdrop.addEventListener("mousedown", e => { if (e.target === backdrop) close(); });
    draw();
    input.focus();
  }

  /* ============================================================
     GLOBAL BINDINGS
     ============================================================ */
  function bindGlobals() {
    window.addEventListener("hashchange", () => {
      if (!S.s.onboarded && !document.body.classList.contains("in-onboarding")) { start(); return; }
      if (S.s.onboarded) route();
    });
    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (S.s.onboarded) openPalette();
      }
    });
    S.on((kind, payload) => {
      if (kind === "xp") {
        updateHeader();
        if (payload.leveledUp && payload.origin !== "chest") {
          // level-up handled by board summary flow to avoid double modals
        }
      }
    });
    // system theme changes
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
        if (S.s.settings.theme === "system") { S.applyTheme(); updateHeader(); }
      });
    }
  }

  return { boot, start, route, updateHeader, openPalette, go };
})();

document.addEventListener("DOMContentLoaded", () => SP.app.boot());
