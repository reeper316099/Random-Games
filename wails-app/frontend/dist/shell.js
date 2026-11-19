// Shell for the desktop app: Games tab (iframe) + High Scores tab.
// Games report results with postMessage (see scores.js); we forward them to the Go backend.
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const api = () => (window.go && window.go.main && window.go.main.App) || null;

  const GAMES = {
    blackjack:   { name: "Blackjack",               icon: "🃏" },
    bs:          { name: "BS (Cheat)",              icon: "🤥" },
    hearts:      { name: "Hearts",                  icon: "♥️" },
    spades:      { name: "Spades",                  icon: "♠️" },
    "video-poker": { name: "Video Poker",           icon: "🂡" },
    "remorse-chess": { name: "Remorse Chess",       icon: "♞" },
    checkers:    { name: "Checkers",                icon: "🔴" },
    chess:       { name: "Chess",                   icon: "♟️" },
    dice:        { name: "High Roller Dice",        icon: "🎲" },
    slots:       { name: "Lucky Reels Slots",       icon: "🎰" },
    minesweeper: { name: "Minesweeper",             icon: "💣" },
    poker:       { name: "Texas Hold'em Poker",     icon: "♠️" },
    roulette:    { name: "Royal Roulette",          icon: "🎡" },
    solitaire:   { name: "Solitaire",               icon: "🂡" },
    "ultimate-ttt": { name: "Ultimate Tic-Tac-Toe",  icon: "⭕" }
  };
  const gameName = id => (GAMES[id] ? GAMES[id].icon + " " + GAMES[id].name : id);

  // ---------- formatting ----------
  function formatValue(v, unit) {
    if (unit === "s") {
      if (v < 60) return v.toFixed(v % 1 ? 1 : 0) + "s";
      const m = Math.floor(v / 60), s = v - m * 60;
      return m + ":" + (s < 10 ? "0" : "") + (s % 1 ? s.toFixed(1) : s);
    }
    const n = Number.isInteger(v) ? v.toLocaleString() : String(v);
    return unit ? n + " " + unit : n;
  }
  function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  // ---------- tabs ----------
  function showTab(which) {
    const scores = which === "scores";
    $("viewGames").hidden = scores;
    $("viewScores").hidden = !scores;
    $("tabGames").classList.toggle("active", !scores);
    $("tabScores").classList.toggle("active", scores);
    $("tabGames").setAttribute("aria-selected", String(!scores));
    $("tabScores").setAttribute("aria-selected", String(scores));
    if (scores) loadScores();
  }
  // Back to the launcher: reloads the game iframe on games/index.html.
  function goHome() {
    const f = $("gameFrame");
    try { f.contentWindow.location.replace("games/index.html"); } catch (e) { f.src = "games/index.html"; }
  }
  // Clicking "Games" while already on the Games tab (or the app logo) returns to the launcher; from High Scores it keeps your game.
  $("tabGames").addEventListener("click", () => { const already = $("tabGames").classList.contains("active"); showTab("games"); if (already) goHome(); });
  const brand = document.querySelector(".brand");
  if (brand) { brand.style.cursor = "pointer"; brand.setAttribute("role", "link"); brand.setAttribute("tabindex", "0"); brand.title = "Back to all games";
    brand.addEventListener("click", () => { showTab("games"); goHome(); });
    brand.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showTab("games"); goHome(); } }); }
  $("tabScores").addEventListener("click", () => showTab("scores"));

  // ---------- full screen (desktop app only) ----------
  async function toggleFullscreen() {
    const rt = window.runtime;
    if (!rt || !rt.WindowIsFullscreen) return;
    try { (await rt.WindowIsFullscreen()) ? rt.WindowUnfullscreen() : rt.WindowFullscreen(); } catch (e) {}
  }
  $("fsBtn").addEventListener("click", toggleFullscreen);
  if (!(window.runtime && window.runtime.WindowFullscreen)) $("fsBtn").hidden = true;   // plain browser: nothing to toggle
  document.addEventListener("keydown", e => { if (e.key === "F11") { e.preventDefault(); toggleFullscreen(); } });

  // ---------- scores view ----------
  let boards = [];
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  async function loadScores() {
    const a = api();
    try { boards = a ? (await a.GetScores()) || [] : []; } catch (e) { boards = []; }
    try { $("scoresPath").textContent = a ? "Saved at: " + ((await a.ScoresPath()) || "(memory only)") : ""; } catch (e) {}
    renderFilter();
    renderScores();
  }
  function renderFilter() {
    const sel = $("gameFilter"), current = sel.value || "";
    const ids = [...new Set(boards.map(b => b.game))];
    sel.innerHTML = "";
    const all = el("option", "", "All games"); all.value = ""; sel.appendChild(all);
    ids.forEach(id => { const o = el("option", "", gameName(id)); o.value = id; sel.appendChild(o); });
    sel.value = ids.includes(current) ? current : "";
  }
  function renderScores() {
    const body = $("scoresBody"); body.innerHTML = "";
    const filter = $("gameFilter").value;
    const shown = boards.filter(b => !filter || b.game === filter);
    if (!shown.length) {
      body.appendChild(el("div", "empty", "No scores yet — win a game and it will show up here."));
      return;
    }
    const byGame = new Map();
    shown.forEach(b => { if (!byGame.has(b.game)) byGame.set(b.game, []); byGame.get(b.game).push(b); });
    byGame.forEach((list, id) => {
      const sec = el("section", "game");
      sec.appendChild(el("h2", "", gameName(id)));
      const grid = el("div", "cards");
      list.forEach(b => {
        const card = el("div", "board");
        const h = el("h3", "", b.metric);
        if (b.category) h.appendChild(el("span", "", b.category));
        card.appendChild(h);
        const ol = el("ol");
        b.entries.forEach((e, i) => {
          const li = el("li");
          li.appendChild(el("span", "rank", String(i + 1)));
          li.appendChild(el("span", "val", formatValue(e.value, e.unit)));
          li.appendChild(el("span", "", ""));
          const meta = [e.detail, formatDate(e.when)].filter(Boolean).join(" · ");
          if (meta) li.appendChild(el("span", "meta", meta));
          // click (or Enter) for the full details of this result
          li.className = "clickable"; li.tabIndex = 0; li.setAttribute("role", "button");
          li.setAttribute("aria-label", "Show details for rank " + (i + 1));
          if (e.info && e.info.length) { const m = li.querySelector(".meta"); if (m) m.appendChild(el("span", "more", "· details ›")); else li.appendChild(el("span", "meta", "details ›")); }
          const open = () => showDetail(b, e, i + 1);
          li.addEventListener("click", open);
          li.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); } });
          ol.appendChild(li);
        });
        card.appendChild(ol);
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      body.appendChild(sec);
    });
  }
  $("gameFilter").addEventListener("change", renderScores);

  // ---------- score detail dialog ----------
  let detailReturn = null;
  function showDetail(b, e, rank) {
    $("detailTitle").textContent = gameName(b.game) + (b.category ? " — " + b.category : "");
    $("detailBig").textContent = b.metric + ": " + formatValue(e.value, e.unit);
    const rows = $("detailRows"); rows.innerHTML = "";
    const add = (k, v) => { const r = el("div", "row"); r.appendChild(el("span", "k", k)); r.appendChild(el("span", "v", v)); rows.appendChild(r); };
    add("Rank", "#" + rank + " of " + b.entries.length);
    if (e.when) { const d = new Date(e.when); if (!isNaN(d)) add("When", d.toLocaleString()); }
    if (e.detail) add("Summary", e.detail);
    (e.info || []).forEach(l => { if (l.value) add(l.label, l.value); else rows.appendChild(el("div", "head", l.label)); });
    if (!e.info || !e.info.length) rows.appendChild(el("div", "head", "No extra details were saved for this result"));
    detailReturn = document.activeElement;
    $("detailBox").hidden = false; $("detailClose").focus();
  }
  function closeDetail() { $("detailBox").hidden = true; if (detailReturn && detailReturn.focus) try { detailReturn.focus(); } catch (e) {} }
  $("detailClose").addEventListener("click", closeDetail);
  $("detailBox").addEventListener("click", ev => { if (ev.target === $("detailBox")) closeDetail(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && !$("detailBox").hidden) closeDetail(); });
  // Two-step reset (no native confirm dialog, which not every desktop webview supports).
  let resetArmed = null;
  $("resetBtn").addEventListener("click", async () => {
    const btn = $("resetBtn"), game = $("gameFilter").value;
    if (!resetArmed) {
      btn.textContent = "Click again to erase " + (game ? gameName(game) : "ALL");
      resetArmed = setTimeout(() => { resetArmed = null; btn.textContent = "Reset…"; }, 4000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null; btn.textContent = "Reset…";
    const a = api();
    if (a) { try { await a.ResetScores(game); } catch (e) { toast("Could not reset: " + e); return; } }
    loadScores();
  });

  // ---------- receive scores from games ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4000);
  }
  // Methods a game is allowed to call on the Go backend (everything else is refused).
  const ALLOWED = new Set(["SaveGame", "ListSaves", "DeleteSave"]);
  window.addEventListener("message", async ev => {
    const frame = $("gameFrame");
    if (!frame || ev.source !== frame.contentWindow) return;       // only trust our own game iframe
    const d = ev.data;
    if (!d) return;
    const reply = msg => { try { frame.contentWindow.postMessage(msg, "*"); } catch (e) {} };
    if (d.type === "rg-ping") { if (api()) reply({ type: "rg-pong" }); return; }
    if (d.type === "rg-rpc") {
      const a = api();
      if (!a || !ALLOWED.has(d.method) || !Array.isArray(d.args)) {
        reply({ type: "rg-rpc-result", id: d.id, ok: false, error: "not available" });
        return;
      }
      try { reply({ type: "rg-rpc-result", id: d.id, ok: true, result: await a[d.method](...d.args) }); }
      catch (err) { reply({ type: "rg-rpc-result", id: d.id, ok: false, error: String(err && err.message || err) }); }
      return;
    }
    if (d.type !== "rg-score" || !d.entry) return;
    const a = api();
    if (!a) return;
    try {
      const res = await a.SubmitScore(d.entry);
      if (res && res.rank > 0) {
        const e = d.entry;
        const label = gameName(e.game) + (e.category ? " — " + e.category : "") + " · " + e.metric + ": " + formatValue(e.value, e.unit);
        toast((res.newBest ? "🏆 New #1! " : "🏅 Top 10 (#" + res.rank + ") ") + label);
      }
    } catch (err) { console.error("SubmitScore failed", err); }
  });
})();
