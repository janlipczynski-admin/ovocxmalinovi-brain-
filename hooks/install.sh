#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Instalator pre-commit hooka — OvocxMalinovi
# Uruchom: bash hooks/install.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")/.."

HOOK_SRC="hooks/pre-commit"
HOOK_DST=".git/hooks/pre-commit"

if [ -f "$HOOK_DST" ]; then
  echo "⚠️  Pre-commit hook już istnieje — nadpisuję..."
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "✅ Pre-commit hook zainstalowany."
echo "   Każdy commit będzie automatycznie sprawdzany testami regresji."
echo "   Aby pominąć (wyjątkowo): git commit --no-verify"
