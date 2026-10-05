/* ============================================================
   EMBERDESK — UI PRIMITIVES
   Ember the firefly · icons · toasts · modals · XP counter ·
   progress ring · avatar · sparkles
   ============================================================ */
window.SP = window.SP || {};

SP.ui = (() => {

  /* ---------- tiny helpers ---------- */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      /* booleans become the strings ARIA / CSS expect: aria-selected -> "true" */
      else node.setAttribute(k, v === true ? "true" : v);
    }
    for (const c of children.flat(9)) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return node;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const fmtNum = n => n.toLocaleString("en-US");

  /* ---------- stroke icon set (24px grid, stroke=currentColor) ---------- */
  const ICON_PATHS = {
    board: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
    social: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.9-4.6 5.5-4.6S14 16 14.6 19"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 14.6c2.1.3 3.8 1.7 4.3 4.1"/>',
    library: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14v16h4.5a1.5 1.5 0 0 0 1.5-1.5z"/><path d="M12 4v16"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5.5a1 1 0 0 0-1 1.2c.3 2 1.6 3.3 3.6 3.7M16 5h2.5a1 1 0 0 1 1 1.2c-.3 2-1.6 3.3-3.6 3.7"/><path d="M12 13v3M9 20h6M10.5 16h3l.7 4h-4.4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    flame: '<path d="M12 3c.4 3-1.8 4.2-3.2 5.8A6.8 6.8 0 0 0 7 13.4 5 5 0 0 0 12 18a5 5 0 0 0 5-4.6c0-2.2-1.2-3.6-2.4-5-.6.9-1.3 1.3-2 1.4.6-2.4.4-4.6-.6-6.8z"/>',
    chevronLeft: '<path d="m14 6-6 6 6 6"/>',
    chevronRight: '<path d="m10 6 6 6-6 6"/>',
    chevronDown: '<path d="m6 10 6 6 6-6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="8" cy="9" r="3"/><path d="M2.8 19c.5-2.8 2.6-4.4 5.2-4.4s4.7 1.6 5.2 4.4"/><circle cx="16.5" cy="10" r="2.3"/><path d="M15.6 14.8c2 .3 3.6 1.6 4.1 3.9"/>',
    msg: '<path d="M20 12a7.5 7.5 0 0 1-7.5 7.5H5l1.8-2.6A7.5 7.5 0 1 1 20 12z"/>',
    comment: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-4.6A7.5 7.5 0 1 1 20 11.5z"/>',
    up: '<path d="m12 5 7 8h-4v6h-6v-6H5z"/>',
    down: '<path d="m12 19-7-8h4V5h6v6h4z"/>',
    bookmark: '<path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.4M12 18.6V21M4.2 7.2l2.1 1.2M17.7 15.6l2.1 1.2M4.2 16.8l2.1-1.2M17.7 8.4l2.1-1.2"/>',
    pin: '<path d="M15 3l6 6-4 1-4.5 4.5L12 21l-3-6.5L3 12l6.5-.5L14 7z"/>',
    trash: '<path d="M4.5 7h15M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7M6.5 7l1 12.2a.8.8 0 0 0 .8.8h7.4a.8.8 0 0 0 .8-.8L17.5 7"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    list: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    play: '<path d="M7 5.5v13l11-6.5z"/>',
    pause: '<rect x="7" y="5.5" width="3.5" height="13" rx="1"/><rect x="13.5" y="5.5" width="3.5" height="13" rx="1"/>',
    sound: '<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M11 8.5v5M8.5 11h5M20 20l-3.8-3.8"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M8.5 11h5M20 20l-3.8-3.8"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
    sparkle: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    chest: '<rect x="4" y="10" width="16" height="9" rx="1.5"/><path d="M4 13.5h16M12 10V7a3 3 0 0 1 6 0M10.5 13.5h3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5z"/>',
    report: '<path d="M12 3l9.5 16.5H2.5z"/><path d="M12 9.5v4.5M12 16.8v.4"/>',
    send: '<path d="M4 12l16-8-6 16-3.5-6z"/><path d="M10.5 14L20 4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10.5h16M8.5 3v4M15.5 3v4"/>',
    brain: '<path d="M9.5 4.5A2.5 2.5 0 0 0 7 7a2.5 2.5 0 0 0-1.5 4.5A2.5 2.5 0 0 0 7 16a2.5 2.5 0 0 0 2.5 2.5V4.5zM14.5 4.5A2.5 2.5 0 0 1 17 7a2.5 2.5 0 0 1 1.5 4.5A2.5 2.5 0 0 1 17 16a2.5 2.5 0 0 1-2.5 2.5V4.5z"/>',
    layers: '<path d="m12 3 8.5 4.5L12 12 3.5 7.5z"/><path d="m4.8 12 7.2 3.8 7.2-3.8M4.8 16.2 12 20l7.2-3.8"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    /* ---- v2 additions: every former emoji now has a stroke twin ---- */
    note: '<path d="M5.5 3.5h13v11l-5 5h-8z"/><path d="M18.5 14.5h-5v5"/><path d="M8.5 8h7M8.5 11.5h4"/>',
    checkSquare: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>',
    hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3v3.4c0 1.7 4 4.2 4 5.6s-4 3.9-4 5.6V21"/><path d="M16 3v3.4c0 1.7-4 4.2-4 5.6s4 3.9 4 5.6V21"/>',
    cards: '<rect x="3.5" y="7" width="13" height="13" rx="2.5"/><path d="M7.5 4.5h10a2.5 2.5 0 0 1 2.5 2.5v10"/>',
    network: '<circle cx="12" cy="5.5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M12 8v3.6M12 11.6 6.7 16M12 11.6l5.3 4.4"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1 1-1.1 1.7v.3"/><path d="M12 16.9v.2"/>',
    file: '<path d="M6 3.5h7.5L19 9v11.5H6z"/><path d="M13.5 3.5V9H19"/><path d="M9 13.2h6M9 16.4h4"/>',
    sigma: '<path d="M17 4.8H7.6l5.4 7.2-5.4 7.2H17"/>',
    timer: '<circle cx="12" cy="13.6" r="7.4"/><path d="M12 10v3.6l2.3 1.5M9.6 2.6h4.8"/>',
    repeat: '<path d="M4.2 9.6A4.6 4.6 0 0 1 8.8 5H18"/><path d="m15.6 2.6 2.9 2.4-2.9 2.4"/><path d="M19.8 14.4A4.6 4.6 0 0 1 15.2 19H6"/><path d="m8.4 21.4-2.9-2.4 2.9-2.4"/>',
    snowflake: '<path d="M12 3.2v17.6M4.4 7.6l15.2 8.8M19.6 7.6 4.4 16.4"/><path d="m12 6.8-2.3-2M12 6.8l2.3-2M12 17.2l-2.3 2M12 17.2l2.3 2"/>',
    medal: '<circle cx="12" cy="14.6" r="5.4"/><path d="M9.1 9.4 6.6 3.4h4.1l1.6 4.6M14.9 9.4l2.5-6h-4.1l-1.6 4.6"/><path d="m12 12 .9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
    folder: '<path d="M3.5 6.6A1.6 1.6 0 0 1 5.1 5h3.6l2 2.4h8.2a1.6 1.6 0 0 1 1.6 1.6v8.4a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6z"/>',
    star: '<path d="m12 4 2.5 5.2 5.5.7-4 3.9 1 5.6-5-2.8-5 2.8 1-5.6-4-3.9 5.5-.7z"/>',
    dna: '<path d="M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12"/><path d="M7 21c0-2.1 1.4-3.6 3.3-4.6M17 21c0-2.1-1.4-3.6-3.3-4.6"/><path d="M8.4 7.2h7.2M8.4 16.8h7.2"/>',
    flask: '<path d="M9.6 3v6.2L4.9 17.9A2 2 0 0 0 6.6 21h10.8a2 2 0 0 0 1.7-3.1L14.4 9.2V3"/><path d="M8.4 3h7.2M7.4 15h9.2"/>',
    integral: '<path d="M15.8 4.4a2.8 2.8 0 0 0-2.8 2.8v9.6a2.8 2.8 0 0 1-2.8 2.8 2.6 2.6 0 0 1-2.5-1.8"/><path d="M16.2 12h3.6M4.2 12h3.6"/>',
    temple: '<path d="M3.4 20.6h17.2M5.2 20.6V10M9.6 20.6V10M14.4 20.6V10M18.8 20.6V10M2.6 10 12 4.2 21.4 10z"/>',
    keyboard: '<rect x="2.6" y="6" width="18.8" height="12" rx="2.4"/><path d="M6.4 9.6h.01M9.8 9.6h.01M13.2 9.6h.01M16.6 9.6h.01M6.4 12.9h.01M17.6 12.9h.01M9.8 14.6h4.4"/>',
    pencil: '<path d="M4 20h4.2L20 8.2 15.8 4 4 15.8z"/><path d="m14.4 5.4 4.2 4.2"/>',
    bolt: '<path d="M13.6 3 6.2 13.4h5L10.4 21 17.8 10.6h-5z"/>',
    sofa: '<path d="M4.4 11.2V8.6A2.6 2.6 0 0 1 7 6h10a2.6 2.6 0 0 1 2.6 2.6v2.6"/><path d="M3 12.6a2 2 0 0 1 2 2v3.2h14v-3.2a2 2 0 0 1 4 0v5.2H3z"/><path d="M5.6 18v2M18.4 18v2"/>',
    book: '<path d="M4.2 5.6A1.6 1.6 0 0 1 5.8 4H19.4v13.6H5.8a1.6 1.6 0 0 0-1.6 1.6z"/><path d="M4.2 19.2a1.6 1.6 0 0 1 1.6-1.6h13.6V21H5.8a1.6 1.6 0 0 1-1.6-1.8z"/>',
    crown: '<path d="M4 8.6 7 12.2l5-7.2 5 7.2 3-3.6-1.7 10.2H5.7z"/>',
    download: '<path d="M12 4v10M8.2 10.4l3.8 3.9 3.8-3.9"/><path d="M5 19.4h14"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20.2 4v4.6h-4.6"/>',
    filter: '<path d="M4 6.4h16M7 12h10M10 17.6h4"/>',
    camera: '<path d="M3.4 8.6h3.2l1.5-2.2h7.8l1.5 2.2h3.2v10.2H3.4z"/><circle cx="12" cy="13.4" r="3.2"/>',
    shield: '<path d="M12 3.4 5.2 5.9v5.6c0 4.3 2.9 7.5 6.8 9.1 3.9-1.6 6.8-4.8 6.8-9.1V5.9z"/>',
    globe: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.4 2.4 3.6 5.3 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.3-3.6-8.4S9.6 6 12 3.6z"/>',
    hash: '<path d="M9.6 4 8 20M16.2 4l-1.6 16M4.4 9.2h15.2M3.9 14.8h15.2"/>',
    compass: '<circle cx="12" cy="12" r="8.4"/><path d="m15.2 8.8-1.9 5.1-5.1 1.9 1.9-5.1z"/>',
    chart: '<path d="M4 20V4.4M4 20h16"/><path d="M8.2 16.4v-4M12.6 16.4V8.2M17 16.4v-5.6"/>',
    lock: '<rect x="5" y="10.4" width="14" height="9.6" rx="2"/><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4"/>',
    bell: '<path d="M6.6 10.2a5.4 5.4 0 0 1 10.8 0c0 4 1.5 5.6 1.5 5.6H5.1s1.5-1.6 1.5-5.6z"/><path d="M10 18.6a2 2 0 0 0 4 0"/>',
    textsize: '<path d="M4.6 7V5.2h9.2V7M9.2 5.2V19M6.6 19h5.2"/><path d="M14.6 12.4v-1.2h5.4v1.2M17.3 11.2V19M15.6 19h3.4"/>',
    link: '<path d="M10 13.6a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.3 1.3"/><path d="M14 10.4a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3"/>',
    copy: '<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="2"/><path d="M15.4 5.6A1.6 1.6 0 0 0 13.8 4H5.6A1.6 1.6 0 0 0 4 5.6v8.2a1.6 1.6 0 0 0 1.6 1.6"/>',
    sliders: '<path d="M4 8.4h8M16.4 8.4H20M4 15.6h3.6M12 15.6h8"/><circle cx="14.2" cy="8.4" r="2.2"/><circle cx="9.8" cy="15.6" r="2.2"/>',
    square: '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2.4"/>',
    eyeOff: '<path d="M4.2 4.2 19.8 19.8"/><path d="M9.6 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M6.4 6.7C4 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1M18.4 15.6c2-1.6 3.1-3.6 3.1-3.6S18 5.5 12 5.5c-.7 0-1.4.1-2 .2"/>',
    more: '<circle cx="5.4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.6" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  };


  function icon(name, size = 20, extra = "") {
    return `<svg class="icon ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
  }

  /* ---------- Ember the firefly ----------
     Small, illustrated, expressive. Appears in onboarding, empty
     states, streak moments, celebrations. Glow color is customizable. */
  function emberSVG(size = 96, opts = {}) {
    const glow = opts.glow || "var(--gold)";
    const acc = opts.accessory || "none";
    const mood = opts.mood || "happy"; // happy | wow | calm | cheer
    const id = "eg" + uid().slice(0, 5);
    const eyes = mood === "wow"
      ? `<circle cx="36" cy="34" r="3.6" fill="var(--ink)"/><circle cx="50" cy="34" r="3.6" fill="var(--ink)"/>`
      : mood === "calm"
      ? `<path d="M33 35q3-2.6 6 0" stroke="var(--ink)" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M47 35q3-2.6 6 0" stroke="var(--ink)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="36" cy="34.5" rx="2.7" ry="3.6" fill="var(--ink)"/><ellipse cx="50" cy="34.5" rx="2.7" ry="3.6" fill="var(--ink)"/><circle cx="37" cy="33.2" r="0.9" fill="var(--bg-elevated)"/><circle cx="51" cy="33.2" r="0.9" fill="var(--bg-elevated)"/>`;
    const mouth = mood === "cheer"
      ? `<path d="M38.5 42q4.5 4.5 9 0" stroke="var(--ink)" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : mood === "wow"
      ? `<ellipse cx="43" cy="43" rx="2.6" ry="3.4" fill="var(--ink)"/>`
      : `<path d="M39.5 42.5q3.5 2.6 7 0" stroke="var(--ink)" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    const accessory = acc === "cap"
      ? `<path d="M28 26q15-14 30 0l-4-9q-11-7-22 0z" fill="var(--ink)"/><rect x="26" y="24" width="34" height="4.5" rx="2.2" fill="var(--ink)" opacity="0.72"/>`
      : acc === "glasses"
      ? `<circle cx="36" cy="34.5" r="6.5" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="50" cy="34.5" r="6.5" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M42.5 34.5h1.5M29 33l-4-1.5M57 33l4-1.5" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>`
      : acc === "scarf"
      ? `<path d="M30 50q13 7 26 0l2 6q-15 8-30 0z" fill="var(--gold)"/><path d="M54 52l4 12-6-2-2-9z" fill="var(--gold-deep)"/>`
      : "";
    return `<svg width="${size}" height="${size}" viewBox="0 0 86 86" fill="none" aria-label="Ember the firefly" role="img">
      <defs>
        <radialGradient id="${id}">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="${glow}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle class="ember-glow-anim" cx="43" cy="58" r="26" fill="url(#${id})"/>
      <g class="ember-bob">
        <path d="M24 30q-14-10-18-2 12 4 18 8z" fill="var(--bg-sunken)" opacity="0.9" stroke="var(--border-strong)" stroke-width="1"/>
        <path d="M62 30q14-10 18-2-12 4-18 8z" fill="var(--bg-sunken)" opacity="0.9" stroke="var(--border-strong)" stroke-width="1"/>
        <path d="M37 16q-2-8-8-10M49 16q2-8 8-10" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="28.5" cy="5" r="2.4" fill="var(--ink)"/><circle cx="57.5" cy="5" r="2.4" fill="var(--ink)"/>
        <ellipse cx="43" cy="38" rx="17" ry="16" fill="var(--ink)"/>
        
        
        <path d="M30 52q13 14 26 0-4 16-13 16t-13-16z" fill="${glow}"/>
        <ellipse cx="43" cy="57" rx="8.5" ry="9.5" fill="${glow}"/>
        <ellipse cx="43" cy="55" rx="4" ry="4.6" fill="var(--bg-elevated)" opacity="0.72"/>
        ${eyes}${mouth}${accessory}
      </g>
    </svg>`;
  }

  /* ---------- streak flame ---------- */
  function flameSVG(size = 22, cls = "") {
    return `<svg class="flame ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g class="flame-glow">
        <path d="M12 2.5c.5 3.4-2 4.8-3.6 6.7A7.7 7.7 0 0 0 6.5 14 5.6 5.6 0 0 0 12 19.6 5.6 5.6 0 0 0 17.6 14c0-2.5-1.4-4.1-2.8-5.7-.6 1-1.4 1.5-2.2 1.6.7-2.7.4-5.2-.6-7.4z" fill="var(--gold)"/>
        <path d="M12 9.5c.3 1.9-1 2.7-1.8 3.7a4.3 4.3 0 0 0-1 2.5A3 3 0 0 0 12 18.5a3 3 0 0 0 2.8-2.8c0-1.4-.7-2.3-1.5-3.2-.3.6-.8.8-1.2.9.4-1.5.2-2.8-.1-3.9z" fill="var(--gold-bright)"/>
      </g>
    </svg>`;
  }

  /* ---------- avatar ---------- */
  function avatarHTML(name, size = 36, opts = {}) {
    const color = opts.color || colorFromName(name);
    const initials = name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const ring = opts.level
      ? (() => {
          const info = typeof opts.level === "object" ? opts.level : { into: 0.6 };
          const r = size / 2 + 1.5, c = 2 * Math.PI * r;
          return `<svg class="avatar-ring-svg" width="${size + 6}" height="${size + 6}" viewBox="0 0 ${size + 6} ${size + 6}">
            <circle cx="${size/2 + 3}" cy="${size/2 + 3}" r="${r}" fill="none" stroke="var(--border)" stroke-width="2.5"/>
            <circle cx="${size/2 + 3}" cy="${size/2 + 3}" r="${r}" fill="none" stroke="var(--ember)" stroke-width="2.5"
              stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - info.into)}" stroke-linecap="round"/>
          </svg>`;
        })()
      : "";
    const presence = opts.online ? `<span class="presence"></span>` : "";
    /* Avatar chips use the fixed monochrome tone ramp, which stays dark in
       BOTH themes — so the initials must be a fixed light colour. They
       previously inherited --bg-elevated and vanished in dark mode. */
    const fill = `background:${color};color:#FFFFFF;`;
    return `<span class="avatar ${opts.level ? "avatar--ring" : ""}" style="width:${size}px;height:${size}px;${opts.level ? "" : fill}" title="${esc(name)}">
      ${ring}<span class="avatar-inner" style="${opts.level ? fill : ""}font-size:${Math.max(10, size * 0.36)}px;font-family:var(--font-num);">${esc(initials)}</span>${presence}
    </span>`;
  }

  /* Monochrome ramp — identity comes from the initials, not from a hue. */
  function colorFromName(name) {
    const tones = ["#0B0B0A", "#2A2A27", "#454540", "#5F5F5A", "#7C7C75", "#96968F"];
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return tones[h % tones.length];
  }


  /* ============================================================
     CONTEXTUAL MENU — the v2 answer to "too many buttons".
     Rare/secondary actions live here; they only exist when the
     thing they act on is being pointed at.
     ============================================================ */
  let openMenu = null;
  function closeMenu() {
    if (!openMenu) return;
    const { pop, trigger } = openMenu;
    pop.remove();
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onDocDown, true);
    document.removeEventListener("keydown", onDocKey, true);
    openMenu = null;
  }
  function onDocDown(e) {
    if (!openMenu) return;
    /* Ignore presses on the trigger itself — its click handler owns the
       toggle, otherwise this closes the menu and the click instantly
       reopens it, so the button could never close its own menu. */
    if (openMenu.trigger && openMenu.trigger.contains(e.target)) return;
    if (!openMenu.pop.contains(e.target)) closeMenu();
  }
  function onDocKey(e) {
    if (!openMenu) return;
    if (e.key === "Escape") { e.stopPropagation(); const t = openMenu.trigger; closeMenu(); t && t.focus(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...openMenu.pop.querySelectorAll(".menu-item:not([disabled])")];
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next].focus();
    }
  }

  /* items: [{ label, icon, run, danger, checked, disabled, sep }] */
  function menu(trigger, items, opts = {}) {
    if (openMenu) { const same = openMenu.trigger === trigger; closeMenu(); if (same) return; }
    const pop = el("div", { class: "menu", role: "menu" });
    items.forEach(it => {
      if (it.sep) { pop.appendChild(el("div", { class: "menu-sep" })); return; }
      const b = el("button", {
        class: `menu-item ${it.danger ? "menu-item--danger" : ""}`, role: "menuitem",
        disabled: !!it.disabled, "aria-label": it.label,
        onclick: () => { closeMenu(); it.run && it.run(); },
      },
        el("span", { class: "menu-item-icon", html: it.checked != null ? icon(it.checked ? "check" : "blankdot", 15) : (it.icon ? icon(it.icon, 15) : "") }),
        el("span", { class: "menu-item-label" }, it.label),
        it.hint ? el("span", { class: "menu-item-hint" }, it.hint) : null);
      pop.appendChild(b);
    });
    document.body.appendChild(pop);

    // place: below-right of the trigger, flipped when it would overflow
    const r = trigger.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = opts.align === "left" ? r.left : r.right - pw;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    // zoom originates from the corner that touches the trigger (iOS popover feel)
    pop.style.transformOrigin = (top < r.top ? "bottom" : "top") + " right";

    trigger.setAttribute("aria-expanded", "true");
    openMenu = { pop, trigger };
    document.addEventListener("pointerdown", onDocDown, true);
    document.addEventListener("keydown", onDocKey, true);
    const first = pop.querySelector(".menu-item:not([disabled])");
    if (first) first.focus();
    return { close: closeMenu };
  }

  /* A ⋯ trigger wired to a menu. Pass items or a function returning items
     (so state can be read at click time). */
  function menuButton(items, opts = {}) {
    const btn = el("button", {
      class: `icon-btn ${opts.class || ""}`, "aria-haspopup": "menu", "aria-expanded": "false",
      "aria-label": opts.label || "More actions", title: opts.label || "More actions",
      html: icon("more", 16),
      onclick: e => { e.stopPropagation(); menu(btn, typeof items === "function" ? items() : items, opts); },
    });
    return btn;
  }

  /* A blank dot for unchecked menu rows (keeps checkmarks aligned). */
  ICON_PATHS.blankdot = '<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>';

  /* ---------- toasts ---------- */
  function toast(msg, kind = "info", ms = 2800) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const iconName = kind === "error" ? "report" : kind === "gold" ? "sparkle" : "check";
    const t = el("div", { class: `toast ${kind === "gold" ? "toast--gold" : kind === "error" ? "toast--error" : ""}`, role: "status", html: icon(iconName, 16) + `<span>${esc(msg)}</span>` });
    root.appendChild(t);
    setTimeout(() => {
      t.classList.add("leaving");
      setTimeout(() => t.remove(), 260);
    }, ms);
  }

  /* ---------- modals ---------- */
  let openModals = [];
  function modal(contentOpts) {
    const backdrop = el("div", { class: "modal-backdrop", role: "dialog", "aria-modal": "true" });
    const m = el("div", { class: `modal ${contentOpts.wide ? "modal--wide" : ""} ${contentOpts.celebration ? "modal--celebration" : ""} ${contentOpts.class || ""}` });
    if (contentOpts.title) {
      m.appendChild(el("div", { class: "modal-head" },
        el("h3", { html: contentOpts.title }),
        el("button", { class: "icon-btn", "aria-label": "Close dialog", html: icon("x", 18), onclick: () => close() })
      ));
    }
    const body = el("div", { class: "modal-body" });
    if (typeof contentOpts.body === "string") body.innerHTML = contentOpts.body;
    else if (contentOpts.body) body.appendChild(contentOpts.body);
    m.appendChild(body);
    if (contentOpts.foot) {
      const foot = el("div", { class: "modal-foot" });
      if (typeof contentOpts.foot === "string") foot.innerHTML = contentOpts.foot;
      else contentOpts.foot.forEach(f => foot.appendChild(f));
      m.appendChild(foot);
    }
    backdrop.appendChild(m);
    backdrop.addEventListener("mousedown", e => { if (e.target === backdrop && contentOpts.dismissable !== false) close(); });
    document.body.appendChild(backdrop);
    const escHandler = e => { if (e.key === "Escape" && contentOpts.dismissable !== false) close(); };
    document.addEventListener("keydown", escHandler);
    const focusables = m.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (focusables.length) focusables[0].focus();
    const entry = { backdrop, close };
    openModals.push(entry);
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", escHandler);
      openModals = openModals.filter(x => x !== entry);
      // iOS dismissal: card falls away while the frosted dim lifts
      backdrop.classList.add("closing");
      setTimeout(() => backdrop.remove(), 170);
      if (contentOpts.onClose) contentOpts.onClose();
    }
    return { close, body, el: m };
  }

  function confirmDialog({ title, text, confirmLabel = "Confirm", danger = false, onConfirm }) {
    const m = modal({
      title,
      body: el("p", { class: "small muted", style: { lineHeight: "1.6" } }, text),
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: `btn ${danger ? "btn--danger" : "btn--quiet"}`, onclick: () => { m.close(); onConfirm && onConfirm(); } }, confirmLabel),
      ],
    });
    return m;
  }

  /* ---------- animated number count-up ---------- */
  function countUp(node, to, { duration = 700, prefix = "", suffix = "" } = {}) {
    const from = parseFloat(String(node.dataset.value ?? node.textContent.replace(/[^\d.-]/g, ""))) || 0;
    node.dataset.value = to;
    if (document.documentElement.getAttribute("data-motion") === "reduced") {
      node.textContent = prefix + fmtNum(Math.round(to)) + suffix;
      return;
    }
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = prefix + fmtNum(Math.round(from + (to - from) * eased)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* XP float + counter pulse. Call after addXP for reward feedback. */
  function xpFloater(amount, anchorEl) {
    const rect = anchorEl ? anchorEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2 };
    const f = el("div", { class: "xp-floater" }, `+${amount} XP`);
    f.style.left = (rect.left + rect.width / 2 - 30) + "px";
    f.style.top = (rect.top - 6) + "px";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  /* ---------- progress ring ---------- */
  function ringSVG(pct, size = 44, stroke = 5, colorClass = "ring-fill--moss") {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-fill ${colorClass}" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(1, pct))).toFixed(1)}"/>
    </svg>`;
  }

  /* ---------- sparkles for celebrations ---------- */
  function sparkleBurst(container, n = 18) {
    if (document.documentElement.getAttribute("data-motion") === "reduced") return;
    const field = el("div", { class: "sparkle-field" });
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 60 + Math.random() * 90;
      const s = el("span", { class: "sparkle" });
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      s.style.setProperty("--dy", Math.sin(ang) * dist - 30 + "px");
      s.style.left = "50%"; s.style.top = "45%";
      s.style.animationDelay = (i * 45) + "ms";
      s.style.background = i % 3 === 0 ? "var(--gold-bright)" : "var(--gold)";
      field.appendChild(s);
    }
    container.style.position = "relative";
    container.appendChild(field);
    setTimeout(() => field.remove(), 2600);
  }

  /* ---------- skeleton ---------- */
  function skeletonCard(h = 120) {
    return el("div", { class: "skeleton", style: { height: h + "px", width: "100%" } });
  }
  function skeletonGrid(n, h) {
    const g = el("div", { class: "lib-content-grid" });
    for (let i = 0; i < n; i++) g.appendChild(skeletonCard(h || 150));
    return g;
  }

  /* ---------- misc format ---------- */
  function fmtMembers(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k members";
    return n + " members";
  }
  function fmtTimeLeft(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
  function daysUntil(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000);
  }

  /* Floating back pill for sub-pages (leaderboard, settings, community, …). */
  function backPill(title, iconName, fallback, onBack) {
    return el("div", { class: "back-pillbar" },
      el("div", { class: "back-pill" },
        el("button", { class: "back-pill-btn", "aria-label": "Back", title: "Back", html: icon("arrowLeft", 17),
          onclick: () => { if (onBack) onBack(); else if (history.length > 1) history.back(); else location.hash = fallback || "#/board"; } }),
        el("span", { class: "pill-div" }),
        iconName ? el("span", { class: "back-pill-ic", html: icon(iconName, 16) }) : null,
        el("span", { class: "back-pill-title" }, title)));
  }

  return { el, esc, uid, icon, emberSVG, flameSVG, avatarHTML, colorFromName, toast, modal, confirmDialog, backPill,
           countUp, xpFloater, ringSVG, sparkleBurst, skeletonCard, skeletonGrid,
           fmtNum, fmtMembers, fmtTimeLeft, daysUntil, menu, menuButton, closeMenu };
})();
