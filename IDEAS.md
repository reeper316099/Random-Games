# Idea board

Games and features we may build later. Nothing here is started yet.

## Games

- **Video Poker (Jacks or Better)** — 5-card draw against a pay table, play-money chips, hold/draw buttons. Should sit next to Slots and use the shared card look and seasonal themes.
- **Hearts** — 4-player trick-taking game against 3 bots (pass 3 cards, avoid hearts and the Queen of Spades, shoot the moon). Needs a decent bot.
- **Spades** — partnership trick-taking game (bidding, spades as trump, nil bids) against bots. Could share the trick-taking engine with Hearts.

## Notes

- New games follow the usual pattern: one HTML file in `One File Games/`, a back link, `scores.js` + `fx.js` + `themes.js`, a card in `index.html`, an entry in `wails-app/frontend/dist/shell.js`, and a line in the README.
