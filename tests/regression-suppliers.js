/**
 * Regression: Dostawcy i mapa kartonów — OvocxMalinovi
 * Uruchom: node tests/regression-suppliers.js
 *
 * Sprawdza:
 *  - DOSTAWCY_DATA: integralność danych dostawców kartonów
 *  - KARTON_MAPA: spójność mapowania opakowanie → karton
 *  - powiązania PLAN2026 paks → KARTON_MAPA
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
const g = { DOSTAWCY_DATA: null, KARTON_MAPA: null, PLAN2026_DATA: null };
loadGlobal('dostawcy-data.js', g);
loadGlobal('karton-mapa.js', g);
loadGlobal('plan-zakupow-2026-data.js', g);

console.log('\n=== Regression: Dostawcy i mapa kartonów ===\n');

// ── 1. DOSTAWCY_DATA — struktura ──────────────────────────────────────────────
console.log('--- DOSTAWCY_DATA: struktura ---');

test('DOSTAWCY_DATA załadowane', () => {
  assert(g.DOSTAWCY_DATA !== null, 'DOSTAWCY_DATA jest null');
});

test('DOSTAWCY_DATA.dostawcy: co najmniej 5 dostawców', () => {
  assert(g.DOSTAWCY_DATA.dostawcy.length >= 5,
    `tylko ${g.DOSTAWCY_DATA.dostawcy.length} dostawców`);
});

// ── 2. DOSTAWCY — wymagane pola ───────────────────────────────────────────────
console.log('\n--- DOSTAWCY_DATA: wymagane pola ---');

const REQUIRED_FIELDS = ['id', 'nazwa', 'skrot', 'kraj', 'aktywny'];

test('każdy dostawca ma wymagane pola', () => {
  const bad = g.DOSTAWCY_DATA.dostawcy.filter(d => {
    return REQUIRED_FIELDS.some(f => !(f in d));
  });
  assert(bad.length === 0,
    `${bad.length} dostawca(-ów) bez wymaganych pól`);
});

test('id dostawców są unikalne', () => {
  const ids = g.DOSTAWCY_DATA.dostawcy.map(d => d.id);
  const unique = [...new Set(ids)];
  assert(ids.length === unique.length,
    `duplikaty id: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
});

// ── 3. KLUCZOWI DOSTAWCY ─────────────────────────────────────────────────────
console.log('\n--- Kluczowi dostawcy obecni ---');

const KLUCZOWI_DOSTAWCY = ['TFP', 'OPAK', 'KRAFT_BOX', 'STORAENSO', 'SAICA', 'EUROBOX', 'KENKEL'];

KLUCZOWI_DOSTAWCY.forEach(id => {
  test(`dostawca ${id} obecny`, () => {
    const found = g.DOSTAWCY_DATA.dostawcy.find(d => d.id === id);
    assert(found, `brak dostawcy ${id}`);
    assert(found.aktywny === true, `dostawca ${id} oznaczony jako nieaktywny`);
  });
});

test('dostawcy z Polski', () => {
  const polscy = g.DOSTAWCY_DATA.dostawcy.filter(d => d.kraj === 'Polska');
  assert(polscy.length >= 5, `tylko ${polscy.length} dostawców z Polski`);
});

// ── 4. KARTON_MAPA — struktura ───────────────────────────────────────────────
console.log('\n--- KARTON_MAPA: struktura ---');

test('KARTON_MAPA załadowane', () => {
  assert(g.KARTON_MAPA !== null, 'KARTON_MAPA jest null');
});

test('KARTON_MAPA.fallback: wszystkie grupy obecne', () => {
  const expected = ['OGL', 'Jeronimo', 'Dino', 'Pozostali'];
  const missing = expected.filter(gr => !g.KARTON_MAPA.fallback[gr]);
  assert(missing.length === 0, `brak fallback dla grup: ${missing.join(', ')}`);
});

test('KARTON_MAPA.fallback: każda grupa ma MAŁY i DUŻY', () => {
  Object.entries(g.KARTON_MAPA.fallback).forEach(([group, sizes]) => {
    assert(sizes.MAŁY, `${group}: brak fallback MAŁY`);
    assert(sizes.DUŻY, `${group}: brak fallback DUŻY`);
  });
});

test('KARTON_MAPA.map: co najmniej 50 mapowań', () => {
  const count = Object.keys(g.KARTON_MAPA.map).length;
  assert(count >= 50, `tylko ${count} mapowań (oczekiwano >= 50)`);
});

test('KARTON_MAPA.map: klucze mają format "GRUPA||PAK_CODE"', () => {
  const badKeys = Object.keys(g.KARTON_MAPA.map).filter(k => !k.includes('||'));
  assert(badKeys.length === 0, `klucze bez "||": ${badKeys.slice(0, 5).join(', ')}`);
});

test('KARTON_MAPA.map: wartości to indeksy kartonów (zaczynają się od K-)', () => {
  const badValues = Object.entries(g.KARTON_MAPA.map).filter(([_, v]) => !v.startsWith('K-'));
  assert(badValues.length === 0,
    `${badValues.length} mapowań z wartością bez prefiksu K-: ${badValues.slice(0, 3).map(([k, v]) => `${k}→${v}`).join(', ')}`);
});

// ── 5. SPÓJNOŚĆ: PLAN2026 paks → KARTON_MAPA ────────────────────────────────
console.log('\n--- Spójność: plan zakupów vs mapa kartonów ---');

test('paki z PLAN2026 mają mapowanie w KARTON_MAPA (lub fallback)', () => {
  const allPaks = g.PLAN2026_DATA.rows.flatMap(r => {
    return (r.paks || []).map(p => ({
      group: r.group,
      pak: p.pak,
      rozmiar: p.rozmiar
    }));
  });

  const unmapped = allPaks.filter(p => {
    const key = `${p.group}||${p.pak}`;
    if (g.KARTON_MAPA.map[key]) return false;
    // Check fallback
    const fb = g.KARTON_MAPA.fallback[p.group];
    if (fb && fb[p.rozmiar]) return false;
    return true;
  });

  // Allow some unmapped (new paks), but flag if > 10%
  const pct = (unmapped.length / allPaks.length) * 100;
  assert(pct < 10,
    `${pct.toFixed(1)}% paków bez mapowania (${unmapped.length}/${allPaks.length}): ${unmapped.slice(0, 5).map(p => `${p.group}||${p.pak}`).join(', ')}`);
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression dostawcy/mapa — OK\n`);
}
