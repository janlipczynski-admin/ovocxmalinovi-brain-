/**
 * Test nawigacji i integralności linków — OvocxMalinovi Brain
 * Uruchom: node tests/navigation.js
 *
 * Wyłapuje klasy błędów:
 *  - elementy nawigacyjne jako <div> zamiast <a> z href     ← bug z 2026-02-27
 *  - linki do plików HTML które nie istnieją (broken links)
 *  - strony bez przycisku powrotu do index.html
 *  - href puste lub "#" w elementach narzędziowych
 *  - brak href na elementach klikalnych (.tool-row, .back-btn, .sub-nav-item)
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

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

// Klasy które MUSZĄ być tagiem <a> z niepustym href
const MUST_BE_ANCHOR = ['tool-row', 'back-btn', 'sub-nav-item'];

// ── MINI TEST RUNNER ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`     → ${e.message}`);
    failed++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// ── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Zwraca listę problemów: elementy z daną klasą które NIE są tagiem <a>.
 * Obsługuje oba formaty: <div class="X"> i <a href="..." class="X">
 */
function findNonAnchorElements(html, className) {
  const issues = [];
  // Matchuje dowolny otwierający tag zawierający daną klasę
  const re = /<(\w+)(?:\s[^>]*)?\sclass="([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag     = m[1].toLowerCase();
    const classes = m[2].trim().split(/\s+/);
    if (classes.includes(className) && tag !== 'a') {
      issues.push(`<${m[1]} class="...${className}..."> — powinno być <a>`);
    }
  }
  return issues;
}

/**
 * Zwraca wszystkie href z tagów <a> w pliku HTML.
 */
function extractHrefs(html) {
  const hrefs = [];
  const re = /<a(?:\s[^>]*)?\shref="([^"#][^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

/**
 * Zwraca href-y tool-row które są puste lub "#".
 */
function findEmptyToolRowHrefs(html) {
  const bad = [];
  // Szukamy <a class="tool-row" ...> lub <a ... class="tool-row"> i sprawdzamy href
  const re = /<a\s([^>]*)>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    if (!/class="[^"]*tool-row[^"]*"/.test(attrs)) continue;
    const hrefMatch = /href="([^"]*)"/.exec(attrs);
    if (!hrefMatch || !hrefMatch[1] || hrefMatch[1] === '#') {
      bad.push(hrefMatch ? `href="${hrefMatch[1]}"` : '(brak href)');
    }
  }
  return bad;
}

// ── 1. ISTNIENIE PLIKÓW ───────────────────────────────────────────────────────
console.log('\n=== 1. Istnienie plików HTML ===');
const htmlContents = {};
HTML_FILES.forEach(f => {
  test(`${f} istnieje`, () => {
    const p = path.join(ROOT, f);
    assert(fs.existsSync(p), `Plik nie istnieje: ${p}`);
    htmlContents[f] = fs.readFileSync(p, 'utf8');
  });
});

// ── 2. ELEMENTY NAWIGACYJNE JAKO <a> — KLUCZOWY TEST ─────────────────────────
console.log('\n=== 2. Elementy nawigacyjne muszą być <a> z href (nie <div>) ===');
HTML_FILES.forEach(file => {
  const html = htmlContents[file];
  if (!html) return;

  MUST_BE_ANCHOR.forEach(cls => {
    // Sprawdzaj tylko jeśli klasa w ogóle występuje w pliku
    if (!html.includes(`class="${cls}`) && !html.includes(` ${cls} `) && !html.includes(`"${cls}"`)) return;

    test(`${file} — .${cls} jest <a> (nie <div>/<span>)`, () => {
      const issues = findNonAnchorElements(html, cls);
      assert(issues.length === 0,
        `${issues.length} element(ów) .${cls} bez <a>:\n     ${issues.join('\n     ')}`);
    });
  });
});

// ── 3. INTEGRALNOŚĆ LINKÓW (lokalne .html muszą istnieć) ─────────────────────
console.log('\n=== 3. Integralność linków — cel href musi istnieć ===');
HTML_FILES.forEach(file => {
  const html = htmlContents[file];
  if (!html) return;

  const allHrefs  = extractHrefs(html);
  const localHtml = allHrefs.filter(h =>
    h.endsWith('.html') && !h.startsWith('http') && !h.startsWith('//')
  );

  if (localHtml.length === 0) return;

  test(`${file} — ${localHtml.length} lokalny/ch link/ów .html istnieje`, () => {
    const missing = localHtml.filter(h => !fs.existsSync(path.join(ROOT, h)));
    assert(missing.length === 0,
      `Broken links w ${file}: ${missing.join(', ')}`);
  });
});

// ── 4. KAŻDA PODSTRONA MA LINK POWROTU DO RODZICA ────────────────────────────
// Hierarchia nawigacji: strony 2. poziomu wracają do zakupy-planowanie.html,
// który sam wraca do index.html — nie wymagamy bezpośredniego linku do index.html
console.log('\n=== 4. Powrót do strony nadrzędnej (hierarchia nawigacji) ===');

const REQUIRED_PARENT = {
  // Poziom 1 — direct z index.html
  'zakupy-planowanie.html':   'index.html',
  'opakowania.html':          'index.html',
  'planowanie-i-sprzedaz.html': 'index.html',
  'rozliczenia-rt.html':      'index.html',
  // Poziom 2 — z zakupy-planowanie.html
  'zakupy-stan.html':         'zakupy-planowanie.html',
  'zakupy-plan2026.html':     'zakupy-planowanie.html',
  'zakupy-klienci.html':      'zakupy-planowanie.html',
  'zakupy-harmonogram.html':  'zakupy-planowanie.html',
  'kartony-dostawcy.html':    'zakupy-planowanie.html',
  'zuzycie-2025.html':        'zakupy-planowanie.html',
};

Object.entries(REQUIRED_PARENT).forEach(([file, parent]) => {
  const html = htmlContents[file];
  if (!html) return;

  test(`${file} — ma link powrotu do ${parent}`, () => {
    assert(
      html.includes(`href="${parent}"`) || html.includes(`href='${parent}'`),
      `Brak linku powrotu do ${parent} w ${file}`
    );
  });
});

// ── 5. TOOL-ROW — href nie może być pusty ani "#" ─────────────────────────────
console.log('\n=== 5. tool-row — href niepusty i nie "#" ===');
HTML_FILES.forEach(file => {
  const html = htmlContents[file];
  if (!html || !html.includes('tool-row')) return;

  test(`${file} — tool-row: wszystkie href wypełnione`, () => {
    const bad = findEmptyToolRowHrefs(html);
    assert(bad.length === 0,
      `${bad.length} tool-row z pustym/# href: ${bad.join(', ')}`);
  });
});

// ── 6. SPÓJNOŚĆ NAWIGACYJNA — strony linkują wzajemnie ────────────────────────
console.log('\n=== 6. Spójność nawigacji (wzajemne linki) ===');

// zakupy-planowanie.html musi linkować do wszystkich podstron zakupowych
const ZAKUPY_HUB   = 'zakupy-planowanie.html';
const ZAKUPY_PAGES = ['zakupy-stan.html', 'zakupy-plan2026.html', 'zakupy-klienci.html',
                      'zakupy-harmonogram.html', 'kartony-dostawcy.html', 'zuzycie-2025.html'];

test(`${ZAKUPY_HUB} linkuje do wszystkich podstron zakupowych`, () => {
  const html = htmlContents[ZAKUPY_HUB];
  if (!html) return;
  const missing = ZAKUPY_PAGES.filter(p => !html.includes(p));
  assert(missing.length === 0, `Brak linków do: ${missing.join(', ')}`);
});

// index.html musi linkować do Planety Zakupów i głównych narzędzi
const INDEX_REQUIRED_LINKS = [
  'zakupy-planowanie.html',
  'opakowania.html',
  'planowanie-i-sprzedaz.html',
  'rozliczenia-rt.html',
];

test('index.html linkuje do wszystkich głównych narzędzi', () => {
  const html = htmlContents['index.html'];
  if (!html) return;
  const missing = INDEX_REQUIRED_LINKS.filter(p => !html.includes(p));
  assert(missing.length === 0, `Brak linków w index.html do: ${missing.join(', ')}`);
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły — sprawdź błędy powyżej\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Wszystkie testy nawigacji przeszły\n`);
}
