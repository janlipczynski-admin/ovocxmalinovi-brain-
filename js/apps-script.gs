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

// ── Główny handler ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    const tab = e && e.parameter && e.parameter.tab;

    // Tryb debug: tylko jedna zakładka
    if (tab === 'lag') {
      const result = readLagMeasures(getSheetById(ss, GID.OS_LAG));
      return jsonResponse(result);
    }

    // Pełny payload dashboardu
    const data = {
      lag:     readLagMeasures(getSheetById(ss, GID.OS_LAG)),
      lead:    readLeadMeasures(getSheetById(ss, GID.OS_LEAD)),
      updated: new Date().toISOString()
    };

    return jsonResponse(data);

  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
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

  // Skanuj WSZYSTKIE wiersze w poszukiwaniu kolumny bieżącego tygodnia
  let weekCol      = -1;
  let headerRowIdx = -1;
  outer:
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (String(values[r][c] || '').trim() === weekLabel) {
        weekCol      = c;
        headerRowIdx = r;
        break outer;
      }
    }
  }

  // Szukaj etykiety w pierwszych 4 kolumnach każdego wiersza
  function extractRow(label) {
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < Math.min(values[r].length, 4); c++) {
        if (String(values[r][c] || '').trim() === label) {
          const row = values[r];
          // Preferuj bieżący tydzień
          if (weekCol >= 0 && weekCol < row.length) {
            const v = row[weekCol];
            if (v != null && v !== '') {
              const n = Number(v);
              if (!isNaN(n)) return Math.round(n <= 1 ? n * 100 : n);
            }
          }
          // Fallback: ostatnia niepusta wartość numeryczna w wierszu
          for (let i = row.length - 1; i >= 1; i--) {
            if (row[i] !== '' && row[i] != null && !isNaN(Number(row[i]))) {
              return Math.round(Number(row[i]) <= 1 ? Number(row[i]) * 100 : Number(row[i]));
            }
          }
          return 0;
        }
      }
    }
    return 0;
  }

  const lag01 = extractRow('LAG-01 Postęp (średnia %)');
  const lag02 = extractRow('LAG-02 Postęp (średnia %)');
  const lag03 = extractRow('LAG-03 Postęp (średnia %)');

  return {
    weekLabel,
    weekCol,
    headerRowIdx,
    lag01,
    lag02,
    lag03,
    overall: Math.round((lag01 + lag02 + lag03) / 3),
    // debug: pierwsze 8 wierszy — usuń gdy wszystko działa
    raw: values.slice(0, 8).map(function(r) {
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
