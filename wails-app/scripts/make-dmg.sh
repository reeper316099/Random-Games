#!/usr/bin/env bash
# Builds a drag-to-Applications .dmg from build/bin/RandomGames.app.
# Usage: scripts/make-dmg.sh <output.dmg>
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:?usage: make-dmg.sh <output.dmg>}"
APP="build/bin/RandomGames.app"
[ -d "$APP" ] || { echo "missing $APP — run 'wails build' first" >&2; exit 1; }

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
hdiutil create -volname "Random Games" -srcfolder "$STAGE" -ov -format UDZO "$OUT" >/dev/null
echo "Created $OUT"
