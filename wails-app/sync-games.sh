#!/usr/bin/env bash
# Copies the games from the repo root into frontend/dist/games so `wails build` can embed them.
# Run this before `wails dev` / `wails build` (the release workflow does it automatically).
set -euo pipefail
cd "$(dirname "$0")"

SRC=..
DEST=frontend/dist/games

rm -rf "$DEST"
mkdir -p "$DEST"
cp "$SRC/index.html" "$SRC/scores.js" "$SRC/fx.js" "$SRC/themes.js" "$DEST/"
cp -R "$SRC/One File Games" "$SRC/Multi-File Games" "$SRC/vendor" "$DEST/"

# find-based cleanup of macOS metadata that may have been copied along
find "$DEST" -name ".DS_Store" -delete

echo "Synced games into $DEST"
