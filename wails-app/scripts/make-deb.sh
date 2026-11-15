#!/usr/bin/env bash
# Builds a .deb from the Linux binary in build/bin/RandomGames.
# Usage: scripts/make-deb.sh <version> <output.deb>      (version like 1.0.0, must start with a digit)
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?usage: make-deb.sh <version> <output.deb>}"
OUT="${2:?usage: make-deb.sh <version> <output.deb>}"
BIN="build/bin/RandomGames"
[ -f "$BIN" ] || { echo "missing $BIN — run 'wails build' first" >&2; exit 1; }

PKG="$(mktemp -d)"
trap 'rm -rf "$PKG"' EXIT
install -Dm755 "$BIN" "$PKG/usr/bin/random-games"
install -Dm644 build/appicon.png "$PKG/usr/share/icons/hicolor/512x512/apps/random-games.png"

mkdir -p "$PKG/usr/share/applications"
cat > "$PKG/usr/share/applications/random-games.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Random Games
Comment=A collection of games with a shared high-score table
Exec=random-games
Icon=random-games
Categories=Game;
Terminal=false
DESKTOP

mkdir -p "$PKG/DEBIAN"
cat > "$PKG/DEBIAN/control" <<CONTROL
Package: random-games
Version: ${VERSION}
Section: games
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libwebkit2gtk-4.1-0
Maintainer: Random Games <noreply@users.noreply.github.com>
Description: Random Games
 A collection of browser games (chess, blackjack, poker, solitaire, minesweeper and more)
 with a shared high-score table and saved, replayable chess games.
CONTROL

mkdir -p "$(dirname "$OUT")"
dpkg-deb --root-owner-group --build "$PKG" "$OUT" >/dev/null
echo "Created $OUT"
