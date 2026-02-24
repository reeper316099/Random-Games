console.log("game.js: TOP reached");

/* game.js — Classic (non-module) build
   - Works with double-click index.html (file://)
   - Implements Hot Zone NA roles (Medic/Dispatcher/Researcher/Generalist)
   - Improves Share Knowledge (selectable from/to/card)
   - Adds shortest-path auto driving (BFS)
   - Adds event play helpers so UI can show/execute effects

   NOTE: UI must call the right APIs (see window.* exports at bottom).
*/

(function () {
    // ---- Pull shared constants from window (provided by data.js) ----
    const COLORS = window.COLORS;
    const CITY_COLOR = window.CITY_COLOR;
    const ADJ = window.ADJ;
    const ALL_CITIES = window.ALL_CITIES;
    const INFECTION_RATE_TRACK = window.INFECTION_RATE_TRACK;
    const EVENTS = window.EVENTS;
    const CRISIS = window.CRISIS;

    if (!COLORS || !CITY_COLOR || !ADJ || !ALL_CITIES) {
        throw new Error("game.js: missing data.js globals (did data.js load first?)");
    }

    // ---- Utilities ----
    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
    function cityColor(city) { return CITY_COLOR[city]; }

    function describeCard(card) {
        if (!card) return "<?>";

        if (card.type === "city") return `${card.city} (${card.color})`;
        if (card.type === "event") return `${card.name} [Event]`;
        if (card.type === "epidemic") return "Epidemic";
        if (card.type === "crisis") return `${card.name} [Crisis]`;
        return JSON.stringify(card);
    }

    function roleById(id) {
        return (window.ROLES || []).find(r => r.id === id) || null;
    }

    function currentPlayer(G) { return G.players[G.turn % G.players.length]; }

    function baseActionsFor(player) {
        return (player.role === "Generalist") ? 5 : 4;
    }

    function turnsLeft(G) { return Math.ceil(G.playerDeck.length / 2); }

    function endGame(G, reason) {
        G.ended = true;
        G.phase = "gameover";
        G.endReason = reason;
        G._log(`🛑 GAME OVER: ${reason}`);
    }

    function checkWin(G) {
        const cured = COLORS.filter(c => G.cures[c]).length;
        if (cured >= 3 && !G.ended) {
            G.ended = true;
            G.phase = "gameover";
            G.endReason = "WIN: All 3 cures discovered!";
            G._log("🏆 WIN: All 3 cures discovered!");
        }
    }

    // ---- Core cube mechanics ----
    function adjustSupply(G, color, delta) {
        G.supplies[color] += delta;
        if (G.supplies[color] < 0) {
            endGame(G, `No ${color} cubes left in supply (needed to place one).`);
        }
    }

    function outbreak(G, city, color, seen) {
        if (G.ended) return;
        const key = city + "|" + color;
        if (seen.has(key)) return;
        seen.add(key);

        G.outbreak += 1;
        G._log(`💥 OUTBREAK in ${city} (${color}). Outbreak -> ${G.outbreak}/3`);
        if (G.outbreak >= 3) {
            endGame(G, "Outbreak marker reached the last space (3).");
            return;
        }

        const nbs = ADJ[city] || [];
        for (const nb of nbs) {
            placeCube(G, nb, color, 1, seen);
            if (G.ended) return;
        }
    }

    function placeCube(G, city, color, n, seen) {
        if (G.ended) return;
        seen = seen || new Set();

        for (let i = 0; i < n; i++) {
            // Outbreak only when trying to add a cube to a city that already has 3
            if (G.cities[city][color] === 3) {
                outbreak(G, city, color, seen);
            } else {
                adjustSupply(G, color, -1);
                G.cities[city][color] += 1;

                // Safety clamp: never let cubes exceed 3 (outbreak handles overflow)
                if (G.cities[city][color] > 3) G.cities[city][color] = 3;
            }
            if (G.ended) return;
        }
    }

    // ---- Infection deck ----
    function drawInfectionCard(G) {
        if (G.infectionDeck.length === 0) {
            if (G.infectionDiscard.length === 0) return null;
            G._log("↻ Infection deck empty: reshuffling discard into a new deck.");
            G.infectionDeck = shuffle(G.infectionDiscard.splice(0));
        }
        const card = G.infectionDeck.pop();
        G.infectionDiscard.push(card);
        return card;
    }

    function infectStep(G, times) {
        if (G.ended) return;
        for (let t = 0; t < times; t++) {
            const card = drawInfectionCard(G);
            if (!card) return;
            const c = card.city;
            const col = cityColor(c);
            G._log(`🦠 Infect: ${c} (+1 ${col})`);
            placeCube(G, c, col, 1);
            if (G.ended) return;
        }
    }

    // ---- Epidemic ----
    function epidemic(G) {
        if (G.ended) return;
        G._log("☣️ EPIDEMIC!");

        if (G.infectionRateIdx < INFECTION_RATE_TRACK.length - 1) G.infectionRateIdx += 1;
        G._log(`↑ Infection rate -> ${INFECTION_RATE_TRACK[G.infectionRateIdx]}`);

        // draw bottom card
        if (G.infectionDeck.length === 0) {
            if (G.infectionDiscard.length === 0) return;
            G.infectionDeck = shuffle(G.infectionDiscard.splice(0));
        }
        const bottom = G.infectionDeck.shift();
        G.infectionDiscard.push(bottom);

        const city = bottom.city;
        const col = cityColor(city);
        G._log(`🔥 Epidemic Infect: ${city} (place 3 ${col})`);

        if (G.cities[city][col] >= 1) {
            while (G.cities[city][col] < 3) {
                placeCube(G, city, col, 1);
                if (G.ended) return;
            }
            outbreak(G, city, col, new Set());
        } else {
            placeCube(G, city, col, 3);
        }
        if (G.ended) return;

        // intensify: shuffle discard onto top
        const pile = shuffle(G.infectionDiscard.splice(0));
        G.infectionDeck = G.infectionDeck.concat(pile);
        G._log("↻ Intensify: shuffled infection discard onto top.");
    }

    // ---- Crisis ----
    function resolveCrisis(G, card) {
        G._log(`⚠️ CRISIS: ${card.name}`);

        function clearOngoing() {
            if (G.crisisInPlay) {
                G._log(`🧹 Crisis ends: ${G.crisisInPlay.name}`);
                G.crisisInPlay = null;
            }
        }

        if (card.name === "Logistics Failure") {
            G._doubleInfectThisTurn = true;
            G._log("📦 Logistics Failure: infection step will happen twice at end of this turn.");
            return;
        }

        if (card.name === "Planes Grounded") {
            clearOngoing();
            G.crisisInPlay = { name: card.name, kind: "ongoing" };
            G._log("🛑 Planes Grounded (ongoing): flights disabled until next Crisis.");
            return;
        }

        if (card.name === "Limited Options") {
            clearOngoing();
            G.crisisInPlay = { name: card.name, kind: "ongoing" };
            G._log("⛔ Limited Options (ongoing): hand limit becomes 5 until next Crisis.");
            for (const pl of G.players) {
                while (pl.hand.length > 5) {
                    const c = pl.hand.pop();
                    G.playerDiscard.push(c);
                    G._log(`✋ Limited Options: auto-discarded ${describeCard(c)} from ${pl.name}.`);
                }
            }
            return;
        }

        if (card.name === "Hot Spot") {
            if (G.infectionDeck.length === 0) {
                if (G.infectionDiscard.length === 0) return;
                G.infectionDeck = shuffle(G.infectionDiscard.splice(0));
            }
            const bottom = G.infectionDeck.shift();
            G.infectionDiscard.push(bottom);

            const city = bottom.city;
            const col = cityColor(city);
            G._log(`🔥 Hot Spot: ${city} (place 3 ${col})`);
            placeCube(G, city, col, 3);
            return;
        }

        if (card.name === "Contamination") {
            const p = currentPlayer(G);
            const city = p.location;
            const col = cityColor(city);
            G._log(`☣️ Contamination: infect all neighbors of ${city} (${col}).`);
            for (const nb of (ADJ[city] || [])) {
                placeCube(G, nb, col, 1);
                if (G.ended) return;
            }
            return;
        }

        if (card.name === "Unacceptable Losses") {
            if (G.infectionDeck.length === 0) {
                if (G.infectionDiscard.length === 0) return;
                G.infectionDeck = shuffle(G.infectionDiscard.splice(0));
            }
            const bottom = G.infectionDeck.shift();
            const city = bottom.city;
            const col = cityColor(city);

            G._log(`💀 Unacceptable Losses: remove 3 ${col} cubes from ${city} (or supply) from the game.`);

            let removed = 0;
            while (removed < 3) {
                if (G.cities[city][col] > 0) {
                    G.cities[city][col] -= 1;
                } else {
                    // remove from supply entirely
                    adjustSupply(G, col, -1);
                    if (G.ended) return;
                }
                removed++;
            }
            return;
        }

        G._log(`(Crisis "${card.name}" is not fully implemented yet.)`);
    }

    function ongoingRestrictions(G) {
        const c = G.crisisInPlay && G.crisisInPlay.name;
        return {
            planesGrounded: c === "Planes Grounded",
            limitedOptions: c === "Limited Options"
        };
    }

    function enforceHandLimit(G, player) {
        const limit = (G.crisisInPlay && G.crisisInPlay.name === "Limited Options") ? 5 : 6;
        while (player.hand.length > limit) {
            const c = player.hand.pop();
            G.playerDiscard.push(c);
            G._log(`✋ Hand limit exceeded: auto-discarded ${describeCard(c)} from ${player.name}.`);
        }
    }

    // ---- Role powers ----
    function medicPassive(G, player) {
        if (player.role !== "Medic") return;
        const city = player.location;
        for (const col of COLORS) {
            if (G.cures[col] && G.cities[city][col] > 0) {
                const n = G.cities[city][col];
                G.cities[city][col] = 0;
                adjustSupply(G, col, +n);
                G._log(`🩺 Medic passive: removed ${n} ${col} cubes in ${city} (cured disease).`);
            }
        }
    }

    function medicCleanCuredHere(G) {
        const p = currentPlayer(G);
        if (p.role !== "Medic") { G._log("❌ Only Medic can do free cured cleanup."); return; }
        medicPassive(G, p);
    }

    // Dispatcher: action to move any pawn to a city with another pawn
    function dispatchMoveToPawn(G, targetPlayerId, destCityWithPawn) {
        const d = currentPlayer(G);
        if (d.role !== "Dispatcher") { G._log("❌ Only Dispatcher can Dispatch."); return; }

        const target = G.players[targetPlayerId];
        if (!target) { G._log("❌ Invalid target pawn."); return; }

        const hasPawnThere = G.players.some(pl => pl.location === destCityWithPawn);
        if (!hasPawnThere) { G._log("❌ Destination must be a city with a pawn."); return; }

        if (!spendAction(G)) return;
        target.location = destCityWithPawn;
        G._log(`📡 Dispatcher moved ${target.name} to ${destCityWithPawn} (to a pawn city).`);
        medicPassive(G, target);
    }

    // Dispatcher: action to move any pawn to a city connected to where THAT pawn is
    function dispatchMoveConnected(G, targetPlayerId, toCity) {
        const d = currentPlayer(G);
        if (d.role !== "Dispatcher") { G._log("❌ Only Dispatcher can Dispatch."); return; }

        const target = G.players[targetPlayerId];
        if (!target) { G._log("❌ Invalid target pawn."); return; }

        const links = ADJ[target.location] || [];
        if (!links.includes(toCity)) {
            G._log(`❌ ${toCity} is not connected to ${target.location} (Dispatcher uses target pawn's city).`);
            return;
        }

        if (!spendAction(G)) return;
        target.location = toCity;
        G._log(`📡 Dispatcher moved ${target.name} to ${toCity} (connected move).`);
        medicPassive(G, target);
    }

    // ---- Shortest path (BFS) + auto-drive ----
    function shortestPath(from, to) {
        if (from === to) return [from];
        const q = [from];
        const prev = {};
        const seen = new Set([from]);

        while (q.length) {
            const cur = q.shift();
            const nbs = ADJ[cur] || [];
            for (const nb of nbs) {
                if (seen.has(nb)) continue;
                seen.add(nb);
                prev[nb] = cur;
                if (nb === to) {
                    const path = [to];
                    let x = to;
                    while (prev[x]) { x = prev[x]; path.push(x); }
                    path.reverse();
                    return path;
                }
                q.push(nb);
            }
        }
        return null;
    }

    function autoDrive(G, toCity) {
        if (G.ended) return;
        if (G.phase !== "actions") { G._log("❌ You can only move during the Actions phase."); return; }

        const p = currentPlayer(G);
        const from = p.location;

        const path = shortestPath(from, toCity);
        if (!path) { G._log(`❌ No path found from ${from} to ${toCity}.`); return; }
        if (path.length === 1) { G._log(`ℹ️ Already in ${toCity}.`); return; }

        const steps = path.slice(1);
        let moved = 0;

        for (const step of steps) {
            if (G.actionsLeft <= 0) {
                G._log(`⏹️ Ran out of actions. Stopped in ${p.location}. Remaining path: ${steps.slice(moved).join(" → ")}`);
                return;
            }
            drive(G, step);
            moved++;
            if (G.ended) return;
        }

        G._log(`🧭 Auto-moved: ${path.join(" → ")}`);
    }

    // ---- Setup infections ----
    function setupInitialInfections(G) {
        const groups = [3, 3, 2, 2, 1, 1];
        G._log("=== Initial Infections ===");
        for (const n of groups) {
            const card = drawInfectionCard(G);
            const city = card.city;
            const col = cityColor(city);
            G._log(`🧫 Setup infect: ${city} (+${n} ${col})`);
            placeCube(G, city, col, n);
            if (G.ended) return;
        }
        G._log("==========================");
    }

    // ---- Actions ----
    function spendAction(G) {
        if (G.actionsLeft <= 0) return false;
        G.actionsLeft -= 1;
        return true;
    }

    function drive(G, toCity) {
        const p = currentPlayer(G);
        const links = ADJ[p.location] || [];
        if (!links.includes(toCity)) { G._log(`❌ Not connected: ${p.location} -> ${toCity}`); return; }
        if (!spendAction(G)) return;
        p.location = toCity;
        G._log(`🚗 ${p.name} drove to ${toCity}.`);
        medicPassive(G, p);
    }

    function directFlight(G, toCity) {
        if (ongoingRestrictions(G).planesGrounded) { G._log("⛔ Planes Grounded: flights disabled."); return; }
        const p = currentPlayer(G);
        const idx = p.hand.findIndex(c => c.type === "city" && c.city === toCity);
        if (idx < 0) { G._log(`❌ Need the ${toCity} card for Direct Flight.`); return; }
        if (!spendAction(G)) return;
        G.playerDiscard.push(p.hand.splice(idx, 1)[0]);
        p.location = toCity;
        G._log(`✈️ ${p.name} Direct Flight to ${toCity}.`);
        medicPassive(G, p);
    }

    function charterFlight(G, toCity) {
        if (ongoingRestrictions(G).planesGrounded) { G._log("⛔ Planes Grounded: flights disabled."); return; }
        const p = currentPlayer(G);
        const here = p.location;
        const idx = p.hand.findIndex(c => c.type === "city" && c.city === here);
        if (idx < 0) { G._log(`❌ Need the ${here} card for Charter Flight.`); return; }
        if (!spendAction(G)) return;
        G.playerDiscard.push(p.hand.splice(idx, 1)[0]);
        p.location = toCity;
        G._log(`🛫 ${p.name} Charter Flight to ${toCity}.`);
        medicPassive(G, p);
    }

    // Treat Disease (Hot Zone NA rules)
    // - Non-Medic: remove 1 cube of chosen color in your city
    // - If that color is cured: remove ALL cubes of that color in your city
    // - Medic: always remove ALL cubes of chosen color when treating
    function treat(G, colorOpt) {
        const p = currentPlayer(G);
        const city = p.location;

        const present = COLORS.filter(col => G.cities[city][col] > 0);
        if (present.length === 0) {
            G._log(`❌ No cubes in ${city} to treat.`);
            return;
        }

        // Pick color if UI didn't specify
        let col = colorOpt;
        if (!col) {
            const native = cityColor(city);
            if (G.cities[city][native] > 0) col = native;
            else {
                col = present.reduce((best, c) =>
                    (G.cities[city][c] > G.cities[city][best] ? c : best),
                    present[0]
                );
            }
        }

        if (!COLORS.includes(col)) {
            G._log(`❌ Invalid treat color: ${col}`);
            return;
        }
        if (G.cities[city][col] <= 0) {
            G._log(`❌ No ${col} cubes in ${city} to treat.`);
            return;
        }

        if (!spendAction(G)) return;

        const isMedic = (p.role === "Medic");
        const isCured = !!G.cures[col];

        const removeN = (isMedic || isCured) ? G.cities[city][col] : 1;

        G.cities[city][col] -= removeN;
        adjustSupply(G, col, +removeN);

        if (isMedic) {
            G._log(`🩺 Medic treated ${city}: removed ALL ${removeN} ${col} cubes.`);
        } else if (isCured) {
            G._log(`🧼 Treated cured ${col} in ${city}: removed ALL ${removeN} cubes.`);
        } else {
            G._log(`🧼 Treated ${city}: removed 1 ${col} cube.`);
        }
    }


    /* Share Knowledge (selectable)
       opts: { fromId:number, toId:number, cityName:string }
       - Both pawns must be in the same city (current player's city)
       - Non-Researcher: card must match that city
       - Researcher: may GIVE any city card (but still must be co-located)
    */
    function shareKnowledge(G, opts) {
        const p = currentPlayer(G);
        const city = p.location;

        if (!opts || typeof opts.fromId !== "number" || typeof opts.toId !== "number" || !opts.cityName) {
            G._log("❌ Share Knowledge needs opts: {fromId,toId,cityName}");
            return;
        }

        const from = G.players[opts.fromId];
        const to = G.players[opts.toId];
        const cardCity = opts.cityName;

        if (!from || !to) { G._log("❌ Invalid player ids for Share Knowledge."); return; }
        if (from.location !== city || to.location !== city) {
            G._log(`❌ Both players must be in ${city} to Share Knowledge.`);
            return;
        }

        // Must be the current player's action
        if (!spendAction(G)) return;

        const researcherGiving = (from.role === "Researcher");
        const mustMatchCity = !researcherGiving;

        if (mustMatchCity && cardCity !== city) {
            G._log(`❌ Non-Researcher shares must use the city card matching the city: ${city}.`);
            return;
        }

        const idx = from.hand.findIndex(c => c.type === "city" && c.city === cardCity);
        if (idx < 0) {
            G._log(`❌ ${from.name} doesn't have the ${cardCity} card.`);
            return;
        }

        const card = from.hand.splice(idx, 1)[0];
        to.hand.push(card);
        G._log(`🤝 Share Knowledge: ${from.name} gave ${describeCard(card)} to ${to.name}.`);
        enforceHandLimit(G, to);
    }

    // Discard a card from a player's hand (manual utility)
    function discardCard(G, opts) {
        if (!opts || typeof opts.playerId !== "number" || typeof opts.cardIndex !== "number") {
            G._log("❌ discardCard needs opts: {playerId, cardIndex}");
            return;
        }
        const pl = G.players[opts.playerId];
        if (!pl) { G._log("❌ Invalid player for discard."); return; }

        const i = opts.cardIndex;
        if (i < 0 || i >= pl.hand.length) {
            G._log("❌ Invalid card index for discard.");
            return;
        }

        const card = pl.hand.splice(i, 1)[0];
        G.playerDiscard.push(card);
        G._log(`🗑️ ${pl.name} discarded ${describeCard(card)}.`);
    }

    function discoverCure(G) {
        const p = currentPlayer(G);
        if (p.location !== "Atlanta") { G._log("❌ Must be in Atlanta to Discover a Cure."); return; }

        const byColor = { blue: [], red: [], yellow: [] };
        p.hand.forEach((c, idx) => { if (c.type === "city") byColor[c.color].push(idx); });

        const options = COLORS.filter(col => byColor[col].length >= 4 && !G.cures[col]);
        if (options.length === 0) { G._log("❌ Need 4 City cards of an uncured color."); return; }
        if (!spendAction(G)) return;

        const col = options[0];
        const idxs = byColor[col].slice(0, 4).sort((a, b) => b - a);
        for (const i of idxs) G.playerDiscard.push(p.hand.splice(i, 1)[0]);

        G.cures[col] = true;
        G._log(`🧪 CURE DISCOVERED: ${col.toUpperCase()}`);
        medicPassive(G, p);
        checkWin(G);
    }

    // ---- Events (play helpers) ----
    function findEventDef(name) {
        return (EVENTS || []).find(e => e.name === name) || null;
    }

    // Remove event from a player's hand by name (first match)
    function discardEventFromHand(G, player, eventName) {
        const idx = player.hand.findIndex(c => c.type === "event" && c.name === eventName);
        if (idx < 0) return false;
        const card = player.hand.splice(idx, 1)[0];
        G.playerDiscard.push(card);
        return true;
    }

    // Play an event card (UI passes options per event)
    // opts:
    //  - Borrowed Time: none
    //  - One Quiet Night: none
    //  - Airlift: { pawnId:number, toCity:string }
    //  - Remote Treatment: { picks:[{city,color},{city,color}] } (two cubes)
    function playEvent(G, eventName, opts) {
        if (G.ended) return;
        const p = currentPlayer(G);

        const def = findEventDef(eventName);
        if (!def) { G._log(`❌ Unknown event: ${eventName}`); return; }

        if (!discardEventFromHand(G, p, eventName)) {
            G._log(`❌ You don't have ${eventName} in hand.`);
            return;
        }

        if (eventName === "Borrowed Time") {
            G.actionsLeft += 2;
            G._log("⏳ Event: Borrowed Time (+2 actions this turn).");
            return;
        }

        if (eventName === "One Quiet Night") {
            G.oneQuietNight = true;
            G._log("🌙 Event: One Quiet Night (skip infection step this turn).");
            return;
        }

        if (eventName === "Airlift") {
            if (!opts || typeof opts.pawnId !== "number" || !opts.toCity) {
                G._log("❌ Airlift needs opts: {pawnId,toCity}");
                return;
            }
            const target = G.players[opts.pawnId];
            if (!target) { G._log("❌ Invalid pawn."); return; }
            target.location = opts.toCity;
            G._log(`🚁 Event: Airlift moved ${target.name} to ${opts.toCity}.`);
            medicPassive(G, target);
            return;
        }

        if (eventName === "Remote Treatment") {
            if (!opts || !Array.isArray(opts.picks) || opts.picks.length !== 2) {
                G._log('❌ Remote Treatment needs opts: {picks:[{city,color},{city,color}]} (exactly 2).');
                return;
            }
            let removed = 0;
            for (const pick of opts.picks) {
                const city = pick.city;
                const color = pick.color;
                if (!city || !color || !G.cities[city]) continue;
                if (G.cities[city][color] > 0) {
                    G.cities[city][color] -= 1;
                    adjustSupply(G, color, +1);
                    removed++;
                    G._log(`🧪 Event: Remote Treatment removed 1 ${color} cube from ${city}.`);
                } else {
                    G._log(`ℹ️ Remote Treatment: no ${color} cube in ${city}.`);
                }
            }
            G._log(`🧪 Remote Treatment: removed ${removed}/2 cubes.`);
            return;
        }

        G._log(`(Event "${eventName}" not implemented.)`);
    }

    // ---- Player deck draw ----
    function drawPlayerCards(G, n) {
        const p = currentPlayer(G);
        for (let i = 0; i < n; i++) {
            if (G.playerDeck.length === 0) {
                endGame(G, "Tried to draw from Player deck but it was empty (time ran out).");
                return;
            }
            const card = G.playerDeck.pop();

            if (card.type === "epidemic") { epidemic(G); continue; }
            if (card.type === "crisis") { resolveCrisis(G, card); continue; }

            if (card.type === "event") {
                p.hand.push(card);
                G._log(`🎴 Drew Event: ${card.name}`);
                enforceHandLimit(G, p);
                continue;
            }
            if (card.type === "city") {
                p.hand.push(card);
                G._log(`🎴 Drew City: ${card.city} (${card.color})`);
                enforceHandLimit(G, p);
                continue;
            }
        }
    }

    function endActions(G) {
        if (G.ended) return;

        G.phase = "draw";
        drawPlayerCards(G, 2);
        if (G.ended) return;

        G.phase = "infect";
        const rate = INFECTION_RATE_TRACK[G.infectionRateIdx];

        if (G.oneQuietNight) {
            G._log("🌙 One Quiet Night: skipping infection step this turn.");
            G.oneQuietNight = false;
        } else {
            infectStep(G, rate);
        }
        if (G.ended) return;

        if (G._doubleInfectThisTurn) {
            G._log("📦 Logistics Failure: resolving infection step a second time.");
            infectStep(G, rate);
            G._doubleInfectThisTurn = false;
            if (G.ended) return;
        }

        G.turn += 1;
        G.actionsLeft = baseActionsFor(currentPlayer(G));
        G.phase = "actions";
        G._log(`— Turn passes to ${currentPlayer(G).name}.`);
    }

    // ---- Game creation ----
    function makeGame({ mode, difficulty, roles, logFn }) {
        const log = logFn || (() => { });

        const numPlayers =
            mode === "solo1" ? 1 :
                mode === "solo2" ? 2 :
                    mode === "coop2" ? 2 :
                        mode === "coop3" ? 3 :
                            4;

        const cities = {};
        ALL_CITIES.forEach(c => { cities[c] = { blue: 0, red: 0, yellow: 0 }; });

        const players = [];
        for (let i = 0; i < numPlayers; i++) {
            players.push({
                id: i,
                name: `Player ${i + 1}`,
                pawn: `p${i + 1}`,
                location: "Atlanta",
                hand: [],
                role: (roles && roles[i]) ? roles[i] : "Generalist"
            });
        }

        const infectionDeck = shuffle(ALL_CITIES.map(c => ({ type: "infection", city: c })));
        const infectionDiscard = [];

        const cityPlayerCards = ALL_CITIES.map(c => ({ type: "city", city: c, color: CITY_COLOR[c] }));
        const playerDeckBase = shuffle(cityPlayerCards.concat(deepClone(EVENTS)));

        // Starting hands (simple / consistent)
        let dealN;
        if (mode === "solo1") dealN = 4;
        else if (numPlayers === 2) dealN = 3;
        else dealN = 2;

        for (let r = 0; r < dealN; r++) {
            for (let p = 0; p < numPlayers; p++) {
                players[p].hand.push(playerDeckBase.pop());
            }
        }

        // Crisis deck
        const crisisDeck = shuffle(deepClone(CRISIS).map(c => ({ type: "crisis", name: c.name, kind: c.kind })));

        // Split remaining player cards into 3 piles, add 1 Epidemic each, add Crisis per difficulty
        const piles = [[], [], []];
        while (playerDeckBase.length) {
            for (let i = 0; i < 3 && playerDeckBase.length; i++) piles[i].push(playerDeckBase.pop());
        }

        for (let i = 0; i < 3; i++) {
            piles[i].push({ type: "epidemic" });

            const perPile = (difficulty === "standard") ? 1 : (difficulty === "heroic") ? 2 : 0;
            for (let k = 0; k < perPile; k++) if (crisisDeck.length) piles[i].push(crisisDeck.pop());

            shuffle(piles[i]);
        }

        let playerDeck = [];
        playerDeck = playerDeck.concat(piles[0], piles[1], piles[2]);
        playerDeck.reverse(); // draw from end

        const G = {
            version: "hotzone_na_classic_roles_events_v1",
            mode,
            difficulty,

            turn: 0,
            actionsLeft: baseActionsFor(players[0]),
            phase: "actions",

            cities,
            players,

            infectionDeck,
            infectionDiscard,

            playerDeck,
            playerDiscard: [],

            cures: { blue: false, red: false, yellow: false },
            outbreak: 0,
            infectionRateIdx: 0,

            oneQuietNight: false,
            crisisInPlay: null,

            ended: false,
            endReason: null,

            supplies: { blue: 16, red: 16, yellow: 16 },
            _doubleInfectThisTurn: false,

            _log: log
        };

        log(`Game created: mode=${mode}, players=${numPlayers}, difficulty=${difficulty}`);
        for (const pl of G.players) {
            const def = roleById(pl.role);
            if (def) log(`Role: ${pl.name} = ${pl.role} — ${def.desc}`);
        }
        return G;
    }

    // ---- Expose API globally ----
    window.makeGame = makeGame;
    window.setupInitialInfections = setupInitialInfections;
    window.currentPlayer = currentPlayer;

    window.drive = drive;
    window.autoDrive = autoDrive;
    window.shortestPath = shortestPath;

    window.treat = treat;
    window.shareKnowledge = shareKnowledge;

    window.directFlight = directFlight;
    window.charterFlight = charterFlight;

    window.discoverCure = discoverCure;
    window.endActions = endActions;

    window.dispatchMoveToPawn = dispatchMoveToPawn;
    window.dispatchMoveConnected = dispatchMoveConnected;

    window.medicCleanCuredHere = medicCleanCuredHere;

    window.playEvent = playEvent;

    window.discardCard = discardCard;

    // helpful extras
    window.turnsLeft = turnsLeft;
    window.ongoingRestrictions = ongoingRestrictions;
    window.describeCard = describeCard;
    window.checkWin = checkWin;
    window.cityColor = cityColor;

    console.log("game.js: BOTTOM reached", typeof window.makeGame, typeof window.autoDrive, typeof window.playEvent);
})();

