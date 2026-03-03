/**
 * Test Google Sheets Data Layer — OvocxMalinovi
 * Uruchom: node tests/sheets-config.js
 *
 * Sprawdza:
 *  1. js/sheets.js istnieje z poprawną konfiguracją
 *  2. index.html ma wymagane IDs dla dynamicznego renderowania
 *  3. Brak hardcoded fake wartości w SVG
 *  4. Eksport funkcji pomocniczych działa poprawnie
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

console.log('\n=== Google Sheets Data Layer — test konfiguracji ===\n');

// ── 1. sheets.js — konfiguracja ───────────────────────────────────────────────
test('sheets.js istnieje', () =>
  assert(fs.existsSync(path.join(ROOT, 'js/sheets.js')), 'Brak pliku js/sheets.js'));

test('SHEETS_CONFIG — ID arkusza obecny', () =>
  assertIn('1LEHtdzY-vVbNw4riaCL3DZ6qa7NQgTix5ra9w_kfvoY', SHEETS, 'ID arkusza WIG Scoreboard'));

test('SHEETS_CONFIG — zakładka DASHBOARD', () =>
  assertIn("'DASHBOARD'", SHEETS, 'Nazwa zakładki DASHBOARD'));

test('EXPECTED_KEYS — klucze danych zdefiniowane', () =>
  assertIn('EXPECTED_KEYS', SHEETS, 'Lista oczekiwanych kluczy'));

test('fetchSheetData() — funkcja fetch zdefiniowana', () =>
  assertIn('fetchSheetData', SHEETS, 'Funkcja pobierania danych'));

test('arcDash() — generator stroke-dasharray', () =>
  assertIn('arcDash', SHEETS, 'Funkcja obliczająca łuk SVG'));

test('initDashboard() — funkcja inicjalizująca', () =>
  assertIn('initDashboard', SHEETS, 'Funkcja inicjalizacji dashboardu'));

// ── 2. Jednostkowe testy funkcji pomocniczych ─────────────────────────────────
test('arcDash(27, 0) → "0.0 169.6"', () => {
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
  assert(formatPLN(600000)  === '600k',  `600k: "${formatPLN(600000)}"`);
  assert(formatPLN(1500000) === '1.5M',  `1.5M: "${formatPLN(1500000)}"`);
  assert(formatPLN(0)       === '0',     `0: "${formatPLN(0)}"`);
});

// ── 3. index.html — IDs dla dynamicznego renderowania ────────────────────────

// WIG #1 OS MALINOVI
test('index.html — circle-os-stanowiska (kółko SVG)', () =>
  assertIn('id="circle-os-stanowiska"', HTML, 'ID kółka stanowiska WIG#1'));
test('index.html — text-os-stanowiska (tekst %)', () =>
  assertIn('id="text-os-stanowiska"', HTML, 'ID tekstu stanowiska'));
test('index.html — circle-os-procesy (kółko SVG)', () =>
  assertIn('id="circle-os-procesy"', HTML, 'ID kółka procesy WIG#1'));
test('index.html — text-os-procesy (tekst %)', () =>
  assertIn('id="text-os-procesy"', HTML, 'ID tekstu procesy'));
test('index.html — circle-os-rytm (kółko SVG)', () =>
  assertIn('id="circle-os-rytm"', HTML, 'ID kółka rytm WIG#1'));
test('index.html — text-os-rytm', () =>
  assertIn('id="text-os-rytm"', HTML, 'ID tekstu rytm'));
test('index.html — lag-val-os (liczba ogólna)', () =>
  assertIn('id="lag-val-os"', HTML, 'ID wartości lag WIG#1'));
test('index.html — lag-bar-os (pasek postępu)', () =>
  assertIn('id="lag-bar-os"', HTML, 'ID paska WIG#1'));
test('index.html — raag-os (badge RAAG)', () =>
  assertIn('id="raag-os"', HTML, 'ID odznaki RAAG WIG#1'));
test('index.html — modal-os-stanowiska', () =>
  assertIn('id="modal-os-stanowiska"', HTML, 'ID modal stanowiska'));
test('index.html — modal-os-procesy', () =>
  assertIn('id="modal-os-procesy"', HTML, 'ID modal procesy'));
test('index.html — modal-os-rytm', () =>
  assertIn('id="modal-os-rytm"', HTML, 'ID modal rytm'));

// WIG #2 HARVEST 50
test('index.html — circle-harvest-main (kółko SVG)', () =>
  assertIn('id="circle-harvest-main"', HTML, 'ID kółka harvest'));
test('index.html — lag-val-harvest', () =>
  assertIn('id="lag-val-harvest"', HTML, 'ID wartości lag WIG#2'));
test('index.html — lag-bar-harvest', () =>
  assertIn('id="lag-bar-harvest"', HTML, 'ID paska WIG#2'));

// WIG #3 NO COMPLAINTS
test('index.html — gauge-needle (wskazówka gaugeʼa)', () =>
  assertIn('id="gauge-needle"', HTML, 'ID wskazówki WIG#3'));
test('index.html — text-complaints-val', () =>
  assertIn('id="text-complaints-val"', HTML, 'ID wartości WIG#3'));
test('index.html — lag-val-complaints', () =>
  assertIn('id="lag-val-complaints"', HTML, 'ID lag value WIG#3'));
test('index.html — lag-bar-complaints', () =>
  assertIn('id="lag-bar-complaints"', HTML, 'ID paska WIG#3'));

// WIG #4 PRODUCT X
test('index.html — circle-productx-outer (kółko SVG)', () =>
  assertIn('id="circle-productx-outer"', HTML, 'ID kółka Product X'));
test('index.html — text-productx-pct', () =>
  assertIn('id="text-productx-pct"', HTML, 'ID tekstu % Product X'));
test('index.html — lag-bar-productx', () =>
  assertIn('id="lag-bar-productx"', HTML, 'ID paska WIG#4'));

// Procesy
test('index.html — proc-pill-1 do proc-pill-7 (wszystkie 7)', () => {
  for (let i = 1; i <= 7; i++) {
    assertIn(`id="proc-pill-${i}"`, HTML, `Brak proc-pill-${i}`);
  }
});

// ── 4. Brak hardcoded fake wartości ───────────────────────────────────────────
test('index.html — brak hardcoded dasharray 40% stanowiska', () =>
  assertNotIn('stroke-dasharray="67.9 101.8"', HTML,
    'Stara hardcoded wartość 40% — usuń i zastąp dynamicznym renderem'));

test('index.html — brak hardcoded dasharray 15% procesy', () =>
  assertNotIn('stroke-dasharray="17.9 101.5"', HTML,
    'Stara hardcoded wartość 15% — usuń i zastąp dynamicznym renderem'));

test('index.html — brak hardcoded dasharray 58% harvest', () =>
  assertNotIn('stroke-dasharray="164.3 212.5"', HTML,
    'Stara hardcoded wartość 58% — usuń i zastąp dynamicznym renderem'));

test('index.html — brak hardcoded dasharray 35% productX', () =>
  assertNotIn('stroke-dasharray="143.3 265.1"', HTML,
    'Stara hardcoded wartość 35% — usuń i zastąp dynamicznym renderem'));

// ── 5. sheets.js załadowany w index.html ─────────────────────────────────────
test('index.html — ładuje js/sheets.js', () =>
  assertIn('js/sheets.js', HTML, 'Brak <script src="js/sheets.js"> w index.html'));

// ── Podsumowanie ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error('\n⛔  Sheets Data Layer niezgodny — nie commituj!\n');
  process.exit(1);
} else {
  console.log('\n✅  Sheets Data Layer OK — dane z Google Sheets\n');
}
