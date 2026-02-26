#!/usr/bin/env bash
# test-opakowania-2025.sh
# Sprawdza że: (1) opakowania.html to czyste "Opakowania 2025" bez logiki prognoz,
#              (2) zakupy-plan2026.html nie ma żadnych zależności od opakowania.html/opakowania-data.js,
#              (3) index.html poprawnie linkuje i opisuje stronę.

PASS=0; FAIL=0
DIR="$(cd "$(dirname "$0")" && pwd)"

ok()  { echo "  ✓ $1"; PASS=$((PASS+1)); return 0; }
fail(){ echo "  ✗ FAIL: $1"; FAIL=$((FAIL+1)); return 1; }

# ─── HELPERS ────────────────────────────────────────────────────────────────
contains()    { grep -qF "$2" "$1"; }
not_contains(){ ! grep -qF "$2" "$1"; }

# ─── opakowania.html — CO POWINNO BYĆ ───────────────────────────────────────
echo ""
echo "=== opakowania.html: tytuł i skrypty ==="
F="$DIR/opakowania.html"

contains "$F" "<title>Opakowania 2025 — OvocxMalinovi</title>" \
  && ok "Tytuł = 'Opakowania 2025'" \
  || fail "Tytuł nie zmieniony na 'Opakowania 2025'"

not_contains "$F" "2025/2026" \
  && ok "Brak '2025/2026' w pliku" \
  || fail "Zostało '2025/2026' — nie podmieniono wszystkich wystąpień"

not_contains "$F" 'src="planowanie-data.js"' \
  && ok "planowanie-data.js NIE jest ładowany" \
  || fail "planowanie-data.js wciąż załadowany — niepotrzebna zależność"

contains "$F" 'src="opakowania-data.js"' \
  && ok "opakowania-data.js wciąż załadowany (potrzebny)" \
  || fail "opakowania-data.js zniknął — dashboard AI straci kontekst"

# ─── opakowania.html — CO NIE POWINNO BYĆ (prognoza usunięta) ───────────────
echo ""
echo "=== opakowania.html: usunięcie logiki prognoz ==="

not_contains "$F" 'data-tab="prognoza"' \
  && ok "Tab 'Prognoza 2026' usunięty z tab-bara" \
  || fail "Tab 'Prognoza 2026' wciąż w tab-barze"

not_contains "$F" 'data-tab="miesieczna"' \
  && ok "Tab 'Prognoza miesięczna' usunięty z tab-bara" \
  || fail "Tab 'Prognoza miesięczna' wciąż w tab-barze"

not_contains "$F" 'id="tab-prognoza"' \
  && ok "Div #tab-prognoza usunięty (HTML)" \
  || fail "Div #tab-prognoza wciąż w HTML"

not_contains "$F" 'id="tab-miesieczna"' \
  && ok "Div #tab-miesieczna usunięty (HTML)" \
  || fail "Div #tab-miesieczna wciąż w HTML"

not_contains "$F" 'function renderPrognoza' \
  && ok "JS renderPrognoza() usunięty" \
  || fail "JS renderPrognoza() wciąż w pliku"

not_contains "$F" 'function renderMiesieczna\|function renderMies' \
  && ok "JS renderMiesieczna() usunięty" \
  || fail "JS renderMiesieczna() wciąż w pliku"

not_contains "$F" 'TAB 3: PROGNOZA' \
  && ok "Komentarz 'TAB 3: PROGNOZA' usunięty" \
  || fail "Komentarz 'TAB 3: PROGNOZA' wciąż w pliku"

not_contains "$F" 'TAB 4: PROGNOZA' \
  && ok "Komentarz 'TAB 4: PROGNOZA' usunięty" \
  || fail "Komentarz 'TAB 4: PROGNOZA' wciąż w pliku"

# ─── opakowania.html — taby które MUSZĄ zostać ──────────────────────────────
echo ""
echo "=== opakowania.html: taby które muszą zostać ==="

contains "$F" 'data-tab="zestawienie"' \
  && ok "Tab 'Zestawienie 2025' istnieje" \
  || fail "Tab 'Zestawienie 2025' zniknął — błąd!"

contains "$F" 'data-tab="odbiorca"' \
  && ok "Tab 'Per odbiorca' istnieje" \
  || fail "Tab 'Per odbiorca' zniknął — błąd!"

contains "$F" 'data-tab="zp2025"' \
  && ok "Tab 'Zest. Proc. 2025' istnieje" \
  || fail "Tab 'Zest. Proc. 2025' zniknął — błąd!"

contains "$F" 'id="tab-zestawienie"' \
  && ok "Div #tab-zestawienie istnieje (HTML)" \
  || fail "Div #tab-zestawienie zniknął — błąd!"

contains "$F" 'id="tab-zp2025"' \
  && ok "Div #tab-zp2025 istnieje (HTML)" \
  || fail "Div #tab-zp2025 zniknął — błąd!"

contains "$F" 'function switchTab' \
  && ok "switchTab() nadal istnieje (nawigacja tabami działa)" \
  || fail "switchTab() zniknął — taby nie będą działać!"

# ─── index.html — opisy zaktualizowane ──────────────────────────────────────
echo ""
echo "=== index.html: aktualizacja opisów ==="
F="$DIR/index.html"

contains "$F" 'Opakowania 2025' \
  && ok "index.html zawiera 'Opakowania 2025'" \
  || fail "index.html nie zawiera 'Opakowania 2025'"

not_contains "$F" 'Opakowania 2025/2026' \
  && ok "Stara nazwa 'Opakowania 2025/2026' usunięta z index.html" \
  || fail "Stara nazwa 'Opakowania 2025/2026' wciąż w index.html"

not_contains "$F" 'prognoza 2026' \
  && ok "Opis 'prognoza 2026' usunięty z index.html" \
  || fail "Opis 'prognoza 2026' wciąż w index.html"

contains "$F" 'href="opakowania.html"' \
  && ok "Link do opakowania.html istnieje w index.html" \
  || fail "Link do opakowania.html zniknął z index.html — błąd!"

contains "$F" 'src="opakowania-data.js"' \
  && ok "opakowania-data.js wciąż ładowany w index.html (kontekst AI)" \
  || fail "opakowania-data.js zniknął z index.html — AI straci kontekst!"

# ─── zakupy-plan2026.html — brak zależności od opakowania.html/data ─────────
echo ""
echo "=== zakupy-plan2026.html: brak zależności od opakowania ==="
F="$DIR/zakupy-plan2026.html"

not_contains "$F" 'src="opakowania-data.js"' \
  && ok "zakupy-plan2026.html NIE importuje opakowania-data.js" \
  || fail "zakupy-plan2026.html importuje opakowania-data.js — nieoczekiwana zależność"

not_contains "$F" 'href="opakowania.html"' \
  && ok "zakupy-plan2026.html NIE linkuje do opakowania.html" \
  || fail "zakupy-plan2026.html linkuje do opakowania.html — sprawdź czy to celowe"

not_contains "$F" 'OPAK_DATA' \
  && ok "zakupy-plan2026.html NIE używa OPAK_DATA" \
  || fail "zakupy-plan2026.html używa OPAK_DATA — nieoczekiwana zależność"

# ─── WYNIK ──────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo "Wynik: $PASS/$TOTAL testów OK"
if [ "$FAIL" -eq 0 ]; then
  echo "Wszystko w porządku."
  exit 0
else
  echo "$FAIL testów NIEUDANYCH."
  exit 1
fi
