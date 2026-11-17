# Random Games — desktop app

A [Wails](https://wails.io) (Go + native webview) wrapper around the games in this repo. It adds:

- **High Scores tab** — a table for every game, saved to a file on your computer
- **Saved chess games** — saved as standard algebraic notation (PGN) and replayable move by move

The games themselves are the same HTML files used on GitHub Pages; the app copies them in at build time.

## Where your data lives

| File | Contents | Location |
|---|---|---|
| `scores.json` | high-score tables | `RandomGames/` inside your OS config folder |
| `saves.json` | saved chess games (PGN) | same folder |

Config folder: `~/Library/Application Support` (macOS), `%AppData%` (Windows), `~/.config` (Linux).
The High Scores tab shows the exact path. Game settings and chip totals are kept in the app's own web storage.

## Build it yourself

You need Go, the Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.1`) and your
platform's build tools ([Wails requirements](https://wails.io/docs/gettingstarted/installation)).

```bash
cd wails-app
./sync-games.sh          # copy the games into frontend/dist/games (re-run after editing a game)
wails dev                # live development window
wails build              # release build -> build/bin/
go test ./internal/...   # unit tests for the score and save stores
```

On Windows run `sync-games.sh` from Git Bash.

## Releases

Pushing a version tag builds the app for Windows, macOS and Linux and attaches the downloads to a GitHub Release:

```bash
git tag -a v1.0.0 -m "First desktop release"
git push origin v1.0.0
```

| Platform | Files |
|---|---|
| Windows | `RandomGames-windows-amd64-setup.exe` (installer), `RandomGames-windows-amd64-portable.zip` |
| macOS | `RandomGames-macos-universal.dmg` (drag to Applications) |
| Linux | `RandomGames-linux-amd64.deb`, `RandomGames-linux-amd64.tar.gz` |

The workflow is `.github/workflows/release-app.yml`; the `.dmg` and `.deb` are made by `scripts/make-dmg.sh` and
`scripts/make-deb.sh`, and the Windows installer comes from Wails' NSIS templates in `build/windows/installer/`.
You can also run it by hand from the Actions tab ("Run workflow"); that builds everything and keeps the files as
run artifacts without creating a release. The version in the tag is stamped into the app.

Builds are **unsigned**:

- **macOS:** right-click the app → Open the first time, or run `xattr -dr com.apple.quarantine /Applications/RandomGames.app`.
- **Windows:** SmartScreen may warn; choose *More info → Run anyway*. Needs the WebView2 runtime (included in Windows 11 and current Windows 10; the installer fetches it if missing).
- **Linux:** the `.deb` depends on GTK 3 and WebKitGTK 4.1 (`sudo apt install ./RandomGames-linux-amd64.deb` pulls them in).

## How scores work

Games call `RGScores.report(...)` (see `../scores.js`). Inside the app the game runs in an iframe and passes
the result up to the shell, which forwards it to Go. On the web the same call stores results in `localStorage`
and nothing else happens. Games currently reporting scores: Minesweeper, Solitaire, Blackjack, Poker, Slots, Dice, Roulette, Checkers, Chess and Ultimate Tic-Tac-Toe.
