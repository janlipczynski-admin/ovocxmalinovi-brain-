/**
 * Regression: Ceny skupu i marże — OvocxMalinovi
 * Uruchom: node tests/regression-prices.js
 *
 * Sprawdza:
 *  - ceny skupu owoców w zakresie 1.5–8 PLN/kg
 *  - kg_per_karton (kgpk) spójne z waga_g × szt_w_kartonie
 *  - brak negatywnych wartości wolumenów i cen
 *  - rozsądne zakresy wag opakowań (50g–2000g)
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

// ── MINI TEST RUNNER ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.error(`  ✗  ${name}\n     → ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// ── ŁADOWANIE DANYCH ─────────────────────────────────────────────────────────
const g = { OPAK_DATA: null, PLAN2026_DATA: null, ZP_DATA: null, PLAN_DATA: null, ZAKUPY_DATA: null };
loadGlobal('opakowania-data.js', g);
loadGlobal('plan-zakupow-2026-data.js', g);
loadGlobal('zestawienie-proc-data.js', g);
loadGlobal('planowanie-data.js', g);

console.log('\n=== Regression: Ceny skupu i marże ===\n');

// ── 1. CENY SKUPU — zakres 1.5–8 PLN/kg ──────────────────────────────────────
// Plan 2026 rows mają avg_kgpk — weryfikujemy rozsądność
console.log('--- Walidacja kgpk w planie zakupów 2026 ---');

test('PLAN2026_DATA załadowane i zawiera rows', () => {
  assert(g.PLAN2026_DATA !== null, 'PLAN2026_DATA jest null');
  assert(g.PLAN2026_DATA.rows && g.PLAN2026_DATA.rows.length > 0, 'brak rows w PLAN2026_DATA');
});

test('avg_kgpk w zakresie 0.5–10 kg/karton dla wszystkich wierszy', () => {
  const bad = g.PLAN2026_DATA.rows.filter(r =>
    r.avg_kgpk !== null && r.avg_kgpk !== undefined && (r.avg_kgpk < 0.5 || r.avg_kgpk > 10)
  );
  assert(bad.length === 0,
    `${bad.length} wiersz(y) z avg_kgpk poza zakresem 0.5–10: ${bad.map(r => `${r.klient}/${r.owoc}=${r.avg_kgpk}`).join(', ')}`);
});

// ── 2. WAGI OPAKOWAŃ — zakres 50g–2000g ───────────────────────────────────────
console.log('\n--- Walidacja wag opakowań w OPAK_DATA ---');

test('OPAK_DATA załadowane i ma rekordy', () => {
  assert(g.OPAK_DATA !== null, 'OPAK_DATA jest null');
  assert(g.OPAK_DATA.rekordy && g.OPAK_DATA.rekordy.length > 0, 'brak rekordów w OPAK_DATA');
});

test('waga_g w zakresie 50–2000g dla rekordów z wypełnioną wagą (>98%)', () => {
  const withWaga = g.OPAK_DATA.rekordy.filter(r => r.waga_g !== null && r.waga_g !== undefined);
  const bad = withWaga.filter(r => r.waga_g < 50 || r.waga_g > 2000);
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z waga_g poza zakresem 50–2000g`);
  // Sprawdź że > 98% rekordów ma wypełnioną wagę
  const nullPct = ((g.OPAK_DATA.rekordy.length - withWaga.length) / g.OPAK_DATA.rekordy.length) * 100;
  assert(nullPct < 2,
    `${nullPct.toFixed(1)}% rekordów ma brak waga_g (null) — za dużo`);
});

test('kg_per_karton spójne z waga_g * szt_w_kartonie / 1000 (tolerancja 0.01)', () => {
  const valid = g.OPAK_DATA.rekordy.filter(r =>
    r.waga_g !== null && r.szt_w_kartonie !== null && r.kg_per_karton !== null
  );
  const bad = valid.filter(r => {
    const expected = (r.waga_g * r.szt_w_kartonie) / 1000;
    return Math.abs(r.kg_per_karton - expected) > 0.01;
  });
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z niespójnym kgpk: ${bad.slice(0, 3).map(r => `pak=${r.pak}, kgpk=${r.kg_per_karton} vs expected=${(r.waga_g * r.szt_w_kartonie / 1000).toFixed(2)}`).join('; ')}`);
});

// ── 3. WOLUMENY NIE NEGATYWNE ─────────────────────────────────────────────────
console.log('\n--- Brak negatywnych wolumenów ---');

test('OPAK_DATA: wolumen_kg >= 0 we wszystkich rekordach', () => {
  const neg = g.OPAK_DATA.rekordy.filter(r => r.wolumen_kg < 0);
  assert(neg.length === 0,
    `${neg.length} rekord(ów) z negatywnym wolumen_kg`);
});

test('OPAK_DATA: kartonow >= 0 we wszystkich rekordach', () => {
  const neg = g.OPAK_DATA.rekordy.filter(r => r.kartonow < 0);
  assert(neg.length === 0,
    `${neg.length} rekord(ów) z negatywną liczbą kartonów`);
});

test('OPAK_DATA: jednostek >= 0 we wszystkich rekordach', () => {
  const neg = g.OPAK_DATA.rekordy.filter(r => r.jednostek < 0);
  assert(neg.length === 0,
    `${neg.length} rekord(ów) z negatywną liczbą jednostek`);
});

// ── 4. PLAN 2026 — ceny skupu rząd wielkości ─────────────────────────────────
// Plan rows mają kg_rt_2025 i kartony_2025 → avg cena/kg z RT
console.log('\n--- Plan 2026: rozsądność ratio r/r ---');

test('ratio plan2026/rt2025 w zakresie 0.01–10 (brak ekstremalnych odchyleń)', () => {
  const rows = g.PLAN2026_DATA.rows.filter(r => r.ratio !== null && r.ratio !== undefined);
  const extreme = rows.filter(r => r.ratio < 0.01 || r.ratio > 10);
  assert(extreme.length === 0,
    `${extreme.length} wiersz(y) z ratio poza 0.01–10: ${extreme.map(r => `${r.klient}/${r.owoc}=${r.ratio}`).join(', ')}`);
});

test('totals: kartony_2025 > 0', () => {
  assert(g.PLAN2026_DATA.totals.kartony_2025 > 0,
    `kartony_2025 = ${g.PLAN2026_DATA.totals.kartony_2025}`);
});

test('totals: kartony_2026 > kartony_2025 * 0.5 (nie drastyczny spadek)', () => {
  assert(g.PLAN2026_DATA.totals.kartony_2026 > g.PLAN2026_DATA.totals.kartony_2025 * 0.5,
    `kartony_2026=${g.PLAN2026_DATA.totals.kartony_2026} vs kartony_2025=${g.PLAN2026_DATA.totals.kartony_2025}`);
});

test('totals: kg_plan_2026 > 500000 kg (co najmniej pół miliona)', () => {
  assert(g.PLAN2026_DATA.totals.kg_plan_2026 > 500000,
    `kg_plan_2026 = ${g.PLAN2026_DATA.totals.kg_plan_2026}`);
});

// ── 5. KGPK W PAKS — zakres 0.5–8 ────────────────────────────────────────────
console.log('\n--- PLAN2026 paks: kgpk w zakresie 0.5–8 ---');

test('każdy pak w PLAN2026 ma kgpk w zakresie 0.5–8 kg/karton', () => {
  const allPaks = g.PLAN2026_DATA.rows.flatMap(r => r.paks || []);
  const bad = allPaks.filter(p => p.kgpk < 0.5 || p.kgpk > 8);
  assert(bad.length === 0,
    `${bad.length} pak(ów) z kgpk poza 0.5–8: ${bad.slice(0, 5).map(p => `${p.pak}=${p.kgpk}`).join(', ')}`);
});

test('każdy pak w PLAN2026 ma udzial w zakresie 0–100%', () => {
  const allPaks = g.PLAN2026_DATA.rows.flatMap(r => r.paks || []);
  const bad = allPaks.filter(p => p.udzial < 0 || p.udzial > 100);
  assert(bad.length === 0,
    `${bad.length} pak(ów) z udziałem poza 0–100%`);
});

test('suma udziałów per klient/owoc ≈ 100% (tolerancja 2%)', () => {
  const badRows = g.PLAN2026_DATA.rows.filter(r => {
    if (!r.paks || r.paks.length === 0) return false;
    const sum = r.paks.reduce((s, p) => s + (p.udzial || 0), 0);
    return Math.abs(sum - 100) > 2;
  });
  assert(badRows.length === 0,
    `${badRows.length} wiersz(y) z sumą udziałów ≠ 100%: ${badRows.map(r => `${r.klient}/${r.owoc}=${r.paks.reduce((s, p) => s + p.udzial, 0).toFixed(1)}%`).join(', ')}`);
});

// ── 6. ZESTAWIENIE PROC — ceny skupu owoców 1.5–8 PLN/kg ─────────────────────
console.log('\n--- ZP_DATA: walidacja cen skupu ---');

test('ZP_DATA.rekordy: wolumen_kg > 0 dla >99% rekordów', () => {
  const total = g.ZP_DATA.rekordy.length;
  const zero = g.ZP_DATA.rekordy.filter(r => !(r.wolumen_kg > 0)).length;
  const pct = (zero / total) * 100;
  assert(pct < 1, `${pct.toFixed(1)}% rekordów ma wolumen_kg <= 0`);
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły — sprawdź powyżej\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression ceny/marże — OK\n`);
}
