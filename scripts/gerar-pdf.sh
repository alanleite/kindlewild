#!/usr/bin/env bash
# Gera o PDF de impressão das cartas (frente e verso, 4 por folha A4) com o Chrome.
# Uso: ./scripts/gerar-pdf.sh   -> cria cenarios/<id>/impressao/cartas-A4.pdf (cenário de cenarios/padrao.txt)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORTA=8765
CENARIO="${KINDLEWILD_CENARIO:-$(cat "$RAIZ/cenarios/padrao.txt")}"
SAIDA="$RAIZ/cenarios/$CENARIO/impressao/cartas-A4.pdf"

cd "$RAIZ"
python3 -m http.server "$PORTA" >/dev/null 2>&1 &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null || true' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$SAIDA" "http://localhost:$PORTA/site/?cenario=$CENARIO" 2>/dev/null

echo "PDF gerado: $SAIDA"
