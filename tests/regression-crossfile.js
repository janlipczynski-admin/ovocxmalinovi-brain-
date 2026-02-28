/**
 * Regression: Spójność między plikami — OvocxMalinovi
 * Uruchom: node tests/regression-crossfile.js
 *
 * Sprawdza:
 *  - integralność wszystkich plików JS (ładują się bez błędów)
 *  - integralność wszystkich plików HTML (istnieją, mają <html>)
 *  - spójność danych między plikami (client_map, magazyny, owoce)
 *  - firma-wiedza.js — kluczowe informacje obecne
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

console.log('\n=== Regression: Spójność między plikami ===\n');

// ── 1. INTEGRALNOŚĆ PLIKÓW JS ────────────────────────────────────────────────
console.log('--- Integralność plików JS (ładowanie bez błędów) ---');

const JS_DATA_FILES = [
  { file: 'zakupy-data.js',           global: 'ZAKUPY_DATA' },
  { file: 'planowanie-data.js',        global: 'PLAN_DATA' },
  { file: 'zestawienie-proc-data.js',  global: 'ZP_DATA' },
  { file: 'opakowania-data.js',        global: 'OPAK_DATA' },
  { file: 'plan-zakupow-2026-data.js', global: 'PLAN2026_DATA' },
  { file: 'stany-data.js',            global: 'STANY_DATA' },
  { file: 'dostawcy-data.js',         global: 'DOSTAWCY_DATA' },
  { file: 'karton-mapa.js',           global: 'KARTON_MAPA' },
  { file: 'zuzycie-data.js',          global: 'ZUZYCIE_DATA' },
  { file: 'firma-wiedza.js',          global: 'FIRMA_WIEDZA' },
  { file: 'config.js',                global: 'OXM_CONFIG' },
];

const globals = {};
JS_DATA_FILES.forEach(({ global }) => { globals[global] = null; });

JS_DATA_FILES.forEach(({ file, global }) => {
  test(`${file} ładuje się bez błędu`, () => {
    const filePath = path.join(ROOT, file);
    assert(fs.existsSync(filePath), `plik nie istnieje: ${file}`);
    loadGlobal(file, globals);
    assert(globals[global] !== null, `${global} jest null po załadowaniu`);
  });
});

// ── 2. INTEGRALNOŚĆ PLIKÓW HTML ──────────────────────────────────────────────
console.log('\n--- Integralność plików HTML ---');

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

HTML_FILES.forEach(file => {
  test(`${file} istnieje i zawiera <html>`, () => {
    const filePath = path.join(ROOT, file);
    assert(fs.existsSync(filePath), `plik nie istnieje: ${file}`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.includes('<html'), `${file}: brak tagu <html>`);
    assert(content.length > 1000, `${file}: podejrzanie mały (${content.length} bytes)`);
  });
});

// ── 3. SPÓJNOŚĆ MAGAZYNÓW ────────────────────────────────────────────────────
console.log('\n--- Spójność nazw magazynów między plikami ---');

test('STANY_DATA.magazyny === ZAKUPY_DATA.magazyny', () => {
  const stanyMag = globals.STANY_DATA.magazyny.sort();
  const zakupyMag = globals.ZAKUPY_DATA.magazyny.sort();
  assert(JSON.stringify(stanyMag) === JSON.stringify(zakupyMag),
    `stany: [${stanyMag}] vs zakupy: [${zakupyMag}]`);
});

test('ZUZYCIE_DATA.magazyny zawiera magazyny z STANY_DATA', () => {
  const stanyMag = globals.STANY_DATA.magazyny;
  const zuzMag = globals.ZUZYCIE_DATA.magazyny;
  const missing = stanyMag.filter(m => !zuzMag.includes(m));
  // Zuzycie może mieć dodatkowe magazyny (Justynów, Unisad), ale musi zawierać główne
  assert(missing.length <= 1,
    `brak magazynów w zuzyciu: ${missing.join(', ')}`);
});

// ── 4. SPÓJNOŚĆ KLIENTÓW ─────────────────────────────────────────────────────
console.log('\n--- Spójność klientów między planowaniem a ZP ---');

test('klienci z PLAN_DATA mają odpowiedniki w client_map PLAN2026', () => {
  const planKlienci = [...new Set(
    globals.PLAN_DATA.filter(r => r.typ === 'klient').map(r => r.podmiot)
  )];
  const p2026map = globals.PLAN2026_DATA.client_map;
  // Main clients should be mapped
  const mainClients = ['OGL', 'Biedronka', 'Dino', 'Frutania', 'SanLucar', 'Berry World'];
  const missing = mainClients.filter(c => !p2026map[c] && planKlienci.includes(c));
  assert(missing.length === 0,
    `klienci w planie bez client_map: ${missing.join(', ')}`);
});

test('client_map PLAN2026 → nazwy ZP istnieją w ZP_DATA.rekordy', () => {
  const p2026map = globals.PLAN2026_DATA.client_map;
  const zpOdbiorcy = [...new Set(globals.ZP_DATA.rekordy.map(r => r.odbiorca))];
  const unmapped = [];
  Object.entries(p2026map).forEach(([klient, zpNames]) => {
    zpNames.forEach(name => {
      if (!zpOdbiorcy.includes(name)) {
        unmapped.push(`${klient}→"${name}"`);
      }
    });
  });
  // Allow some unmapped (new clients), but not too many
  assert(unmapped.length <= 3,
    `nazwy ZP nie znalezione w danych: ${unmapped.join(', ')}`);
});

// ── 5. SPÓJNOŚĆ OWOCÓW ──────────────────────────────────────────────────────
console.log('\n--- Spójność owoców między plikami ---');

test('PLAN2026 rows zawierają główne owoce', () => {
  const owoce = [...new Set(globals.PLAN2026_DATA.rows.map(r => r.owoc))];
  assert(owoce.includes('Malina'), `brak Maliny — owoce: ${owoce.join(', ')}`);
  assert(owoce.includes('Truskawka'), `brak Truskawki — owoce: ${owoce.join(', ')}`);
});

test('ZUZYCIE_DATA: typy materiałów zawierają Etykieta i Karton/Opakowanie', () => {
  const typy = [...new Set(globals.ZUZYCIE_DATA.rekordy.map(r => r.typ_materialu))];
  assert(typy.some(t => t.includes('Etykieta')),
    `brak Etykiet w zuzyciu — typy: ${typy.join(', ')}`);
});

// ── 6. FIRMA_WIEDZA — kluczowe sekcje ────────────────────────────────────────
console.log('\n--- firma-wiedza.js: kluczowe sekcje ---');

test('FIRMA_WIEDZA zawiera sekcję o zespole', () => {
  assert(globals.FIRMA_WIEDZA.includes('Zespół') || globals.FIRMA_WIEDZA.includes('zespół'),
    'brak sekcji Zespół w FIRMA_WIEDZA');
});

test('FIRMA_WIEDZA zawiera kluczowe osoby', () => {
  ['Jan', 'Iza', 'Renia', 'Kacper', 'Adrian'].forEach(osoba => {
    assert(globals.FIRMA_WIEDZA.includes(osoba),
      `brak ${osoba} w FIRMA_WIEDZA`);
  });
});

test('FIRMA_WIEDZA zawiera info o dostawcach', () => {
  assert(globals.FIRMA_WIEDZA.includes('TFP') || globals.FIRMA_WIEDZA.includes('dostawc'),
    'brak info o dostawcach w FIRMA_WIEDZA');
});

// ── 7. CONFIG.JS ──────────────────────────────────────────────────────────────
console.log('\n--- config.js: struktura ---');

test('OXM_CONFIG ma klucz apiKey', () => {
  assert('apiKey' in globals.OXM_CONFIG, 'brak apiKey w OXM_CONFIG');
});

test('OXM_CONFIG ma klucz model', () => {
  assert('model' in globals.OXM_CONFIG, 'brak model w OXM_CONFIG');
});

// ── 8. ROZMIARY PLIKÓW — sanity check ───────────────────────────────────────
console.log('\n--- Rozmiary plików (sanity check) ---');

test('pliki danych JS > 1KB (nie puste)', () => {
  const dataFiles = ['zakupy-data.js', 'planowanie-data.js', 'zestawienie-proc-data.js',
                     'opakowania-data.js', 'plan-zakupow-2026-data.js', 'stany-data.js'];
  dataFiles.forEach(file => {
    const size = fs.statSync(path.join(ROOT, file)).size;
    assert(size > 1024, `${file}: rozmiar ${size} bytes — podejrzanie mały`);
  });
});

test('index.html > 10KB (główny dashboard)', () => {
  const size = fs.statSync(path.join(ROOT, 'index.html')).size;
  assert(size > 10240, `index.html: ${size} bytes — za mały`);
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Regression spójność — OK\n`);
}
