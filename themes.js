/* themes.js — seasonal themes shared by the single-file games.
 *
 * Adds a "Seasonal theme" menu to the game's Settings panel (or to a [data-season-slot] element) and re-skins whichever game loaded it:
 * page background, card faces and backs, felt tables, chess and checkers boards and pieces, dice,
 * the roulette wheel, minesweeper tiles. Falling petals / leaves / snow float over the page.
 *
 *   RGThemes.get()      -> "classic" | "spring" | "summer" | "fall" | "winter" | "auto"
 *   RGThemes.set("fall")
 *   RGThemes.palette()  -> colours of the active season (null for classic)
 *
 * Games work without this file; "classic" leaves every game exactly as it was designed.
 * The choice is remembered (localStorage "rg_season") and shared by all games.
 */
(function () {
  "use strict";
  var KEY = "rg_season";
  var NAMES = ["classic", "auto", "spring", "summer", "fall", "winter"];
  var LABELS = { classic: "🎨 Classic", auto: "🗓️ Auto", spring: "🌸 Spring", summer: "☀️ Summer", fall: "🍂 Fall", winter: "❄️ Winter" };
  var root = document.documentElement;

  // ---------- palettes ----------
  var P = {
    spring: {
      icon: "🌸", bgA: "#34603f", bgB: "#1c3a35", bgC: "#101c1c",
      f1: "#62d3a2", f2: "#37a97d", f3: "#1b6a52", rail: "#9a6a4a", railD: "#4a2e1f", trim: "rgba(255,170,200,.55)",
      g1: "#ffd6e6", g2: "#ff8fb8",
      b1: "#e0709a", b2: "#bf4f7c", back: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.38) 0 15%, transparent 16%), repeating-radial-gradient(circle at 50% 50%, #e0709a 0 4px, #bf4f7c 4px 8px)", emblem: "🌸",
      fa: "#fffefb", fb: "#fff0f6",
      sqL: "#f7e6ee", sqD: "#86bb86", sqL2: "#fbeaf1", sqD2: "#6fa874", pw: "#fff8fb", pb: "#3a2147", frame: "#5a3a2a",
      x: "#ff7aa8", o: "#7ddc8f",
      cr: "#ee6a98", crd: "#b83a68", crs: "#7a1f42", cb: "#4a8a5a", cbd: "#244c30", cbs: "#12281a",
      d1: "#ff9ec0", d2: "#e0457f", d3: "#b32a60",
      wr: "#ff6fa5", wb: "#1f6b4a", wg: "#f2c14e", w1: "#7a5a4a", w2: "#3c2a22", rn: "pink", bn: "green", zn: "gold",
      pw1: "#fff4f8", pw2: "#ffb8d2", pwo: "#a8416d", pb1: "#7a3d86", pb2: "#2e1233", pbo: "#16061a", glow: "rgba(255,170,205,.55)", sr: "#d6336c", sk: "#1f5c3a",
      m1: "#9bd0a8", m2: "#62a681", mr: "#192b25"
    },
    summer: {
      icon: "☀️", bgA: "#0f6f94", bgB: "#0a3f5e", bgC: "#07202f",
      f1: "#27c0b9", f2: "#0e8f94", f3: "#075c68", rail: "#d9a25f", railD: "#6a4318", trim: "rgba(255,230,120,.65)",
      g1: "#fff1a8", g2: "#ffb703",
      b1: "#ffb703", b2: "#fb7a00", back: "repeating-conic-gradient(from 0deg at 50% 50%, #ffb703 0 12deg, #fb7a00 12deg 24deg)", emblem: "☀️",
      fa: "#fffdf5", fb: "#fff3d2",
      sqL: "#fff0c8", sqD: "#3fa9c9", sqL2: "#fff3d2", sqD2: "#2f93b4", pw: "#fffdf2", pb: "#0b3a4d", frame: "#b87a2c",
      x: "#ff7a45", o: "#22d3ee",
      cr: "#ff8a3d", crd: "#c2571a", crs: "#7a3208", cb: "#118aa8", cbd: "#064e5f", cbs: "#032a33",
      d1: "#ff8a5c", d2: "#f4511e", d3: "#c23a10",
      wr: "#ff7a1a", wb: "#0a6f9a", wg: "#17b58a", w1: "#c68a3f", w2: "#6a4318", rn: "orange", bn: "blue", zn: "teal",
      pw1: "#fffbe0", pw2: "#ffd24d", pwo: "#a86a00", pb1: "#1b8fb3", pb2: "#073b52", pbo: "#021c28", glow: "rgba(255,214,80,.5)", sr: "#e8590c", sk: "#0b5d7a",
      m1: "#64c9ea", m2: "#2f93b8", mr: "#0b2a3b"
    },
    fall: {
      icon: "🍂", bgA: "#6f3c1b", bgB: "#3a2014", bgC: "#1a0f0b",
      f1: "#b8582d", f2: "#8d3b1d", f3: "#57220f", rail: "#6f3d1b", railD: "#2a1409", trim: "rgba(255,170,60,.6)",
      g1: "#ffd592", g2: "#e8821a",
      b1: "#c2571a", b2: "#7a2e0e", back: "repeating-linear-gradient(-45deg, rgba(0,0,0,.2) 0 2px, transparent 2px 12px), repeating-linear-gradient(45deg, #c2571a 0 6px, #8c3510 6px 12px)", emblem: "🍂",
      fa: "#fffaf0", fb: "#fbe9cf",
      sqL: "#f0d7ac", sqD: "#a8622d", sqL2: "#f3dcb4", sqD2: "#8c4f22", pw: "#fff3dc", pb: "#3a1d0c", frame: "#4a2a12",
      x: "#ff7043", o: "#f2c14e",
      cr: "#c8402e", crd: "#8a2318", crs: "#5a130d", cb: "#6a4630", cbd: "#34200f", cbs: "#1a0f06",
      d1: "#ff9a3c", d2: "#d9530f", d3: "#8a2f08",
      wr: "#d9661a", wb: "#3a2214", wg: "#6f8a2e", w1: "#7a4a22", w2: "#2a1409", rn: "orange", bn: "brown", zn: "olive",
      pw1: "#fff1cf", pw2: "#f0b055", pwo: "#8a5510", pb1: "#9a431f", pb2: "#4a1d0b", pbo: "#1f0c04", glow: "rgba(255,160,60,.45)", sr: "#b5361a", sk: "#4a2c14",
      m1: "#cf9355", m2: "#9a6431", mr: "#251610"
    },
    winter: {
      icon: "❄️", bgA: "#3a5f86", bgB: "#1c2f4b", bgC: "#0c1424",
      f1: "#4f8fc2", f2: "#31679a", f3: "#183d66", rail: "#b8c7d9", railD: "#5d7088", trim: "rgba(200,235,255,.65)",
      g1: "#eaf8ff", g2: "#7cc8f0",
      b1: "#6fb4e8", b2: "#3a7cb5", back: "radial-gradient(circle, rgba(255,255,255,.75) 0 1.6px, transparent 2.6px) 0 0/11px 11px, linear-gradient(160deg, #6fb4e8, #2f6ea6)", emblem: "❄️",
      fa: "#ffffff", fb: "#e8f3fb",
      sqL: "#e6f1f8", sqD: "#7a9bbd", sqL2: "#ecf5fb", sqD2: "#6788ab", pw: "#ffffff", pb: "#1c2f4a", frame: "#6d7f96",
      x: "#ff7a93", o: "#7fe7ff",
      cr: "#dc5470", crd: "#92293f", crs: "#5c1425", cb: "#35557f", cbd: "#17294a", cbs: "#0a1428",
      d1: "#8ccbf5", d2: "#3f8fd0", d3: "#215c94",
      wr: "#4f9fe0", wb: "#14233a", wg: "#2f9d8a", w1: "#8aa0b8", w2: "#3a4a60", rn: "ice", bn: "navy", zn: "teal",
      pw1: "#ffffff", pw2: "#c4e4ff", pwo: "#4f7fb3", pb1: "#34568a", pb2: "#10213f", pbo: "#050b18", glow: "rgba(150,215,255,.7)", sr: "#c2255c", sk: "#1c3a66",
      m1: "#a4c8e8", m2: "#6f9ec8", mr: "#15243a"
    }
  };

  function feltBg(p, at) { return "radial-gradient(ellipse at " + (at || "50% 20%") + ", " + p.f1 + " 0%, " + p.f2 + " 55%, " + p.f3 + " 100%)"; }
  function rail(p, a, b, c, drop, inset) {
    return "0 0 0 " + a + "px " + p.rail + ", 0 0 0 " + b + "px " + p.railD + ", 0 0 0 " + c + "px " + p.trim + ", 0 " + drop + "px 60px rgba(0,0,0,.6), inset 0 0 " + inset + "px rgba(0,0,0,.5)";
  }
  function cardBits(p, sel) {            // card faces/backs for blackjack + poker (.face/.backf)
    return faceCss(p, ".face", ".card.red .face") +
      "@ .backf{background:" + p.back + " !important;}" +
      "@ .backf::after{content:'" + p.emblem + "';position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--cw) * .38);filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));}";
  }
  function pieceCss(p) {                  // gradient-filled, outlined, softly glowing pieces (both chess games)
    return "@ .pc.w,@ .ghost.w{color:transparent !important;background:linear-gradient(180deg," + p.pw1 + "," + p.pw2 + ") !important;-webkit-background-clip:text !important;background-clip:text !important;-webkit-text-stroke:1.3px " + p.pwo + " !important;text-shadow:none !important;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45)) drop-shadow(0 0 5px " + p.glow + ");}" +
      "@ .pc.b,@ .ghost.b{color:transparent !important;background:linear-gradient(180deg," + p.pb1 + "," + p.pb2 + ") !important;-webkit-background-clip:text !important;background-clip:text !important;-webkit-text-stroke:1.1px " + p.pbo + " !important;text-shadow:none !important;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5)) drop-shadow(0 0 4px " + p.glow + ");}";
  }
  function faceCss(p, face, ink) {        // card fronts: tinted paper, season-coloured suits and a thin inner frame
    return "@ " + face + "{background:linear-gradient(160deg," + p.fa + "," + p.fb + ") !important;color:" + p.sk + " !important;border-color:color-mix(in srgb," + p.sk + " 40%,transparent) !important;}" +
      "@ " + ink + "{color:" + p.sr + " !important;}" +
      "@ " + face + "::after{content:'';position:absolute;inset:3.5%;border:1px solid color-mix(in srgb," + p.sr + " 28%,transparent);border-radius:7%;pointer-events:none;}";
  }
  // per-game rules; "@" stands for  html[data-season="…"][data-game="…"]
  var GAME = {
    blackjack: function (p) {
      return "@ .table{background:" + feltBg(p, "50% 15%") + " !important;box-shadow:" + rail(p, 10, 12, 13, 26, 80) + " !important;}" + cardBits(p) +
        "@ .shoe::after{background:" + p.back + " !important;}";
    },
    poker: function (p) {
      return "@ .table{background:" + feltBg(p, "50% 45%") + " !important;box-shadow:" + rail(p, 12, 14, 15, 26, 90) + " !important;}" +
        "@ .table::before{border-color:" + p.trim + " !important;}" + cardBits(p);
    },
    solitaire: function (p) {
      return "@ .felt{background:" + feltBg(p, "50% 20%") + " !important;box-shadow:" + rail(p, 8, 10, 11, 24, 70).replace("60px rgba(0,0,0,.6)", "50px rgba(0,0,0,.55)") + " !important;}" +
        faceCss(p, ".card:not(.down)", ".card.red:not(.down)") +
        "@ .card.down{background:" + p.back + " !important;}" +
        "@ .card.down::after{content:'" + p.emblem + "';position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--cw) * .4);filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));}";
    },
    slots: function (p) {
      return "@ .cabinet{background:linear-gradient(180deg," + p.f1 + "," + p.f2 + " 55%," + p.f3 + ") !important;box-shadow:0 0 0 2px " + p.rail + ",0 0 0 5px " + p.railD + ",0 24px 60px rgba(0,0,0,.6),inset 0 2px 0 rgba(255,255,255,.2) !important;}" +
        "@ .sheet{background:" + p.bgB + " !important;border-color:" + p.trim + " !important;}";
    },
    dice: function (p) {
      return "@ .table{background:" + feltBg(p) + " !important;box-shadow:" + rail(p, 10, 12, 13, 26, 70) + " !important;}" +
        "@ .face{background:linear-gradient(145deg," + p.d1 + "," + p.d2 + " 55%," + p.d3 + ") !important;border-color:" + p.trim + " !important;box-shadow:inset 0 0 14px rgba(0,0,0,.3), inset 0 2px 3px rgba(255,255,255,.5), 0 0 12px " + p.glow + " !important;}" +
        "@ .pip{background:none !important;box-shadow:none !important;display:grid;place-items:center;font-size:calc(var(--d) * .21);line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45));}" +
        "@ .pip::after{content:'" + p.emblem + "';}";
    },
    roulette: function (p) {
      return "@{--felt:" + p.f2 + ";--felt2:" + p.f3 + ";--red:" + p.wr + ";--black:" + p.wb + ";}" +
        "@ .tableWrap{background:linear-gradient(180deg," + p.w1 + "," + p.w2 + ") !important;}" +
        "@ .z.red,@ .badge.red,@ .hist i.red,@ .z.out .dia.r{background:" + p.wr + " !important;}" +
        "@ .z.black,@ .badge.black,@ .hist i.black,@ .z.out .dia.b{background:" + p.wb + " !important;}" +
        "@ .z.green,@ .badge.green,@ .hist i.green{background:" + p.wg + " !important;}";
    },
    chess: function (p) {
      return "@ #board{--sqL:" + p.sqL + " !important;--sqD:" + p.sqD + " !important;box-shadow:0 14px 40px rgba(0,0,0,.55), 0 0 0 5px " + p.frame + ", 0 0 0 6px " + p.trim + " !important;}" +
        pieceCss(p);
    },
    "disguised-king-chess": function (p) {
      return "@{--sq-light:" + p.sqL + ";--sq-dark:" + p.sqD + ";--bg1:" + p.bgA + ";--bg2:" + p.bgC + ";--primary:" + p.g2 + ";--secondary:" + p.g1 + ";--accent:" + p.g2 + ";}" +
        pieceCss(p) +
        "@ .sq.l .co,@ .sq.l .fl{color:" + p.sqD + " !important;}@ .sq.d .co,@ .sq.d .fl{color:" + p.sqL + " !important;}";
    },
    checkers: function (p) {
      function disc(m, d, sh) {
        return "radial-gradient(circle at 50% 50%, " + m + " 0 44%, " + d + " 45% 52%, " + m + " 53% 62%, " + d + " 63% 70%, " + m + " 71%), " + m;
      }
      return "@ .sq.light{background:linear-gradient(145deg," + p.sqL2 + "," + p.sqL + ") !important;}" +
        "@ .sq.dark{background:linear-gradient(145deg," + p.sqD2 + "," + p.sqD + ") !important;}" +
        "@ .pc.red i{background:" + disc(p.cr, p.crd) + " !important;box-shadow:0 4px 0 " + p.crs + ",0 7px 10px rgba(0,0,0,.55),inset 0 2px 3px rgba(255,255,255,.45) !important;}" +
        "@ .pc.black i{background:" + disc(p.cb, p.cbd) + " !important;box-shadow:0 4px 0 " + p.cbs + ",0 7px 10px rgba(0,0,0,.55),inset 0 2px 3px rgba(255,255,255,.3) !important;}";
    },
    "ultimate-ttt": function (p) {
      return "@{--x:" + p.x + ";--o:" + p.o + ";--gold:" + p.g1 + ";}";
    },
    minesweeper: function (p) {
      return "@ .machine{background:linear-gradient(180deg," + p.bgA + "," + p.bgB + ") !important;}" +
        "@ .cell:not(.revealed){background:linear-gradient(145deg," + p.m1 + "," + p.m2 + ") !important;}" +
        "@ .cell.flagged{background:linear-gradient(145deg," + p.m1 + "," + p.m2 + ") !important;filter:brightness(1.12);}" +
        "@ .cell.revealed{background:" + p.mr + " !important;}" +
        "@ .cell.mine{background:#2a1219 !important;}@ .cell.boom{background:#7a1426 !important;}" +
        "@ .board{background:" + p.bgC + " !important;}";
    }
  };
  var COMMON = function (p) {
    return "@{--gold:" + p.g1 + ";--gold2:" + p.g2 + ";--accent:" + p.g2 + ";}" +
      "@ body{background:radial-gradient(1100px 600px at 50% -10%," + p.bgA + " 0%," + p.bgB + " 45%," + p.bgC + " 85%) fixed !important;}";
  };

  var game = root.getAttribute("data-game") || (location.pathname.split("/").pop() || "index").replace(/\.html?$/i, "") || "index";
  root.setAttribute("data-game", game);

  var styleEl = null;
  function buildCss(season) {
    var p = P[season]; if (!p) return "";
    var prefix = 'html[data-season="' + season + '"][data-game="' + game + '"]';
    var css = COMMON(p) + (GAME[game] ? GAME[game](p) : "");
    return css.replace(/@/g, prefix);
  }
  function autoSeason() {
    var m = new Date().getMonth();           // northern-hemisphere seasons
    return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "fall" : "winter";
  }

  var choice = "classic";
  try { var saved = localStorage.getItem(KEY); if (NAMES.indexOf(saved) >= 0) choice = saved; } catch (e) {}
  function active() { return choice === "auto" ? autoSeason() : choice; }

  // ---------- falling things ----------
  var cv = null, ctx = null, parts = [], raf = 0, kind = null, cfg = null;
  var reduced = false; try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var KINDS = {
    spring: { kind: "petal", colors: ["#ffc2d9", "#ffa6c6", "#fff0f6", "#ffd6e6"] },
    summer: { kind: "mote", colors: ["255,236,150", "255,255,255", "255,214,102"] },
    fall: { kind: "leaf", colors: ["#e8821a", "#c2571a", "#f2c14e", "#b3261e", "#d99a2b"] },
    winter: { kind: "snow", colors: ["#ffffff", "#e6f4ff"] }
  };
  function mk(init) {
    var w = cv.width, h = cv.height, k = cfg, r = Math.random;
    var o = { x: r() * w, y: init ? r() * h : (kind === "mote" ? h + 10 : -20), c: k.colors[Math.floor(r() * k.colors.length)],
      s: 0.6 + r() * 0.9, rot: r() * 6.28, vr: (r() - 0.5) * 0.04, ph: r() * 6.28, sw: 0.4 + r() * 0.9 };
    o.vy = kind === "snow" ? 0.4 + r() * 0.9 : kind === "mote" ? -(0.2 + r() * 0.4) : 0.6 + r() * 0.9;
    o.vx = kind === "leaf" ? 0.2 + r() * 0.6 : 0;
    return o;
  }
  function frame(t) {
    if (!cv) return;
    var w = cv.width, h = cv.height; ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i];
      q.ph += 0.02; q.rot += q.vr;
      q.x += q.vx + Math.sin(q.ph) * q.sw; q.y += q.vy;
      if (q.y > h + 24 || q.y < -30 || q.x > w + 30 || q.x < -30) { parts[i] = mk(false); continue; }
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      if (kind === "petal") {
        ctx.globalAlpha = 0.75; ctx.fillStyle = q.c; ctx.beginPath(); ctx.ellipse(0, 0, 7 * q.s, 4 * q.s, 0, 0, 6.28); ctx.fill();
      } else if (kind === "leaf") {
        ctx.globalAlpha = 0.85; ctx.fillStyle = q.c; var L = 9 * q.s;
        ctx.beginPath(); ctx.moveTo(0, -L); ctx.quadraticCurveTo(L * 0.9, -L * 0.2, 0, L); ctx.quadraticCurveTo(-L * 0.9, -L * 0.2, 0, -L); ctx.fill();
        ctx.strokeStyle = "rgba(60,25,5,.45)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(0, L + 2); ctx.stroke();
      } else if (kind === "snow") {
        ctx.globalAlpha = 0.5 + 0.4 * q.s / 1.5; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(0, 0, 1.8 * q.s + 0.6, 0, 6.28); ctx.fill();
      } else {
        var a = 0.35 + 0.35 * Math.sin(q.ph * 2), g = ctx.createRadialGradient(0, 0, 0, 0, 0, 7 * q.s);
        g.addColorStop(0, "rgba(" + q.c + "," + a + ")"); g.addColorStop(1, "rgba(" + q.c + ",0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 7 * q.s, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  }
  function startParticles(season) {
    stopParticles();
    if (reduced || !KINDS[season] || !document.body) return;
    cfg = KINDS[season]; kind = cfg.kind;
    cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true"); cv.id = "rgSeasonFx";
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
    document.body.appendChild(cv); ctx = cv.getContext("2d");
    sizeCanvas();
    var n = Math.max(14, Math.min(46, Math.round(cv.width / 32)));
    parts = []; for (var i = 0; i < n; i++) parts.push(mk(true));
    raf = requestAnimationFrame(frame);
  }
  function sizeCanvas() { if (cv) { cv.width = window.innerWidth; cv.height = window.innerHeight; } }
  function stopParticles() { if (raf) cancelAnimationFrame(raf); raf = 0; if (cv) cv.remove(); cv = null; parts = []; }
  window.addEventListener("resize", sizeCanvas);

  // ---------- apply ----------
  function apply() {
    var s = active();
    if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "rgSeasonCss"; (document.head || root).appendChild(styleEl); }
    if (s === "classic") { root.removeAttribute("data-season"); styleEl.textContent = ""; stopParticles(); }
    else { root.setAttribute("data-season", s); styleEl.textContent = buildCss(s); if (document.body) startParticles(s); }
    try { window.dispatchEvent(new CustomEvent("rg-season", { detail: s })); } catch (e) {}
  }
  function set(name) {
    if (NAMES.indexOf(name) < 0) return;
    choice = name;
    try { localStorage.setItem(KEY, name); } catch (e) {}
    syncSelects();
    apply();
  }

  // A labelled <select> that follows the shared choice. Games drop one into their Settings panel.
  function makeSelect(compact) {
    var lab = document.createElement("label");
    lab.className = "rgSeasonLabel";
    lab.style.cssText = "display:grid;gap:4px;font-size:12px;color:inherit;opacity:.95";
    if (!compact) lab.appendChild(document.createTextNode("Seasonal theme"));
    var sel = document.createElement("select");
    sel.className = "rgSeasonPick"; sel.setAttribute("aria-label", "Seasonal theme");
    sel.style.cssText = "padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#e7eefc;font:inherit;font-size:" + (compact ? "13px;font-weight:700;width:auto" : "14px;width:100%") + ";cursor:pointer";
    NAMES.forEach(function (n) { var o = document.createElement("option"); o.value = n; o.textContent = LABELS[n]; o.style.color = "#111"; sel.appendChild(o); });
    sel.value = choice;
    sel.addEventListener("change", function () { set(sel.value); });
    lab.appendChild(sel);
    return lab;
  }
  function syncSelects() { var all = document.querySelectorAll(".rgSeasonPick"); for (var i = 0; i < all.length; i++) all[i].value = choice; }
  // put the menu into the game's Settings panel (the .fields block next to #applySettings), or into [data-season-slot]
  function mountInSettings() {
    var slot = document.querySelector("[data-season-slot]");
    if (slot) { if (!slot.querySelector(".rgSeasonPick")) slot.appendChild(makeSelect(true)); return; }
    var apply = document.getElementById("applySettings");
    var fields = apply && apply.closest("details") ? apply.closest("details").querySelector(".fields") : null;
    if (fields && !fields.querySelector(".rgSeasonPick")) fields.appendChild(makeSelect());
  }

  window.RGThemes = {
    names: NAMES.slice(),
    get: function () { return choice; },
    set: set,
    makeSelect: makeSelect,
    active: active,
    palette: function () { var s = active(); return P[s] || null; }
  };

  function init() { mountInSettings(); apply(); }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
  // the stylesheet can go in before <body> exists, so the first paint is already themed
  try { if (document.head) { var s0 = active(); if (s0 !== "classic") { root.setAttribute("data-season", s0); styleEl = document.createElement("style"); styleEl.id = "rgSeasonCss"; styleEl.textContent = buildCss(s0); document.head.appendChild(styleEl); } } } catch (e) {}
})();
