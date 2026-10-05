/* ============================================================
   EMBERDESK — SOCIAL
   Two visually distinct formats:
   • Communities (Reddit-like): feeds, flairs, votes, threads
   • Groups & Study Rooms (Discord-like): live presence, shared
     pomodoro, body doubling, chat
   Plus a discovery feed and friends/DMs.
   ============================================================ */
window.SP = window.SP || {};

SP.social = (() => {
  const { el, esc, icon, uid, avatarHTML, fmtMembers, fmtTimeLeft, emberSVG, fmtNum } = SP.ui;
  const D = SP.data;
  const S = SP.state;

  let container = null;
  let sortMode = "hot";

  function mount(c) {
    container = c;
    c.innerHTML = "";
    c.classList.remove("screen--flush");
    const page = el("div", { class: "page page--wide" });
    c.appendChild(page);

    page.appendChild(buildPillbar());
    const content = el("div", { id: "social-content", class: "social-content" });
    page.appendChild(content);
    route(content);
  }

  /* one small floating pill: a feed drop-down + a chat icon */
  function buildPillbar() {
    const bar = el("div", { class: "social-pillbar" });
    const feedBtn = el("button", { class: "pill-feed", "aria-haspopup": "menu", "aria-expanded": "false",
      onclick: () => SP.ui.menu(feedBtn, feedMenuItems(), { align: "center" }) },
      el("span", { class: "pill-feed-label" }, currentFeedLabel()),
      el("span", { class: "pill-chev", html: icon("chevronDown", 14) }));
    const chatBtn = el("button", { class: "pill-chat", "aria-label": "Messages", title: "Messages",
      "data-unread": String(unreadTotal()),
      html: icon("msg", 18) + (unreadTotal() ? `<span class="chat-unread">${unreadTotal()}</span>` : ""),
      onclick: () => openChatHub() });
    bar.appendChild(el("div", { class: "social-pill" },
      feedBtn, el("span", { class: "pill-div" }), chatBtn));
    return bar;
  }

  function currentFeedLabel() {
    const h = location.hash;
    if (h.startsWith("#/social/communit")) return "Communities";
    if (h.startsWith("#/social/room")) return "Rooms";
    return "For you";
  }

  function feedMenuItems() {
    const cur = currentFeedLabel();
    return [
      { label: "For you", icon: "sparkle", checked: cur === "For you", run: () => { location.hash = "#/social"; } },
      { label: "Communities", icon: "users", checked: cur === "Communities", run: () => { location.hash = "#/social/communities"; } },
      { label: "Rooms", icon: "clock", checked: cur === "Rooms", run: () => { location.hash = "#/social/rooms"; } },
    ];
  }

  function unreadTotal() {
    return D.GROUPS.reduce((n, g) => n + (g.unread || 0), 0);
  }

  function route(content) {
    const h = location.hash;
    let m;
    if ((m = h.match(/#\/social\/community\/(\w+)/))) return renderCommunity(content, m[1]);
    if ((m = h.match(/#\/social\/room\/(\w+)/))) return renderRoom(content, m[1]);
    if (h.startsWith("#/social/communities")) return renderCommunities(content);
    if (h.startsWith("#/social/rooms")) return renderRooms(content);
    if (h.startsWith("#/social/groups")) return renderGroups(content);
    if (h.startsWith("#/social/friends")) return renderFriends(content);
    return renderFeed(content);
  }

  /* ============================================================
     DISCOVER
     ============================================================ */
  function renderDiscover(content) {
    content.innerHTML = "";
    content.appendChild(el("h1", { style: { marginBottom: "4px" } }, "Discover"));

    // live rooms strip (social proof)
    const live = D.ROOMS.filter(r => r.live);
    const strip = el("div", { class: "live-rail" });
    live.forEach(r => {
      strip.appendChild(el("button", { class: "live-card", onclick: () => { location.hash = `#/social/room/${r.id}`; } },
        el("span", { class: "live-pill" }, el("span", { class: "live-dot" }), String(r.people)),
        el("span", { class: "live-name" }, r.name),
        el("span", { class: "live-focus" }, r.focus)));
    });
    content.appendChild(sectionHead("Live right now", `${live.reduce((n, r) => n + r.people, 0)} students in rooms`));
    content.appendChild(strip);

    // suggested communities from onboarding subjects
    content.appendChild(sectionHead("Suggested for you", "Based on what you picked at setup"));
    const coms = el("div", { class: "com-list" });
    suggestedCommunities().forEach(c => coms.appendChild(communityCard(c)));
    content.appendChild(coms);

    // trending posts
    content.appendChild(sectionHead("Trending posts", ""));
    [...D.POSTS].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3).forEach(p => content.appendChild(postCard(p, true)));
  }

  function suggestedCommunities() {
    const subs = S.s.profile.subjects || [];
    const order = [];
    if (subs.includes("bio")) order.push("c2");
    if (subs.includes("ochem")) order.push("c4");
    if (subs.includes("cs")) order.push("c3");
    if (subs.includes("calc2")) order.push("c1");
    if (subs.includes("hist")) order.push("c5");
    D.COMMUNITIES.forEach(c => { if (!order.includes(c.id)) order.push(c.id); });
    return order.map(id => D.COMMUNITIES.find(c => c.id === id));
  }

  /* headings stand alone — the explanatory subtitle line is gone */
  function sectionHead(title, sub) {
    return el("div", { class: "section-head" },
      el("h2", {}, title));
  }

  /* ============================================================
     FEED — one continuous, interleaved stream
     post -> live sessions -> post -> communities -> more posts
     ============================================================ */
  function renderFeed(content) {
    content.innerHTML = "";
    const posts = [...D.POSTS].sort((a, b) => b.upvotes - a.upvotes);
    const live = D.ROOMS.filter(r => r.live);
    let i = 0;
    const nextPost = () => (i < posts.length ? postCard(posts[i++], true) : null);
    let p;
    if ((p = nextPost())) content.appendChild(p);
    content.appendChild(feedLive(live));
    if ((p = nextPost())) content.appendChild(p);
    content.appendChild(feedComs());
    while ((p = nextPost())) content.appendChild(p);
  }

  function feedLive(live) {
    const wrap = el("div", { class: "feed-block" });
    wrap.appendChild(el("div", { class: "feed-label" }, el("span", { class: "live-dot" }), "Live now"));
    const rail = el("div", { class: "live-rail" });
    live.forEach(r => rail.appendChild(el("button", { class: "live-card", onclick: () => { location.hash = `#/social/room/${r.id}`; } },
      el("span", { class: "live-pill" }, el("span", { class: "live-dot" }), String(r.people)),
      el("span", { class: "live-name" }, r.name),
      el("span", { class: "live-focus" }, r.focus))));
    wrap.appendChild(rail);
    return wrap;
  }

  function feedComs() {
    const wrap = el("div", { class: "feed-block" });
    wrap.appendChild(el("div", { class: "feed-label" }, "Communities for you"));
    const card = el("div", { class: "com-list" });
    suggestedCommunities().slice(0, 3).forEach(c => card.appendChild(communityCard(c)));
    card.appendChild(el("button", { class: "com-card feed-seeall", onclick: () => { location.hash = "#/social/communities"; } },
      el("span", { class: "com-name" }, "See all communities"),
      el("span", { class: "row-chevron", html: icon("chevronRight", 16) })));
    wrap.appendChild(card);
    return wrap;
  }

  /* ============================================================
     CHAT HUB — friends, groups & community updates as conversations
     ============================================================ */
  /* chats are full-window views, not popups */
  let chatFull = null;
  let chatEscKey = null;
  function closeFullChat() {
    if (!chatFull) return;
    chatFull.remove();
    chatFull = null;
    // the Escape listener must die with the view, or it stacks up one per
    // open and a later Escape anywhere would slam whatever chat is open
    if (chatEscKey) { document.removeEventListener("keydown", chatEscKey); chatEscKey = null; }
  }
  function openFullChat(title, contentNode, opts = {}) {
    closeFullChat();
    const root = el("div", { class: "chat-full", role: "dialog", "aria-modal": "true" });
    root.append(SP.ui.backPill(title, opts.icon || null, null, () => { if (opts.onBack) opts.onBack(); else closeFullChat(); }), contentNode);
    document.body.appendChild(root);
    chatFull = root;
    chatEscKey = function onKey(e) {
      if (e.key === "Escape") closeFullChat();
    };
    document.addEventListener("keydown", chatEscKey);
    return root;
  }

  function openChatHub() {
    const body = el("div", { class: "chat-hub" });
    body.appendChild(el("div", { class: "chat-sec" }, "Groups"));
    D.GROUPS.forEach(g => body.appendChild(convRow("group", g)));
    body.appendChild(el("div", { class: "chat-sec" }, "Direct messages"));
    D.FRIENDS.forEach(f => body.appendChild(convRow("dm", f)));
    body.appendChild(el("div", { class: "chat-sec" }, "Community updates"));
    D.COMMUNITIES.slice(0, 4).forEach(c => body.appendChild(convRow("community", c)));
    openFullChat("Messages", body, { icon: "msg" });
  }

  function convRow(type, ref) {
    const last = type === "group" ? ref.messages[ref.messages.length - 1]
               : type === "dm" ? null : null;
    const preview = type === "group" ? `${last.author}: ${last.text}`
                  : type === "dm" ? ref.status
                  : communityUpdate(ref).text;
    const name = type === "community" ? ref.name : ref.name;
    const art = type === "group"
      ? el("span", { class: "conv-art", style: { background: SP.ui.colorFromName(ref.name), color: "#FFFFFF" } }, ref.name[0])
      : type === "community"
        ? el("span", { class: "conv-art", style: { background: SP.ui.colorFromName(ref.name), color: "#FFFFFF" } }, ref.initials)
        : el("span", { class: "conv-art", html: avatarHTML(ref.name, 40, { online: ref.online }) });
    return el("button", { class: "conv-row", onclick: () => openChat(type, ref) },
      art,
      el("span", { class: "conv-main" },
        el("span", { class: "conv-name" }, name),
        el("span", { class: "conv-preview" }, preview)),
      type === "group" && ref.unread ? el("span", { class: "conv-unread" }, String(ref.unread)) : null,
      el("span", { class: "row-chevron", html: icon("chevronRight", 16) }));
  }

  function communityUpdate(c) {
    const post = [...D.POSTS].filter(p => p.community === c.id).sort((a, b) => b.upvotes - a.upvotes)[0];
    return post ? { text: `New: ${post.title}` } : { text: fmtMembers(c.members) };
  }

  function openChat(type, ref) {
    const name = ref.name;
    const body = el("div", { class: "chat-body" });
    const msgs = el("div", { class: "chat-msgs" });

    const push = (author, text, mine, time) => {
      msgs.appendChild(el("div", { class: `chat-line ${mine ? "mine" : ""}` },
        mine ? null : el("span", { class: "chat-av", html: avatarHTML(author, 26) }),
        el("div", { class: "bubble" },
          !mine && type === "group" ? el("span", { class: "bubble-author" }, author) : null,
          el("div", { class: "bubble-text" }, text),
          time ? el("span", { class: "bubble-time" }, time) : null)));
    };

    if (type === "group") ref.messages.forEach(m => push(m.author, m.text, m.author === S.s.profile.name, m.time));
    else if (type === "dm") push(ref.name, ref.online ? "hey! joining the 9pm room?" : `(last seen — ${ref.status})`, false);
    else { const u = communityUpdate(ref); push(ref.name, u.text, false); }

    body.appendChild(msgs);
    const input = el("input", { class: "input", placeholder: `Message ${name}…`, "aria-label": `Message ${name}` });
    const send = el("button", { class: "btn btn--sm btn--quiet chat-send", html: icon("send", 15), "aria-label": "Send", onclick: () => {
      const v = input.value.trim();
      if (!v) return;
      if (type === "group") ref.messages.push({ author: S.s.profile.name, time: "now", text: v });
      push(S.s.profile.name, v, true, "now");
      input.value = "";
      msgs.scrollTop = msgs.scrollHeight;
    } });
    input.addEventListener("keydown", e => { if (e.key === "Enter") send.click(); });
    body.appendChild(el("div", { class: "chat-input-row" }, input, send));

    openFullChat(name, body, { onBack: () => openChatHub() });
    requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
  }

  /* ============================================================
     COMMUNITIES
     ============================================================ */
  function renderCommunities(content) {
    content.innerHTML = "";
    content.appendChild(el("h1", { style: { marginBottom: "16px" } }, "Communities"));
    const list = el("div", { class: "com-list" });
    D.COMMUNITIES.forEach(c => list.appendChild(communityCard(c)));
    content.appendChild(list);
  }

  function communityCard(c) {
    const joined = S.s.social.joinedCommunities.includes(c.id);
    const card = el("div", { class: "com-card", onclick: () => { location.hash = `#/social/community/${c.id}`; } },
      el("span", { class: "com-icon", style: { background: SP.ui.colorFromName(c.name), color: "#FFFFFF" } }, c.initials),
      el("span", { style: { flex: "1", minWidth: "0" } },
        el("span", { class: "com-name", style: { display: "block" } }, c.name),
        el("span", { class: "com-members" }, fmtMembers(c.members))),
      el("button", { class: `btn btn--sm ${joined ? "" : "btn--ghost com-join"}`, onclick: e => {
        e.stopPropagation();
        if (joined) {
          S.s.social.joinedCommunities = S.s.social.joinedCommunities.filter(x => x !== c.id);
          SP.ui.toast(`Left ${c.name}`);
        } else {
          S.s.social.joinedCommunities.push(c.id);
          SP.ui.toast(`Joined ${c.name}`);
        }
        S.save();
        mount(container);
      } }, joined ? "Joined" : "Join"));
    return card;
  }

  let comTab = "feed";   // feed | about (per community view)
  function renderCommunity(content, id) {
    const c = D.COMMUNITIES.find(x => x.id === id);
    content.innerHTML = "";
    if (!c) { content.appendChild(emptyState("Community not found", "It may have been removed. Browse all communities instead.", "Browse communities", () => { location.hash = "#/social/communities"; })); return; }
    const joined = S.s.social.joinedCommunities.includes(c.id);
    const color = SP.ui.colorFromName(c.name);
    const postCount = D.POSTS.filter(p => p.community === c.id).length;

    content.appendChild(SP.ui.backPill(c.name, "users", "#/social"));

    /* banner + overlapping identity, Reddit-style.
       The second gradient stop must be a FIXED near-black: var(--ink)
       flips to white in dark mode, washing the banner out and hiding
       the white banner mark. A banner is a fixed dark surface, like the
       avatar tone chips. */
    content.appendChild(el("div", { class: "rc-banner", style: { background: `linear-gradient(135deg, ${color}, #0B0B0A)` } },
      el("span", { class: "rc-banner-mark", html: icon("users", 30) })));
    content.appendChild(el("div", { class: "rc-id" },
      el("span", { class: "rc-icon", style: { background: color } }, c.initials),
      el("div", { class: "rc-id-main" },
        el("div", { class: "rc-name" }, c.name),
        el("div", { class: "rc-meta" }, `${fmtMembers(c.members)} · ${postCount} posts this week`))));

    /* actions */
    content.appendChild(el("div", { class: "rc-actions" },
      el("button", { class: "btn btn--sm rc-create", html: icon("plus", 14) + "<span>Create Post</span>",
        onclick: () => { comTab = "feed"; renderCommunity(content, id); const t = content.querySelector(".composer .textarea"); if (t) t.focus(); } }),
      el("button", { class: `btn btn--sm rc-join ${joined ? "btn--primary" : "btn--quiet"}`,
        onclick: () => { toggleJoin(c); renderCommunity(content, id); } }, joined ? "Joined" : "Join")));

    /* Feed / About tabs + sort menu */
    const sortLabel = sortMode === "hot" ? "Best" : sortMode === "new" ? "New" : "Top";
    const sortBtn = el("button", { class: "rc-sort", "aria-haspopup": "menu", "aria-expanded": "false" },
      el("span", {}, sortLabel), el("span", { class: "rc-sort-chev", html: icon("chevronDown", 14) }));
    sortBtn.onclick = () => SP.ui.menu(sortBtn, [
      { label: "Best", icon: "sparkle", checked: sortMode === "hot", run: () => { sortMode = "hot"; renderCommunity(content, id); } },
      { label: "New", icon: "clock", checked: sortMode === "new", run: () => { sortMode = "new"; renderCommunity(content, id); } },
      { label: "Top", icon: "trophy", checked: sortMode === "top", run: () => { sortMode = "top"; renderCommunity(content, id); } },
    ]);
    content.appendChild(el("div", { class: "rc-tabrow" },
      el("div", { class: "rc-tabs" },
        el("button", { class: `rc-tab ${comTab === "feed" ? "active" : ""}`, onclick: () => { comTab = "feed"; renderCommunity(content, id); } }, "Feed"),
        el("button", { class: `rc-tab ${comTab === "about" ? "active" : ""}`, onclick: () => { comTab = "about"; renderCommunity(content, id); } }, "About")),
      sortBtn));

    if (comTab === "about") { renderAbout(content, c); return; }

    /* highlights rail */
    const top = [...D.POSTS.filter(p => p.community === c.id)].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3);
    if (top.length) {
      content.appendChild(el("div", { class: "rc-hl-head" }, el("span", { html: icon("pin", 14) }), "Community highlights"));
      const rail = el("div", { class: "rc-hl-rail" });
      top.forEach(p => rail.appendChild(el("div", { class: "rc-hl-card" },
        el("div", { class: "rc-hl-title" }, p.title),
        el("div", { class: "rc-hl-meta" }, `${fmtNum(p.upvotes)} upvotes · ${p.comments.length} comments`))));
      content.appendChild(rail);
    }

    /* composer + feed */
    content.appendChild(buildComposer(c));
    let posts = D.POSTS.filter(p => p.community === c.id);
    if (sortMode === "top") posts = [...posts].sort((a, b) => b.upvotes - a.upvotes);
    // "new": data order is already newest-first (new posts unshift to the
    // front) — the old .reverse() showed the OLDEST first instead.
    if (sortMode === "new") posts = posts.slice();
    if (!posts.length) {
      content.appendChild(emptyState("No posts here yet", "Be the one who starts the conversation — a doubt you have is probably shared by forty others.", "Write the first post", () => content.querySelector(".textarea") && content.querySelector(".textarea").focus()));
    }
    posts.forEach(p => content.appendChild(postCard(p, false, c)));
  }

  function renderAbout(content, c) {
    content.appendChild(el("div", { class: "card rc-about" },
      el("h3", {}, "About"),
      el("p", { class: "small muted" }, c.desc),
      el("h3", { style: { marginTop: "14px" } }, "Rules & moderation"),
      el("ul", { class: "small muted", style: { paddingLeft: "20px", lineHeight: "1.7" } },
        el("li", {}, "Answer doubts with sources or steps, not just final options."),
        el("li", {}, "No photo of a full question paper during a live exam window."),
        el("li", {}, "Report button on every post reaches moderators within an hour."))));
  }

  function toggleJoin(c) {
    const joined = S.s.social.joinedCommunities.includes(c.id);
    if (joined) {
      S.s.social.joinedCommunities = S.s.social.joinedCommunities.filter(x => x !== c.id);
      SP.ui.toast(`Left ${c.name}`);
    } else {
      S.s.social.joinedCommunities.push(c.id);
      SP.ui.toast(`Joined ${c.name}`);
      S.addXP(2, { origin: "community" });
      SP.app.updateHeader();
    }
    S.save();
  }

  function buildComposer(c) {
    const box = el("div", { class: "composer" });
    box.innerHTML = avatarHTML(S.s.profile.name, 36, { color: S.s.profile.avatarColor });
    const main = el("div", { style: { flex: "1", minWidth: "0" } });
    const titleIn = el("input", { class: "input", placeholder: "Post a doubt, a resource, or a win…", style: { marginBottom: "8px" }, "aria-label": "Post title" });
    const textIn = el("textarea", { class: "textarea", placeholder: "Details help people help you.", "aria-label": "Post body" });
    const flairSel = el("select", { class: "input", style: { width: "auto" }, "aria-label": "Post flair" });
    [["doubt", "Doubt"], ["resource", "Resource"], ["motivation", "Motivation"], ["win", "Win"]].forEach(([v, l]) => flairSel.appendChild(el("option", { value: v }, l)));
    const err = el("p", { class: "xs", style: { color: "var(--alert-coral)", display: "none", marginTop: "6px" } }, "Write something first — a title is enough.");
    const row = el("div", { class: "composer-row" }, flairSel, el("div", { style: { flex: "1" } }),
      el("button", { class: "btn btn--sm btn--quiet", onclick: publish }, "Publish"));
    main.append(titleIn, textIn, err, row);
    box.appendChild(main);

    function publish() {
      if (!titleIn.value.trim()) { err.style.display = ""; titleIn.focus(); return; }
      const post = {
        id: uid(), community: c.id, flair: flairSel.value, author: S.s.profile.name, time: "just now",
        upvotes: 1, title: titleIn.value.trim(), text: textIn.value.trim(), comments: [], mine: true,
      };
      D.POSTS.unshift(post);
      S.addXP(2, { origin: "community" });
      S.bumpQuest("q4", 1);
      SP.app.updateHeader();
      SP.ui.toast("Published — your post is at the top of the feed");
      mount(container);
    }
    return box;
  }

  /* ---------- post card ---------- */
  function postCard(p, showCommunity, c) {
    const com = c || D.COMMUNITIES.find(x => x.id === p.community);
    const myVote = S.s.social.votes[p.id] || 0;
    const score = p.upvotes + myVote;
    const card = el("article", { class: "post" });

    const countEl = el("span", { class: "vote-num" }, String(score));
    const up = el("button", { class: "vote-pill", "aria-pressed": myVote === 1, "aria-label": "Upvote",
      onclick: () => vote(1) }, el("span", { class: "vp-ic", html: icon("up", 14) }), countEl);
    const down = el("button", { class: "vote-btn down", "aria-pressed": myVote === -1, "aria-label": "Downvote", html: icon("down", 14),
      onclick: () => vote(-1) });

    function vote(dir) {
      S.s.social.votes[p.id] = myVote === dir ? 0 : dir;
      S.save();
      const now = S.s.social.votes[p.id] || 0;
      countEl.textContent = String(p.upvotes + now);
      up.setAttribute("aria-pressed", now === 1);
      down.setAttribute("aria-pressed", now === -1);
    }

    const main = el("div", { class: "post-main" });
    /* community name leads; the author sits smaller underneath it */
    main.appendChild(el("div", { class: "post-head" },
      el("span", { class: "post-avatar", html: avatarHTML(p.author, 34) }),
      el("div", { class: "post-id" },
        showCommunity && com
          ? el("button", { class: "post-com", onclick: () => { location.hash = `#/social/community/${com.id}`; } }, com.name)
          : el("span", { class: "post-com" }, p.author),
        el("span", { class: "post-by" }, (showCommunity && com ? `${p.author} · ` : "") + p.time)),
      el("span", { class: `flair flair--${p.flair}` }, p.flair === "doubt" ? "Doubt" : p.flair === "resource" ? "Resource" : p.flair === "motivation" ? "Motivation" : "Win")));
    main.appendChild(el("h3", { class: "post-title" }, p.title));
    if (p.text) main.appendChild(el("p", { class: "post-text" }, p.text));

    if (p.poll) {
      const total = p.poll.options.reduce((n, o) => n + o.votes, 0) + (p.poll.myVote != null ? 0 : 0);
      const poll = el("div", { class: `poll ${p.poll.myVote != null ? "voted" : ""}` });
      p.poll.options.forEach((o, oi) => {
        const pct = Math.round(o.votes / total * 100);
        const opt = el("button", { class: `poll-option ${p.poll.myVote === oi ? "voted" : ""}`, onclick: () => {
          if (p.poll.myVote != null) return;
          p.poll.myVote = oi;
          o.votes++;
          mount(container);
        } },
          el("span", { class: "poll-fill", style: { width: p.poll.myVote != null ? pct + "%" : "0" } }),
          el("span", { class: "poll-label" }, o.text),
          el("span", { class: "poll-pct" }, pct + "%"));
        poll.appendChild(opt);
      });
      poll.appendChild(el("span", { class: "xs faint" }, `${fmtNumSafe(total)} votes`));
      main.appendChild(poll);
    }

    const actions = el("div", { class: "post-actions" });
    const commentsBox = el("div", {});
    let commentsOpen = false;
    const commentBtn = el("button", { class: "post-action", html: icon("comment", 14) + `<span>${p.comments.length} comments</span>`,
      onclick: () => { commentsOpen = !commentsOpen; drawComments(); } });
    /* Vote, comment and one ⋯. Reporting a post is not something every
       card should advertise — it lives in the menu where it belongs. */
    actions.append(up, down, commentBtn,
      el("div", { class: "spacer" }),
      SP.ui.menuButton([
        { label: "Save post", icon: "bookmark", run: () => SP.ui.toast("Post saved to your items") },
        { label: "Copy link", icon: "link", run: () => SP.ui.toast("Link copied") },
        { sep: true },
        { label: "Report post", icon: "report", danger: true, run: () => reportPost(p) },
      ], { label: "Post actions" }));
    main.appendChild(actions);

    function drawComments() {
      commentsBox.innerHTML = "";
      if (!commentsOpen) return;
      const wrap = el("div", { class: "comments" });
      p.comments.forEach(cm => {
        wrap.appendChild(el("div", { class: "comment" },
          el("span", { html: avatarHTML(cm.author, 26) }),
          el("div", { class: "c-body" },
            el("div", { class: "c-author" }, cm.author),
            el("div", { class: "c-text" }, cm.text),
            el("div", { class: "xs faint", style: { marginTop: "4px" } }, `${cm.votes} helpful`))));
      });
      const input = el("input", { class: "input", placeholder: "Add a comment…", "aria-label": "Add a comment" });
      const send = el("button", { class: "btn btn--sm btn--quiet", onclick: () => {
        const v = input.value.trim();
        if (!v) return;
        p.comments.push({ author: S.s.profile.name, text: v, votes: 0 });
        S.addXP(2, { origin: "community" });
        S.bumpQuest("q4", 1);
        SP.app.updateHeader();
        SP.ui.toast("Comment posted");
        commentBtn.innerHTML = icon("comment", 14) + `<span>${p.comments.length} comments</span>`;
        drawComments();
      } }, "Reply");
      input.addEventListener("keydown", e => { if (e.key === "Enter") send.click(); });
      wrap.appendChild(el("div", { style: { display: "flex", gap: "8px" } }, input, send));
      commentsBox.appendChild(wrap);
    }
    main.appendChild(commentsBox);

    card.append(main);
    return card;
  }
  function fmtNumSafe(n) { return SP.ui.fmtNum(n); }

  function reportPost(p) {
    const body = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });
    const reasons = ["Spam or advertising", "Incorrect or misleading answer", "Harassment", "Exam paper leak"];
    let chosen = null;
    reasons.forEach(r => {
      body.appendChild(el("button", { class: "drawer-item", style: { width: "100%" }, onclick: e => {
        chosen = r;
        body.querySelectorAll(".drawer-item").forEach(b => b.style.borderColor = "");
        e.currentTarget.style.borderColor = "var(--alert-coral)";
      } }, el("span", { class: "di-name" }, r)));
    });
    const m = SP.ui.modal({
      title: "Report post to moderators", body,
      foot: [
        el("button", { class: "btn btn--ghost", onclick: () => m.close() }, "Cancel"),
        el("button", { class: "btn btn--danger", onclick: () => {
          if (!chosen) { SP.ui.toast("Pick a reason first"); return; }
          m.close();
          SP.ui.toast("Report sent to moderators");
        } }, "Send report")],
    });
  }

  /* ============================================================
     STUDY ROOMS
     ============================================================ */
  function renderRooms(content) {
    content.innerHTML = "";
    content.appendChild(el("h1", { style: { marginBottom: "4px" } }, "Study Rooms"));
    content.appendChild(el("p", { class: "muted small", style: { marginBottom: "20px" } }, "Shared timers and quiet company. Cameras optional, presence real."));
    const grid = el("div", { class: "room-grid" });
    D.ROOMS.forEach(r => {
      grid.appendChild(el("button", { class: `room-card ${r.live ? "live" : ""}`, onclick: () => { location.hash = `#/social/room/${r.id}`; } },
        el("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
          r.live ? el("span", { class: "live-pill" }, el("span", { class: "live-dot" }), "Live now") : el("span", { class: "small faint" }, "Not live yet"),
          el("span", { style: { marginLeft: "auto" }, class: "num xs muted" }, `${r.people}/${r.capacity}`)),
        el("span", { class: "room-title" }, r.name),
        el("span", { class: "room-presence" }, r.focus),
        r.live ? el("span", { class: "small", style: { color: "var(--moss)", fontWeight: "700" } }, `${r.people} people studying here now`) : null,
        el("span", { class: `btn btn--sm ${r.live ? "btn--quiet" : ""}`, style: { width: "100%" } }, r.live ? "Join room" : "View room")));
    });
    content.appendChild(grid);

    content.appendChild(sectionHead("Your groups", "Chat rooms with topic sub-threads"));
    const groups = el("div", { class: "com-list" });
    D.GROUPS.forEach(g => {
      groups.appendChild(el("button", { class: "com-card", onclick: () => { location.hash = "#/social/groups"; } },
        el("span", { class: "com-icon", html: icon("msg", 17) }),
        el("span", { style: { flex: "1" } },
          el("span", { class: "com-name", style: { display: "block" } }, g.name),
          el("span", { class: "com-members" }, `${g.members} members`)),
        g.unread ? el("span", { class: "nav-badge" }, `${g.unread} new`) : null));
    });
    content.appendChild(groups);
  }

  let roomTimer = null;
  function renderRoom(content, id) {
    const r = D.ROOMS.find(x => x.id === id);
    content.innerHTML = "";
    if (roomTimer) { clearInterval(roomTimer); roomTimer = null; }
    if (!r) { content.appendChild(emptyState("Room not found", "This room may have closed. Browse the live ones instead.", "Browse rooms", () => { location.hash = "#/social/rooms"; })); return; }

    content.appendChild(SP.ui.backPill(r.name, "clock", "#/social/rooms"));

    if (!r.live) {
      content.appendChild(emptyState("This room isn't live yet", `"${r.name}" opens when ${r.host} starts the session. You'll get a notification if reminders are on.`, "Browse live rooms", () => { location.hash = "#/social/rooms"; }));
      return;
    }

    const view = el("div", { class: "room-view" });

    // stage: shared timer + people (body doubling)
    const stage = el("div", { class: "room-stage" });
    stage.appendChild(el("h2", {}, r.name));
    stage.appendChild(el("span", { class: "live-pill" }, el("span", { class: "live-dot" }), `${r.people} people studying here now`));
    const shared = { remain: 18 * 60 + 24 };
    const timerNode = el("div", { class: "room-big-timer" }, fmtTimeLeft(shared.remain * 1000));
    stage.appendChild(el("div", { style: { textAlign: "center" } },
      el("div", { class: "xs faint", style: { fontWeight: "700", marginBottom: "4px" } }, "Shared pomodoro — everyone in the room sees the same clock"),
      timerNode));
    roomTimer = setInterval(() => {
      shared.remain = Math.max(0, shared.remain - 1);
      timerNode.textContent = fmtTimeLeft(shared.remain * 1000);
      if (shared.remain === 0) { clearInterval(roomTimer); SP.ui.toast("Room block finished — everyone takes five"); }
    }, 1000);

    const people = el("div", { class: "room-people" });
    (r.members.length ? r.members : [{ name: "Studyer", cam: false }]).forEach(m => {
      people.appendChild(el("div", { class: "room-person" },
        el("div", { class: "cam-tile" }, m.cam ? avatarHTML(m.name, 44) : el("span", { html: icon("eye", 18), style: { color: "var(--ink-faint)", display: "flex" }, class: "faint" })),
        el("span", { class: "rp-name" }, m.name)));
    });
    stage.appendChild(people);
    stage.appendChild(el("p", { class: "xs faint" }, "Cameras optional — presence is the point."));
    const camBtn = el("button", { class: "btn btn--sm", "aria-pressed": "false",
      html: icon("eyeOff", 14) + "<span>Camera off</span>",
      onclick: () => {
        const on = camBtn.getAttribute("aria-pressed") === "true";
        camBtn.setAttribute("aria-pressed", String(!on));
        camBtn.classList.toggle("btn--quiet", !on);
        camBtn.innerHTML = icon(on ? "eyeOff" : "camera", 14) + `<span>Camera ${on ? "off" : "on"}</span>`;
        SP.ui.toast(on ? "Camera off — presence is still shared" : "Camera on");
      } });
    stage.appendChild(el("div", { class: "room-controls" }, camBtn,
      el("button", { class: "btn btn--sm btn--ghost", onclick: () => { clearInterval(roomTimer); SP.ui.toast(`Left ${r.name}`); location.hash = "#/social/rooms"; } }, "Leave")));
    view.appendChild(stage);

    // chat
    const chat = el("div", { class: "room-chat" });
    chat.appendChild(el("div", { class: "room-chat-head" }, "Room chat"));
    const msgs = el("div", { class: "chat-msgs" });
    const seedMsgs = [
      { author: r.host === "system" ? "Ishita" : r.host, text: "Starting a 25-minute block. Doubts after the timer, not during.", time: "now - 24m" },
      { author: "Dev", text: "in. physiology deck + past paper q12", time: "now - 22m" },
      { author: "Aisha", text: "same here, gl at 11 everyone", time: "now - 20m" },
    ];
    const drawMsg = m => msgs.appendChild(el("div", { class: "msg" },
      el("span", { html: avatarHTML(m.author, 26) }),
      el("div", { class: "m-main" },
        el("span", { class: "m-author" }, m.author, el("span", { class: "m-time" }, m.time)),
        el("div", { class: "m-text" }, m.text))));
    seedMsgs.forEach(drawMsg);
    chat.appendChild(msgs);
    const input = el("input", { class: "input", placeholder: "Say something to the room…", "aria-label": "Room message" });
    const send = el("button", { class: "btn btn--sm btn--quiet", "aria-label": "Send message", html: icon("send", 14), onclick: () => {
      const v = input.value.trim();
      if (!v) return;
      drawMsg({ author: S.s.profile.name, text: v, time: "now" });
      input.value = "";
      msgs.scrollTop = msgs.scrollHeight;
    } });
    input.addEventListener("keydown", e => { if (e.key === "Enter") send.click(); });
    chat.appendChild(el("div", { class: "chat-input-row" }, input, send));
    view.appendChild(chat);

    content.appendChild(view);
    msgs.scrollTop = msgs.scrollHeight;

    // mark joined (once per session)
    if (!S.s.social.joinedRooms.includes(id)) {
      S.s.social.joinedRooms.push(id);
      S.save();
    }
  }

  /* ============================================================
     GROUPS
     ============================================================ */
  function renderGroups(content) {
    content.innerHTML = "";
    content.appendChild(el("h1", { style: { marginBottom: "16px" } }, "Groups"));
    D.GROUPS.forEach(g => {
      const box = el("div", { class: "card", style: { marginBottom: "16px", borderRadius: "var(--r-lg)", padding: "0", overflow: "hidden" } });
      box.appendChild(el("div", { style: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: "1px solid var(--border)" } },
        el("span", { style: { fontWeight: "800", fontSize: "14px", flex: "1" } }, g.name),
        el("span", { class: "com-members" }, `${g.members} members`)));
      const msgs = el("div", { style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" } });
      g.messages.forEach(m => {
        const msg = el("div", { class: "msg" },
          el("span", { html: avatarHTML(m.author, 28) }),
          el("div", { class: "m-main" },
            el("span", { class: "m-author" }, m.author, el("span", { class: "m-time" }, m.time)),
            el("div", { class: "m-text" }, m.text)));
        msgs.appendChild(msg);
      });
      // sub-threads
      g.threads.forEach(t => {
        msgs.appendChild(el("div", { style: { marginLeft: "36px" } },
          el("button", { class: "thread-link", onclick: () => openThread(g, t), html: icon("msg", 12) + `<span>${esc(t.name)} — ${t.replies} replies</span>` })));
      });
      box.appendChild(msgs);
      const input = el("input", { class: "input", placeholder: `Message ${g.name}…`, "aria-label": "Group message" });
      const send = el("button", { class: "btn btn--sm btn--quiet", html: icon("send", 14), "aria-label": "Send", onclick: () => {
        const v = input.value.trim();
        if (!v) return;
        g.messages.push({ author: S.s.profile.name, time: "now", text: v });
        input.value = "";
        renderGroups(content);
      } });
      input.addEventListener("keydown", e => { if (e.key === "Enter") send.click(); });
      box.appendChild(el("div", { class: "chat-input-row", style: { borderTop: "1px solid var(--border)" } }, input, send));
      content.appendChild(box);
    });
  }

  function openThread(g, t) {
    const m = SP.ui.modal({
      title: `${g.name} — ${t.name}`,
      body: el("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        el("p", { class: "small muted" }, `${t.replies} replies in this sub-thread. Last activity: ${t.last}`),
        el("div", { class: "msg" }, el("span", { html: avatarHTML("Kabir", 28) }),
          el("div", { class: "m-main" }, el("span", { class: "m-author" }, "Kabir"),
            el("div", { class: "m-text" }, "Posting the revised tables here so we stop losing them in main chat."))),
        el("div", { class: "msg" }, el("span", { html: avatarHTML("Meera", 28) }),
          el("div", { class: "m-main" }, el("span", { class: "m-author" }, "Meera"),
            el("div", { class: "m-text" }, "The dihybrid one still needs the expected-ratio column."))),
      ),
      foot: [el("button", { class: "btn", onclick: () => m.close() }, "Close thread")],
    });
  }

  /* ============================================================
     FRIENDS
     ============================================================ */
  function renderFriends(content) {
    content.innerHTML = "";
    content.appendChild(el("h1", { style: { marginBottom: "16px" } }, "Friends"));
    const list = el("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
    D.FRIENDS.forEach(f => {
      list.appendChild(el("div", { class: "friend-row" },
        el("span", { html: avatarHTML(f.name, 40, { online: f.online, level: { into: (f.level * 37 % 100) / 100 } }) }),
        el("div", { style: { flex: "1", minWidth: "0" } },
          el("div", { style: { fontWeight: "700", fontSize: "14px" } }, f.name, el("span", { class: "num xs faint", style: { marginLeft: "8px" } }, `Lv ${f.level}`)),
          el("div", { class: "fr-status" }, f.status)),
        el("button", { class: "btn btn--sm", onclick: () => openDM(f) }, "Message")));
    });
    content.appendChild(list);
  }

  function openDM(f) {
    const body = el("div", {});
    const msgs = el("div", { class: "chat-msgs", style: { height: "260px", border: "1px solid var(--border)", borderRadius: "var(--r-md)", marginBottom: "10px" } });
    msgs.appendChild(el("div", { class: "msg" },
      el("span", { html: avatarHTML(f.name, 26) }),
      el("div", { class: "m-main" }, el("span", { class: "m-author" }, f.name),
        el("div", { class: "m-text" }, f.online ? "hey! joining the 9pm room?" : `(last seen — ${f.status})`))));
    body.appendChild(msgs);
    const input = el("input", { class: "input", placeholder: `Message ${f.name}…`, "aria-label": "Direct message" });
    const send = el("button", { class: "btn btn--sm btn--quiet", html: icon("send", 14), onclick: () => {
      const v = input.value.trim();
      if (!v) return;
      msgs.appendChild(el("div", { class: "msg", style: { flexDirection: "row-reverse" } },
        el("div", { class: "m-main", style: { textAlign: "right" } }, el("div", { class: "m-text" }, v))));
      input.value = "";
      msgs.scrollTop = msgs.scrollHeight;
    } });
    input.addEventListener("keydown", e => { if (e.key === "Enter") send.click(); });
    body.appendChild(el("div", { style: { display: "flex", gap: "8px" } }, input, send));
    const m = SP.ui.modal({ title: f.name, body });
  }

  function emptyState(title, text, ctaLabel, cta) {
    return el("div", { class: "empty-state" },
      el("div", { html: emberSVG(84, { glow: S.s.profile.ember.glow, mood: "calm" }) }),
      el("h3", {}, title),
      el("p", {}, text),
      cta ? el("button", { class: "btn btn--quiet", onclick: cta }, ctaLabel) : null);
  }

  return { mount, stopRoomTimer: () => { if (roomTimer) { clearInterval(roomTimer); roomTimer = null; } } };
})();
