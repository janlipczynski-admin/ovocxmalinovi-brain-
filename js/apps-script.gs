/**
 * OvocxMalinowi — Google Apps Script Web App
 * Arkusz: 2026_Ovocxmalinovi_dashboard
 *
 * INSTALACJA:
 *   1. Otwórz arkusz → Rozszerzenia → Apps Script
 *   2. Wklej cały ten plik (zastąp domyślny kod)
 *   3. Kliknij "Wdróż" → "Nowe wdrożenie" → typ: Aplikacja internetowa
 *      - Uruchom jako: Ja (owner)
 *      - Kto ma dostęp: Wszyscy
 *   4. Skopiuj URL wdrożenia → wklej do js/sheets.js jako SHEETS_CONFIG.appsScriptUrl
 *
 * ROZWIĄZYWANIE BŁĘDU 403:
 *   Jeśli dashboard zwraca 403, sprawdź te 3 warstwy:
 *
 *   Warstwa 1 — Dostęp do arkusza Google Sheet:
 *     • Otwórz arkusz → Udostępnij → upewnij się, że konto (lub service account) ma rolę Edytor
 *     • Dla service account: dodaj email SA (xxx@yyy.iam.gserviceaccount.com) jako Edytor
 *
 *   Warstwa 2 — API Google (GCP):
 *     • Google Cloud Console → APIs & Services → Library
 *     • Włącz: Google Sheets API, Google Drive API, Google Apps Script API
 *     • OAuth scope'y muszą zawierać: spreadsheets, drive (lub drive.file)
 *
 *   Warstwa 3 — Wdrożenie Apps Script:
 *     • Wdróż → Nowe wdrożenie → typ: Aplikacja internetowa
 *     • "Uruchom jako": Ja (konto właściciela arkusza)
 *     • "Kto ma dostęp": Wszyscy (KRYTYCZNE — bez tego 403!)
 *     • Po każdej zmianie kodu: Wdróż → Zarządzaj wdrożeniami → Nowa wersja
 *     • Stary URL nie aktualizuje się automatycznie — zawsze kopiuj nowy URL
 *
 *   Dodatkowe przyczyny 403:
 *     • Google Workspace admin może blokować aplikacje (allowlist/Trust)
 *     • Token bez wymaganych scope'ów → "insufficientPermissions"
 *     • Inny profil Google w przeglądarce niż właściciel arkusza
 *
 * ENDPOINT:
 *   GET {url}         → pełny JSON ze wszystkimi danymi dashboardu
 *   GET {url}?tab=lag → tylko zakładka OS_LAG MEASURES (debug)
 *
 * STRUKTURA ZWRACANEGO LAG OBIEKTU:
 *   lag.lag01         → number (current %)          ← backward compat z sheets.js / index.html
 *   lag.lag02         → number (current %)
 *   lag.lag03         → number (current %)
 *   lag.lag04         → number (current %)
 *   lag.overall       → number (wynik ogólny %)
 *   lag.weeks         → ['T10','T11',...]            ← lista tygodni z arkusza
 *   lag.weekLabel     → 'T10'                        ← bieżący tydzień
 *   lag.details.lag01 → { current, prev, delta, onTrackNow, history[] }  ← dla os-malinovi.html
 *   lag.details.lag02 → ...
 *   lag.details.lag03 → ...
 *   lag.details.lag04 → ...
 *
 *   history[] element: { week: 'T10', postep: 14, plan: 20, onTrack: true }
 */

// ── GID zakładek (odporne na zmiany nazw) ──────────────────────────────────────
const GID = {
  WIGI:                1492902022,
  OS_LAG:              322339268,
  OS_LEAD:             1844898951,
  HARVEST_LAG:         200348167,
  HARVEST_LEAD:        259840012,
  NOCOMPLAINTS_LAG:    716489223,
  NOCOMPLAINTS_LEAD:   1872002
};

// ── ID arkusza ─────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ';

// ── Helper: pobierz zakładkę po gid ───────────────────────────────────────────
function getSheetById(ss, gid) {
  return ss.getSheets().find(function(s) { return s.getSheetId() === gid; }) || null;
}

// ── Główny handler ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
    const tab      = e && e.parameter && e.parameter.tab;
    const callback = e && e.parameter && e.parameter.callback;

    if (tab === 'lag') {
      const result = readLagMeasures(getSheetById(ss, GID.OS_LAG));
      return jsonResponse(result, callback);
    }

    const data = {
      lag:     readLagMeasures(getSheetById(ss, GID.OS_LAG)),
      lead:    readLeadMeasures(getSheetById(ss, GID.OS_LEAD)),
      updated: new Date().toISOString()
    };

    return jsonResponse(data, callback);

  } catch (err) {
    const cb = e && e.parameter && e.parameter.callback;
    return jsonResponse({ error: err.message, stack: err.stack }, cb);
  }
}

function jsonResponse(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── LAG MEASURES ──────────────────────────────────────────────────────────────
//
// Skanuje CAŁY arkusz OS_LAG MEASURES.
// Szuka wierszy zawierających:
//   - "Postęp (średnia %)"   → wartości procentowe per tydzień
//   - "Plan narastająco (%)" → wartości planu per tydzień
//   - "On track?"             → TAK/NIE per tydzień
//
// Zwraca:
//   { lag01, lag02, lag03, lag04 }  → numery (backward compat)
//   { details.lag01..04 }           → pełne obiekty z historią tygodniową
//
// Wartości w arkuszu: ułamki (0.125 = 12.5%) lub procenty (14.29 = 14.29%)

function readLagMeasures(sheet) {
  if (!sheet) return { error: 'Brak zakładki OS_LAG MEASURES (gid=' + GID.OS_LAG + ')' };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { error: 'Pusta zakładka OS_LAG MEASURES' };

  const currentWeekLabel = 'T' + isoWeekNumber();

  // === PASS 1: Znajdź kolumny tygodniowe (T10, T11, ...) ===
  // Szukamy w pierwszych 20 wierszach — nagłówki mogą być w różnych miejscach
  const weekCols = {}; // { 'T10': 2, 'T11': 3, ... }
  for (var r = 0; r < Math.min(values.length, 20); r++) {
    var row = values[r];
    for (var c = 0; c < row.length; c++) {
      var cell = String(row[c] || '').trim();
      if (/^T\d{1,2}$/.test(cell)) {
        weekCols[cell] = c;
      }
    }
  }

  var weeks = Object.keys(weekCols).sort(function(a, b) {
    return parseInt(a.slice(1)) - parseInt(b.slice(1));
  });

  // === PASS 2: Zbierz wiersze Postęp / Plan / On track ===
  var lagPostep  = []; // [[val_T10, val_T11, ...], [...], ...]  ← jeden element per LAG
  var lagPlan    = [];
  var lagOnTrack = [];

  function extractNumericRow(row) {
    return weeks.map(function(w) {
      var col = weekCols[w];
      if (col === undefined || col >= row.length) return null;
      var v = row[col];
      if (v == null || v === '') return null;
      var n = Number(v);
      if (isNaN(n)) return null;
      return Math.round(n <= 1 ? n * 100 : n);
    });
  }

  function extractBoolRow(row) {
    return weeks.map(function(w) {
      var col = weekCols[w];
      if (col === undefined || col >= row.length) return null;
      var v = String(row[col] || '').trim().toUpperCase();
      if (v === '') return null;
      if (v === 'TAK' || v === 'YES' || v === 'TRUE' || v === '1') return true;
      if (v === 'NIE' || v === 'NO'  || v === 'FALSE'|| v === '0') return false;
      return null;
    });
  }

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    // Szukaj etykiety w pierwszych 3 kolumnach
    var label = '';
    for (var c = 0; c < Math.min(row.length, 3); c++) {
      var s = String(row[c] || '').trim();
      if (s) { label = s.toLowerCase(); break; }
    }
    if (!label) continue;

    if (label.indexOf('postęp') >= 0 && label.indexOf('%') >= 0) {
      lagPostep.push(extractNumericRow(row));
    } else if (label.indexOf('plan') >= 0 && label.indexOf('%') >= 0) {
      lagPlan.push(extractNumericRow(row));
    } else if (label.indexOf('on track') >= 0 || label.indexOf('track?') >= 0) {
      lagOnTrack.push(extractBoolRow(row));
    }
  }

  // === PASS 3: Zbuduj obiekty per LAG ===
  var currentIdx = weeks.indexOf(currentWeekLabel);

  function getNumVal(arr, idx) {
    if (!arr || idx < 0 || idx >= arr.length) return null;
    var v = arr[idx];
    return (typeof v === 'number') ? v : null;
  }

  function getLastNumeric(arr) {
    if (!arr) return null;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (typeof arr[i] === 'number') return arr[i];
    }
    return null;
  }

  function makeLagDetail(lagIdx) {
    var postep  = lagPostep[lagIdx]  || [];
    var plan    = lagPlan[lagIdx]    || [];
    var onTrack = lagOnTrack[lagIdx] || [];

    var history = weeks.map(function(w, i) {
      return {
        week:    w,
        postep:  getNumVal(postep, i),
        plan:    getNumVal(plan, i),
        onTrack: (onTrack[i] !== undefined) ? onTrack[i] : null
      };
    });

    // Bieżąca wartość: z bieżącego tygodnia, fallback: ostatnia niepusta
    var current = 0;
    if (currentIdx >= 0 && postep[currentIdx] !== null && postep[currentIdx] !== undefined) {
      current = postep[currentIdx];
    } else {
      current = getLastNumeric(postep) || 0;
    }

    var prev  = (currentIdx > 0) ? (getNumVal(postep, currentIdx - 1) || 0) : null;
    var delta = (prev !== null) ? (current - prev) : null;
    var onTrackNow = (currentIdx >= 0 && onTrack[currentIdx] !== undefined)
      ? onTrack[currentIdx] : null;

    return { current: current, prev: prev, delta: delta, onTrackNow: onTrackNow, history: history };
  }

  var d01 = makeLagDetail(0);
  var d02 = makeLagDetail(1);
  var d03 = makeLagDetail(2);
  var d04 = makeLagDetail(3);

  // Overall: średnia z LAG-01..04 — tylko niepuste (brak danych ≠ 0%)
  // Celowo ignorujemy B1 arkusza — formuła w arkuszu jest pomocnicza, nie źródłem prawdy
  var vals = [d01.current, d02.current, d03.current, d04.current].filter(function(v) { return v > 0; });
  var overall = vals.length ? Math.round(vals.reduce(function(a,b){return a+b;},0) / vals.length) : 0;

  return {
    weekLabel:   currentWeekLabel,
    weeks:       weeks,
    // Liczby — backward compat z sheets.js (index.html)
    lag01:       d01.current,
    lag02:       d02.current,
    lag03:       d03.current,
    lag04:       d04.current,
    overall:     overall,
    // Pełne obiekty z historią — dla os-malinovi.html Pulse Tracker
    details: {
      lag01: d01,
      lag02: d02,
      lag03: d03,
      lag04: d04
    },
    postepCount: lagPostep.length,
    // Pierwsze 5 wierszy do debugowania
    raw: values.slice(0, 5).map(function(r) {
      return r.slice(0, 8).map(function(c) { return String(c || ''); });
    })
  };
}

// ── LEAD MEASURES ─────────────────────────────────────────────────────────────
function readLeadMeasures(sheet) {
  if (!sheet) return { error: 'Brak zakładki OS_LEAD MEASURES (gid=' + GID.OS_LEAD + ')' };

  var values = sheet.getDataRange().getValues();
  return {
    raw: values.slice(0, 20).map(function(row) {
      return row.slice(0, 6).map(function(c) { return String(c || ''); });
    }),
    note: 'LEAD MEASURES — wymaga parsowania po ustaleniu struktury'
  };
}

// ── ISO week helper ───────────────────────────────────────────────────────────
function isoWeekNumber() {
  var d    = new Date();
  var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
