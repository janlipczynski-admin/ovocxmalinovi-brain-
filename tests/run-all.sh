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
echo "▶  [1/9] Dane (smoke.js)"
node tests/smoke.js

echo ""
echo "▶  [2/9] Dashboard WIG (dashboard.js)"
node tests/dashboard.js

echo ""
echo "▶  [3/9] Nawigacja i linki (navigation.js)"
node tests/navigation.js

echo ""
echo "▶  [4/9] Regression: Ceny i marże (regression-prices.js)"
node tests/regression-prices.js

echo ""
echo "▶  [5/9] Regression: Plany ilościowe (regression-plan.js)"
node tests/regression-plan.js

echo ""
echo "▶  [6/9] Regression: Dostawcy i mapa kartonów (regression-suppliers.js)"
node tests/regression-suppliers.js

echo ""
echo "▶  [7/9] Regression: Stany magazynowe (regression-inventory.js)"
node tests/regression-inventory.js

echo ""
echo "▶  [8/9] Regression: Spójność między plikami (regression-crossfile.js)"
node tests/regression-crossfile.js

echo ""
echo "▶  [9/9] Regression: Dashboard rozszerzony (regression-crossfile-dashboard.js)"
node tests/regression-crossfile-dashboard.js

echo ""
echo "████████████████████████████████████████████████████████"
echo "  ✅  Wszystkie 9 suite'ów przeszły — można commitować  "
echo "████████████████████████████████████████████████████████"
echo ""
