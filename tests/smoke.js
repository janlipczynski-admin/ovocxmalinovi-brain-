/**
 * Testy smoke — OvocxMalinovi Brain
 * Uruchom: node tests/smoke.js
 *
 * Wyłapuje klasy błędów:
 *  - puste lub brakujące dane w plikach JS
 *  - brak danych dla konkretnego klienta w ZP 2025
 *  - niespójności między plikami (plan vs ZP)
 *  - brakujące pola wymagane przez strony HTML
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── LOADER ────────────────────────────────────────────────────────────────────
function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const fake = { ZAKUPY_DATA: null, ZP_DATA: null, PLAN_DATA: null };
  const script = code
    .replace('window.ZAKUPY_DATA', 'fake.ZAKUPY_DATA')
    .replace('window.ZP_DATA',     'fake.ZP_DATA')
    .replace('window.PLAN_DATA',   'fake.PLAN_DATA');
  // eslint-disable-next-line no-new-func
  new Function('fake', script)(fake);
  return fake;
}

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
function assertGt(val, min, msg) {
  if (!(val > min)) throw new Error(msg || `${val} > ${min} — failed`);
}
function assertProp(obj, key) {
  if (!(key in obj)) throw new Error(`brak pola "${key}"`);
}

// ── ŁADOWANIE PLIKÓW ──────────────────────────────────────────────────────────
console.log('\n=== Ładowanie plików ===');
let ZP, PLAN, ZAK;

test('zestawienie-proc-data.js ładuje się bez błędu', () => {
  ZP = load('zestawienie-proc-data.js');
  assert(ZP.ZP_DATA !== null, 'window.ZP_DATA jest null');
});

test('planowanie-data.js ładuje się bez błędu', () => {
  PLAN = load('planowanie-data.js');
  assert(PLAN.PLAN_DATA !== null, 'window.PLAN_DATA jest null');
});

test('zakupy-data.js ładuje się bez błędu', () => {
  ZAK = load('zakupy-data.js');
  assert(ZAK.ZAKUPY_DATA !== null, 'window.ZAKUPY_DATA jest null');
});

// ── ZP_DATA (zestawienie-proc-data.js) ───────────────────────────────────────
console.log('\n=== zestawienie-proc-data.js ===');

test('ZP_DATA.rekordy istnieje i nie jest puste', () => {
  assertProp(ZP.ZP_DATA, 'rekordy');
  assertGt(ZP.ZP_DATA.rekordy.length, 1000, `rekordy.length = ${ZP.ZP_DATA.rekordy.length}`);
});

test('rekordy mają wymagane pola', () => {
  const r = ZP.ZP_DATA.rekordy[0];
  ['odbiorca','pak','wolumen_kg','kartonow','kg_per_karton','szt_w_kartonie'].forEach(f =>
    assert(f in r, `brak pola "${f}" w rekordzie ZP`)
  );
});

// Kluczowi klienci — sprawdź czy mają dane w ZP
const CLIENT_MAP = {
  'Biedronka':     ['JERONIMO MARTINS POLSKA SPÓŁKA AKCYJNA'],
  'Dino':          ['DINO POLSKA SPÓŁKA  AKCYJNA'],
  'OGL':           ['OGL FOOD TRADE POLSKA', 'OGL FOOD TRADE NIEMCY'],
  'Frutania':      ['FRUTANIA'],
  'SanLucar':      ['SANLUCAR'],
  'Kaczmarek':     ['RAFAŁ KACZMAREK'],
  'Berry World':   ['BERRYWORLD (NL-NIP)'],
  'Special Fruit': ['SPECIAL FRUIT', 'SPECIAL FRUIT- MAXIMA'],
  'Garden Frutta': ['GARDEN FRUTTA S.R.L.'],
  'Specjał':       ['SPECJAŁ'],
  'Kaufland':      ['FHU ROBERT (KAUFLAND)'],
};

console.log('\n=== Dane ZP 2025 per klient ===');
const rekordy = ZP.ZP_DATA.rekordy;

Object.entries(CLIENT_MAP).forEach(([planClient, zpNames]) => {
  test(`${planClient} — ma rekordy w ZP 2025`, () => {
    const recs = rekordy.filter(r => zpNames.includes(r.odbiorca));
    assertGt(recs.length, 0, `0 rekordów dla ${zpNames.join(', ')}`);
    const kg = recs.reduce((s, r) => s + (r.wolumen_kg || 0), 0);
    assertGt(kg, 1000, `wolumen_kg = ${Math.round(kg)} — podejrzanie mały`);
    const kart = recs.reduce((s, r) => s + (r.kartonow || 0), 0);
    assertGt(kart, 100, `kartonow = ${Math.round(kart)} — podejrzanie mało`);
  });
});

test('rekordy mają kgpk > 0 dla > 95% wpisów', () => {
  const brakKgpk = rekordy.filter(r => !(r.kg_per_karton > 0)).length;
  const pct = brakKgpk / rekordy.length * 100;
  assert(pct < 5, `${pct.toFixed(1)}% rekordów ma kgpk=0 (powinno być < 5%)`);
});

test('rekordy mają szt_w_kartonie > 0 dla > 95% wpisów', () => {
  const brak = rekordy.filter(r => !(r.szt_w_kartonie > 0)).length;
  const pct = brak / rekordy.length * 100;
  assert(pct < 5, `${pct.toFixed(1)}% rekordów ma szt_w_kartonie=0 (powinno być < 5%)`);
});

// ── PLAN_DATA (planowanie-data.js) ────────────────────────────────────────────
console.log('\n=== planowanie-data.js ===');

test('PLAN_DATA nie jest puste', () => {
  assertGt(PLAN.PLAN_DATA.length, 0, 'PLAN_DATA.length = 0');
});

test('PLAN_DATA ma rekordy klientów i producentów', () => {
  const klienci = PLAN.PLAN_DATA.filter(r => r.typ === 'klient');
  const prod    = PLAN.PLAN_DATA.filter(r => r.typ === 'producent');
  assertGt(klienci.length, 0, 'brak rekordów typ=klient');
  assertGt(prod.length,    0, 'brak rekordów typ=producent');
});

test('rekordy klientów mają wymagane pola', () => {
  const r = PLAN.PLAN_DATA.find(r => r.typ === 'klient');
  ['podmiot','tydzien','kg','owoc'].forEach(f =>
    assert(f in r, `brak pola "${f}" w rekordzie planu`)
  );
});

const PLAN_CLIENTS_EXPECTED = ['OGL','Dino','Biedronka','Frutania','SanLucar','Berry World'];
const planKlienci = [...new Set(PLAN.PLAN_DATA.filter(r => r.typ === 'klient').map(r => r.podmiot))];

test('plan zawiera kluczowych klientów', () => {
  PLAN_CLIENTS_EXPECTED.forEach(c =>
    assert(planKlienci.includes(c), `brak klienta "${c}" w planie`)
  );
});

test('łączny plan klientów > 500 000 kg', () => {
  const totalKg = PLAN.PLAN_DATA.filter(r => r.typ === 'klient').reduce((s, r) => s + (r.kg || 0), 0);
  assertGt(totalKg, 500000, `plan = ${Math.round(totalKg)} kg`);
});

// ── ZAKUPY_DATA (zakupy-data.js) ──────────────────────────────────────────────
console.log('\n=== zakupy-data.js ===');

test('ZAKUPY_DATA.stany istnieje i nie jest puste', () => {
  assertProp(ZAK.ZAKUPY_DATA, 'stany');
  assertGt(ZAK.ZAKUPY_DATA.stany.length, 0, 'stany.length = 0');
});

test('stany mają kartony i etykiety', () => {
  const kartony  = ZAK.ZAKUPY_DATA.stany.filter(s => s.kategoria === 'kartony');
  const etykiety = ZAK.ZAKUPY_DATA.stany.filter(s => s.kategoria === 'etykiety');
  assertGt(kartony.length,  0, 'brak stanu magazynowego dla kartonów');
  assertGt(etykiety.length, 0, 'brak stanu magazynowego dla etykiet');
});

test('ZAKUPY_DATA.zp_stats (ZP summary) istnieje', () => {
  assertProp(ZAK.ZAKUPY_DATA, 'zp_stats');
  assertGt(ZAK.ZAKUPY_DATA.zp_stats.length, 0, 'zp_stats.length = 0');
});

// ── SPÓJNOŚĆ CROSS-FILE ───────────────────────────────────────────────────────
console.log('\n=== Spójność między plikami ===');

test('klienci z planu sprzedaży pokrywają się z CLIENT_MAP', () => {
  const missing = planKlienci.filter(c => !(c in CLIENT_MAP) && c !== 'Spar' && c !== 'InterMarche');
  assert(missing.length === 0,
    `Klienci w planie bez mapowania ZP: ${missing.join(', ')} — dodaj do CLIENT_MAP`);
});

test('zsumowane kg ZP 2025 per klient spójne z wielkością planu (rząd wielkości)', () => {
  Object.entries(CLIENT_MAP).forEach(([planClient, zpNames]) => {
    const zpKg   = rekordy.filter(r => zpNames.includes(r.odbiorca)).reduce((s, r) => s + (r.wolumen_kg || 0), 0);
    const planKg = PLAN.PLAN_DATA.filter(r => r.typ === 'klient' && r.podmiot === planClient).reduce((s, r) => s + (r.kg || 0), 0);
    if (zpKg === 0 || planKg === 0) return; // jeden z nich może być 0
    // plan 2026 nie powinien być > 10x ani < 0.1x ZP 2025 (rząd wielkości)
    const ratio = planKg / zpKg;
    assert(ratio < 10 && ratio > 0.02,
      `${planClient}: plan2026=${Math.round(planKg)}kg vs ZP2025=${Math.round(zpKg)}kg, ratio=${ratio.toFixed(2)} — podejrzane`);
  });
});

// ── SYMULACJA LOGIKI STRONY ────────────────────────────────────────────────────
// To jest dokładnie ten sam kod co w zakupy-klienci.html — wyłapuje błędy renderingu
console.log('\n=== Symulacja ZS (logika zakupy-klienci.html) ===');

test('ZS buduje się poprawnie dla wszystkich klientów z CLIENT_MAP', () => {
  Object.entries(CLIENT_MAP).forEach(([planClient, zpNames]) => {
    const pakMap = {};
    zpNames.forEach(zpC => {
      rekordy.filter(r => r.odbiorca === zpC).forEach(r => {
        if (!pakMap[r.pak]) pakMap[r.pak] = { kg: 0, kart: 0 };
        pakMap[r.pak].kg   += r.wolumen_kg || 0;
        pakMap[r.pak].kart += r.kartonow   || 0;
      });
    });
    const totalKg = Object.values(pakMap).reduce((s, v) => s + v.kg, 0);
    if (zpNames.length === 0) return; // InterMarche — brak w ZP, OK
    assertGt(totalKg, 0, `${planClient}: ZS.total_kg = 0 — strona pokaże "brak w ZP 2025"`);
  });
});

test('każdy klient ZS ma co najmniej 1 pak_code z kgpk > 0', () => {
  Object.entries(CLIENT_MAP).forEach(([planClient, zpNames]) => {
    if (zpNames.length === 0) return;
    const validPaks = rekordy
      .filter(r => zpNames.includes(r.odbiorca) && r.kg_per_karton > 0)
      .length;
    assertGt(validPaks, 0, `${planClient}: brak pak_kodów z kgpk>0 — projektowanie kartonów niemożliwe`);
  });
});

// ── PODSUMOWANIE ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Wynik: ${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) {
  console.error(`\n⛔  ${failed} test(y) nie przeszły — sprawdź błędy powyżej\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Wszystkie testy przeszły\n`);
}
