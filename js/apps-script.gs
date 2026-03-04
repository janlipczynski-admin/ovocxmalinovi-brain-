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
 * ENDPOINT:
 *   GET {url}         → pełny JSON ze wszystkimi danymi dashboardu
 *   GET {url}?tab=lag → tylko zakładka OS_LAG MEASURES (debug)
 *
 * ROZSZERZANIE:
 *   Dodaj nową funkcję readXxx(sheet) i wstaw wynik do obiektu data w doGet().
 */

// ── GID zakładek (odporne na zmiany nazw) ──────────────────────────────────────
// GID nie zmienia się przy zmianie nazwy zakładki — bezpieczne
const GID = {
  WIGI:                1492902022,
  OS_LAG:              322339268,
  OS_LEAD:             1844898951,
  HARVEST_LAG:         200348167,
  HARVEST_LEAD:        259840012,
  NOCOMPLAINTS_LAG:    716489223,
  NOCOMPLAINTS_LEAD:   1872002
};

// ── Helper: pobierz zakładkę po gid ───────────────────────────────────────────
function getSheetById(ss, gid) {
  return ss.getSheets().find(function(s) { return s.getSheetId() === gid; }) || null;
}

// ── ID arkusza (potrzebne gdy skrypt jest standalone, nie bound) ────────────────
const SPREADSHEET_ID = '1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ';

// ── Główny handler ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    // openById działa zarówno w standalone jak i bound script
    const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
    const tab      = e && e.parameter && e.parameter.tab;
    const callback = e && e.parameter && e.parameter.callback;

    // Tryb debug: tylko jedna zakładka
    if (tab === 'lag') {
      const result = readLagMeasures(getSheetById(ss, GID.OS_LAG));
      return jsonResponse(result, callback);
    }

    // Pełny payload dashboardu
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

// Obsługuje zarówno zwykły JSON jak i JSONP (gdy callback jest podany)
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
// Skrypt skanuje CAŁY arkusz — nie zakłada stałej pozycji nagłówków ani etykiet.
// Wartości: ułamki (0.125 = 12.5%) lub procenty (41.43 = 41.43%)

function readLagMeasures(sheet) {
  if (!sheet) return { error: 'Brak zakładki OS_LAG MEASURES (gid=' + GID.OS_LAG + ')' };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { error: 'Pusta zakładka OS_LAG MEASURES' };

  const weekLabel = 'T' + isoWeekNumber();

  // Skanuj cały arkusz — śledź weekCol (zmienia się przy każdym sub-nagłówku T10/T11/...)
  // Zbieraj wiersze z "Postęp (średnia %)" i odczytuj wartość z bieżącego weekCol
  let currentWeekCol = -1;
  const postepValues = [];

  for (let r = 0; r < values.length; r++) {
    const row = values[r];

    for (let c = 0; c < row.length; c++) {
      if (String(row[c] || '').trim() === weekLabel) { currentWeekCol = c; break; }
    }

    for (let c = 0; c < Math.min(row.length, 4); c++) {
      if (String(row[c] || '').trim().indexOf('Postęp (średnia %)') >= 0) {
        let val = 0;
        if (currentWeekCol >= 0 && currentWeekCol < row.length) {
          const v = row[currentWeekCol];
          if (v != null && v !== '') {
            const n = Number(v);
            if (!isNaN(n)) val = Math.round(n <= 1 ? n * 100 : n);
          }
        }
        postepValues.push(val);
        break;
      }
    }
  }

  const lag01   = postepValues[0] || 0;
  const lag02   = postepValues[1] || 0;
  const lag03   = postepValues[2] || 0;
  const overall = postepValues.length > 0 ? Math.round((lag01 + lag02 + lag03) / 3) : 0;

  return {
    weekLabel,
    currentWeekCol,
    postepValues,
    lag01,
    lag02,
    lag03,
    overall,
    raw: values.slice(0, 10).map(function(r) {
      return r.slice(0, 8).map(function(c) { return String(c || ''); });
    })
  };
}

// ── LEAD MEASURES ─────────────────────────────────────────────────────────────
//
// Placeholder — uzupełnij po udostępnieniu struktury zakładki LEAD MEASURES.
// Zwraca surowe wiersze dla debugowania (max 20 wierszy).

function readLeadMeasures(sheet) {
  if (!sheet) return { error: 'Brak zakładki OS_LEAD MEASURES (gid=' + GID.OS_LEAD + ')' };

  const values = sheet.getDataRange().getValues();
  // TODO: zamień na właściwy parsing po poznaniu struktury
  return {
    raw: values.slice(0, 20).map(row =>
      row.slice(0, 6).map(c => String(c || ''))
    ),
    note: 'LEAD MEASURES — wymaga parsowania po ustaleniu struktury'
  };
}

// ── PROCESY (placeholder) ─────────────────────────────────────────────────────
// function readProcesy(sheet) { ... }  ← dodaj gdy będzie zakładka MAPA PROCESÓW

// ── ISO week helper ───────────────────────────────────────────────────────────

function isoWeekNumber() {
  const d    = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
