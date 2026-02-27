#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# OvocxMalinovi — pełny runner testów
# Uruchom z katalogu repozytorium: bash tests/run-all.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")/.."

echo ""
echo "████████████████████████████████████████████████████████"
echo "  OvocxMalinovi — Suite Testów                          "
echo "████████████████████████████████████████████████████████"

echo ""
echo "▶  [1/3] Dane (smoke.js)"
node tests/smoke.js

echo ""
echo "▶  [2/3] Dashboard WIG (dashboard.js)"
node tests/dashboard.js

echo ""
echo "▶  [3/3] Nawigacja i linki (navigation.js)"
node tests/navigation.js

echo ""
echo "████████████████████████████████████████████████████████"
echo "  ✅  Wszystkie 3 suite'y przeszły — można commitować    "
echo "████████████████████████████████████████████████████████"
echo ""
