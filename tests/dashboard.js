/**
 * Test integralności WIG Dashboard — OvocxMalinovi
 * Uruchom: node tests/dashboard.js
 *
 * ZASADA: index.html MUSI być WIG Dashboard 2026.
 * Ten test blokuje każdą wersję bez WIG-ów.
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const HTML  = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.error(`  ✗  ${name}\n     → ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'failed'); }
function assertContains(str, msg) {
  assert(HTML.includes(str), `Brak "${str}" — ${msg}`);
}
function assertCount(str, min, label) {
  const count = (HTML.match(new RegExp(str, 'g')) || []).length;
  assert(count >= min, `"${label || str}" — znaleziono ${count}, oczekiwano >= ${min}`);
}

console.log('\n=== WIG Dashboard — test integralności ===\n');

// 1. Struktura WIG
test('wig-grid istnieje (struktura WIG)', () => assertContains('wig-grid', 'dashboard nie jest WIG Dashboard 2026'));
test('WIG #1 OS MALINOVI', () => assertContains('OS MALINOVI', 'Brak WIG #1'));
test('WIG #2 HARVEST 50',  () => assertContains('HARVEST 50',  'Brak WIG #2'));
test('WIG #3 NO COMPLAINTS', () => assertContains('NO COMPLAINTS', 'Brak WIG #3'));
test('WIG #4 PRODUCT X',  () => assertContains('PRODUCT X',   'Brak WIG #4'));

// 2. Właściciele WIG-ów
test('WIG #1 — właściciel Jan', () => assertContains('WIG #1 · Jan', 'Brak przypisania Jan do WIG #1'));
test('WIG #2 — właściciel Kacper', () => assertContains('WIG #2 · Kacper', 'Brak przypisania Kacper do WIG #2'));
test('WIG #3 — właściciel Olgierd', () => assertContains('WIG #3 · Olgierd', 'Brak przypisania Olgierd do WIG #3'));

// 3. Wykresy kołowe SVG
test('wykresy kołowe SVG — co najmniej 4', () => assertCount('stroke-dasharray', 4, 'stroke-dasharray (koło SVG)'));
test('radial-fill (animacja wejścia koła)', () => assertContains('radial-fill', 'Brak klasy radial-fill'));

// 4. Google Sheets
test('link Google Sheets obecny', () =>
  assertContains('spreadsheets/d/1LEHtdzY-vVbNw4riaCL3DZ6qa7NQgTix5ra9w_kfvoY', 'Brak linku do arkusza WIG Scoreboard'));

// 5. Brak niepożądanych elementów (poprzednie błędne wersje)
test('brak "Mapa Procesów" jako sekcja (to nie jest ten dashboard)', () => {
  const mapProc = (HTML.match(/class="card-title">Mapa Procesów/g) || []).length;
  assert(mapProc === 0, `Znaleziono ${mapProc} sekcję "Mapa Procesów" — to jest zły dashboard`);
});
test('brak tickera giełdowego (stary błędny komponent)', () => {
  const ticker = (HTML.match(/tickerInner/g) || []).length;
  assert(ticker === 0, `Znaleziono tickerInner — usunąć`);
});

// 6. Malinoovek (asystent AI)
test('Malinoovek panel istnieje', () => assertContains('mal-card', 'Brak panelu Malinoovka'));

// 7. Title strony
test('tytuł strony poprawny', () => assertContains('<title>OvocxMalinovi', 'Błędny tytuł strony'));

// ── Podsumowanie ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  DASHBOARD NIEZGODNY z WIG Dashboard 2026. Nie deplouj!\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Dashboard OK — WIG Dashboard 2026 w porządku\n`);
}
