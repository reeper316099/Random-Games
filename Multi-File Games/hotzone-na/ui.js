/* ui.js — Classic (non-module) build
   Works with double-click index.html (file://)
   Requires data.js + game.js + storage.js loaded first.
*/

(function () {
    "use strict";

    // --------- DOM helpers ----------
    const $ = (id) => document.getElementById(id);
    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // --------- State ----------
    let G = null;
    let setup = {
        mode: "solo2",
        difficulty: "intro",
        roles: [] // per-player selected roles
    };

    // --------- Logging ----------
    function logLine(msg) {
        const box = $("log");
        const time = new Date().toLocaleTimeString();
        box.textContent += `[${time}] ${msg}\n`;
        box.scrollTop = box.scrollHeight;
    }
    function clearLog() {
        $("log").textContent = "";
    }

    // --------- Setup UI ----------
    function playersForMode(mode) {
        return mode === "solo1" ? 1
            : mode === "solo2" ? 2
                : mode === "coop2" ? 2
                    : mode === "coop3" ? 3
                        : 4;
    }

    function ensureRolesArray() {
        const n = playersForMode(setup.mode);
        while (setup.roles.length < n) setup.roles.push("Generalist");
        setup.roles = setup.roles.slice(0, n);
    }

    function renderRolePicker() {
        ensureRolesArray();

        const picker = $("rolePicker");
        picker.innerHTML = "";

        const n = setup.roles.length;
        const roles = window.ROLES || [];

        // We render N "columns": one per player, each with role buttons
        for (let p = 0; p < n; p++) {
            const col = document.createElement("div");
            col.className = "panelBox";
            col.innerHTML = `<div class="miniTitle">Player ${p + 1} role</div>`;
            const grid = document.createElement("div");
            grid.className = "rolePicker";

            for (const r of roles) {
                const btn = document.createElement("button");
                btn.className = "roleBtn" + (setup.roles[p] === r.id ? " selected" : "");
                btn.type = "button";
                btn.title = r.desc || r.id;
                btn.textContent = r.id;
                btn.addEventListener("click", () => {
                    setup.roles[p] = r.id;
                    renderRolePicker();
                });
                grid.appendChild(btn);
            }

            col.appendChild(grid);
            picker.appendChild(col);
        }

        $("rolePickHint").textContent =
            `Choose roles for ${n} pawn${n === 1 ? "" : "s"}. Generalist gets 5 actions; others get 4.`;
    }

    function syncModeDifficultyFromUI() {
        setup.mode = $("mode").value;
        setup.difficulty = $("difficulty").value;
        ensureRolesArray();
        renderRolePicker();
    }

    // --------- Dropdown population ----------
    function fillCitySelects() {
        const cities = window.ALL_CITIES || [];

        const citySel = $("citySelect");
        const dispatchDest = $("dispatchDest");

        citySel.innerHTML = "";
        dispatchDest.innerHTML = "";
        for (const c of cities) {
            const o1 = document.createElement("option");
            o1.value = c; o1.textContent = c;
            citySel.appendChild(o1);

            const o2 = document.createElement("option");
            o2.value = c; o2.textContent = c;
            dispatchDest.appendChild(o2);
        }
    }

    function fillPlayerSelects() {
        const sels = [$("tradeFrom"), $("tradeTo"), $("dispatchTarget")];
        sels.forEach(s => s.innerHTML = "");

        if (!G) {
            // placeholder options
            for (const s of sels) {
                const o = document.createElement("option");
                o.value = "0";
                o.textContent = "—";
                s.appendChild(o);
            }
            return;
        }

        for (const s of sels) {
            for (const pl of G.players) {
                const o = document.createElement("option");
                o.value = String(pl.id);
                o.textContent = `P${pl.id + 1} (${pl.role})`;
                s.appendChild(o);
            }
        }

        // defaults
        $("tradeFrom").value = "0";
        $("tradeTo").value = G.players.length > 1 ? "1" : "0";
        $("dispatchTarget").value = "0";
    }

    function fillDiscardSelects() {
        const pSel = $("discardPlayer");
        const cSel = $("discardCard");
        if (!pSel || !cSel) return;

        pSel.innerHTML = "";
        cSel.innerHTML = "";

        if (!G) {
            const o = document.createElement("option");
            o.value = "0"; o.textContent = "—";
            pSel.appendChild(o);

            const o2 = document.createElement("option");
            o2.value = ""; o2.textContent = "—";
            cSel.appendChild(o2);
            return;
        }

        for (const pl of G.players) {
            const o = document.createElement("option");
            o.value = String(pl.id);
            o.textContent = `P${pl.id + 1} (${pl.role})`;
            pSel.appendChild(o);
        }

        // default to current player
        const cp = window.currentPlayer(G);
        pSel.value = String(cp.id);

        // build cards for selected player
        rebuildDiscardCards();
    }

    function rebuildDiscardCards() {
        const pSel = $("discardPlayer");
        const cSel = $("discardCard");
        if (!pSel || !cSel) return;

        cSel.innerHTML = "";
        if (!G) return;

        const pl = G.players[Number(pSel.value)];
        if (!pl || pl.hand.length === 0) {
            const o = document.createElement("option");
            o.value = ""; o.textContent = "(No cards)";
            cSel.appendChild(o);
            return;
        }

        pl.hand.forEach((card, idx) => {
            const o = document.createElement("option");
            o.value = String(idx);
            o.textContent = window.describeCard ? window.describeCard(card) : (card.name || card.city || "Card");
            cSel.appendChild(o);
        });
    }

    function fillTradeCardSelect() {
        const sel = $("tradeCard");
        sel.innerHTML = "";
        if (!G) {
            const o = document.createElement("option");
            o.value = ""; o.textContent = "—";
            sel.appendChild(o);
            return;
        }

        const fromId = Number($("tradeFrom").value);
        const from = G.players[fromId];
        if (!from) {
            const o = document.createElement("option");
            o.value = ""; o.textContent = "—";
            sel.appendChild(o);
            return;
        }

        const here = (window.currentPlayer ? window.currentPlayer(G).location : from.location);
        const isResearcher = from.role === "Researcher";

        let cards = from.hand.filter(c => c.type === "city");
        if (!isResearcher) {
            cards = cards.filter(c => c.city === here);
        }

        if (cards.length === 0) {
            const o = document.createElement("option");
            o.value = ""; o.textContent = isResearcher ? "(No city cards)" : `(Need ${here} card)`;
            sel.appendChild(o);
            return;
        }

        for (const c of cards) {
            const o = document.createElement("option");
            o.value = c.city;
            o.textContent = `${c.city} (${c.color})`;
            sel.appendChild(o);
        }
    }

    // --------- Event display + play ----------
    function eventTooltip(card) {
        const def = (window.EVENTS || []).find(e => e.name === card.name);
        if (!def) return `${card.name}\n(Event)`;
        return `${def.name}\nTiming: ${def.timing || "—"}\n\n${def.desc || ""}\n\nTip: click this card to play it.`;
    }

    function tryPlayEvent(card) {
        if (!G || G.ended) return;

        // For simple events: prompt for required info
        const name = card.name;

        if (name === "Borrowed Time" || name === "One Quiet Night") {
            window.playEvent(G, name, {});
            render();
            return;
        }

        if (name === "Airlift") {
            const pawnId = Number(prompt(`Airlift: move which pawn? (0..${G.players.length - 1})`, "0"));
            if (Number.isNaN(pawnId) || pawnId < 0 || pawnId >= G.players.length) return;
            const toCity = prompt("Airlift destination city (exact name):", G.players[pawnId].location);
            if (!toCity || !G.cities[toCity]) return;
            window.playEvent(G, name, { pawnId, toCity });
            render();
            return;
        }

        if (name === "Remote Treatment") {
            // Ask twice: city then color
            function askPick(i) {
                const city = prompt(`Remote Treatment pick ${i}/2: city name`, "Atlanta");
                if (!city || !G.cities[city]) return null;
                const color = prompt(`Remote Treatment pick ${i}/2: color (blue/red/yellow)`, window.cityColor(city));
                if (!color || !["blue", "red", "yellow"].includes(color)) return null;
                return { city, color };
            }
            const p1 = askPick(1); if (!p1) return;
            const p2 = askPick(2); if (!p2) return;
            window.playEvent(G, name, { picks: [p1, p2] });
            render();
            return;
        }

        alert("This event isn’t wired yet.");
    }

    // --------- Rendering ----------
    function renderTopStats() {
        if (!G) {
            $("outbreakTrack").textContent = "Outbreaks: —";
            $("infectionRate").textContent = "Infection rate: —";
            $("turnsLeft").textContent = "Turns left: —";
            $("winTrack").textContent = "Cures: —";
            $("supplyBlue").textContent = "Blue cubes: —";
            $("supplyRed").textContent = "Red cubes: —";
            $("supplyYellow").textContent = "Yellow cubes: —";
            $("turnInfo").textContent = "—";
            $("endStateBox").innerHTML = "<b>Ready</b><br>Pick mode + roles, then Start.";
            return;
        }

        $("outbreakTrack").textContent = `Outbreaks: ${G.outbreak}/3`;
        $("infectionRate").textContent = `Infection rate: ${window.INFECTION_RATE_TRACK[G.infectionRateIdx]}`;
        $("turnsLeft").textContent = `Turns left: ${window.turnsLeft(G)}`;

        const cured = window.COLORS.filter(c => G.cures[c]).length;
        $("winTrack").textContent = `Cures: ${cured}/3`;

        $("supplyBlue").textContent = `Blue cubes: ${G.supplies.blue}`;
        $("supplyRed").textContent = `Red cubes: ${G.supplies.red}`;
        $("supplyYellow").textContent = `Yellow cubes: ${G.supplies.yellow}`;

        const cp = window.currentPlayer(G);
        $("turnInfo").textContent = `P${cp.id + 1} • ${cp.role} • ${cp.location} • actions ${G.actionsLeft}`;

        if (G.ended) {
            $("endStateBox").className = "okBox";
            $("endStateBox").innerHTML = `<b>${escapeHtml(G.endReason || "Game Over")}</b>`;
        } else {
            $("endStateBox").className = "okBox";
            const crisis = G.crisisInPlay ? `Crisis: ${G.crisisInPlay.name}` : "No ongoing crisis";
            const phase = `Phase: ${G.phase}`;
            $("endStateBox").innerHTML = `<b>In progress</b><br>${escapeHtml(phase)}<br>${escapeHtml(crisis)}`;
        }
    }

    function renderPlayers() {
        const wrap = $("players");
        wrap.innerHTML = "";
        if (!G) return;

        const cp = window.currentPlayer(G);

        for (const pl of G.players) {
            const box = document.createElement("div");
            box.className = "player";
            if (pl.id === cp.id && !G.ended) box.style.outline = "2px solid var(--accent)";

            const header = document.createElement("div");
            header.className = "playerHeader";
            header.innerHTML = `
        <div>
          <span class="playerName">P${pl.id + 1}</span>
          <span class="sub"> • ${escapeHtml(pl.location)}</span>
        </div>
        <div class="playerRole">${escapeHtml(pl.role)}</div>
      `;

            const hand = document.createElement("div");
            hand.className = "hand";

            for (const card of pl.hand) {
                const item = document.createElement("div");
                item.className = "cardItem";
                if (card.type === "city") {
                    item.textContent = `${card.city}\n(${card.color})`;
                    item.title = `${card.city} (${card.color})`;
                } else if (card.type === "event") {
                    item.textContent = `${card.name}\n[Event]`;
                    item.title = eventTooltip(card);
                    item.style.borderColor = "#3f5297";
                    item.style.background = "#121e3f";
                    item.addEventListener("click", () => {
                        if (pl.id !== cp.id) {
                            logLine("❌ Only the current player can play their event cards (in this build).");
                            return;
                        }
                        tryPlayEvent(card);
                    });
                } else {
                    item.textContent = card.name || "Card";
                    item.title = item.textContent;
                }
                hand.appendChild(item);
            }

            box.appendChild(header);
            box.appendChild(hand);
            wrap.appendChild(box);
        }
    }

    function renderCityList() {
        const list = $("cityList");
        list.innerHTML = "";
        if (!G) return;

        const cities = window.ALL_CITIES.slice();

        // Sort most infected first
        cities.sort((a, b) => {
            const ta = window.COLORS.reduce((s, c) => s + G.cities[a][c], 0);
            const tb = window.COLORS.reduce((s, c) => s + G.cities[b][c], 0);
            return tb - ta || a.localeCompare(b);
        });

        for (const city of cities) {
            const col = window.cityColor(city);
            const total = window.COLORS.reduce((s, c) => s + G.cities[city][c], 0);
            const links = (window.ADJ[city] || []).join(", ");

            const pawns = G.players
                .filter(pl => pl.location === city)
                .map(pl => `P${pl.id + 1}`)
                .join(", ");

            const div = document.createElement("div");
            div.className = "city";
            div.innerHTML = `
        <b>${escapeHtml(city)} <span style="color:var(--muted)">(${col})</span> <span style="color:var(--muted)">• total ${total}</span></b>
        <div class="row" style="gap:10px;margin:4px 0 0;">
          <span class="pill"><span class="dot blue"></span> <b>${G.cities[city].blue}</b></span>
          <span class="pill"><span class="dot red"></span> <b>${G.cities[city].red}</b></span>
          <span class="pill"><span class="dot yellow"></span> <b>${G.cities[city].yellow}</b></span>
        </div>
        <div class="sub" style="margin-top:4px;"><b>Links:</b> ${escapeHtml(links)}</div>
        ${pawns ? `<div class="sub"><b>Pawns:</b> ${escapeHtml(pawns)}</div>` : ``}
      `;

            div.addEventListener("click", () => {
                $("citySelect").value = city;
            });

            list.appendChild(div);
        }
    }

    function render() {
        renderTopStats();
        renderPlayers();
        renderCityList();
        fillPlayerSelects();
        fillTradeCardSelect();
        fillDiscardSelects();

        // Status line
        if (!G) {
            $("statusLine").textContent = "Pick roles, then Start.";
        } else if (G.ended) {
            $("statusLine").textContent = `Game ended: ${G.endReason || "—"}`;
        } else {
            $("statusLine").textContent = "Play your actions. Tip: click event cards for details and to play them.";
        }
    }

    // --------- Buttons / Actions ----------
    function doNewSetup() {
        clearLog();
        G = null;
        logLine("New setup: choose mode/difficulty/roles, then Start.");
        render();
    }

    function doStart() {
        clearLog();

        // Create game from setup selections
        const roles = setup.roles.slice();
        G = window.makeGame({
            mode: setup.mode,
            difficulty: setup.difficulty,
            roles,
            logFn: logLine
        });

        window.setupInitialInfections(G);
        logLine("Game started.");
        fillPlayerSelects();
        fillTradeCardSelect();
        render();
    }

    function doSave() {
        if (!G) { logLine("❌ No game to save."); return; }
        const str = window.exportSave(G);
        // Copy to clipboard if possible
        navigator.clipboard?.writeText(str).then(() => {
            logLine("✅ Save exported to clipboard.");
            alert("Save copied to clipboard.");
        }).catch(() => {
            prompt("Copy your save string:", str);
        });
    }

    function doLoad() {
        const str = prompt("Paste your save string:");
        if (!str) return;
        const g = window.importSave(str);
        if (!g) {
            logLine("❌ Failed to import save.");
            return;
        }
        G = g;
        clearLog();
        logLine("✅ Save imported.");
        fillPlayerSelects();
        fillTradeCardSelect();
        render();
    }

    function doAutoDrive() {
        if (!G) { logLine("❌ Start a game first."); return; }
        window.autoDrive(G, $("citySelect").value);
        render();
    }

    function doTreat() {
        if (!G) { logLine("❌ Start a game first."); return; }

        const city = window.currentPlayer(G).location;
        const present = window.COLORS.filter(c => G.cities[city][c] > 0);

        if (present.length === 0) {
            logLine(`❌ No cubes in ${city} to treat.`);
            return;
        }

        let pick = null;
        if (present.length === 1) {
            pick = present[0];
        } else {
            pick = prompt(
                `Treat which color in ${city}? (${present.join(", ")})`,
                // default: city color if present else first present
                (G.cities[city][window.cityColor(city)] > 0) ? window.cityColor(city) : present[0]
            );
            if (!pick) return;
            pick = pick.trim().toLowerCase();
            if (!["blue", "red", "yellow"].includes(pick)) {
                logLine("❌ Invalid color. Use blue/red/yellow.");
                return;
            }
        }

        window.treat(G, pick);
        render();
    }


    function doCure() {
        if (!G) { logLine("❌ Start a game first."); return; }
        window.discoverCure(G);
        render();
    }

    function doDirectFlight() {
        if (!G) { logLine("❌ Start a game first."); return; }
        window.directFlight(G, $("citySelect").value);
        render();
    }

    function doCharterFlight() {
        if (!G) { logLine("❌ Start a game first."); return; }
        window.charterFlight(G, $("citySelect").value);
        render();
    }

    function doDiscard() {
        if (!G) { logLine("❌ Start a game first."); return; }

        const pSel = $("discardPlayer");
        const cSel = $("discardCard");
        if (!pSel || !cSel) { logLine("❌ Discard UI missing."); return; }

        const playerId = Number(pSel.value);
        const cardIndex = Number(cSel.value);

        if (Number.isNaN(cardIndex)) {
            logLine("❌ Pick a card to discard.");
            return;
        }

        window.discardCard(G, { playerId, cardIndex });
        // refresh discard dropdowns after change
        rebuildDiscardCards();
        render();
    }

    function doEndActions() {
        if (!G) { logLine("❌ Start a game first."); return; }
        window.endActions(G);
        render();
    }

    function doShare() {
        if (!G) { logLine("❌ Start a game first."); return; }
        const fromId = Number($("tradeFrom").value);
        const toId = Number($("tradeTo").value);
        const cityName = $("tradeCard").value;

        if (!cityName) {
            logLine("❌ Pick a valid card to share.");
            return;
        }
        window.shareKnowledge(G, { fromId, toId, cityName });
        render();
    }

    function doDispatchToPawn() {
        if (!G) { logLine("❌ Start a game first."); return; }
        const targetId = Number($("dispatchTarget").value);
        const dest = $("dispatchDest").value;
        window.dispatchMoveToPawn(G, targetId, dest);
        render();
    }

    function doDispatchConnected() {
        if (!G) { logLine("❌ Start a game first."); return; }
        const targetId = Number($("dispatchTarget").value);
        const dest = $("dispatchDest").value;
        window.dispatchMoveConnected(G, targetId, dest);
        render();
    }

    function doMedicClean() {
        if (!G) { logLine("❌ Start a game first."); return; }
        window.medicCleanCuredHere(G);
        render();
    }

    // --------- Wire up handlers ----------
    function init() {
        // Populate city selects
        fillCitySelects();

        // Setup selects
        $("mode").addEventListener("change", () => {
            syncModeDifficultyFromUI();
            render();
        });
        $("difficulty").addEventListener("change", () => {
            syncModeDifficultyFromUI();
            render();
        });

        // Buttons
        $("btnNew").addEventListener("click", doNewSetup);
        $("btnStart").addEventListener("click", doStart);
        $("btnSave").addEventListener("click", doSave);
        $("btnLoad").addEventListener("click", doLoad);

        $("btnDrive").addEventListener("click", doAutoDrive);
        $("btnTreat").addEventListener("click", doTreat);
        $("btnCure").addEventListener("click", doCure);
        $("btnEndActions").addEventListener("click", doEndActions);

        $("btnShare").addEventListener("click", doShare);

        $("tradeFrom").addEventListener("change", () => {
            fillTradeCardSelect();
        });
        $("tradeTo").addEventListener("change", () => {
            // nothing needed, but keep for future
        });

        $("btnDispatchToPawn").addEventListener("click", doDispatchToPawn);
        $("btnDispatchConnected").addEventListener("click", doDispatchConnected);

        $("btnMedicClean").addEventListener("click", doMedicClean);

        $("btnDirectFlight").addEventListener("click", doDirectFlight);
        $("btnCharterFlight").addEventListener("click", doCharterFlight);

        $("btnDiscard").addEventListener("click", doDiscard);
        $("discardPlayer").addEventListener("change", () => {
            rebuildDiscardCards();
        });

        // Initial setup render
        syncModeDifficultyFromUI();
        renderRolePicker();
        render();
    }

    init();
})();
