# Idea board

Games and features we may build later. Everything listed below has now been built; the Remorse Chess rules are kept as the reference spec.

## Games (all built)

- ✅ **Video Poker (Jacks or Better)** — 5-card draw against a pay table, play-money chips, hold/draw buttons. Should sit next to Slots and use the shared card look and seasonal themes.
- ✅ **Hearts** — 4-player trick-taking game against 3 bots (pass 3 cards, avoid hearts and the Queen of Spades, shoot the moon). Needs a decent bot.
- ✅ **Spades** — partnership trick-taking game (bidding, spades as trump, nil bids) against bots. Could share the trick-taking engine with Hearts.
- ✅ **Remorse Chess** — chess variant from Bardelo_bardalini on Instagram (rules below, written from four of their videos). Would build on the existing chess engine. The creator admits it's too much to track over a physical board, which is the point of doing it on a computer.

## Remorse Chess rules

Standard chess (setup, moves, checkmate wins) plus a "reaction" system. Pieces are tracked with tokens on a real board; in the game we'd show badges.

**Reaction roll (once per piece, ever).** The first time a piece captures, roll a D6. The result is its reaction for the rest of the game; it is never rolled again.

| Roll | Reaction | Effect |
|---|---|---|
| 1 | Devastated | Piece is immobilised. If no bishop absolves it within 3 turns, it self-captures (removed). |
| 2–3 | Guilt-ridden | Piece still moves normally but cannot capture. Fixed by absolution (below); after that it is back to normal and may capture again. |
| 4–5 | Unaffected | Plays as an orthodox piece. |
| 6 | Psychopath | Gets one extra move after a capture (doesn't stack if it captures twice in one turn). After 3 total captures it gains **bloodlust**: it only moves when it can capture, and may capture friendly pieces. |

**Absolution.** A bishop moves to a square adjacent to a guilt-ridden (or devastated) piece. This takes that turn, and the piece returns to orthodox. It works both ways: a guilty piece that steps up next to a friendly bishop is absolved too (setting `walkUpAbsolve`, on by default). Bishops are not special: a bishop that captures rolls the reaction D6 like any other piece, and if it comes up devastated or guilt-ridden the bishop has to absolve *itself*, which takes one turn (for a devastated bishop, within the 3-turn limit). Another bishop can absolve it instead. If a player has no bishops left, they cannot absolve anyone until a pawn promotes to a bishop.

**Witness rolls (adjacent captures).** When a piece is captured, every *opposing-side-to-the-capturer* piece adjacent to the capture square (the victim's surviving neighbours) rolls a D6:

| Roll | Effect |
|---|---|
| 1–2 | Temporarily guilt-ridden (for surviving). Unlike the capture-reaction this is just a debuff: a bishop absolves it, and if the piece hasn't captured yet it will still get its one-time reaction roll later. If it was *already* guilt-ridden, the effect doubles and it becomes temporarily devastated (immobile, 3 turns to absolve). |
| 3–4 | No effect. |
| 5–6 | **Vengeance** (white token): one guilt-free capture, but only against the same piece *type* that made the original capture (e.g. a pawn witnessing a knight take its neighbour may take one enemy knight). |

Psychopaths (called "sadist" in one video) are immune to witness effects.

**Settings (every rule is a toggle or number, so players can mix them):**

- *Reaction rolls on capture:* on/off. When off, nothing else about capture reactions applies.
- *Roll table:* the outcome ranges for 1–6 are editable (defaults: 1 devastated, 2–3 guilt-ridden, 4–5 unaffected, 6 psychopath), and each reaction can be switched off (its range becomes "unaffected").
- *Devastated:* turns allowed to absolve before self-capture (default 3); self-capture on/off.
- *Psychopath:* extra move on/off; captures needed for bloodlust (default 3, 0 = never); bloodlust may capture friendly pieces on/off.
- *Reaction is permanent per piece* (default) vs. re-roll on every capture.
- *Absolution:* bishops absolve on/off; takes the whole turn on/off; bishops roll for their own captures on/off (default on); self-absolution needed on/off; absolve from adjacent squares only vs. any bishop on the same line.
- *Witness rolls:* on/off; who rolls (victim's side only / both sides / every piece); radius (adjacent = 1, default); the witness table (default 1–2 temporary guilt, 3–4 none, 5–6 vengeance); doubling of guilt into temporary devastation on/off; psychopaths immune on/off.
- *Vengeance:* on/off; number of guilt-free captures (default 1); restricted to the offender's piece type (default) or any piece.
- *Dice:* real random / fixed seed (for testing and replays); show the roll animation and badges; choose whether bots see hidden state (they should, it's all public).
- *Presets:* "Orthodox" (all off), "Remorse (full)" (all on), "Lite" (capture rolls only, no witnesses).

**Open questions to settle before building** (the videos don't say):
- Does the capturing side's own adjacent pieces also roll, or only the victim's neighbours? (Video says "opposing piece adjacent to this taking", so I assumed the victim's side.)
- Do guilt-ridden pieces still give check? (Suggest: yes, but can't capture the king, so check still counts as a threat only if capture is allowed; simplest is that a guilt-ridden piece gives no check.)
- Can a bishop absolve from any adjacent square when it arrives, or does it also need to be a legal move? (Assume the move must be legal and the absolution is its effect.)
- Does the bishop's absolution use up the whole turn, or can it be a normal move that happens to land adjacent? (Videos say it takes the turn; covered by a setting.)
- Does a devastated piece that self-captures count as a capture for witness rolls?
- Dice: random, with a seedable roll so it can be tested; maybe an option to show the roll animation using `fx.js`.

## Notes

- New games follow the usual pattern: one HTML file in `One File Games/`, a back link, `scores.js` + `fx.js` + `themes.js`, a card in `index.html`, an entry in `wails-app/frontend/dist/shell.js`, and a line in the README.
