/* scores.js — shared helper for reporting game results.
 *
 * Inside the desktop app a game runs in an iframe; we hand the result to the app shell
 * (postMessage), which saves it to the high-score file. On the web (GitHub Pages) there is no
 * shell, so results are kept in localStorage instead and nothing else happens.
 *
 *   RGScores.report("minesweeper", "Easy", "Best time", 42.5, { unit: "s", better: "low", detail: "9x9, 10 mines" });
 */
(function () {
  "use strict";
  function report(game, category, metric, value, opts) {
    opts = opts || {};
    var entry = {
      game: String(game), category: String(category || ""), metric: String(metric),
      value: Number(value), unit: opts.unit || "", better: opts.better === "low" ? "low" : "high",
      detail: opts.detail || ""
    };
    if (!isFinite(entry.value)) return;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "rg-score", entry: entry }, "*");
        return;
      }
    } catch (e) { /* cross-origin parent: fall through */ }
    try {
      var list = JSON.parse(localStorage.getItem("rg_scores_local") || "[]");
      entry.when = new Date().toISOString();
      list.push(entry);
      localStorage.setItem("rg_scores_local", JSON.stringify(list.slice(-200)));
    } catch (e) { /* storage unavailable */ }
  }
  window.RGScores = { report: report };

  /* RGHost — lets a game call the desktop app's saved-games backend.
   *   RGHost.available().then(ok => ...)   true only inside the desktop app
   *   RGHost.call("SaveGame", "chess", "My game", pgnText).then(...)
   * Outside the app (GitHub Pages) available() resolves false and games use localStorage instead. */
  var pending = {}, nextId = 1, hostState = null, pongWaiters = [];
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || ev.source !== window.parent) return;
    if (d.type === "rg-pong") { hostState = true; pongWaiters.splice(0).forEach(function (f) { f(true); }); }
    else if (d.type === "rg-rpc-result" && pending[d.id]) {
      var p = pending[d.id]; delete pending[d.id];
      if (d.ok) p.resolve(d.result); else p.reject(new Error(d.error || "request failed"));
    }
  });
  function available() {
    return new Promise(function (resolve) {
      if (hostState !== null) return resolve(hostState);
      if (window.parent === window) { hostState = false; return resolve(false); }
      pongWaiters.push(resolve);
      try { window.parent.postMessage({ type: "rg-ping" }, "*"); } catch (e) { return resolve(false); }
      setTimeout(function () { if (hostState === null) { hostState = false; pongWaiters.splice(0).forEach(function (f) { f(false); }); } }, 600);
    });
  }
  function call(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      pending[id] = { resolve: resolve, reject: reject };
      try { window.parent.postMessage({ type: "rg-rpc", id: id, method: method, args: args }, "*"); }
      catch (e) { delete pending[id]; return reject(e); }
      setTimeout(function () { if (pending[id]) { delete pending[id]; reject(new Error("timed out")); } }, 8000);
    });
  }
  window.RGHost = { available: available, call: call };
})();

/* RGDialog.confirm(message) -> Promise<boolean>
 * An in-page replacement for window.confirm(), which desktop webviews often block inside iframes
 * (it silently returns false, so buttons that ask "are you sure?" appear to do nothing). */
(function () {
  "use strict";
  function confirmDialog(message) {
    return new Promise(function (resolve) {
      var prevFocus = document.activeElement;
      var wrap = document.createElement("div");
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-modal", "true");
      wrap.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif";
      var box = document.createElement("div");
      box.style.cssText = "max-width:380px;width:100%;background:#161d2b;color:#e8ecf4;border:1px solid #2c3750;border-radius:12px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
      var p = document.createElement("p");
      p.textContent = message;
      p.style.cssText = "margin:0 0 16px;line-height:1.45;font-size:15px";
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:8px;justify-content:flex-end";
      function mk(label, primary) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = label;
        b.style.cssText = "cursor:pointer;font:inherit;font-weight:600;padding:8px 16px;border-radius:8px;border:1px solid " +
          (primary ? "#4f8cff;background:#4f8cff;color:#fff" : "#2c3750;background:#222b3d;color:#e8ecf4");
        return b;
      }
      var no = mk("Cancel", false), yes = mk("Continue", true);
      row.appendChild(no); row.appendChild(yes); box.appendChild(p); box.appendChild(row); wrap.appendChild(box);
      function done(v) {
        document.removeEventListener("keydown", onKey, true);
        wrap.remove();
        try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); }
        else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); done(document.activeElement === no ? false : true); }
        else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === yes ? no : yes).focus(); }
        else e.stopPropagation();
      }
      no.addEventListener("click", function () { done(false); });
      yes.addEventListener("click", function () { done(true); });
      wrap.addEventListener("click", function (e) { if (e.target === wrap) done(false); });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(wrap);
      yes.focus();
    });
  }
  window.RGDialog = { confirm: confirmDialog };
})();
