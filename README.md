# Random Games Collection

A small collection of browser games, including both single-file games and multi-file projects. No build step or dependencies required.

## What's included

### One File Games
- `One File Games/blackjack.html` — Blackjack (play-money chips, animated dealing, strategy hints)
- `One File Games/checkers.html` — Checkers vs the computer (three skill levels) or a friend
- `One File Games/chess.html` — Chess vs the computer (three skill levels) or a friend; drag-and-drop, promotion choice, hints, undo, save and replay
- `One File Games/dice.html` — High Roller Dice, a craps-style table (play-money chips)
- `One File Games/disguised-king-chess.html` — Disguised King Chess
- `One File Games/minesweeper.html` — Minesweeper Ultra Deluxe (ripple reveals, hints, custom boards, best times)
- `One File Games/roulette.html` — Royal Roulette, a European wheel with the full betting table (play-money chips)
- `One File Games/poker.html` — Texas Hold'em Poker vs up to 3 bots (play-money chips)
- `One File Games/slots.html` — Lucky Reels, a 5-reel slot machine with wilds and free spins (play-money credits)
- `One File Games/solitaire.html` — Solitaire (Klondike, Spider and FreeCell; pick the game in Settings; drag-and-drop or tap)
- `One File Games/ultimate-ttt.html` — Ultimate Tic-Tac-Toe vs the computer (three skill levels) or a friend

### Multi-File Games
- `Multi-File Games/hotzone-na/index.html` — Pandemic: Hot Zone NA
- `Multi-File Games/Risk/index.html` — Risk (work in progress, currently empty)

## How to play

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Click any game to start playing. Each game has a "← Games" link back to the launcher.

The chip and credit games use pretend money only. Two small shared files sit next to the launcher: `scores.js`
(high-score reporting) and `fx.js` (sound effects, confetti and a mute button in the top-right corner).

> Tip: Some browsers apply stricter local file security rules. If a game doesn't load correctly via `file://`, run a local static server (for example `python3 -m http.server`) and open `http://localhost:8000`.

## License

See [LICENSE](LICENSE).

## Desktop app

A Go + [Wails](https://wails.io) desktop version lives in [`wails-app/`](wails-app/). It adds a **High Scores** tab
covering all games and lets you **save chess games in algebraic notation (PGN) and replay them move by move**.
Pushing a `v*` tag builds it for Windows, macOS and Linux and publishes a GitHub Release. See
[`wails-app/README.md`](wails-app/README.md).

The chess page also saves and replays games on its own (in the browser's storage) when run from the website.
