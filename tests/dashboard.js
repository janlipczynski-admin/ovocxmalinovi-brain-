/**
 * Test integralności WIG Dashboard — OvocxMalinovi
 * Uruchom: node tests/dashboard.js
 *
 * ZASADA: index.html MUSI być WIG Dashboard 2026.
 * Architektura v2: dane live z Supabase (nie Google Sheets).
 * Ten test blokuje każdą wersję bez WIG-ów i bez połączenia z Supabase.
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
function assertNotContains(str, msg) {
  assert(!HTML.includes(str), `Znaleziono "${str}" — ${msg}`);
}

console.log('\n=== WIG Dashboard v2 — test integralności ===\n');

// 1. Struktura WIG — wig-grid musi istnieć (niezależnie od architektury)
test('wig-grid istnieje (struktura WIG)', () =>
  assertContains('wig-grid', 'dashboard nie jest WIG Dashboard 2026'));

// 2. Architektura Supabase — live dane (v2)
test('Supabase URL obecny', () =>
  assertContains('fssfuricylndtetfktex.supabase.co', 'Brak połączenia z Supabase'));
test('Supabase API key obecny', () =>
  assertContains('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'Brak Supabase API key'));
test('sbGet — funkcja pobierania danych', () =>
  assertContains('sbGet', 'Brak funkcji sbGet'));

// 3. Render kart WIG — funkcje renderujące muszą istnieć
test('renderCard — funkcja karty WIG', () =>
  assertContains('renderCard', 'Brak funkcji renderCard'));
test('renderEmptyCard — karta dla obszaru bez danych', () =>
  assertContains('renderEmptyCard', 'Brak funkcji renderEmptyCard'));
test('calcWigScore — obliczanie wyniku WIG', () =>
  assertContains('calcWigScore', 'Brak funkcji calcWigScore'));
test('idealPace — idealne tempo', () =>
  assertContains('idealPace', 'Brak funkcji idealPace'));

// 4. Design system — Familjen Grotesk + DM Mono (nie stare fonty)
test('font Familjen Grotesk', () =>
  assertContains('Familjen Grotesk', 'Brak fontu Familjen Grotesk'));
test('font DM Mono', () =>
  assertContains('DM Mono', 'Brak fontu DM Mono'));

// 5. Karta WIG — elementy UI
test('wig-card (karta WIG)', () =>
  assertContains('wig-card', 'Brak klasy wig-card'));
test('progress-fill (pasek postępu)', () =>
  assertContains('progress-fill', 'Brak paska postępu progress-fill'));
test('status-badge (badge statusu)', () =>
  assertContains('status-badge', 'Brak elementu status-badge'));
test('lag-mini-grid (mini paski LAG)', () =>
  assertContains('lag-mini-grid', 'Brak elementu lag-mini-grid'));

// 6. Nawigacja do dashboard-4dx
test('link do dashboard-4dx.html', () =>
  assertContains('dashboard-4dx.html', 'Brak linka do dashboard-4dx.html'));

// 7. Favicon
test('favicon.svg', () =>
  assertContains('favicon.svg', 'Brak favicon'));

// 8. Tytuł strony
test('tytuł strony zawiera OvocxMalinow', () =>
  assertContains('<title>OvocxMalinow', 'Błędny tytuł strony'));

// 9. Brak niepożądanych elementów (stare wersje)
test('brak tickera giełdowego (stary błędny komponent)', () => {
  const ticker = (HTML.match(/tickerInner/g) || []).length;
  assert(ticker === 0, `Znaleziono tickerInner — usunąć`);
});
test('brak "Mapa Procesów" jako sekcja (to nie jest ten dashboard)', () => {
  const mapProc = (HTML.match(/class="card-title">Mapa Procesów/g) || []).length;
  assert(mapProc === 0, `Znaleziono ${mapProc} sekcję "Mapa Procesów" — to jest zły dashboard`);
});
test('brak hardcoded stroke-dasharray (dane nie mogą być hardcoded)', () => {
  const hc = (HTML.match(/stroke-dasharray="\d+\.\d+ \d+\.\d+"/g) || []).length;
  assert(hc === 0, `Znaleziono ${hc} hardcoded stroke-dasharray — dane muszą być dynamiczne`);
});

// ── Podsumowanie ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  DASHBOARD NIEZGODNY z WIG Dashboard 2026. Nie deplouj!\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Dashboard OK — WIG Dashboard 2026 (Supabase v2) w porządku\n`);
}
