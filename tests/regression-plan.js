/**
 * Regression: Plany ilościowe i spójność — OvocxMalinovi
 * Uruchom: node tests/regression-plan.js
 *
 * Sprawdza:
 *  - PLAN_DATA: plan sprzedaży 2026 po klientach i producentach
 *  - PLAN2026_DATA: plan zakupów kartonów 2026
 *  - spójność między planem sprzedaży a planem zakupów
 *  - rozsądność ilości (sezon, tygodnie, owoce)
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
const g = { PLAN_DATA: null, PLAN2026_DATA: null };
loadGlobal('planowanie-data.js', g);
loadGlobal('plan-zakupow-2026-data.js', g);

console.log('\n=== Regression: Plany ilościowe ===\n');

// ── 1. PLAN_DATA — struktura ──────────────────────────────────────────────────
console.log('--- PLAN_DATA: struktura i kompletność ---');

test('PLAN_DATA załadowane i nie jest puste', () => {
  assert(g.PLAN_DATA !== null && g.PLAN_DATA.length > 0, 'PLAN_DATA puste');
});

test('PLAN_DATA: > 100 rekordów (rozsądna objętość)', () => {
  assert(g.PLAN_DATA.length > 100, `tylko ${g.PLAN_DATA.length} rekordów`);
});

test('PLAN_DATA: oba typy (klient + producent) obecne', () => {
  const typy = [...new Set(g.PLAN_DATA.map(r => r.typ))];
  assert(typy.includes('klient'), 'brak typ=klient');
  assert(typy.includes('producent'), 'brak typ=producent');
});

test('PLAN_DATA: tygodnie w zakresie 1–52', () => {
  const bad = g.PLAN_DATA.filter(r => r.tydzien < 1 || r.tydzien > 52);
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z tygodniem poza 1–52`);
});

test('PLAN_DATA: kg > 0 dla wszystkich rekordów', () => {
  const bad = g.PLAN_DATA.filter(r => !(r.kg > 0));
  assert(bad.length === 0,
    `${bad.length} rekord(ów) z kg <= 0`);
});

// ── 2. PLAN_DATA — kluczowi klienci i owoce ──────────────────────────────────
console.log('\n--- PLAN_DATA: kluczowi klienci i owoce ---');

const KLUCZOWI_KLIENCI = ['OGL', 'Biedronka', 'Dino', 'Frutania', 'SanLucar', 'Berry World'];
const KLUCZOWE_OWOCE = ['Malina', 'Truskawka tunelowa'];

test('PLAN_DATA: wszyscy kluczowi klienci obecni', () => {
  const klienci = [...new Set(g.PLAN_DATA.filter(r => r.typ === 'klient').map(r => r.podmiot))];
  const brak = KLUCZOWI_KLIENCI.filter(k => !klienci.includes(k));
  assert(brak.length === 0, `brak klientów: ${brak.join(', ')}`);
});

test('PLAN_DATA: malina i truskawka w planie', () => {
  const owoce = [...new Set(g.PLAN_DATA.map(r => r.owoc))];
  KLUCZOWE_OWOCE.forEach(o => {
    assert(owoce.some(ow => ow.toLowerCase().includes(o.toLowerCase().split(' ')[0])),
      `brak owocu "${o}" — dostępne: ${owoce.join(', ')}`);
  });
});

// ── 3. PLAN_DATA — bilans podaży i popytu ─────────────────────────────────────
console.log('\n--- PLAN_DATA: bilans podaż vs popyt ---');

test('plan klientów: łącznie > 500 000 kg', () => {
  const totalKg = g.PLAN_DATA.filter(r => r.typ === 'klient').reduce((s, r) => s + (r.kg || 0), 0);
  assert(totalKg > 500000, `łącznie klienci = ${Math.round(totalKg)} kg`);
});

test('plan producentów: łącznie > 500 000 kg', () => {
  const totalKg = g.PLAN_DATA.filter(r => r.typ === 'producent').reduce((s, r) => s + (r.kg || 0), 0);
  assert(totalKg > 500000, `łącznie producenci = ${Math.round(totalKg)} kg`);
});

test('bilans: producenci pokrywają >= 80% planu klientów', () => {
  const klientKg = g.PLAN_DATA.filter(r => r.typ === 'klient').reduce((s, r) => s + (r.kg || 0), 0);
  const prodKg   = g.PLAN_DATA.filter(r => r.typ === 'producent').reduce((s, r) => s + (r.kg || 0), 0);
  const ratio = prodKg / klientKg;
  assert(ratio >= 0.8,
    `producenci ${Math.round(prodKg)} kg vs klienci ${Math.round(klientKg)} kg = ${(ratio * 100).toFixed(0)}% pokrycia`);
});

// ── 4. PLAN2026_DATA — plan zakupów kartonów ──────────────────────────────────
console.log('\n--- PLAN2026_DATA: plan zakupów kartonów ---');

test('PLAN2026_DATA.rows: co najmniej 10 wierszy', () => {
  assert(g.PLAN2026_DATA.rows.length >= 10,
    `tylko ${g.PLAN2026_DATA.rows.length} wierszy`);
});

test('PLAN2026_DATA.totals: kartony_2026 > 400 000', () => {
  assert(g.PLAN2026_DATA.totals.kartony_2026 > 400000,
    `kartony_2026 = ${g.PLAN2026_DATA.totals.kartony_2026}`);
});

test('PLAN2026_DATA.totals: kg_plan_2026 spójne z planem sprzedaży (±30%)', () => {
  const planKg = g.PLAN_DATA.filter(r => r.typ === 'klient').reduce((s, r) => s + (r.kg || 0), 0);
  const plan2026Kg = g.PLAN2026_DATA.totals.kg_plan_2026;
  const ratio = plan2026Kg / planKg;
  assert(ratio > 0.7 && ratio < 1.3,
    `plan2026=${Math.round(plan2026Kg)} kg vs plan_sprzedazy=${Math.round(planKg)} kg, ratio=${ratio.toFixed(2)}`);
});

// ── 5. PLAN2026_DATA — grupy klientów ─────────────────────────────────────────
console.log('\n--- PLAN2026_DATA: grupy klientów ---');

test('group_totals: OGL obecne i > 100k kartonów', () => {
  const ogl = g.PLAN2026_DATA.group_totals.OGL;
  assert(ogl, 'brak grupy OGL');
  assert(ogl.kartony_2026 > 100000, `OGL kartony_2026 = ${ogl.kartony_2026}`);
});

test('group_totals: Jeronimo obecne', () => {
  assert(g.PLAN2026_DATA.group_totals.Jeronimo, 'brak grupy Jeronimo');
});

test('group_totals: Pozostali obecne', () => {
  assert(g.PLAN2026_DATA.group_totals.Pozostali, 'brak grupy Pozostali');
});

// ── 6. PLAN2026 rows — kluczowi klienci mają dane ────────────────────────────
console.log('\n--- PLAN2026: kluczowi klienci w rows ---');

const P2026_KLIENCI = ['OGL', 'Biedronka', 'Dino', 'Frutania', 'SanLucar', 'Berry World', 'Special Fruit'];

P2026_KLIENCI.forEach(klient => {
  test(`${klient} obecny w PLAN2026_DATA.rows`, () => {
    const found = g.PLAN2026_DATA.rows.filter(r => r.klient === klient);
    assert(found.length > 0, `brak wierszy dla ${klient}`);
  });
});

// ── 7. SPÓJNOŚĆ client_map między plan2026 a smoke tests ─────────────────────
console.log('\n--- PLAN2026: client_map kompletność ---');

test('client_map zawiera kluczowych klientów', () => {
  const map = g.PLAN2026_DATA.client_map;
  const expected = ['Biedronka', 'Dino', 'OGL', 'Frutania', 'SanLucar'];
  const missing = expected.filter(k => !map[k]);
  assert(missing.length === 0, `brak w client_map: ${missing.join(', ')}`);
});

test('client_map: każdy klucz ma co najmniej 1 nazwę ZP', () => {
  const map = g.PLAN2026_DATA.client_map;
  const empty = Object.entries(map).filter(([_, v]) => !v || v.length === 0);
  assert(empty.length === 0, `puste mapowania: ${empty.map(([k]) => k).join(', ')}`);
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression plany ilościowe — OK\n`);
}
