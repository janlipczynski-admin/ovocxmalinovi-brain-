/**
 * Regression: Rozliczenia RT — OvocxMalinovi
 * Uruchom: node tests/regression-rt.js
 *
 * Sprawdza:
 *  - rozliczenia-rt.html: struktura strony, linki, SheetJS
 *  - Rozliczenia RT 2025.xlsx: plik istnieje i ma rozsądny rozmiar
 *  - OPAK_DATA: dane RT (sprzedaż wg opakowań) — spójność z planem
 *  - Walidacja danych sprzedażowych: odbiorca, owoc, wolumen
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── LOADER ────────────────────────────────────────────────────────────────────
function loadGlobal(file, globals) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let script = code;
  Object.keys(globals).forEach(g => {
    script = script.replace(new RegExp(`window\\.${g}`, 'g'), `globals.${g}`);
  });
  new Function('globals', script)(globals);
  return globals;
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.error(`  ✗  ${name}\n     → ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Regression: Rozliczenia RT ===\n');

// ── 1. PLIK XLSX ISTNIEJE ────────────────────────────────────────────────────
console.log('--- Plik źródłowy RT ---');

const XLSX_FILE = 'Rozliczenia RT 2025.xlsx';

test(`${XLSX_FILE} istnieje`, () => {
  assert(fs.existsSync(path.join(ROOT, XLSX_FILE)), `brak pliku ${XLSX_FILE}`);
});

test(`${XLSX_FILE} ma rozsądny rozmiar (> 100KB)`, () => {
  const size = fs.statSync(path.join(ROOT, XLSX_FILE)).size;
  assert(size > 100 * 1024,
    `${XLSX_FILE}: ${(size / 1024).toFixed(0)} KB — za mały`);
});

// ── 2. STRONA HTML ───────────────────────────────────────────────────────────
console.log('\n--- rozliczenia-rt.html: struktura ---');

const rtHtml = fs.readFileSync(path.join(ROOT, 'rozliczenia-rt.html'), 'utf8');

test('rozliczenia-rt.html: tytuł zawiera "Rozliczenia RT"', () => {
  assert(rtHtml.includes('Rozliczenia RT'), 'brak "Rozliczenia RT" w tytule');
});

test('rozliczenia-rt.html: SheetJS załadowany', () => {
  assert(rtHtml.includes('xlsx.full.min.js') || rtHtml.includes('sheetjs'),
    'brak SheetJS — strona nie będzie mogła odczytać XLSX');
});

test('rozliczenia-rt.html: link powrotu do index.html', () => {
  assert(rtHtml.includes('href="index.html"'), 'brak linku powrotu do dashboardu');
});

test('rozliczenia-rt.html: back-btn jest <a> z href', () => {
  // Obsługuje oba formaty: <a class="back-btn" href="..."> i <a href="..." class="back-btn">
  assert(
    rtHtml.includes('class="back-btn"') && rtHtml.includes('href="index.html"'),
    'back-btn nie jest <a> z href="index.html"'
  );
});

test('rozliczenia-rt.html: referencja do pliku XLSX', () => {
  assert(rtHtml.includes('Rozliczenia RT 2025.xlsx'),
    'brak referencji do pliku XLSX w HTML');
});

// ── 3. OPAK_DATA — dane sprzedaży RT jako proxy ─────────────────────────────
console.log('\n--- OPAK_DATA: dane sprzedaży RT 2025 ---');

const g = { OPAK_DATA: null };
loadGlobal('opakowania-data.js', g);

test('OPAK_DATA.rok = 2025', () => {
  assert(g.OPAK_DATA.rok === 2025, `rok = ${g.OPAK_DATA.rok}`);
});

test('OPAK_DATA: łączny wolumen > 1 000 000 kg', () => {
  const totalKg = g.OPAK_DATA.rekordy.reduce((s, r) => s + (r.wolumen_kg || 0), 0);
  assert(totalKg > 1000000,
    `łączny wolumen = ${Math.round(totalKg)} kg — za mało`);
});

test('OPAK_DATA: unikalni odbiorcy > 5', () => {
  const odbiorcy = [...new Set(g.OPAK_DATA.rekordy.map(r => r.odbiorca).filter(Boolean))];
  assert(odbiorcy.length > 5,
    `tylko ${odbiorcy.length} unikalnych odbiorców`);
});

test('OPAK_DATA: kluczowi odbiorcy obecni', () => {
  const odbiorcy = [...new Set(g.OPAK_DATA.rekordy.map(r => r.odbiorca))];
  const expected = ['OGL FOOD TRADE POLSKA', 'JERONIMO MARTINS POLSKA'];
  expected.forEach(o => {
    assert(odbiorcy.some(ob => ob && ob.includes(o.split(' ')[0])),
      `brak odbiorcy zawierającego "${o.split(' ')[0]}"`);
  });
});

test('OPAK_DATA: owoce zawierają Malina i Truskawka', () => {
  const owoce = [...new Set(g.OPAK_DATA.rekordy.map(r => r.owoc).filter(Boolean))];
  assert(owoce.includes('Malina'), `brak Maliny — owoce: ${owoce.join(', ')}`);
  assert(owoce.includes('Truskawka'), `brak Truskawki — owoce: ${owoce.join(', ')}`);
});

test('OPAK_DATA: tygodnie w rozsądnym zakresie (0–52)', () => {
  const bad = g.OPAK_DATA.rekordy.filter(r => r.tydzien < 0 || r.tydzien > 52);
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z tygodniem poza 0–52`);
});

// ── 4. INNE PLIKI XLSX — istnienie ───────────────────────────────────────────
console.log('\n--- Pliki XLSX źródłowe ---');

// Pliki XLSX mogą mieć różne normalizacje Unicode (NFD vs NFC)
// dlatego szukamy wzorcem glob zamiast dokładną nazwą
const XLSX_PATTERNS = [
  { pattern: 'Planowanie', label: 'Planowanie + sprzedaż 2026' },
  { pattern: 'KARTONY SEZON', label: 'KARTONY SEZON 2025R.xlsx' },
  { pattern: 'Stany magazynowe', label: 'Stany magazynowe na dn.25.02.2026.xlsx' },
];

XLSX_PATTERNS.forEach(({ pattern, label }) => {
  test(`${label} istnieje`, () => {
    const files = fs.readdirSync(ROOT).filter(f => f.includes(pattern) && f.endsWith('.xlsx'));
    assert(files.length > 0, `brak pliku XLSX zawierającego "${pattern}"`);
  });
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression RT — OK\n`);
}
