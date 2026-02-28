/**
 * Regression: Stany magazynowe — OvocxMalinovi
 * Uruchom: node tests/regression-inventory.js
 *
 * Sprawdza:
 *  - STANY_DATA: integralność stanów magazynowych
 *  - ZAKUPY_DATA.stany: spójność z danymi magazynowymi
 *  - ZUZYCIE_DATA: zużycie materiałów 2025
 *  - walidacja wartości, magazynów, grup
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

// ── ŁADOWANIE DANYCH ─────────────────────────────────────────────────────────
const g = { STANY_DATA: null, ZAKUPY_DATA: null, ZUZYCIE_DATA: null };
loadGlobal('stany-data.js', g);
loadGlobal('zakupy-data.js', g);
loadGlobal('zuzycie-data.js', g);

console.log('\n=== Regression: Stany magazynowe ===\n');

// ── 1. STANY_DATA — struktura ─────────────────────────────────────────────────
console.log('--- STANY_DATA: struktura ---');

test('STANY_DATA załadowane', () => {
  assert(g.STANY_DATA !== null, 'STANY_DATA jest null');
});

test('STANY_DATA.magazyny: 4 magazyny', () => {
  assert(g.STANY_DATA.magazyny.length === 4,
    `${g.STANY_DATA.magazyny.length} magazynów: ${g.STANY_DATA.magazyny.join(', ')}`);
});

const EXPECTED_MAGAZYNY = ['Chodzież', 'Łobżenica', 'Stróżewo', 'Wyszynki'];

test('STANY_DATA: zawiera wymagane magazyny', () => {
  const missing = EXPECTED_MAGAZYNY.filter(m => !g.STANY_DATA.magazyny.includes(m));
  assert(missing.length === 0, `brak magazynów: ${missing.join(', ')}`);
});

test('STANY_DATA.rekordy: co najmniej 100 pozycji', () => {
  assert(g.STANY_DATA.rekordy.length >= 100,
    `tylko ${g.STANY_DATA.rekordy.length} rekordów`);
});

// ── 2. STANY — walidacja wartości ─────────────────────────────────────────────
console.log('\n--- STANY_DATA: walidacja wartości ---');

test('stan >= 0 we wszystkich rekordach', () => {
  const neg = g.STANY_DATA.rekordy.filter(r => r.stan < 0);
  assert(neg.length === 0,
    `${neg.length} rekord(ów) z negatywnym stanem: ${neg.slice(0, 3).map(r => `${r.indeks}@${r.magazyn}=${r.stan}`).join(', ')}`);
});

test('wartosc >= 0 we wszystkich rekordach', () => {
  const neg = g.STANY_DATA.rekordy.filter(r => r.wartosc < 0);
  assert(neg.length === 0,
    `${neg.length} rekord(ów) z negatywną wartością`);
});

test('każdy rekord ma magazyn z listy', () => {
  const bad = g.STANY_DATA.rekordy.filter(r => !EXPECTED_MAGAZYNY.includes(r.magazyn));
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z nieznanym magazynem: ${[...new Set(bad.map(r => r.magazyn))].join(', ')}`);
});

// ── 3. STANY — grupy produktów ────────────────────────────────────────────────
console.log('\n--- STANY_DATA: grupy produktów ---');

const EXPECTED_GRUPY = ['Etykiety', 'Opakowania-Jednostkowe', 'Opakowania-Transportowe', 'Opakowania-Zbiorcze'];

test('STANY_DATA.grupy: co najmniej 4 główne grupy', () => {
  assert(g.STANY_DATA.grupy.length >= 4,
    `tylko ${g.STANY_DATA.grupy.length} grup`);
});

EXPECTED_GRUPY.forEach(grupa => {
  test(`grupa "${grupa}" ma rekordy`, () => {
    const count = g.STANY_DATA.rekordy.filter(r => r.nazwa_grupy === grupa).length;
    assert(count > 0, `0 rekordów dla grupy ${grupa}`);
  });
});

// ── 4. STANY — kluczowe kartony na stanie ────────────────────────────────────
console.log('\n--- STANY_DATA: kluczowe kartony ---');

const KLUCZOWE_KARTONY = [
  'K-369X285X84',     // Mały czarny
  'K-400X300X90',     // Mały zielony
  'K-580X390X90',     // Duży czarny składany
  'K-600X400X100',    // Duży czarny klejony
];

KLUCZOWE_KARTONY.forEach(indeks => {
  test(`karton ${indeks} na stanie`, () => {
    const recs = g.STANY_DATA.rekordy.filter(r => r.indeks === indeks);
    assert(recs.length > 0, `brak kartonu ${indeks} w stanach`);
    const totalStan = recs.reduce((s, r) => s + r.stan, 0);
    assert(totalStan > 0, `${indeks}: łączny stan = 0`);
  });
});

// ── 5. STANY — sumaryczna wartość ─────────────────────────────────────────────
console.log('\n--- STANY_DATA: wartość sumaryczna ---');

test('łączna wartość stanów > 100 000 PLN', () => {
  const total = g.STANY_DATA.rekordy.reduce((s, r) => s + (r.wartosc || 0), 0);
  assert(total > 100000,
    `łączna wartość = ${total.toFixed(0)} PLN — podejrzanie niska`);
});

// ── 6. ZAKUPY_DATA.stany — spójność z STANY_DATA ─────────────────────────────
console.log('\n--- ZAKUPY_DATA.stany: spójność ---');

test('ZAKUPY_DATA.stany załadowane i nie jest puste', () => {
  assert(g.ZAKUPY_DATA.stany && g.ZAKUPY_DATA.stany.length > 0,
    'ZAKUPY_DATA.stany puste');
});

test('ZAKUPY_DATA.stany: kategorie zawierają kartony i etykiety', () => {
  const kats = [...new Set(g.ZAKUPY_DATA.stany.map(s => s.kategoria))];
  assert(kats.includes('kartony'), `brak kategorii 'kartony' — dostępne: ${kats.join(', ')}`);
  assert(kats.includes('etykiety'), `brak kategorii 'etykiety' — dostępne: ${kats.join(', ')}`);
});

test('ZAKUPY_DATA.stany: total >= 0 we wszystkich rekordach', () => {
  const neg = g.ZAKUPY_DATA.stany.filter(s => s.total < 0);
  assert(neg.length === 0, `${neg.length} pozycji z total < 0`);
});

// ── 7. ZUZYCIE_DATA — dane historyczne ────────────────────────────────────────
console.log('\n--- ZUZYCIE_DATA: dane historyczne ---');

test('ZUZYCIE_DATA załadowane', () => {
  assert(g.ZUZYCIE_DATA !== null, 'ZUZYCIE_DATA jest null');
});

test('ZUZYCIE_DATA.rekordy: co najmniej 100 pozycji', () => {
  assert(g.ZUZYCIE_DATA.rekordy.length >= 100,
    `tylko ${g.ZUZYCIE_DATA.rekordy.length} rekordów`);
});

test('ZUZYCIE_DATA.rekordy: ilosc > 0 w rekordach', () => {
  const neg = g.ZUZYCIE_DATA.rekordy.filter(r => r.ilosc <= 0);
  assert(neg.length === 0,
    `${neg.length} rekord(ów) z ilosc <= 0`);
});

test('ZUZYCIE_DATA.rekordy: miesiące w zakresie 1–12', () => {
  const bad = g.ZUZYCIE_DATA.rekordy.filter(r => r.miesiac < 1 || r.miesiac > 12);
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z miesiącem poza 1–12`);
});

test('ZUZYCIE_DATA.magazyny: zawiera Chodzież i Łobżenica', () => {
  assert(g.ZUZYCIE_DATA.magazyny.includes('Chodzież'), 'brak magazynu Chodzież');
  assert(g.ZUZYCIE_DATA.magazyny.includes('Łobżenica'), 'brak magazynu Łobżenica');
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression stany magazynowe — OK\n`);
}
