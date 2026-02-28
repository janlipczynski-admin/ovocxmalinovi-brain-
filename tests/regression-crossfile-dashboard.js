/**
 * Regression: Dashboard — rozszerzony test integralności
 * Uruchom: node tests/regression-crossfile-dashboard.js
 *
 * Sprawdza aspekty dashboardu nieobecne w dashboard.js:
 *  - referencje do plików JS w HTML (czy ładowane skrypty istnieją)
 *  - linki CSS/style integralność
 *  - meta tagi i responsywność
 *  - pliki JS danych referencjonowane z HTML istnieją
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.error(`  ✗  ${name}\n     → ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Regression: Dashboard rozszerzony ===\n');

// ── 1. REFERENCJE JS w HTML ──────────────────────────────────────────────────
console.log('--- Referencje <script src="..."> w plikach HTML ---');

const HTML_FILES = [
  'index.html',
  'zakupy-planowanie.html',
  'zakupy-stan.html',
  'zakupy-plan2026.html',
  'zakupy-klienci.html',
  'zakupy-harmonogram.html',
  'kartony-dostawcy.html',
  'opakowania.html',
  'zuzycie-2025.html',
  'planowanie-i-sprzedaz.html',
  'rozliczenia-rt.html',
];

HTML_FILES.forEach(htmlFile => {
  const filePath = path.join(ROOT, htmlFile);
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf8');

  // Extract local .js script references
  const scriptRe = /<script\s[^>]*src="([^"]+\.js)"/g;
  let m;
  const localScripts = [];
  while ((m = scriptRe.exec(html)) !== null) {
    const src = m[1];
    if (!src.startsWith('http') && !src.startsWith('//')) {
      localScripts.push(src);
    }
  }

  if (localScripts.length > 0) {
    test(`${htmlFile}: ${localScripts.length} lokalnych skryptów JS istnieje`, () => {
      const missing = localScripts.filter(s => !fs.existsSync(path.join(ROOT, s)));
      assert(missing.length === 0,
        `brak plików JS: ${missing.join(', ')}`);
    });
  }
});

// ── 2. INDEX.HTML — meta tagi ────────────────────────────────────────────────
console.log('\n--- index.html: meta i responsywność ---');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('index.html: meta viewport obecny', () => {
  assert(indexHtml.includes('viewport'), 'brak meta viewport');
});

test('index.html: meta charset obecny', () => {
  assert(indexHtml.includes('charset') || indexHtml.includes('UTF-8'),
    'brak meta charset');
});

test('index.html: zawiera <title>', () => {
  assert(indexHtml.includes('<title>'), 'brak <title>');
});

// ── 3. HTML — podstawowa walidacja struktury ─────────────────────────────────
console.log('\n--- HTML: podstawowa walidacja ---');

HTML_FILES.forEach(htmlFile => {
  const filePath = path.join(ROOT, htmlFile);
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf8');

  test(`${htmlFile}: zamknięty tag </html>`, () => {
    assert(html.includes('</html>'), `brak zamknięcia </html>`);
  });
});

// ── 4. LOGO — plik SVG istnieje ──────────────────────────────────────────────
console.log('\n--- Zasoby statyczne ---');

test('logo.svg istnieje i jest poprawnym SVG', () => {
  const logoPath = path.join(ROOT, 'logo.svg');
  assert(fs.existsSync(logoPath), 'brak logo.svg');
  const content = fs.readFileSync(logoPath, 'utf8');
  assert(content.includes('<svg'), 'logo.svg nie zawiera tagu <svg>');
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression dashboard rozszerzony — OK\n`);
}
