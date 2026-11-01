#!/usr/bin/env bash
# Builds the card print PDF (front and back, 4 per A4 sheet) with Chrome.
# Usage: ./scripts/build-pdf-chrome.sh   -> creates scenarios/<id>/print/cards-A4.pdf (scenario from scenarios/default.txt)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8765
SCENARIO="${KINDLEWILD_SCENARIO:-$(cat "$ROOT/scenarios/default.txt")}"
OUT="$ROOT/scenarios/$SCENARIO/print/cards-A4.pdf"

cd "$ROOT"
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" "http://localhost:$PORT/site/?scenario=$SCENARIO" 2>/dev/null

echo "PDF built: $OUT"
