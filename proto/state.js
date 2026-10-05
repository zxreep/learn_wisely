/* ============================================================
   EMBERDESK — STATE & GAMIFICATION ENGINE
   XP · streaks (with freeze) · levels · quests · persistence
   ============================================================ */
window.SP = window.SP || {};

SP.state = (() => {
  const KEY = "emberdesk.state.v1";

  const LEVELS = [0, 150, 400, 750, 1200, 1750, 2400, 3200, 4200, 5400, 6800, 8400, 10200, 12200, 14400];

  function defaults() {
    return {
      version: 1,
      onboarded: false,
      profile: {
        name: "Aarav",
        avatarColor: "#0B0B0A",
        ember: { glow: "#C9A227", accessory: "none" },
        goalMinutes: 20,
        reminder: "21:00",
        studyingFor: "college",
        subjects: ["bio", "ochem"],
        exams: [],
        studyStyle: ["practice"],
      },
      settings: {
        theme: "system",        // light | dark | system
        reduceMotion: false,
        dyslexicFont: false,
        textSize: "normal",     // normal | large | larger
        showOnLeaderboard: true,
        notifications: { streakRisk: true, reminders: true, community: false },
      },
      xp: 1240,
      streak: { count: 12, freezes: 1, lastStudied: null, studiedToday: false, history: null },
      boards: [],
      activeBoardId: null,
      library: {
        saved: ["l9", "l13", "l16"],
        // real folder tree (iOS Files style). Legacy builds stored plain
        // strings here — library.js migrates those to folder objects.
        folders: [
          { id: "f-bio", name: "Midterm — Biology", parent: null },
          { id: "f-reagents", name: "Reagents", parent: null },
        ],
        places: {},     // itemId -> folderId (where a saved/created item lives)
        created: [],   // user-made notes/quizzes/uploads
      },
      quests: null,    // copied from data.QUESTS with live progress
      badgesEarned: null,
      stats: { sessions: 34, cardsReviewed: 612, quizAccuracy: 0.87, widgetsPlaced: 11, hoursFocused: 19.5 },
      social: {
        votes: {},       // postId -> 1 | -1
        joinedRooms: [],
        joinedCommunities: ["c2"],
      },
      lastSeen: Date.now(),
    };
  }

  let state = defaults();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(defaults(), parsed);
        state.profile = Object.assign(defaults().profile, parsed.profile || {});
        state.settings = Object.assign(defaults().settings, parsed.settings || {});
        state.streak = Object.assign(defaults().streak, parsed.streak || {});
        state.library = Object.assign(defaults().library, parsed.library || {});
      }
    } catch (e) { /* corrupted state — start fresh */ }
    if (!state.boards || !state.boards.length) {
      state.boards = JSON.parse(JSON.stringify(SP.data.DEFAULT_BOARDS));
      state.activeBoardId = state.boards[0].id;
    }
    if (!state.quests) state.quests = JSON.parse(JSON.stringify(SP.data.QUESTS));
    if (!state.badgesEarned) state.badgesEarned = SP.data.BADGES.filter(b => b.earned).map(b => b.id);
    rollDay();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { SP.ui.toast("Couldn't save — check your connection and try again", "error"); }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = defaults();
    state.onboarded = true;   // the sample student is already set up
    state.boards = JSON.parse(JSON.stringify(SP.data.DEFAULT_BOARDS));
    state.activeBoardId = state.boards[0].id;
    state.quests = JSON.parse(JSON.stringify(SP.data.QUESTS));
    state.badgesEarned = SP.data.BADGES.filter(b => b.earned).map(b => b.id);
    save();
    emit();
  }

  /* ---------- day rollover / streak protection (loss aversion) ---------- */
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function rollDay() {
    const today = todayStr();
    if (state.streak.lastStudied === today) { state.streak.studiedToday = true; return; }
    if (state.streak.lastStudied) {
      const last = new Date(state.streak.lastStudied + "T00:00:00");
      const diff = Math.round((new Date(today + "T00:00:00") - last) / 86400000);
      if (diff === 1) {
        // streak still alive, just not fed yet today
      } else if (diff > 1) {
        if (state.streak.freezes > 0 && diff === 2) {
          state.streak.freezes -= 1;
          // freeze absorbed one missed day
        } else {
          state.streak.count = 0;
        }
      }
    }
    state.streak.studiedToday = false;
  }

  function markStudiedToday() {
    const today = todayStr();
    const firstToday = state.streak.lastStudied !== today;
    state.streak.lastStudied = today;
    state.streak.studiedToday = true;
    if (firstToday) {
      state.streak.count += 1;
      return { streakUp: true, count: state.streak.count };
    }
    return { streakUp: false, count: state.streak.count };
  }

  /* ---------- XP & levels ---------- */
  function levelInfo(xp = state.xp) {
    let level = 1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i]) { level = i + 1; break; }
    }
    const floor = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    const ceil = LEVELS[Math.min(level, LEVELS.length - 1)];
    const span = ceil > floor ? ceil - floor : 1;
    const into = Math.min(1, (xp - floor) / span);
    return { level, floor, ceil: ceil > floor ? ceil : floor + 500, into, maxed: level >= LEVELS.length };
  }

  function addXP(amount, opts = {}) {
    const before = levelInfo();
    state.xp += amount;
    const after = levelInfo();
    save();
    emit("xp", { amount, before, after, leveledUp: after.level > before.level, origin: opts.origin });
    return { before, after, leveledUp: after.level > before.level };
  }

  /* ---------- quests ---------- */
  function bumpQuest(id, by = 1) {
    const q = state.quests.find(q => q.id === id);
    if (!q) return;
    q.cur = Math.min(q.goal, q.cur + by);
    save();
    emit("quest", q);
  }
  function claimQuest(id) {
    const q = state.quests.find(q => q.id === id);
    if (!q || q.cur < q.goal || q.claimed) return;
    q.claimed = true;
    save();
    addXP(q.xp, { origin: "quest" });
    SP.ui.toast(`Claimed +${q.xp} XP — ${q.title}`, "gold");
  }

  /* ---------- badges ---------- */
  function earnBadge(id) {
    if (state.badgesEarned.includes(id)) return null;
    state.badgesEarned.push(id);
    save();
    const badge = SP.data.BADGES.find(b => b.id === id);
    emit("badge", badge);
    return badge;
  }

  /* ---------- library ---------- */
  function saveItem(id) {
    if (!state.library.saved.includes(id)) {
      state.library.saved.push(id);
      save();
      emit();
      return true;
    }
    return false;
  }
  function unsaveItem(id) {
    state.library.saved = state.library.saved.filter(x => x !== id);
    save(); emit();
  }
  function addCreated(item) {
    state.library.created.unshift(item);
    save(); emit();
  }

  /* ---------- boards ---------- */
  function activeBoard() {
    return state.boards.find(b => b.id === state.activeBoardId) || state.boards[0];
  }
  function addBoard(name, widgets = []) {
    const b = { id: "board-" + Math.random().toString(36).slice(2, 8), name, widgets };
    state.boards.push(b);
    state.activeBoardId = b.id;
    save(); emit();
    return b;
  }
  function removeBoard(id) {
    if (state.boards.length <= 1) return;
    state.boards = state.boards.filter(b => b.id !== id);
    if (state.activeBoardId === id) state.activeBoardId = state.boards[0].id;
    save(); emit();
  }
  function persistBoard() { save(); }

  /* ---------- theme ---------- */
  function resolvedTheme() {
    if (state.settings.theme === "system") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return state.settings.theme;
  }
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", resolvedTheme());
    document.documentElement.setAttribute("data-motion", state.settings.reduceMotion ? "reduced" : "full");
    document.documentElement.setAttribute("data-textsize", state.settings.textSize);
    document.documentElement.setAttribute("data-dyslexic", state.settings.dyslexicFont ? "on" : "off");
  }

  /* ---------- pub/sub ---------- */
  function on(fn) { listeners.push(fn); }
  function emit(kind, payload) {
    listeners.forEach(fn => { try { fn(kind, payload); } catch (e) { console.error(e); } });
  }

  return {
    get s() { return state; },
    load, save, reset,
    addXP, levelInfo, markStudiedToday, rollDay, todayStr,
    bumpQuest, claimQuest, earnBadge,
    saveItem, unsaveItem, addCreated,
    activeBoard, addBoard, removeBoard, persistBoard,
    resolvedTheme, applyTheme,
    on, emit,
  };
})();
