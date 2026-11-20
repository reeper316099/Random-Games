<div align="center">

# 🎮 Random Games

**A pocket arcade of browser games.** Cards, casino, chess variants, puzzles and more.
No build step, no installs, no internet needed once you have it.

[Play online](https://reeper316099.github.io/Random-Games/) · [Desktop app](wails-app/) · [Idea board](IDEAS.md)

</div>

---

## ✨ Highlights

- **A searchable launcher**: search by name or idea, filter by category or by how you want to play (vs computer, hot-seat, solo, play-money), sort A–Z, newest, recently or most played, star favorites, grid or list view, light and dark, `/` to search, `R` for a random game
- **21 games**, each a self-contained page
- **Play-money casino** with chips and credits (nothing real is ever at stake)
- **Bots at three skill levels** for the board and card games, or play a friend
- **High scores** for every game, with click-through details: bets, dice rolls, rule settings, engine strength
- **Save and replay chess games** in standard algebraic notation (PGN), including the Remorse Chess variant
- **Seasonal themes** that re-skin every game, with sound effects and confetti
- **Works offline**: nothing is loaded from the internet

---

## 🕹️ The games

### ♟️ Chess and board games

| Game | What it is |
|---|---|
| [**Chess**](One%20File%20Games/chess.html) | Three skill levels with a choice of the built-in engine or bundled Stockfish, or a friend. Drag-and-drop, promotion choice, hints, undo, save and replay |
| [**Remorse Chess**](One%20File%20Games/remorse-chess.html) | Chess where pieces feel guilt after capturing. Every rule is a setting, with Orthodox / Full / Lite presets. Undo (dice repeat the same numbers), and games save in algebraic notation with the dice and feelings recorded, like `Bxa6 {🎲4🙂 👁b7=6⚪}` |
| [**Disguised King Chess**](One%20File%20Games/disguised-king-chess.html) | Your king is secretly one of your pawns. It moves like a pawn, but if it's captured you lose instantly (no check, no castling) |
| [**Checkers**](One%20File%20Games/checkers.html) | Versus the computer (three skill levels) or a friend |
| [**Mancala**](One%20File%20Games/mancala.html) | Kalah rules: extra turns, captures, 3–6 stones per pit, easy / medium / hard bot, optional hints |
| [**Ultimate Tic-Tac-Toe**](One%20File%20Games/ultimate-ttt.html) | Nine boards in one, versus the computer (three skill levels) or a friend |

### 🃏 Card games

| Game | What it is |
|---|---|
| [**Hearts**](One%20File%20Games/hearts.html) | Four players: card passing, hearts breaking, shooting the moon, play to 50 or 100 |
| [**Crazy Eights**](One%20File%20Games/crazy-eights.html) | 2–4 players: match suit or rank, eights are wild, optional 2 / Q / A action cards, play a round or to 100 / 200 |
| [**Cribbage**](One%20File%20Games/cribbage.html) | Six-card cribbage against a bot with a pegboard: the play, the show, the crib, skunks, and a discard hint |
| [**Spades**](One%20File%20Games/spades.html) | Partnership bidding (you and Max against two bots), Nil bids, bags, play to 250 or 500 |
| [**BS (Cheat)**](One%20File%20Games/bs.html) | Bluff your cards away against 1–4 bots and call out their lies |
| [**Solitaire**](One%20File%20Games/solitaire.html) | Klondike, Spider and FreeCell (pick the game in Settings), drag-and-drop or tap |

### 🎰 Casino (play money)

| Game | What it is |
|---|---|
| [**Blackjack**](One%20File%20Games/blackjack.html) | Animated dealing, insurance, split and double, strategy hints |
| [**Poker**](One%20File%20Games/poker.html) | Texas Hold'em against up to 3 bots |
| [**Video Poker**](One%20File%20Games/video-poker.html) | Jacks or Better 9/6: hold and draw, pay table, double-up gamble |
| [**Baccarat**](One%20File%20Games/baccarat.html) | Punto Banco with the real third-card rules, Player / Banker / Tie and pair bets, 5% commission or no-commission, results plate |
| [**Roulette**](One%20File%20Games/roulette.html) | Royal Roulette: a European wheel with the full betting table |
| [**Slots**](One%20File%20Games/slots.html) | Lucky Reels: five reels, wilds and free spins |
| [**High Roller Dice**](One%20File%20Games/dice.html) | A craps-style table |

### 🧩 Puzzle and strategy

| Game | What it is |
|---|---|
| [**Minesweeper Ultra Deluxe**](One%20File%20Games/minesweeper.html) | Ripple reveals, hints, custom boards, best times |
| [**Pandemic: Hot Zone NA**](Multi-File%20Games/hotzone-na/index.html) | A multi-file strategy game |
| **Risk** | Work in progress, currently empty |

---

## 🚀 Getting started

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Search, filter or browse, then click any game. Each one has a **← Games** link back to the launcher.

> **Tip:** some browsers apply stricter security rules to `file://` pages. If a game doesn't load properly, run a local server and open the address it prints:
>
> ```bash
> python3 -m http.server 8000
> ```
>
> then visit `http://localhost:8000`.

---

## 🧰 Shared pieces

Three small files sit next to the launcher and every game uses them:

| File | What it does |
|---|---|
| `scores.js` | High-score reporting (to the desktop app, or the browser's storage on the website) |
| `fx.js` | Sound effects, confetti, and a mute button in the top-right corner |
| `themes.js` | A "Seasonal theme" menu in each game's settings (in Chess it is part of the board colour list): Spring, Summer, Fall, Winter, Halloween, Thanksgiving, Christmas, Easter, **Auto by date**, or Classic. It re-skins every game and adds drifting petals, leaves, snow, embers or Easter eggs. The choice is remembered and shared by all games |

---

## 🖥️ Desktop app

A Go + [Wails](https://wails.io) desktop version lives in [`wails-app/`](wails-app/). It adds:

- a **High Scores** tab covering every game, saved to a file on your computer
- **saved chess and Remorse Chess games**, replayable move by move

Pushing a `v*` tag builds it for Windows, macOS and Linux and publishes a GitHub Release. See [`wails-app/README.md`](wails-app/README.md).

The chess pages also save and replay games on their own, in the browser's storage, when run from the website.

---

## 📦 Bundled third-party files (`vendor/`)

Everything works offline; nothing is loaded from the internet.

- `vendor/fonts/`: the Inter font (SIL Open Font License, see `OFL-Inter.txt`)
- `vendor/stockfish/`: [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19, lite single-threaded WebAssembly build (GPL-3.0, see `Copying.txt`), used by Chess when you pick the Stockfish engine. Web Workers don't run from `file://`, so open the games through the website or the desktop app; otherwise Chess falls back to the built-in engine automatically.

---

## 📄 License

See [LICENSE](LICENSE).
