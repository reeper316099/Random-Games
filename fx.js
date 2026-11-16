/* fx.js — shared sound and visual effects for the games.
 *
 * Everything here is optional polish: games check `window.RGFx` before using it and work without it.
 *
 *   RGFx.sound("chip")                    play a short synthesised sound (no audio files needed)
 *   RGFx.confetti()                       burst of confetti over the whole page
 *   RGFx.countTo(el, from, to, ms)        animate a number in an element
 *   RGFx.floatText(anchorEl, "+50", col)  text that floats up from an element and fades
 *   RGFx.fmt(1234567)                     "1,234,567"
 *
 * A mute button is added to the top-right corner automatically; the choice is remembered.
 */
(function () {
  "use strict";
  var KEY = "rg_muted", muted = false, ctx = null;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (e) {}
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function ac() {
    if (muted) return null;
    try {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, dur, o) {
    var c = ac(); if (!c) return; o = o || {};
    try {
      var t = c.currentTime + (o.at || 0), os = c.createOscillator(), g = c.createGain();
      os.type = o.type || "sine";
      os.frequency.setValueAtTime(freq, t);
      if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      var v = o.vol == null ? 0.1 : o.vol;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      os.connect(g); g.connect(c.destination);
      os.start(t); os.stop(t + dur + 0.03);
    } catch (e) {}
  }
  function noise(dur, o) {
    var c = ac(); if (!c) return; o = o || {};
    try {
      var t = c.currentTime + (o.at || 0), n = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
      for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = c.createBufferSource(); s.buffer = buf;
      var f = c.createBiquadFilter(); f.type = o.type || "bandpass"; f.frequency.value = o.freq || 2000; f.Q.value = o.q || 1;
      var g = c.createGain(); g.gain.value = o.vol == null ? 0.14 : o.vol;
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start(t);
    } catch (e) {}
  }
  function arp(notes, step, dur, o) {
    notes.forEach(function (f, i) { tone(f, dur, { at: i * step, type: (o && o.type) || "triangle", vol: (o && o.vol) || 0.1 }); });
  }

  var SOUNDS = {
    click:   function () { tone(700, 0.04, { type: "square", vol: 0.04 }); },
    chip:    function () { noise(0.035, { freq: 4200, q: 3, vol: 0.22 }); tone(2400, 0.05, { vol: 0.05 }); tone(3100, 0.04, { at: 0.03, vol: 0.04 }); },
    card:    function () { noise(0.09, { freq: 2600, q: 0.7, vol: 0.13 }); },
    flip:    function () { noise(0.06, { freq: 1500, q: 0.8, vol: 0.14 }); tone(520, 0.05, { at: 0.03, vol: 0.04 }); },
    move:    function () { tone(210, 0.07, { type: "triangle", vol: 0.16 }); noise(0.03, { freq: 900, vol: 0.1 }); },
    capture: function () { tone(170, 0.1, { type: "triangle", vol: 0.18 }); noise(0.06, { freq: 600, vol: 0.14 }); tone(120, 0.12, { at: 0.06, type: "triangle", vol: 0.12 }); },
    king:    function () { arp([523, 659, 784, 1047], 0.07, 0.16); },
    win:     function () { arp([523, 659, 784, 1047], 0.08, 0.2); },
    bigwin:  function () { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.09, 0.26, { vol: 0.11 }); },
    lose:    function () { tone(300, 0.28, { to: 150, type: "sawtooth", vol: 0.06 }); },
    push:    function () { tone(440, 0.1, { type: "triangle" }); tone(440, 0.12, { at: 0.13, type: "triangle" }); },
    coin:    function () { tone(1320, 0.07, { vol: 0.06 }); tone(1980, 0.1, { at: 0.05, vol: 0.05 }); },
    tick:    function () { tone(900, 0.025, { type: "square", vol: 0.03 }); },
    stop:    function () { tone(140, 0.09, { type: "triangle", vol: 0.2 }); noise(0.04, { freq: 500, vol: 0.12 }); },
    roll:    function () { for (var i = 0; i < 7; i++) noise(0.04, { at: i * 0.09 + Math.random() * 0.03, freq: 1400 + Math.random() * 900, q: 2, vol: 0.16 }); },
    bonus:   function () { arp([392, 523, 659, 784, 1047, 1319], 0.06, 0.22, { type: "square", vol: 0.05 }); },
    error:   function () { tone(180, 0.12, { type: "square", vol: 0.05 }); }
  };
  function sound(name) { var f = SOUNDS[name]; if (f) f(); }

  // ---------- confetti ----------
  var cv = null, parts = [], raf = 0;
  function confetti(opts) {
    if (reduced) return;
    opts = opts || {};
    var n = opts.count || 140;
    if (!cv) {
      cv = document.createElement("canvas");
      cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";
      document.body.appendChild(cv);
    }
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    var colors = opts.colors || ["#ffd36a", "#6affb6", "#6aa6ff", "#ff6a9a", "#ffffff", "#c58bff"];
    var ox = (opts.x == null ? 0.5 : opts.x) * cv.width, oy = (opts.y == null ? 0.35 : opts.y) * cv.height;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 11;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length], life: 110 + Math.random() * 50 });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame() {
    var g = cv.getContext("2d");
    g.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 30; });
    parts.forEach(function (p) {
      p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.globalAlpha = Math.min(1, p.life / 30); g.fillStyle = p.c;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    });
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; g.clearRect(0, 0, cv.width, cv.height); }
  }

  // ---------- small helpers ----------
  function fmt(n) { try { return Math.round(n).toLocaleString("en-US"); } catch (e) { return String(Math.round(n)); } }
  var counters = new WeakMap();
  function countTo(el, from, to, ms, format) {
    if (!el) return;
    format = format || fmt;
    var prev = counters.get(el); if (prev) cancelAnimationFrame(prev);
    if (reduced || from === to || !ms) { el.textContent = format(to); return; }
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = format(from + (to - from) * e);
      if (k < 1) counters.set(el, requestAnimationFrame(step)); else el.textContent = format(to);
    })(t0);
  }
  function floatText(anchor, text, color) {
    if (!anchor || reduced) return;
    var r = anchor.getBoundingClientRect(), d = document.createElement("div");
    d.textContent = text;
    d.style.cssText = "position:fixed;z-index:2147482000;pointer-events:none;font:800 18px system-ui,sans-serif;text-shadow:0 2px 6px rgba(0,0,0,.7);white-space:nowrap;" +
      "left:" + (r.left + r.width / 2) + "px;top:" + (r.top + r.height / 2) + "px;color:" + (color || "#6affb6");
    document.body.appendChild(d);
    var a = d.animate([{ transform: "translate(-50%,-50%) scale(.8)", opacity: 0 }, { transform: "translate(-50%,-120%) scale(1.1)", opacity: 1, offset: 0.2 },
      { transform: "translate(-50%,-320%) scale(1)", opacity: 0 }], { duration: 1300, easing: "ease-out" });
    a.onfinish = a.oncancel = function () { d.remove(); };
  }

  // ---------- mute button ----------
  function mountMute() {
    if (document.getElementById("rgMute")) return;
    var b = document.createElement("button");
    b.id = "rgMute"; b.type = "button";
    b.style.cssText = "position:fixed;top:8px;right:8px;z-index:9999;padding:4px 10px;border-radius:999px;background:rgba(15,23,42,.8);color:#e2e8f0;" +
      "font:600 12px system-ui,sans-serif;border:1px solid rgba(255,255,255,.2);cursor:pointer;min-width:0";
    function paint() { b.textContent = muted ? "🔇 Sound off" : "🔊 Sound on"; b.setAttribute("aria-pressed", muted ? "false" : "true"); }
    b.addEventListener("click", function () {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) {}
      paint(); if (!muted) sound("click");
    });
    paint(); document.body.appendChild(b);
  }
  if (document.body) mountMute(); else document.addEventListener("DOMContentLoaded", mountMute);

  window.RGFx = { sound: sound, confetti: confetti, countTo: countTo, floatText: floatText, fmt: fmt,
    get muted() { return muted; }, get reducedMotion() { return reduced; } };
})();
