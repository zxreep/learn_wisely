/* ============================================================
   EMBERDESK — PROFILE & LEADERBOARD
   Profile = trophy shelf (level ring, streak heatmap, badges,
   quests, controls). Leaderboard = weekly league with podium,
   promotion/demotion zones, and the user's row always visible.
   ============================================================ */
window.SP = window.SP || {};

SP.profile = (() => {
  const { el, esc, icon, uid, avatarHTML, flameSVG, emberSVG, ringSVG, fmtNum } = SP.ui;
  const D = SP.data;
  const S = SP.state;

  let container = null;

  /* ============================================================
     PROFILE SCREEN
     ============================================================ */
  let profileTab = "overview";   // overview | badges | controls

  function mount(c) {
    container = c;
    c.innerHTML = "";
    c.classList.remove("screen--flush");
    const page = el("div", { class: "page" });
    c.appendChild(page);
    renderProfile(page);
  }

  /* The shelf used to dump quests, badges and twelve settings onto one
     scroll. Three tabs, one section at a time — the head always stays. */
  const PROFILE_TABS = [["overview", "Overview"], ["badges", "Badges"]];
  function profileTabs(page) {
    return el("div", { class: "tabs profile-tabs", role: "tablist", "aria-label": "Profile sections" },
      ...PROFILE_TABS.map(([id, label]) => el("button", {
        class: "tab-btn", role: "tab", "aria-selected": profileTab === id,
        onclick: () => { profileTab = id; renderProfile(page); },
      }, label)));
  }

  function renderProfile(page) {
    page.innerHTML = "";
    const s = S.s;
    const li = S.levelInfo();

    /* ---- head: avatar w/ level ring, name, stats ---- */
    const head = el("div", { class: "profile-head profile-hero" });
    head.appendChild(el("button", { class: "icon-btn hero-edit", "aria-label": "Edit profile", title: "Edit profile", html: icon("settings", 16), onclick: openEditProfile }));
    head.appendChild(el("div", { class: "hero-avatar", html: avatarHTML(s.profile.name, 92, { color: s.profile.avatarColor, level: li }) }));
    head.appendChild(el("div", { class: "hero-name" }, s.profile.name));
    head.appendChild(el("div", { class: "hero-level" },
      `Level ${li.level} · `, el("span", { class: "num" }, `${fmtNum(s.xp)} XP`),
      li.maxed ? "" : ` · ${fmtNum(li.ceil - s.xp)} to Level ${li.level + 1}`));
    head.appendChild(el("div", { class: "progress hero-progress", html: `<div class="progress-fill progress-fill--ember" style="width:${li.into * 100}%"></div>` }));
    head.appendChild(el("div", { class: "profile-stats" },
      pStat(String(s.streak.count), "day streak", true),
      pStat(String(s.stats.sessions), "sessions"),
      pStat(String(s.stats.hoursFocused), "hours focused"),
      pStat(Math.round(s.stats.quizAccuracy * 100) + "%", "accuracy")));
    page.appendChild(head);
    page.appendChild(profileActions());
    page.appendChild(profileTabs(page));
    if (profileTab === "badges") return renderBadgeShelf(page, s);
    /* settings now live on their own page (#/settings) */

    /* ---- quests carousel (variable reward) ---- */
    page.appendChild(sectionHead("Quests", "Bonus XP — the pool rotates weekly"));
    const questWrap = el("div", { class: "quest-scroll" });
    s.quests.forEach(q => {
      const pct = q.cur / q.goal;
      const claimable = q.cur >= q.goal && !q.claimed;
      questWrap.appendChild(el("div", { class: `quest-card ${claimable ? "claimable" : ""} ${q.claimed ? "locked" : ""}`, style: q.claimed ? { opacity: "0.55" } : {} },
        el("div", { class: "quest-ring", html: ringSVG(pct, 44, 5, claimable ? "ring-fill--ember" : "ring-fill--moss") + `<span class="qr-num">${Math.round(pct * 100)}%</span>` }),
        el("div", { class: "quest-info" },
          el("div", { class: "quest-title" }, q.title),
          el("div", { class: "quest-prog" }, `${q.cur} of ${q.goal} (${q.period})`),
          el("div", { class: "quest-xp" }, `+${q.xp} XP`)),
        claimable ? el("button", { class: "btn btn--sm btn--primary", onclick: () => { S.claimQuest(q.id); SP.app.updateHeader(); renderProfile(page); } }, "Claim")
          : q.claimed ? el("span", { class: "quest-claimed xs", html: icon("check", 12) + "<span>Claimed</span>" }) : null));
    });
    page.appendChild(questWrap);

    /* ---- streak calendar heatmap ---- */
    page.appendChild(sectionHead("Streak calendar", s.streak.studiedToday ? "Today is fed — the flame is safe" : "Today's cell is empty until you study"));
    const hmCard = el("div", { class: "card" });
    hmCard.appendChild(el("div", { style: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "16px" } },
      el("span", { html: flameSVG(34, "flame--big") }),
      el("span", {},
        el("span", { class: "num", style: { fontSize: "28px", fontWeight: "700" } }, String(s.streak.count)),
        el("span", { class: "small muted", style: { marginLeft: "8px" } }, "day streak")),
      el("span", { style: { flex: "1" } }),
      el("span", { class: "freeze-chip" }, el("span", { html: icon("snowflake", 13) }), el("span", {}, `${s.streak.freezes} streak freeze left`))));
    hmCard.appendChild(buildHeatmap());
    hmCard.appendChild(el("div", { class: "xs faint", style: { marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" } },
      "Less",
      ...[0, 1, 2, 3].map(l => el("span", { class: "hm-cell", "data-l": l || null, style: { width: "11px", height: "11px", display: "inline-block" } })),
      "More"));
    page.appendChild(hmCard);

  }

  function renderBadgeShelf(page, s) {
    page.appendChild(sectionHead("Badge shelf", `${s.badgesEarned.length} of ${D.BADGES.length} earned`));
    const cats = ["All", "Consistency", "Mastery", "Social", "Explorer"];
    const cat = badgeCat || "All";
    page.appendChild(el("div", { class: "tabs badge-cats", role: "tablist" },
      ...cats.map(cc => el("button", { class: "tab-btn", role: "tab", "aria-selected": cat === cc,
        onclick: () => { badgeCat = cc; renderProfile(page); } }, cc))));
    const grid = el("div", { class: "badge-grid" });
    D.BADGES.filter(b => cat === "All" || b.cat === cat).forEach(b => {
      const earned = s.badgesEarned.includes(b.id);
      grid.appendChild(el("button", { class: `badge-tile ${earned ? "" : "locked"}`, "data-tier": b.tier, onclick: () => badgeModal(b, earned) },
        el("span", { class: "badge-medal", html: icon(b.icon, 22) }),
        el("span", { class: "badge-name" }, b.name),
        el("span", { class: "badge-cond" }, earned ? b.cond : (b.progress ? `${b.cond} — ${b.progress}` : b.cond)),
        el("span", { class: "badge-tier" }, `${b.tier} · ${earned ? "earned" : "locked"}`)));
    });
    page.appendChild(grid);
  }

  let badgeCat = "All";

  /* leaderboard + settings, each a tappable card */
  function profileActions() {
    return el("div", { class: "profile-actions" },
      leagueCard(),
      el("button", { class: "league-card", onclick: () => { location.hash = "#/settings"; } },
        el("span", { class: "league-card-medal is-settings", html: icon("settings", 20) }),
        el("span", { class: "league-card-main" },
          el("span", { class: "league-card-name" }, "Settings"),
          el("span", { class: "league-card-sub" }, "Appearance, privacy, notifications, data")),
        el("span", { class: "row-chevron", html: icon("chevronRight", 16) })));
  }

  function backPill(title, iconName) {
    return el("div", { class: "back-pillbar" },
      el("div", { class: "back-pill" },
        el("button", { class: "back-pill-btn", "aria-label": "Back", title: "Back", html: icon("arrowLeft", 17), onclick: goBackToProfile }),
        el("span", { class: "pill-div" }),
        el("span", { class: "back-pill-ic", html: icon(iconName, 16) }),
        el("span", { class: "back-pill-title" }, title)));
  }
  function goBackToProfile() {
    if (history.length > 1) history.back(); else location.hash = "#/profile";
  }

  function mountSettings(c) {
    container = c;
    c.innerHTML = "";
    c.classList.remove("screen--flush");
    const page = el("div", { class: "page" });
    c.appendChild(page);
    page.appendChild(backPill("Settings", "settings"));
    page.appendChild(buildSettings());
  }

  /* your live rank in the weekly league (mirrors the board's math) */
  function myRank() {
    const myXp = Math.round(S.s.xp * 0.62);
    const others = D.LEADERBOARD.filter(r => !r.me).map(r => r.xp);
    return 1 + others.filter(x => x > myXp).length;
  }

  /* leaderboard now lives here, behind a single tappable league card */
  function leagueCard() {
    return el("button", { class: "league-card", onclick: () => { location.hash = "#/leaderboard"; } },
      el("span", { class: "league-card-medal", html: icon("trophy", 20) }),
      el("span", { class: "league-card-main" },
        el("span", { class: "league-card-name" }, "Obsidian League"),
        el("span", { class: "league-card-sub" }, `Weekly leaderboard — you're #${myRank()}`)),
      el("span", { class: "row-chevron", html: icon("chevronRight", 16) }));
  }

  function pStat(val, label, gold) {
    return el("div", { class: `p-stat ${gold ? "gold" : ""}` },
      el("div", { class: "ps-val" }, val),
      el("div", { class: "ps-label" }, label));
  }

  /* headings stand alone — the explanatory subtitle line is gone */
  function sectionHead(title, sub) {
    return el("div", { class: "section-head" },
      el("h2", {}, title));
  }

  function buildHeatmap() {
    // 16 weeks: 111 days of history + today
    const hist = D.HEATMAP_HISTORY;
    const today = S.s.streak.studiedToday;
    const cells = [...hist, today ? 3 : 0];
    const wrap = el("div", { class: "heatmap-wrap" });
    const months = el("div", { class: "hm-months" });
    const now = new Date();
    for (let w = 15; w >= 0; w -= 4) {
      const d = new Date(now); d.setDate(d.getDate() - w * 7);
      months.appendChild(el("span", {}, d.toLocaleDateString("en-US", { month: "short" })));
    }
    wrap.appendChild(months);
    const grid = el("div", { class: "heatmap" });
    cells.forEach((lvl, i) => {
      const isToday = i === cells.length - 1;
      const d = new Date(); d.setDate(d.getDate() - (cells.length - 1 - i));
      grid.appendChild(el("span", {
        class: `hm-cell ${isToday ? (today ? "today-done" : "today-empty") : ""}`,
        "data-l": lvl || null,
        title: `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${lvl ? ` — ${["", "light", "solid", "deep"][lvl]} study` : " — no session"}${isToday && !today ? " (today, still open)" : ""}`,
      }));
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function badgeModal(b, earned) {
    const m = SP.ui.modal({
      celebration: true,
      body: el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" } },
        el("div", { class: `badge-tile ${earned ? "" : "locked"}`, "data-tier": b.tier, style: { border: "none", background: "none", cursor: "default" } },
          el("span", { class: "badge-medal", html: icon(b.icon, 36), style: { width: "80px", height: "80px" } })),
        el("h2", {}, b.name),
        el("span", { class: "badge-tier" }, `${b.tier} (${b.cat})`),
        el("p", { class: "small muted", style: { maxWidth: "34ch" } }, earned ? `Earned. Condition: ${b.cond}` : `Locked. ${b.cond}${b.progress ? ` — ${b.progress}` : ""}`),
        earned ? el("p", { class: "xs", style: { color: "var(--moss)", fontWeight: "700" } }, "On your shelf") : null),
      foot: [el("button", { class: "btn", onclick: () => m.close() }, "Close")],
    });
    if (earned && b.tier === "legendary") SP.ui.sparkleBurst(m.el, 18);
  }

  function openEditProfile() {
    const s = S.s;
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } });
    const nameIn = el("input", { class: "input", value: s.profile.name, "aria-label": "Display name" });
    body.append(el("label", { class: "field-label" }, "Display name"), nameIn);

    const colors = ["#0B0B0A", "#2A2A27", "#454540", "#5F5F5A", "#7C7C75", "#96968F"];
    const swatches = el("div", { class: "swatches" });
    colors.forEach(cc => {
      swatches.appendChild(el("button", { class: "swatch", style: { background: cc }, "aria-pressed": s.profile.avatarColor === cc, "aria-label": `Avatar color ${cc}`,
        onclick: () => { s.profile.avatarColor = cc; openEditProfile2(); } }));
    });
    body.append(el("label", { class: "field-label" }, "Avatar tone"), swatches);

    // Ember cosmetics are real rewards / personalization
    const preview = el("div", { class: "ember-preview", style: { width: "100%", height: "130px" },
      html: emberSVG(110, { glow: s.profile.ember.glow, accessory: s.profile.ember.accessory, mood: "cheer" }) });
    body.append(el("label", { class: "field-label" }, "Ember"), preview);
    const accRow = el("div", { class: "time-chips" });
    [["none", "No accessory"], ["cap", "Study cap"], ["glasses", "Glasses"], ["scarf", "Scarf"]].forEach(([id, label]) => {
      accRow.appendChild(el("button", { class: "chip", "aria-pressed": s.profile.ember.accessory === id, onclick: () => { s.profile.ember.accessory = id; openEditProfile2(); } }, label));
    });
    body.appendChild(accRow);
    const glowRow = el("div", { class: "swatches" });
    [["#C9A227", "Gold"], ["#E3BE55", "Bright gold"], ["#F4F4F1", "White-hot"], ["#9E7C13", "Brass"]].forEach(([cc, label]) => {
      glowRow.appendChild(el("button", { class: "swatch", style: { background: cc }, title: label, "aria-pressed": s.profile.ember.glow === cc, "aria-label": `Ember glow ${label}`,
        onclick: () => { s.profile.ember.glow = cc; openEditProfile2(); } }));
    });
    body.append(el("label", { class: "field-label", style: { marginTop: "4px" } }, "Ember glow"), glowRow);

    const m = SP.ui.modal({
      title: "Edit profile", body,
      foot: [el("button", { class: "btn btn--primary", onclick: () => {
        const v = nameIn.value.trim();
        if (v) s.profile.name = v;
        S.save();
        m.close();
        SP.ui.toast("Profile saved");
        SP.app.updateHeader();
        renderProfile(container.querySelector(".page"));
      } }, "Save profile")],
    });
    function openEditProfile2() { m.close(); openEditProfile(); }
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  function buildSettings() {
    const wrap = el("div", {});
    const s = S.s;

    // appearance
    wrap.appendChild(el("div", { class: "settings-section" },
      el("h3", {}, "Appearance"),
      settingRow("Theme", "Dark mode is where Ember's glow pays off.", segmented(
        [["light", "Light"], ["dark", "Dark"], ["system", "System"]],
        s.settings.theme,
        v => { s.settings.theme = v; S.applyTheme(); S.save(); })),
      /* the toggle must read the REAL setting: on = animations calmed.
         The old code inverted both of these rows. */
      settingRow("Reduce motion", "Calms every animation in the app.", toggleEl(s.settings.reduceMotion, v => { s.settings.reduceMotion = v; S.applyTheme(); S.save(); })),
      settingRow("Dyslexia-friendly font", "Wider letter and word spacing, taller line height.", toggleEl(s.settings.dyslexicFont, v => { s.settings.dyslexicFont = v; S.applyTheme(); S.save(); })),
      settingRow("Text size", "Scales the whole interface.", segmented(
        [["normal", "Normal"], ["large", "Large"], ["larger", "Larger"]],
        s.settings.textSize,
        v => { s.settings.textSize = v; S.applyTheme(); S.save(); }))));

    // privacy
    wrap.appendChild(el("div", { class: "settings-section" },
      el("h3", {}, "Privacy"),
      settingRow("Show me on leaderboards", "Turn off to appear as “Anonymous” in leagues.", toggleEl(s.settings.showOnLeaderboard, v => { s.settings.showOnLeaderboard = v; S.save(); SP.ui.toast(v ? "You're back on the leaderboard" : "Hidden from leaderboards"); })),
      settingRow("Profile visibility", "Who can open your trophy shelf.", segmented(
        [["friends", "Friends"], ["everyone", "Everyone"], ["private", "Only me"]],
        s.settings.visibility || "friends",
        v => { s.settings.visibility = v; S.save(); }))));

    // notifications
    wrap.appendChild(el("div", { class: "settings-section" },
      el("h3", {}, "Notifications"),
      settingRow("Streak risk warning", "One nudge in the evening if today's cell is still empty.", toggleEl(s.settings.notifications.streakRisk, v => { s.settings.notifications.streakRisk = v; S.save(); })),
      settingRow("Daily reminder", `Your commitment: ${s.profile.goalMinutes >= 45 ? "45+" : s.profile.goalMinutes} min/day at ${s.profile.reminder}.`, (() => {
        const t = el("input", { type: "time", class: "input", style: { width: "auto" }, value: s.profile.reminder, "aria-label": "Reminder time",
          onchange: e => { s.profile.reminder = e.target.value; S.save(); SP.ui.toast(`Reminder moved to ${e.target.value}`); } });
        return t; })()),
      settingRow("Community replies", "When someone answers your doubt or mentions you.", toggleEl(s.settings.notifications.community, v => { s.settings.notifications.community = v; S.save(); })),
      el("p", { class: "xs faint", style: { padding: "10px 16px 0" } }, "Smart timing: most of your sessions start near 9 PM — reminders will avoid interrupting an active streak.")));

    // data
    wrap.appendChild(el("div", { class: "settings-section" },
      el("h3", {}, "Data & account"),
      settingRow("Export my data", "Download boards, notes, and progress as JSON.",
        el("button", { class: "btn btn--sm", onclick: exportData, html: icon("download", 13) + "<span>Export</span>" })),
      settingRow("Replay onboarding · reset demo data", "Two things you rarely need, kept out of the way.", (() => {
        const adv = SP.ui.menuButton([
          { label: "Replay onboarding", icon: "refresh", run: () => { s.onboarded = false; S.save(); location.hash = "#/onboarding"; SP.app.start(); } },
          { label: "Reset demo data", icon: "trash", danger: true, run: () => SP.ui.confirmDialog({
              title: "Reset demo data?",
              text: "Everything you changed in this demo — boards, notes, XP, streak — goes back to the sample state. This can't be undone.",
              confirmLabel: "Reset everything", danger: true,
              onConfirm: () => {
                S.reset();
                SP.app.updateHeader();
                SP.ui.toast("Demo data reset");
                // land on the profile itself — resetting used to leave you on
                // #/settings with profile content rendered under it
                const before = location.hash;
                location.hash = "#/profile";
                if (location.hash === before) mount(container); // hash didn't change → no hashchange event fires
              },
            }) },
        ], { label: "Advanced data actions" });
        adv.classList.add("btn", "btn--sm");
        adv.style.width = "auto";
        return adv; })())));
    return wrap;
  }

  function settingRow(name, desc, control) {
    return el("div", { class: "setting-row" },
      el("div", { class: "setting-info" },
        el("div", { class: "setting-name" }, name)),
      control);
  }

  function toggleEl(initial, onChange) {
    let on = initial;
    const btn = el("button", { class: "toggle", role: "switch", "aria-checked": String(on), "aria-label": "Toggle setting",
      onclick: () => { on = !on; btn.setAttribute("aria-checked", String(on)); onChange(on); } });
    return btn;
  }

  function segmented(options, current, onChange) {
    const wrap = el("div", { class: "tabs" });
    const btns = options.map(([v, label]) =>
      el("button", { class: "tab-btn", "aria-selected": v === current, onclick: () => {
        btns.forEach(b => b.setAttribute("aria-selected", "false"));
        wrap.querySelector(`[data-v="${v}"]`)?.setAttribute("aria-selected", "true");
        onChange(v);
      }, "data-v": v }, label));
    btns.forEach(b => wrap.appendChild(b));
    return wrap;
  }

  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(S.s, null, 2)], { type: "application/json" });
      const a = el("a", { href: URL.createObjectURL(blob), download: "emberdesk-data.json" });
      document.body.appendChild(a); a.click(); a.remove();
      SP.ui.toast("Data exported — check your downloads");
    } catch (e) {
      SP.ui.toast("Couldn't export — check your connection and try again", "error");
    }
  }

  /* ============================================================
     LEADERBOARD SCREEN
     ============================================================ */
  function mountLeaderboard(c) {
    container = c;
    c.innerHTML = "";
    c.classList.remove("screen--flush");
    const page = el("div", { class: "page" });
    c.appendChild(backPill("Leaderboard", "trophy"));
    c.appendChild(page);

    // brief loading state: "fetching this week's league"
    page.appendChild(el("div", { class: "skeleton", style: { height: "110px", marginBottom: "20px" } }));
    page.appendChild(SP.ui.skeletonGrid(3, 60));
    setTimeout(() => { if (container === c) renderLeaderboard(page); }, 380);
  }

  let lbScope = "week";     // week | alltime
  let lbFilter = "global";  // global | friends | bio

  function renderLeaderboard(page) {
    page.innerHTML = "";
    const s = S.s;

    // league banner (reward register)
    const banner = el("div", { class: "league-banner" },
      el("div", { class: "league-medal", html: leagueMedalSVG() }),
      el("div", { class: "league-info" },
        el("h1", { class: "league-name" }, "Obsidian League"),
        el("p", { class: "league-meta" }, "Week 4 of 4 — 6 days left. Top 10 promote to Aurum, bottom 5 drop to Graphite.")),
      el("div", { style: { textAlign: "right" } },
        el("div", { class: "num", style: { fontSize: "26px", fontWeight: "700" } }, fmtNum(s.xp)),
        el("div", { class: "xs muted" }, "your XP this league")));
    page.appendChild(banner);

    // controls
    const filterLabel = { global: "Everyone", friends: "Friends", bio: "Biology" }[lbFilter];
    const fbtn = el("button", { class: `btn btn--sm filter-btn ${lbFilter !== "global" ? "is-on" : ""}`, "aria-haspopup": "menu", "aria-expanded": "false",
      onclick: () => SP.ui.menu(fbtn, [
        { label: "Everyone", icon: "globe", checked: lbFilter === "global", run: () => { lbFilter = "global"; renderLeaderboard(page); } },
        { label: "Friends", icon: "users", checked: lbFilter === "friends", run: () => { lbFilter = "friends"; renderLeaderboard(page); } },
        { label: "Biology", icon: "dna", checked: lbFilter === "bio", run: () => { lbFilter = "bio"; renderLeaderboard(page); } },
      ]), html: icon("filter", 14) + `<span>${esc(filterLabel)}</span>` });
    page.appendChild(el("div", { class: "lb-controls" },
      el("div", { class: "tabs", role: "tablist" },
        el("button", { class: "tab-btn", role: "tab", "aria-selected": lbScope === "week", onclick: () => { lbScope = "week"; renderLeaderboard(page); } }, "This week"),
        el("button", { class: "tab-btn", role: "tab", "aria-selected": lbScope === "alltime", onclick: () => { lbScope = "alltime"; renderLeaderboard(page); } }, "All-time")),
      fbtn));

    // rows: seed from data, insert the user with live XP
    let rows = D.LEADERBOARD.map((r, i) => ({ ...r }));
    rows = rows.map(r => r.me ? { ...r, xp: Math.round(s.xp * (lbScope === "week" ? 0.62 : 1)), level: S.levelInfo().level, avatarColor: s.profile.avatarColor, name: s.settings.showOnLeaderboard ? s.profile.name : "Anonymous (you)" } : r);
    // all-time shuffles rivals upward a bit
    if (lbScope === "alltime") rows.forEach(r => { if (!r.me) r.xp = Math.round(r.xp * 3.4); });
    if (lbFilter === "friends") {
      const friendNames = new Set(D.FRIENDS.map(f => f.name.split(" ")[0].toLowerCase()));
      rows = rows.filter(r => r.me || friendNames.has(r.name.split(/[\s_]/)[0].toLowerCase()) || ["tanish", "meera", "hana", "sofia", "arjun"].some(n => r.name.toLowerCase().startsWith(n)));
    }
    if (lbFilter === "bio") {
      // subject boards have their own smaller pool
      rows = rows.filter((r, i) => r.me || i % 2 === 0);
      rows.forEach(r => { r.xp = Math.round(r.xp * 0.4); });
    }
    rows.sort((a, b) => b.xp - a.xp);
    const meIdx = rows.findIndex(r => r.me);

    // podium
    const top3 = rows.slice(0, 3);
    const podium = el("div", { class: "podium", style: { marginBottom: "20px" } });
    [1, 0, 2].forEach(slotIdx => {
      const r = top3[slotIdx];
      if (!r) return;
      const place = slotIdx + 1;
      podium.appendChild(el("div", { class: `podium-slot ${place === 1 ? "first" : ""}` },
        el("span", { html: avatarHTML(r.name, place === 1 ? 64 : 52, { color: r.avatarColor }) }),
        el("span", { style: { fontWeight: "700", fontSize: "13px" } }, r.name),
        el("span", { class: "num", style: { fontSize: "13px", color: "var(--ink-muted)" } }, `${fmtNum(r.xp)} XP`),
        el("span", { class: `podium-plinth num place-${place}` }, el("span", { html: icon("medal", 13) }), String(place))));
    });
    page.appendChild(podium);

    // rest of the league with zone lines
    const promotionCut = Math.min(10, rows.length);
    const demotionStart = Math.max(promotionCut, rows.length - 5);
    const list = el("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } });

    rows.slice(3).forEach((r, i) => {
      const rank = i + 4;
      if (rank === promotionCut + 1 && demotionStart > promotionCut) {
        // zone divider between safe middle and demotion
      }
      if (rank === demotionStart + 1 && demotionStart >= promotionCut) {
        list.appendChild(el("div", { class: "zone-label demotion" }, "Demotion zone — bottom 5 drop to Graphite"));
      }
      list.appendChild(lbRow(r, rank, r.me));
    });
    if (promotionCut >= 3) {
      list.prepend(el("div", { class: "zone-label promotion" }, `Promotion zone — top ${promotionCut} move up to Aurum`));
    }
    page.appendChild(list);

    // the user's own row, always visible even if scrolled off
    if (meIdx >= 3) {
      page.appendChild(el("div", { class: "lb-pin" }, lbRow(rows[meIdx], meIdx + 1, true)));
    } else if (meIdx >= 0) {
      page.appendChild(el("p", { class: "xs faint", style: { textAlign: "center", marginTop: "12px" } }, "You're on the podium this week. Stay fed."));
    }
  }

  function lbRow(r, rank, me) {
    return el("div", { class: `lb-row ${me ? "me" : ""} ${rank <= 10 && !me ? "in-promotion" : ""}` },
      el("span", { class: "lb-rank" }, String(rank)),
      el("span", { html: avatarHTML(r.name, 32, { color: r.avatarColor }) }),
      el("span", { class: "lb-name" }, r.name, me ? el("span", { class: "lb-you xs" }, "YOU") : null),
      el("span", { class: "lb-xp" }, `${fmtNum(r.xp)} XP`));
  }

  /* ============================================================
     EMBER AI — a full study-teacher chat.
     A general assistant, not a leaderboard widget: it explains
     concepts, quizzes you, plans your week and keeps you going.
     ============================================================ */
  function coachRich(text) {
    return SP.ui.esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^- /gm, "•  ")
      .replace(/\n/g, "<br>");
  }

  const COACH_KB = [
    { keys: ["epistasis", "dominance", "gene"], title: "Epistasis vs dominance",
      explain: "Dominance is between **alleles of one gene** — the dominant allele masks the recessive at the same locus. Epistasis is between **two different genes** — one gene masks the expression of another.",
      example: "A 12:3:1 ratio in a dihybrid cross is dominant epistasis: the masking gene overrides the second gene's colour.",
      check: "In the 12:3:1 cross, which is at work — dominance or epistasis?",
      answer: "epistasis (dominant epistasis)", why: "Two genes interact and one masks the other. Dominance alone stays within a single gene." },
    { keys: ["photosynthesis", "calvin", "light reaction"], title: "Photosynthesis",
      explain: "Two stages: the **light reactions** (thylakoid) make ATP + NADPH and release O2; the **Calvin cycle** (stroma) spends them to fix CO2 into sugar.",
      example: "Think of the light reactions as charging a battery and the Calvin cycle as spending it to build glucose.",
      check: "Which stage releases oxygen — light reactions or the Calvin cycle?",
      answer: "the light reactions", why: "O2 comes from splitting water in the thylakoid, not from carbon fixation." },
    { keys: ["knapsack", "dynamic programming", "dp"], title: "0/1 Knapsack",
      explain: "For each item and capacity, decide **take or skip**: dp[i][w] = max(dp[i-1][w], val + dp[i-1][w-wt]). '0/1' means each item is taken whole or not at all.",
      example: "Space-optimise to a 1D array by iterating capacity right-to-left so you never reuse an item.",
      check: "Why iterate capacity right-to-left in the 1D version?",
      answer: "to avoid reusing an item", why: "Left-to-right would let the same item count twice — that's the unbounded knapsack." },
    { keys: ["pointer", "memory", "malloc"], title: "Pointers & memory",
      explain: "A pointer is just an **address**. The stack holds locals; the heap holds what you allocate. Bugs come from using addresses after free or writing past bounds.",
      example: "A linked node needs the heap — and a matching free. Forgetting it leaks; using it after frees it crashes.",
      check: "What's the classic bug of using memory after free()?",
      answer: "use-after-free", why: "The address still points at memory now owned by something else." },
    { keys: ["pcc", "jones", "reagent", "oxidation"], title: "PCC vs Jones",
      explain: "Both oxidise alcohols. **PCC** stops at the aldehyde; **Jones** (CrO3/H2SO4) goes all the way to the carboxylic acid.",
      example: "1° alcohol + PCC → aldehyde; 1° alcohol + Jones → carboxylic acid. A 2° alcohol gives a ketone either way.",
      check: "Which reagent gives the aldehyde from a 1° alcohol?",
      answer: "PCC", why: "PCC is anhydrous and milder, so it stops one oxidation step early." },
    { keys: ["rotational", "torque", "inertia", "rotation"], title: "Rotational motion",
      explain: "Rotation mirrors linear motion: torque is like force, moment of inertia like mass, angular like linear. τ = Iα is just F = ma wearing a hat.",
      example: "A skater spins faster by pulling arms in — I drops, so ω rises to conserve angular momentum.",
      check: "If moment of inertia halves, what happens to angular speed (momentum conserved)?",
      answer: "it doubles", why: "L = Iω is constant, so ω must double when I halves." },
  ];

  const findTopic = t => COACH_KB.find(k => k.keys.some(kk => t.includes(kk)));

  function coachGreeting() {
    const s = S.s;
    return `Hi ${s.profile.name.split(" ")[0]} — I'm your study teacher. I can **explain a concept**, **quiz you**, or **plan your week**. ` +
      `You're on a ${s.streak.count}-day streak, so let's keep it fed. What are we working on?`;
  }

  function coachAnswer(text, setQuiz, getQuiz) {
    const s = S.s;
    const t = text.toLowerCase();
    const acc = Math.round(s.stats.quizAccuracy * 100);

    const pending = getQuiz();
    if (pending) {
      setQuiz(null);
      return `Good effort. The answer is **${pending.answer}**.\n${pending.why}\n\nWant another? Say **"quiz me on ${pending.title}"**.`;
    }
    if (/who are you|what can you do|^help$|help me study/.test(t)) {
      return `I'm Ember AI, your study teacher. Try me:\n- **"Explain epistasis simply"** — a concept in plain words\n- **"Quiz me on biology"** — I'll check you and explain the answer\n- **"Make me a study plan"** — a week sized to your goal\n- **"How do I stay focused?"** — tactics that actually work`;
    }
    if (/quiz me|test me|practice|check me/.test(t)) {
      const topic = findTopic(t) || COACH_KB[Math.floor(Math.random() * COACH_KB.length)];
      setQuiz(topic);
      return `Let's check **${topic.title}**.\n\n${topic.check}`;
    }
    const topic = findTopic(t);
    if (topic) {
      return `**${topic.title}**\n${topic.explain}\n\nExample: ${topic.example}\n\nSay **"quiz me on ${topic.title}"** and I'll check you.`;
    }
    if (/(plan|week|schedule|routine|organize)/.test(t)) {
      return `A light, doable week:\n- ${s.profile.goalMinutes} min at ${s.profile.reminder || "9:00 PM"}, 5 days\n- one flashcard review daily\n- one past-paper question on the weekend\n\nThat clears your quests and protects the streak — consistency is the whole game.`;
    }
    if (/(focus|concentrat|distract|procrastinat)/.test(t)) {
      return `Three things that work:\n- **one target** — Focus Mode hides everything else\n- **25-minute blocks** with a real break after\n- **phone in another room** — distance beats willpower\n\nYou've logged ${s.stats.hoursFocused} focused hours; short daily blocks grow that fast.`;
    }
    if (/(streak|flame|motivat|tired|give up)/.test(t)) {
      return s.streak.studiedToday
        ? `Your ${s.streak.count}-day streak is already safe today — anything now is bonus. Protect the floor, then build.`
        : `Your ${s.streak.count}-day streak is still open. Don't aim for a great session — aim for a **ten-minute** one. Starting is the hard part; the rest follows.`;
    }
    if (/(exam|test|accuracy|remember|revise|revision)/.test(t)) {
      return `Your quiz accuracy is ${acc}%. To move it:\n- review **yesterday's** cards before new ones\n- retrieve, don't re-read — close the notes and recall\n- space it out; cramming decays in days\n\nWant me to quiz you right now?`;
    }
    return `I hear you. As your teacher I'd keep it simple: pick **one** topic, spend ${s.profile.goalMinutes} minutes on it, and finish by recalling it from memory. ` +
      `Tell me the topic (biology, DSAs, chemistry, physics) and I'll explain it or quiz you on it.`;
  }

  /* ---- pre-API reply modes + chat history ---- */
  const aiMode = () => S.s.settings.aiMode || "normal";
  let aiHistory = [];

  function goBack() {
    if (history.length > 1) history.back();
    else location.hash = "#/board";
  }

  function mountCoach(c) {
    container = c;
    c.innerHTML = "";
    c.classList.add("screen--flush");
    let quiz = null;
    const curMsgs = [];
    const root = el("div", { class: "coach-screen" });

    const msgs = el("div", { class: "coach-msgs" });
    const push = (who, text, rich, err) => {
      curMsgs.push({ who, text, rich: !!rich });
      const line = el("div", { class: `coach-line ${who}` });
      if (who === "ai") line.appendChild(el("span", { class: "coach-av", html: icon("sparkle", 12) }));
      const bub = el("div", { class: `coach-bubble ${err ? "error" : ""}` });
      if (rich) bub.innerHTML = coachRich(text); else bub.textContent = text;
      line.appendChild(bub);
      msgs.appendChild(line);
      msgs.scrollTop = msgs.scrollHeight;
      return line;
    };
    const typing = () => el("div", { class: "coach-line ai" },
      el("span", { class: "coach-av", html: icon("sparkle", 12) }),
      el("div", { class: "coach-bubble coach-typing" }, el("span"), el("span"), el("span")));

    /* ---- pill header: AI name + three-bars menu ---- */
    root.appendChild(el("div", { class: "coach-topbar" },
      el("div", { class: "coach-pill" },
        el("button", { class: "coach-back", "aria-label": "Back", title: "Back", html: icon("arrowLeft", 17), onclick: goBack }),
        el("span", { class: "pill-div" }),
        el("span", { class: "coach-pill-av", html: icon("sparkle", 14) }),
        el("span", { class: "coach-pill-name" }, "Ember AI"),
        el("span", { class: "pill-div" }),
        el("button", { class: "coach-menu", "aria-label": "Assistant menu", "aria-haspopup": "menu",
          html: icon("menu", 17), onclick: e => openMenu(e.currentTarget) }))));

    root.appendChild(msgs);
    push("ai", coachGreeting(), true);

    const chips = el("div", { class: "coach-chips" });
    ["Explain epistasis simply", "Quiz me on biology", "Make me a study plan", "How do I stay focused?"].forEach(q =>
      chips.appendChild(el("button", { class: "chip", onclick: () => ask(q) }, q)));
    root.appendChild(chips);

    const input = el("textarea", { class: "coach-input", rows: 1, placeholder: "Message Ember AI…", "aria-label": "Message Ember AI" });
    const fit = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 96) + "px"; };
    input.addEventListener("input", fit);
    const send = el("button", { class: "btn btn--sm btn--quiet coach-send", html: icon("send", 15), "aria-label": "Send", onclick: () => ask(input.value) });
    input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.click(); } });
    root.appendChild(el("div", { class: "coach-input-row" }, input, send));

    /* ---- three-bars menu ---- */
    function openMenu(t) {
      SP.ui.menu(t, [
        { label: "New chat", icon: "refresh", run: newChat },
        { label: "Chat history", icon: "clock", run: openHistory },
        { sep: true },
        { label: "AI settings", icon: "settings", run: openSettings },
      ]);
    }

    function newChat() {
      if (curMsgs.some(m => m.who === "me")) aiHistory.unshift({ id: uid(), title: curMsgs.find(m => m.who === "me").text.slice(0, 38), messages: curMsgs.slice() });
      aiHistory = aiHistory.slice(0, 12);
      curMsgs.length = 0; quiz = null;
      msgs.innerHTML = "";
      push("ai", coachGreeting(), true);
    }

    function openSettings() {
      const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } });
      body.appendChild(el("p", { class: "small muted" }, "A real model API isn't connected yet, so choose how Ember AI replies."));
      body.appendChild(el("label", { class: "field-label" }, "Reply mode"));
      body.appendChild(segmented([["normal", "Normal"], ["error", "Error"], ["echo", "Echo"]], aiMode(),
        v => { S.s.settings.aiMode = v; S.save(); SP.ui.toast(`Reply mode: ${v}`); }));
      body.appendChild(el("p", { class: "xs faint" }, "Error simulates a failed API call; Echo just repeats you — handy for testing before the real API lands."));
      const m = SP.ui.modal({ title: "AI settings", body, foot: [el("button", { class: "btn", onclick: () => m.close() }, "Done")] });
    }

    function openHistory() {
      const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });
      if (!aiHistory.length) body.appendChild(el("p", { class: "small muted", style: { textAlign: "center", padding: "16px" } }, "No past chats yet — start one and it will be saved here."));
      const hm = SP.ui.modal({ title: "Chat history", body });
      aiHistory.forEach(h => {
        const row = el("button", { class: "conv-row", onclick: () => { loadSession(h); hm.close(); } },
          el("span", { class: "conv-art", html: icon("sparkle", 16) }),
          el("span", { class: "conv-main" },
            el("span", { class: "conv-name" }, h.title),
            el("span", { class: "conv-preview" }, `${h.messages.length} messages`)),
          el("span", { class: "row-chevron", html: icon("chevronRight", 16) }));
        body.appendChild(row);
      });
    }

    function loadSession(h) {
      curMsgs.length = 0; quiz = null;
      msgs.innerHTML = "";
      h.messages.forEach(m => push(m.who, m.text, m.rich));
    }

    function ask(q) {
      const question = (q || "").trim();
      if (!question) return;
      push("me", question);
      if (chips.isConnected) chips.remove();
      input.value = ""; fit();
      const think = typing();
      msgs.appendChild(think);
      msgs.scrollTop = msgs.scrollHeight;
      setTimeout(() => {
        think.remove();
        const mode = aiMode();
        if (mode === "error") push("ai", "Connection error — the model API isn't connected yet. Switch the reply mode under the three-bars menu, AI settings.", false, true);
        else if (mode === "echo") push("ai", `Echo (test mode): "${question}"`);
        else push("ai", coachAnswer(question, v => { quiz = v; }, () => quiz), true);
      }, 600);
    }
    c.appendChild(root);
  }



  function leagueMedalSVG() {
    return `<svg width="60" height="60" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 4l7.6 5.5 9.4-.6 2.9 9 7.6 5.6-4.6 8.2 1.7 9.2-9 2.9L42.7 51 32 52.6 21.3 51l-4.9-8.6-9-2.9 1.7-9.2L4.5 22l7.6-5.6 2.9-9 9.4.6z" fill="var(--ink)"/>
      <circle cx="32" cy="28" r="12.5" fill="var(--gold)"/>
      <text x="32" y="34" text-anchor="middle" font-size="16" font-weight="800" fill="var(--gold-ink)" style="font-family:var(--font-display)">O4</text>
    </svg>`;
  }

  return { mount, mountLeaderboard, renderProfile, mountCoach, mountSettings };
})();
