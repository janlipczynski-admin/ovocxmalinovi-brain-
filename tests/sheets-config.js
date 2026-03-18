/**
 * Test Data Layer — OvocxMalinovi
 * Uruchom: node tests/sheets-config.js
 *
 * Sprawdza:
 *  1. js/sheets.js istnieje z poprawną konfiguracją (używany przez os-malinovi.html itp.)
 *  2. index.html v2 — Supabase data layer (nie Google Sheets)
 *  3. Brak hardcoded fake wartości w SVG w index.html
 *  4. Eksport funkcji pomocniczych sheets.js działa poprawnie
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const SHEETS = fs.readFileSync(path.join(ROOT, 'js/sheets.js'), 'utf8');
const HTML   = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let passed = 0, failed = 0;

function test(name, fn) {
  try   { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.error(`  ✗  ${name}\n     → ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'failed'); }
function assertIn(str, src, label) {
  assert(src.includes(str), `Brak "${str}" — ${label}`);
}
function assertNotIn(str, src, label) {
  assert(!src.includes(str), `Znaleziono zakazane "${str}" — ${label}`);
}

console.log('\n=== Data Layer — test konfiguracji ===\n');

// ── 1. js/sheets.js — używany przez os-malinovi.html i inne ──────────────────
test('sheets.js istnieje', () =>
  assert(fs.existsSync(path.join(ROOT, 'js/sheets.js')), 'Brak pliku js/sheets.js'));

test('sheets.js — ID arkusza Google Sheets obecny', () =>
  assertIn('1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ', SHEETS, 'ID arkusza 2026_Ovocxmalinovi_dashboard'));

test('sheets.js — fetchGviz() zdefiniowany', () =>
  assertIn('fetchGviz', SHEETS, 'Funkcja pobierania danych z gviz'));

test('sheets.js — arcDash() zdefiniowany', () =>
  assertIn('arcDash', SHEETS, 'Funkcja obliczająca łuk SVG'));

test('sheets.js — initDashboard() zdefiniowany', () =>
  assertIn('initDashboard', SHEETS, 'Funkcja inicjalizacji dashboardu'));

// ── 2. Testy jednostkowe funkcji sheets.js ───────────────────────────────────
test('arcDash(27, 0) → "0.0 ..."', () => {
  const { arcDash } = require('../js/sheets.js');
  const result = arcDash(27, 0);
  assert(result.startsWith('0.0'), `Oczekiwano "0.0 ...", dostano "${result}"`);
});

test('arcDash(27, 100) → pełne kółko', () => {
  const { arcDash } = require('../js/sheets.js');
  const [fill, gap] = arcDash(27, 100).split(' ').map(Number);
  const c = 2 * Math.PI * 27;
  assert(Math.abs(fill - c) < 0.5 && gap < 0.5,
    `Oczekiwano pełnego kółka ~${c.toFixed(1)}, dostano fill=${fill}`);
});

test('arcDash(27, 50) → połowa kółka', () => {
  const { arcDash } = require('../js/sheets.js');
  const [fill, gap] = arcDash(27, 50).split(' ').map(Number);
  assert(Math.abs(fill - gap) < 1,
    `Dla 50% fill (${fill}) powinien być ~równy gap (${gap})`);
});

test('clampPct — wartości poza zakresem', () => {
  const { clampPct } = require('../js/sheets.js');
  assert(clampPct(-10) === 0,   'clampPct(-10) powinno być 0');
  assert(clampPct(150) === 100, 'clampPct(150) powinno być 100');
  assert(clampPct(null) === 0,  'clampPct(null) powinno być 0');
  assert(clampPct('45') === 45, 'clampPct("45") powinno być 45');
});

test('formatPLN — formatowanie kwot', () => {
  const { formatPLN } = require('../js/sheets.js');
  assert(formatPLN(600000)  === '600k', `600k: "${formatPLN(600000)}"`);
  assert(formatPLN(1500000) === '1.5M', `1.5M: "${formatPLN(1500000)}"`);
  assert(formatPLN(0)       === '0',    `0: "${formatPLN(0)}"`);
});

// ── 3. index.html v2 — Supabase data layer ───────────────────────────────────
test('index.html — Supabase URL (nie Google Sheets)', () =>
  assertIn('fssfuricylndtetfktex.supabase.co', HTML, 'index.html musi używać Supabase'));

test('index.html — sbGet() jako główna funkcja danych', () =>
  assertIn('sbGet', HTML, 'Brak funkcji sbGet w index.html'));

test('index.html — calcWigScore() zdefiniowany', () =>
  assertIn('calcWigScore', HTML, 'Brak funkcji calcWigScore'));

test('index.html — wig-grid istnieje', () =>
  assertIn('wig-grid', HTML, 'Brak struktury wig-grid'));

// ── 4. Brak hardcoded wartości SVG w index.html ───────────────────────────────
test('index.html — brak hardcoded stroke-dasharray', () => {
  const hc = (HTML.match(/stroke-dasharray="\d+\.\d+ \d+\.\d+"/g) || []).length;
  assert(hc === 0, `Znaleziono ${hc} hardcoded stroke-dasharray — dane muszą być dynamiczne`);
});

test('index.html — brak stale gear-os-* IDs (stara architektura)', () =>
  assertNotIn('id="gear-os-main"', HTML, 'Stare ID sheets.js — powinno być zastąpione Supabase'));

test('index.html — brak paska bar-os-stanowiska (stara wersja)', () =>
  assertNotIn('id="bar-os-stanowiska"', HTML, 'Stary pasek postępu — usunąć'));

test('index.html — brak tickerInner (stary komponent)', () =>
  assertNotIn('tickerInner', HTML, 'Stary ticker giełdowy — usunąć'));

// ── Podsumowanie ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error('\n⛔  Sheets Data Layer niezgodny — nie commituj!\n');
  process.exit(1);
} else {
  console.log('\n✅  Data Layer OK — Supabase v2 + sheets.js (legacy pages)\n');
}
