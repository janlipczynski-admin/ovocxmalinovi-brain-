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
 *   GET {url}?tab=lag → tylko zakładka LAG MEASURES (debug)
 *
 * ROZSZERZANIE:
 *   Dodaj nową funkcję readXxx(sheet) i wstaw wynik do obiektu data w doGet().
 */

// ── Główny handler ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    const tab = e && e.parameter && e.parameter.tab;

    // Tryb debug: tylko jedna zakładka
    if (tab === 'lag') {
      const result = readLagMeasures(ss.getSheetByName('LAG MEASURES'));
      return jsonResponse(result);
    }

    // Pełny payload dashboardu
    const data = {
      lag:     readLagMeasures(ss.getSheetByName('LAG MEASURES')),
      lead:    readLeadMeasures(ss.getSheetByName('LEAD MEASURES')),
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
// Struktura zakładki LAG MEASURES:
//   Wiersz 1: nagłówki — kol.A = "Miara", kol.B = "Deadline", kol.C = T12, kol.D = T13, ...
//   Szukamy wierszy z etykietami "LAG-01 Postęp (średnia %)", "LAG-02 ...", "LAG-03 ..."
//   Wartości: ułamki (0.125 = 12.5%) lub procenty (41.43 = 41.43%)

function readLagMeasures(sheet) {
  if (!sheet) return { error: 'Brak zakładki LAG MEASURES' };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { error: 'Pusta zakładka LAG MEASURES' };

  // Znajdź kolumnę bieżącego tygodnia ISO (T10, T11, ...)
  const weekLabel  = 'T' + isoWeekNumber();
  const headerRow  = values[0];
  let weekCol      = -1;
  for (let i = 1; i < headerRow.length; i++) {
    if (String(headerRow[i] || '').trim() === weekLabel) { weekCol = i; break; }
  }

  function extractRow(label) {
    for (let r = 0; r < values.length; r++) {
      if (String(values[r][0] || '').trim() === label) {
        // Preferuj bieżący tydzień, fallback: ostatnia niepusta wartość
        const row = values[r];
        let v = weekCol >= 0 ? row[weekCol] : null;
        if (v == null || v === '') {
          for (let i = row.length - 1; i >= 1; i--) {
            if (row[i] !== '' && row[i] != null && !isNaN(Number(row[i]))) {
              v = row[i]; break;
            }
          }
        }
        if (v == null || v === '') return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : Math.round(n <= 1 ? n * 100 : n);
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
    lag01,
    lag02,
    lag03,
    overall: Math.round((lag01 + lag02 + lag03) / 3)
  };
}

// ── LEAD MEASURES ─────────────────────────────────────────────────────────────
//
// Placeholder — uzupełnij po udostępnieniu struktury zakładki LEAD MEASURES.
// Zwraca surowe wiersze dla debugowania (max 20 wierszy).

function readLeadMeasures(sheet) {
  if (!sheet) return { error: 'Brak zakładki LEAD MEASURES' };

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
