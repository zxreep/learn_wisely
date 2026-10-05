/* ============================================================
   EMBERDESK — ONBOARDING
   One question per screen (Hick's Law), thin progress bar at
   top (Zeigarnik), Ember reacting to answers, one orchestrated
   celebration at the end. Commitment-framed daily goal.
   ============================================================ */
window.SP = window.SP || {};

SP.onboarding = (() => {
  const { el, esc, icon, emberSVG } = SP.ui;
  const D = SP.data;

  const answers = {
    studyingFor: null,
    exams: [],
    subjects: [],
    goal: 20,
    styles: [],
    reminder: "21:00",
    ember: { glow: "#C9A227", accessory: "none" },
  };

  let step = 0;
  let root = null;
  const TOTAL = 8;

  const FOR_OPTIONS = [
    { id: "school", label: "School", sub: "Classes 9–12" },
    { id: "college", label: "College", sub: "University coursework" },
    { id: "exam", label: "Competitive exam", sub: "JEE, NEET, SAT and friends" },
    { id: "self", label: "Self-learning", sub: "My own syllabus" },
  ];

  const STYLE_OPTIONS = [
    { id: "reading", label: "Reading notes", icon: "file" },
    { id: "visual", label: "Visual / mindmaps", icon: "network" },
    { id: "practice", label: "Practice / quizzes", icon: "target" },
    { id: "group", label: "Group study", icon: "users" },
  ];

  function mount(container) {
    root = container;
    step = 0;
    render();
  }

  function render() {
    root.innerHTML = "";
    const onb = el("div", { class: "onb" });
    const pct = Math.round((step / (TOTAL - 1)) * 100);
    onb.appendChild(el("div", { class: "onb-progress", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100,
      html: `<div class="onb-progress-fill" style="width:${pct}%"></div>` }));

    const stage = el("div", { class: "onb-stage" });
    const builders = [welcome, studyingFor, subjects, goal, styles, reminder, emberCustom, celebrate];
    builders[step](stage);
    onb.appendChild(stage);
    root.appendChild(onb);
  }

  function next() { step = Math.min(TOTAL - 1, step + 1); render(); }
  function back() { step = Math.max(0, step - 1); render(); }

  function foot(stage, { onNext, nextLabel = "Continue", canNext = true, showBack = true, stepLabel }) {
    const foot = el("div", { class: "onb-foot" });
    const btn = el("button", { class: "btn btn--primary btn--lg", onclick: () => onNext && onNext() }, nextLabel);
    btn.disabled = !canNext;
    foot.appendChild(btn);
    if (showBack && step > 0) {
      foot.appendChild(el("button", { class: "btn btn--ghost", onclick: back, html: icon("chevronLeft", 16) + "Back" }));
    }
    if (stepLabel) foot.appendChild(el("div", { class: "onb-stepcount" }, stepLabel));
    stage.appendChild(foot);
  }

  function emberCorner(stage, mood = "happy", size = 108) {
    const wrap = el("div", { class: "onb-ember", html: emberSVG(size, { glow: answers.ember.glow, accessory: answers.ember.accessory, mood }) });
    stage.appendChild(wrap);
    return wrap;
  }

  /* ---------- Step 1: Welcome ---------- */
  function welcome(stage) {
    emberCorner(stage, "cheer", 128);
    stage.appendChild(el("h1", { class: "onb-title" }, "One desk for everything you're studying."));
    foot(stage, { onNext: next, nextLabel: "Get started", showBack: false, stepLabel: `Step 1 of ${TOTAL}` });
  }

  /* ---------- Step 2: What are you studying for? ---------- */
  function studyingFor(stage) {
    stage.appendChild(el("h1", { class: "onb-title" }, "What are you studying for?"));
    const choices = el("div", { class: "onb-choices" });
    FOR_OPTIONS.forEach((opt, i) => {
      const chip = el("button", {
        class: `chip chip--big ${answers.studyingFor === opt.id ? "selected" : ""}`,
        "aria-pressed": answers.studyingFor === opt.id,
        style: { animationDelay: `${i * 60}ms`, flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "14px 22px" },
        onclick: () => { answers.studyingFor = opt.id; render(); },
      },
        el("span", {}, opt.label),
        el("span", { class: "xs muted", style: { fontWeight: "500" } }, opt.sub));
      choices.appendChild(chip);
    });
    stage.appendChild(choices);
    foot(stage, { onNext: next, canNext: !!answers.studyingFor, stepLabel: `Step 2 of ${TOTAL}` });
  }

  /* ---------- Step 3: Subjects (branches to exams) ---------- */
  function subjects(stage) {
    const isExam = answers.studyingFor === "exam";
    if (isExam) {
      stage.appendChild(el("h1", { class: "onb-title" }, "Which exam are you prepping?"));
      const choices = el("div", { class: "onb-choices" });
      D.EXAMS.forEach((ex, i) => {
        const selected = answers.exams.includes(ex.id);
        const chip = el("button", {
          class: `chip chip--big ${selected ? "selected" : ""}`,
          "aria-pressed": selected,
          style: { animationDelay: `${i * 50}ms` },
          onclick: () => {
            if (ex.id === "other") { answers.exams = ["other"]; render(); return; }
            answers.exams = selected ? answers.exams.filter(x => x !== ex.id) : [...answers.exams.filter(x => x !== "other"), ex.id];
            render();
          },
        }, ex.name + (ex.note ? "" : ""));
        if (ex.note) chip.title = ex.note;
        choices.appendChild(chip);
      });
      stage.appendChild(choices);
      foot(stage, { onNext: next, canNext: answers.exams.length > 0, stepLabel: `Step 3 of ${TOTAL}` });
    } else {
      stage.appendChild(el("h1", { class: "onb-title" }, "Pick your subjects"));
      const choices = el("div", { class: "onb-choices" });
      D.SUBJECTS.forEach((s, i) => {
        const selected = answers.subjects.includes(s.id);
        choices.appendChild(el("button", {
          class: `chip chip--big ${selected ? "selected" : ""}`,
          "aria-pressed": selected,
          style: { animationDelay: `${i * 50}ms` },
          onclick: () => {
            answers.subjects = selected ? answers.subjects.filter(x => x !== s.id) : [...answers.subjects, s.id];
            render();
          },
        }, el("span", { html: icon(s.icon, 16) }), el("span", {}, s.name)));
      });
      stage.appendChild(choices);
      foot(stage, { onNext: next, canNext: answers.subjects.length > 0, stepLabel: `Step 3 of ${TOTAL}` });
    }
  }

  /* ---------- Step 4: Daily goal — commitment device ---------- */
  function goal(stage) {
    emberCorner(stage, answers.goal >= 30 ? "wow" : "calm", 84);
    stage.appendChild(el("h1", { class: "onb-title" }, "Your daily study goal"));
    const wrap = el("div", { class: "goal-slider-wrap" });
    const val = el("div", { class: "goal-value num" });
    const updateVal = () => {
      val.innerHTML = answers.goal >= 45 ? `45+ <small>min / day</small>` : `${answers.goal} <small>min / day</small>`;
      commitLine.textContent = `You're committing to ${answers.goal >= 45 ? "45+" : answers.goal} minutes a day.`;
      emberWrap.innerHTML = emberSVG(84, { glow: answers.ember.glow, accessory: answers.ember.accessory, mood: answers.goal >= 30 ? "wow" : "calm" });
    };
    const stops = [10, 20, 30, 45];
    const slider = el("input", {
      type: "range", class: "goal-slider", min: "0", max: "3", step: "1", value: String(stops.indexOf(answers.goal)),
      "aria-label": "Daily study goal in minutes",
      oninput: e => { answers.goal = stops[+e.target.value]; updateVal(); },
    });
    wrap.appendChild(val);
    wrap.appendChild(slider);
    wrap.appendChild(el("div", { class: "goal-ticks" },
      ...stops.map(s => el("span", {}, s === 45 ? "45+" : String(s)))));
    stage.appendChild(wrap);
    const commitLine = el("p", { class: "commitment-line" });
    stage.appendChild(commitLine);
    const emberWrap = stage.querySelector(".onb-ember");
    updateVal();
    foot(stage, { onNext: next, nextLabel: "I'll keep it", stepLabel: `Step 4 of ${TOTAL}` });
  }

  /* ---------- Step 5: Study style (pre-populates the board) ---------- */
  function styles(stage) {
    stage.appendChild(el("h1", { class: "onb-title" }, "How do you like to study?"));
    const choices = el("div", { class: "onb-choices" });
    STYLE_OPTIONS.forEach((opt, i) => {
      const selected = answers.styles.includes(opt.id);
      choices.appendChild(el("button", {
        class: `chip chip--big ${selected ? "selected" : ""}`,
        "aria-pressed": selected,
        style: { animationDelay: `${i * 50}ms` },
        onclick: () => {
          answers.styles = selected ? answers.styles.filter(x => x !== opt.id) : [...answers.styles, opt.id];
          render();
        },
      }, el("span", { html: icon(opt.icon, 16) }), el("span", {}, opt.label)));
    });
    stage.appendChild(choices);
    foot(stage, { onNext: next, canNext: answers.styles.length > 0, stepLabel: `Step 5 of ${TOTAL}` });
  }

  /* ---------- Step 6: Reminder time ---------- */
  function reminder(stage) {
    stage.appendChild(el("h1", { class: "onb-title" }, "When should we nudge you?"));
    const times = ["16:00", "18:00", "20:00", "21:00", "22:00"];
    const chips = el("div", { class: "time-chips" });
    times.forEach(t => {
      chips.appendChild(el("button", {
        class: `chip num ${answers.reminder === t ? "selected" : ""}`,
        "aria-pressed": answers.reminder === t,
        onclick: () => { answers.reminder = t; render(); },
      }, t));
    });
    stage.appendChild(chips);
    const custom = el("input", { type: "time", class: "input", style: { maxWidth: "160px", textAlign: "center" }, value: answers.reminder,
      "aria-label": "Custom reminder time",
      onchange: e => { if (e.target.value) { answers.reminder = e.target.value; render(); } } });
    stage.appendChild(el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" } },
      el("span", { class: "xs faint" }, "or pick your own"), custom));
    foot(stage, { onNext: next, nextLabel: "Set reminder", stepLabel: `Step 6 of ${TOTAL}` });
  }

  /* ---------- Step 7: Customize Ember ---------- */
  function emberCustom(stage) {
    stage.appendChild(el("h1", { class: "onb-title" }, "Make Ember yours"));
    const glows = [
      { id: "#C9A227", name: "Gold" },
      { id: "#E3BE55", name: "Bright gold" },
      { id: "#F4F4F1", name: "White-hot" },
      { id: "#9E7C13", name: "Brass" },
    ];
    const accessories = [
      { id: "none", name: "No accessory" },
      { id: "cap", name: "Study cap" },
      { id: "glasses", name: "Reading glasses" },
      { id: "scarf", name: "Winter scarf" },
    ];
    const box = el("div", { class: "ember-custom" });
    const preview = el("div", { class: "ember-preview", html: emberSVG(120, { glow: answers.ember.glow, accessory: answers.ember.accessory, mood: "cheer" }) });
    const opts = el("div", { class: "ember-options" });
    const glowRow = el("div", { class: "swatches" });
    glows.forEach(g => {
      glowRow.appendChild(el("button", {
        class: "swatch", style: { background: g.id }, title: g.name, "aria-label": `Glow: ${g.name}`,
        "aria-pressed": answers.ember.glow === g.id,
        onclick: () => { answers.ember.glow = g.id; render(); },
      }));
    });
    const accRow = el("div", { class: "time-chips" });
    accessories.forEach(a => {
      accRow.appendChild(el("button", {
        class: `chip ${answers.ember.accessory === a.id ? "selected" : ""}`,
        "aria-pressed": answers.ember.accessory === a.id,
        onclick: () => { answers.ember.accessory = a.id; render(); },
      }, a.name));
    });
    opts.appendChild(el("span", { class: "field-label" }, "Glow"));
    opts.appendChild(glowRow);
    opts.appendChild(el("span", { class: "field-label", style: { marginTop: "8px" } }, "Accessory"));
    opts.appendChild(accRow);
    box.appendChild(preview);
    box.appendChild(opts);
    stage.appendChild(box);
    foot(stage, { onNext: finish, nextLabel: "Finish setup", stepLabel: `Step 7 of ${TOTAL}` });
  }

  /* ---------- Step 8: Celebration (one orchestrated moment) ---------- */
  function celebrate(stage) {
    const emberWrap = el("div", { class: "onb-ember onb-celebrate", html: emberSVG(140, { glow: answers.ember.glow, accessory: answers.ember.accessory, mood: "cheer" }) });
    stage.appendChild(emberWrap);
    stage.appendChild(el("h1", { class: "onb-title" }, "Your Board is ready."));
    const starterNames = starterSummary();
    const list = el("div", { class: "ready-checklist" });
    starterNames.forEach((line, i) => {
      list.appendChild(el("div", { class: "ready-item", style: { animationDelay: `${500 + i * 280}ms` } },
        el("span", { class: "dot-ok", html: icon("check", 12) }),
        el("span", {}, line)));
    });
    stage.appendChild(list);
    foot(stage, { onNext: enterApp, nextLabel: "Enter your Board", showBack: false });
    // the one orchestrated moment: sparkles after Ember lands
    setTimeout(() => SP.ui.sparkleBurst(emberWrap, 22), 700);
  }

  function starterSummary() {
    const lines = [];
    const subjectName = firstSubjectName();
    lines.push(`A checklist seeded with your ${subjectName} tasks`);
    const style = answers.styles[0];
    if (style === "practice") lines.push("Your first flashcard deck, ready to review");
    else if (style === "visual") lines.push("A mindmap pinned to the canvas");
    else if (style === "group") lines.push("A shortcut to tonight's live study room");
    else lines.push("A notes viewer with your first reading");
    lines.push(`A pomodoro set to your ${answers.goal >= 45 ? "45+" : answers.goal}-minute commitment`);
    return lines;
  }

  function firstSubjectName() {
    const subs = effectiveSubjects();
    const s = D.SUBJECTS.find(x => x.id === subs[0]);
    return s ? s.name.toLowerCase() : "first";
  }

  function effectiveSubjects() {
    if (answers.subjects.length) return answers.subjects;
    // derive from exam choices
    const map = {
      jee: ["calc2", "ochem"], neet: ["bio", "ochem"], upsc: ["hist"],
      sat: ["calc2", "hist"], ap: ["bio", "calc2"], other: ["cs"],
    };
    const set = new Set();
    answers.exams.forEach(e => (map[e] || []).forEach(s => set.add(s)));
    return [...set].length ? [...set] : ["bio"];
  }

  /* ---------- Build starter widgets from answers ---------- */
  function buildStarterWidgets() {
    const subs = effectiveSubjects();
    const subjectName = firstSubjectName();
    const widgets = [];
    let y = 60;
    const uid = SP.ui.uid;

    // 1. todo seeded with real tasks
    widgets.push({
      id: uid(), type: "todo", x: 60, y, w: 300, h: 280, rot: -0.8,
      config: { title: `This week — ${subjectName}`, items: [
        { text: `Skim the ${subjectName} starter notes`, done: false },
        { text: "First flashcard review (8 cards)", done: false },
        { text: "One 25-minute focus session", done: false },
      ] },
    });

    // 2. study-style widget
    const style = answers.styles[0] || "practice";
    if (style === "practice") {
      widgets.push({ id: uid(), type: "flashcards", x: 400, y: y - 10, w: 300, h: 330, rot: 1.2,
        config: { deckTitle: deckFor(subs), libId: deckIdFor(subs) } });
    } else if (style === "visual") {
      widgets.push({ id: uid(), type: "mindmap", x: 390, y: y - 10, w: 360, h: 280, rot: 0.7,
        config: { title: mindmapTitleFor(subs) } });
    } else if (style === "group") {
      widgets.push({ id: uid(), type: "room", x: 400, y, w: 280, h: 210, rot: 1.5, config: { roomId: "r1" } });
    } else {
      widgets.push({ id: uid(), type: "notesview", x: 390, y: y - 10, w: 320, h: 300, rot: 0.9,
        config: { libId: notesIdFor(subs) } });
    }

    // 3. countdown if exam, else pomodoro — plus pomodoro always per summary line
    let x2 = style === "visual" ? 790 : 740;
    if (answers.exams.length && answers.exams[0] !== "other") {
      const ex = D.EXAMS.find(e => e.id === answers.exams[0]);
      widgets.push({ id: uid(), type: "countdown", x: x2, y, w: 240, h: 210, rot: -1.6,
        config: { exam: `${ex.name} exam day`, date: D.futureDate(ex.id === "jee" ? 120 : ex.id === "neet" ? 140 : 60) } });
      x2 += 0;
    }
    widgets.push({ id: uid(), type: "pomodoro", x: x2, y: y + (answers.exams.length && answers.exams[0] !== "other" ? 250 : 0), w: 250, h: 300, rot: 0.6, config: {} });
    return widgets;
  }

  function deckFor(subs) {
    if (subs.includes("bio")) return "Genetics Vocabulary";
    if (subs.includes("ochem")) return "Reagents & What They Do";
    if (subs.includes("cs")) return "Big-O Cheatsheet Cards";
    return "NEET Biology: Human Physiology";
  }
  function deckIdFor(subs) {
    if (subs.includes("bio")) return "l2";
    if (subs.includes("ochem")) return "l9";
    if (subs.includes("cs")) return "l16";
    return "l6";
  }
  function notesIdFor(subs) {
    if (subs.includes("calc2")) return "l11";
    if (subs.includes("ochem")) return "l7";
    if (subs.includes("hist")) return "l14";
    if (subs.includes("cs")) return "l17";
    return "l1";
  }
  function mindmapTitleFor(subs) {
    if (subs.includes("bio")) return "Meiosis vs Mitosis";
    if (subs.includes("calc2")) return "Which Convergence Test?";
    return "Organic Reaction Map";
  }

  function finish() {
    const s = SP.state.s;
    s.profile.studyingFor = answers.studyingFor;
    s.profile.exams = answers.exams;
    s.profile.subjects = effectiveSubjects();
    s.profile.goalMinutes = answers.goal;
    s.profile.studyStyle = answers.styles;
    s.profile.reminder = answers.reminder;
    s.profile.ember = { ...answers.ember };
    s.onboarded = true;
    // fresh board built from answers — never an empty canvas on first use
    s.boards = [{ id: "board-main", name: "My Board", widgets: buildStarterWidgets() },
                { id: "board-planner", name: "Daily Planner", widgets: [] }];
    s.activeBoardId = "board-main";
    SP.state.save();
    next(); // step 8: celebrate
  }

  function enterApp() {
    document.body.classList.remove("in-onboarding");
    location.hash = "#/board";
    SP.app.start(true);
  }

  return { mount };
})();
