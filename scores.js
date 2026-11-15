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
