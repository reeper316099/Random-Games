// Shell for the desktop app: Games tab (iframe) + High Scores tab.
// Games report results with postMessage (see scores.js); we forward them to the Go backend.
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const api = () => (window.go && window.go.main && window.go.main.App) || null;

  const GAMES = {
    blackjack:   { name: "Blackjack",               icon: "🃏" },
    bs:          { name: "BS (Cheat)",              icon: "🤥" },
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
  $("tabGames").addEventListener("click", () => showTab("games"));
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
