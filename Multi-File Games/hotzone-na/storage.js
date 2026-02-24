/* storage.js — Classic (non-module) build
   Simple export/import as JSON.
   Works with file:// (double-click index.html).
*/

(function () {
    "use strict";

    const VERSION = "hotzone_na_save_v1";

    function exportSave(G) {
        try {
            const payload = {
                saveVersion: VERSION,
                game: G
            };
            return JSON.stringify(payload);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    function importSave(str) {
        try {
            const payload = JSON.parse(str);

            // Backwards compatibility: allow raw game object
            const game = payload && payload.game ? payload.game : payload;

            if (!game || !game.players || !game.cities || !game.playerDeck) {
                console.warn("importSave: missing expected fields");
                return null;
            }

            // Re-attach log function (UI sets it later if desired)
            if (typeof game._log !== "function") game._log = () => { };

            // Ensure supplies exist
            if (!game.supplies) {
                game.supplies = { blue: 16, red: 16, yellow: 16 };
            }

            // Ensure flags exist
            if (typeof game.oneQuietNight !== "boolean") game.oneQuietNight = false;
            if (typeof game._doubleInfectThisTurn !== "boolean") game._doubleInfectThisTurn = false;

            return game;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    window.exportSave = exportSave;
    window.importSave = importSave;
})();
