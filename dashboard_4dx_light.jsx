'use strict';

const { useState, useEffect, useMemo } = React;

// ─── CONFIG ────────────────────────────────────────────────────────────────────

const SHEET_ID = '1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ';
const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

// GID-y arkuszy (zweryfikowane 2026-03-08)
const SHEET_DEFS = [
  { key: 'WIGI',              param: 'gid=1699564336' },
  { key: 'OS_LAG',            param: 'gid=322339268' },
  { key: 'OS_LEAD',           param: 'gid=2102307131' },   // poprawiony GID
  { key: 'HARVEST_LAG',       param: 'gid=200348167' },
  { key: 'HARVEST_LEAD',      param: 'gid=259840012' },
];

// Dane statyczne (kolory, właściciele, deadline) — nie w Sheets
const WIG_STATIC = [
  { key: 'OS',           color: '#6366f1', owner: 'Jan',     deadline: '2026-05-30' },
  { key: 'HARVEST',      color: '#f59e0b', owner: 'Kacper',  deadline: '' },
  { key: 'NOCOMPLAINTS', color: '#22c55e', owner: 'Olgierd', deadline: '' },
  { key: 'XPRODUCT',     color: '#ef4444', owner: 'Jan',     deadline: '' },
];

// Aktywne pary LAG/LEAD — na razie tylko OS
const WIG_PAIRS = [
  { key: 'OS',      lagKey: 'OS_LAG',      leadKey: 'OS_LEAD' },
  { key: 'HARVEST', lagKey: 'HARVEST_LAG', leadKey: 'HARVEST_LEAD' },
];

const WEEKS = ['T10','T11','T12','T13','T14','T15','T16','T17','T18'];

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS  = "'Plus Jakarta Sans', system-ui, sans-serif";

// ─── UTILS ─────────────────────────────────────────────────────────────────────

function ss(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function sf(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(',', '.');
  if (str.endsWith('%')) { const n = parseFloat(str); return isNaN(n) ? 0 : n / 100; }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function findRow(rows, col, pattern, regex = false) {
  for (let i = 0; i < rows.length; i++) {
    const val = ss(rows[i]?.[col]);
    if (regex ? new RegExp(pattern, 'i').test(val) : val.toLowerCase().includes(pattern.toLowerCase())) return i;
  }
  return null;
}

function findRows(rows, col, pattern, regex = false) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const val = ss(rows[i]?.[col]);
    if (regex ? new RegExp(pattern, 'i').test(val) : val.toLowerCase().includes(pattern.toLowerCase())) out.push(i);
  }
  return out;
}

// Szuka kolumn T10–T18 w wierszu nagłówkowym.
// Zgodnie z wskazówką: czytaj .v (liczba 10–18), nie .f.
// Dlatego fetchGvizSheet zwraca cell.v, a tu mapujemy 10→T10 itd.
function findWeekColumns(rows, headerRow) {
  const wc = {};
  if (headerRow === null || headerRow === undefined) return wc;
  const scanRow = (ri) => {
    if (ri < 0 || !rows[ri]) return;
    rows[ri].forEach((cell, i) => {
      const v = ss(cell);
      if (WEEKS.includes(v) && !(v in wc)) { wc[v] = i; return; }
      // gviz zwraca v=10 dla komórek z liczbą 10 (format kolumny tygodniowej)
      if (typeof cell === 'number' && Number.isInteger(cell) && cell >= 10 && cell <= 18) {
        const wk = 'T' + cell;
        if (WEEKS.includes(wk) && !(wk in wc)) wc[wk] = i;
      }
    });
  };
  scanRow(headerRow);
  if (Object.keys(wc).length < 2) scanRow(headerRow - 1);
  if (Object.keys(wc).length < 2) scanRow(headerRow - 2);
  return wc;
}

// Fallback dla arkuszy LAG gdy gviz nie zwraca labeli tygodniowych.
// Kolumny C–H (indeksy 2–7) to T10–T15 w arkuszach *_LAG MEASURES.
function lagWeekColsFallback(wc) {
  if (Object.keys(wc).length >= 2) return wc;
  const fb = {};
  ['T10','T11','T12','T13','T14','T15'].forEach((w, i) => { fb[w] = i + 2; });
  console.warn('[4DX parseLag] brak labeli tygodniowych — fallback C-H (2-7)');
  return fb;
}

// Fallback dla arkuszy LEAD gdy gviz nie zwraca labeli tygodniowych.
// Kolumny D–I (indeksy 3–8) to T10–T15 w arkuszach *_LEAD MEASURES.
function leadWeekColsFallback(wc) {
  if (Object.keys(wc).length >= 2) return wc;
  const fb = {};
  ['T10','T11','T12','T13','T14','T15'].forEach((w, i) => { fb[w] = i + 3; });
  console.warn('[4DX parseLead] brak labeli tygodniowych — fallback D-I (3-8)');
  return fb;
}

function getWeekValues(rows, row, weekCols) {
  if (row === null || row === undefined || !rows[row]) return WEEKS.map(() => 0);
  return WEEKS.map(w => weekCols[w] !== undefined ? sf(rows[row][weekCols[w]]) : 0);
}

// ─── FETCH ─────────────────────────────────────────────────────────────────────

// headers=0: wszystkie wiersze zwracane jako dane (gviz nie "zjada" pierwszego wiersza jako nagłówka).
// cell.v: czytamy wartość surową, nie sformatowaną (.f może być niepoprawna dla liczb 10-18).
async function fetchGvizSheet(param) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0&${param}&_t=${Date.now()}`;
  console.log('[4DX fetch]', param);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} dla parametru: ${param}`);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Nieprawidłowy format odpowiedzi gviz');
  const table = JSON.parse(match[1]).table;
  const rows = table.rows || [];
  console.log(`[4DX] ${param}: ${rows.length} wierszy × ${rows[0]?.c?.length ?? 0} kol. | pierwsze 5:`,
    rows.slice(0, 5).map(r => r?.c?.map(c => c?.v === null || c?.v === undefined ? '∅' : c?.v)));
  return rows;
}

// ─── PARSERY ───────────────────────────────────────────────────────────────────

function parseWigs(rows) {
  let currentWeek = 'T10';
  let wigs = [];

  // Wiersz 0: col E (indeks 4) = aktualny tydzień
  if (rows[0]) {
    for (let c = 0; c < (rows[0].c || []).length; c++) {
      const v = rows[0].c[c] ? rows[0].c[c].v : null;
      if (typeof v === 'number' && v >= 10 && v <= 30) {
        currentWeek = `T${Math.round(v)}`;
        break;
      }
    }
  }
  console.log('[parseWigs] currentWeek:', currentWeek);

  // WIG-i — wiersze z "WIG#X" w col C (indeks 2)
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i].c;
    if (!c) continue;
    const colC = c[2] ? String(c[2].v || '') : '';
    if (colC.startsWith('WIG#')) {
      const name = c[1] ? String(c[1].v || '') : '';
      const desc = c[3] ? String(c[3].v || '') : '';
      wigs.push({ id: colC, name, description: desc });
      console.log(`[parseWigs] ${colC}: ${name} — ${desc.substring(0, 50)}...`);
    }
  }

  return { currentWeek, wigs };
}

function parseLag(rows, currentWeek) {
  const result = { wig_status: 0, lag01: null, additional_lags: [], wig_description: '' };

  // Helper: bezpieczne czytanie wartości z komórki gviz
  function cellVal(row, colIdx) {
    if (!row || !row.c || !row.c[colIdx]) return null;
    return row.c[colIdx].v;
  }
  function cellStr(row, colIdx) {
    const v = cellVal(row, colIdx);
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }
  function cellNum(row, colIdx) {
    const v = cellVal(row, colIdx);
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    // Handle string percentages "28,57%" or "0.2"
    const s = String(v).replace(',', '.').replace('%', '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : (s.includes('%') || n > 1 ? n / 100 : n);
  }

  // 1. WIG Status — wiersz z "WIG Status" w col A
  for (let i = 0; i < rows.length; i++) {
    if (cellStr(rows[i], 0) === 'WIG Status') {
      // Wartość w col B — może być string "3,02%" lub number 0.03
      const raw = cellVal(rows[i], 1);
      if (typeof raw === 'number') {
        result.wig_status = raw;
      } else if (typeof raw === 'string') {
        const s = raw.replace(',', '.').replace('%', '');
        result.wig_status = parseFloat(s) / (raw.includes('%') ? 100 : 1) || 0;
      }
      break;
    }
  }

  // 2. WIG Description — wiersz z deadline (data) w col A, opis w col B
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    if (a.match(/^20\d\d-\d\d-\d\d/)) {  // np. "2026-05-30"
      result.wig_description = cellStr(rows[i], 1);
      result.wig_deadline = a;
      break;
    }
  }

  // 3. Znajdź header procesów — wiersz z "Proces" w col A
  let processHeaderRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    if (a === 'Proces' || a === 'Process') {
      processHeaderRow = i;
      console.log('[parseLag] processHeaderRow:', i, 'col A:', a, 'col B:', cellStr(rows[i], 1));
      break;
    }
  }

  // 4. Znajdź wiersz "LAG-01 Postęp"
  let lag01ProgressRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    if (a.includes('LAG-01') && a.toLowerCase().includes('post')) {
      lag01ProgressRow = i;
      break;
    }
  }

  // 5. Kolumny tygodniowe — ZAWSZE C-H (indeksy 2-7) dla LAG
  const weekCols = { T10: 2, T11: 3, T12: 4, T13: 5, T14: 6, T15: 7 };
  const weekKey = currentWeek; // np. "T10"
  const weekColIdx = weekCols[weekKey];

  // 6. Parsuj procesy LAG-01
  if (processHeaderRow >= 0 && lag01ProgressRow >= 0) {
    const processes = [];
    for (let i = processHeaderRow + 1; i < lag01ProgressRow; i++) {
      const name = cellStr(rows[i], 0);
      if (!name) continue;
      const values = {};
      for (const [wk, ci] of Object.entries(weekCols)) {
        values[wk] = cellNum(rows[i], ci);
      }
      processes.push({ name, values });
      console.log(`[parseLag] proces: "${name}" | T10: ${values.T10} (1.0=ukończone)`);
    }
    const progress = cellNum(rows[lag01ProgressRow], weekColIdx);
    result.lag01 = {
      processes,
      progress,
      done: processes.filter(p => p.values[weekKey] >= 0.99).length,
      total: processes.length
    };
    console.log(`[parseLag] LAG-01: ${result.lag01.done}/${result.lag01.total} procesów, postęp: ${progress}`);
  } else {
    console.error('[parseLag] NIE ZNALEZIONO processHeaderRow lub lag01ProgressRow!',
      { processHeaderRow, lag01ProgressRow });
    result.lag01 = { processes: [], progress: 0, done: 0, total: 0 };
  }

  // 7. Dodatkowe LAG-i (LAG-02, LAG-03, ..., LAG-N)
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    const match = a.match(/^LAG-0?(\d+)\s*[—–-]/);
    if (match && parseInt(match[1]) >= 2) {
      const lagName = a;
      const lagNum = parseInt(match[1]);

      // Znajdź wiersz Postęp dla tego LAG-a
      let progressRow = -1;
      let progressVal = 0;
      for (let j = i + 1; j < Math.min(i + 20, rows.length); j++) {
        const ja = cellStr(rows[j], 0);
        if (ja.includes(`LAG-0${lagNum}`) && ja.toLowerCase().includes('post')) {
          progressRow = j;
          // Postęp może być w kolumnie B lub w kolumnie weekColIdx
          const fromWeekCol = cellNum(rows[j], weekColIdx);
          const fromColB = cellNum(rows[j], 1);
          progressVal = fromWeekCol || fromColB;
          break;
        }
        // Jeśli trafimy na następny LAG marker, stop
        if (ja.match(/^LAG-0?\d+\s*[—–-]/) && !ja.includes(`LAG-0${lagNum}`)) break;
      }

      // Policz kryteria
      let criteria = 0;
      let headerRow = -1;
      for (let j = i + 1; j < Math.min(i + 3, rows.length); j++) {
        const ja = cellStr(rows[j], 0).toLowerCase();
        if (ja.includes('measure') || ja.includes('target')) {
          headerRow = j;
          break;
        }
      }
      if (headerRow >= 0) {
        for (let j = headerRow + 1; j < Math.min(headerRow + 10, rows.length); j++) {
          const ja = cellStr(rows[j], 0);
          if (!ja || ja.includes('LAG-') || ja === '') break;
          criteria++;
        }
      }

      const is_tbd = cellStr(rows[headerRow + 1] || rows[i], 1).toUpperCase() === 'TBD';

      result.additional_lags.push({
        id: `LAG-0${lagNum}`,
        name: lagName,
        progress: progressVal,
        criteria,
        is_tbd,
      });
      console.log(`[parseLag] ${lagName} | postęp T10: ${progressVal} | kryteria: ${criteria} | tbd: ${is_tbd}`);
    }
  }

  return result;
}

function parseLead(rows, currentWeek) {
  const result = { lead_score: 0, leads: [] };

  function cellVal(row, colIdx) {
    if (!row || !row.c || !row.c[colIdx]) return null;
    return row.c[colIdx].v;
  }
  function cellStr(row, colIdx) {
    const v = cellVal(row, colIdx);
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }
  function cellNum(row, colIdx) {
    const v = cellVal(row, colIdx);
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(',', '.').replace('%', '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function scanWeekCols(row) {
    const wc = {};
    for (let c = 2; c < (row?.c || []).length; c++) {
      const v = cellVal(row, c);
      if (typeof v === 'number' && Number.isInteger(v) && v >= 10 && v <= 30) {
        wc[`T${v}`] = c;
      } else if (typeof v === 'string' && /^T?\d+$/.test(v)) {
        const num = parseInt(v.replace('T', ''));
        if (num >= 10 && num <= 30) wc[`T${num}`] = c;
      }
    }
    return wc;
  }

  // Szukaj GŁÓWNEGO nagłówka (wiersz z "Deadline" w col A lub B) — skanuj WSZYSTKIE wiersze
  const weekCols = {};
  let mainHeaderRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0).toLowerCase();
    const b = cellStr(rows[i], 1).toLowerCase();
    if (a.startsWith('deadline') || b.startsWith('deadline')) {
      mainHeaderRow = i;
      const found = scanWeekCols(rows[i]);
      Object.assign(weekCols, found);
      break;
    }
  }

  // Fallback jeśli nie znaleziono
  if (Object.keys(weekCols).length === 0) {
    console.warn('[parseLead] fallback kolumn: D=T10, E=T11, ..., I=T15');
    for (let w = 10; w <= 15; w++) weekCols[`T${w}`] = w - 7; // D=3, E=4, ..., I=8
  }
  console.log('[parseLead] weekCols:', weekCols, '| mainHeaderRow:', mainHeaderRow);

  const weekKey = currentWeek;
  const weekColIdx = weekCols[weekKey];

  // LEAD score — szukaj w WSZYSTKICH wierszach "LEAD score" w col B lub A
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0).toLowerCase();
    const b = cellStr(rows[i], 1).toLowerCase();
    if (b.includes('lead score') || a.includes('lead score')) {
      result.lead_score = weekColIdx !== undefined ? cellNum(rows[i], weekColIdx) : 0;
      console.log('[parseLead] LEAD score row', i, ':', result.lead_score);
      break;
    }
  }

  // Znajdź WSZYSTKIE markery Lead-ów
  // Format: "Lead X - nazwa" LUB "Lead X — nazwa" (podwójna spacja też OK)
  // Regex: /^Lead\s*(\d+)\s*[-–—]/i  (wymaga myślnika po numerze)
  // Fallback: SUB-WIG X (stary format)
  // Wykluczenia: wiersze "Postęp" i "On track"
  const leadMarkers = [];
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    const aLow = a.toLowerCase();
    if (aLow.includes('post') || aLow.includes('on track')) continue;

    const leadMatch  = a.match(/^Lead\s*(\d+)\s*[-–—]/i);
    const subWigMatch = a.match(/^SUB-WIG\s*(\d+)/i);

    if (leadMatch || subWigMatch) {
      leadMarkers.push({ row: i, name: a, num: leadMatch ? leadMatch[1] : subWigMatch[1] });
      console.log(`[parseLead] marker: row ${i}: "${a}"`);
    }
  }
  if (leadMarkers.length === 0) {
    console.warn('[parseLead] BRAK markerów Lead! Pierwsze 15 wierszy col A:',
      rows.slice(0, 15).map((r, i) => `[${i}]="${r?.c?.[0]?.v ?? 'null'}"`).join(' | '));
  }

  // Parsuj każdy Lead
  for (let idx = 0; idx < leadMarkers.length; idx++) {
    const marker = leadMarkers[idx];
    const nextMarkerRow = idx + 1 < leadMarkers.length ? leadMarkers[idx + 1].row : rows.length;

    // Znajdź nagłówek tego LEAD-a (wiersz z "Deadline" po markerze, max 6 wierszy dalej)
    let headerRow = -1;
    for (let j = marker.row + 1; j < Math.min(marker.row + 6, rows.length); j++) {
      const a = cellStr(rows[j], 0).toLowerCase();
      const b = cellStr(rows[j], 1).toLowerCase();
      if (a.startsWith('deadline') || b.startsWith('deadline')) {
        headerRow = j;
        break;
      }
    }

    // Kolumny tygodniowe dla tego LEAD-a (wykrywane z jego headera)
    let leadWeekCols = weekCols;
    if (headerRow >= 0) {
      const lc = scanWeekCols(rows[headerRow]);
      if (Object.keys(lc).length >= 2) leadWeekCols = lc;
    }
    const leadWeekColIdx = leadWeekCols[weekKey];

    // Znajdź zadania (col A = numer tygodnia, col B = opis)
    // Jeśli brak lokalnego headera Deadline — skanuj od razu od wiersza za markerem
    const taskStartRow = headerRow >= 0 ? headerRow + 1 : marker.row + 1;
    const tasks = [];
    for (let j = taskStartRow; j < nextMarkerRow; j++) {
      const a = cellStr(rows[j], 0);
      const b = cellStr(rows[j], 1);
      const aLow = a.toLowerCase();
      if (aLow.includes('post') || aLow.includes('on track')) continue;
      if (a.match(/^\d+$/) && b) {
        const values = {};
        for (const [wk, ci] of Object.entries(leadWeekCols)) {
          values[wk] = cellNum(rows[j], ci);
        }
        tasks.push({ deadline: `T${parseInt(a)}`, desc: b, values,
          done: (values[weekKey] ?? 0) >= 0.99 });
      }
    }

    // Znajdź wiersz Postęp i On track
    let progressVal = 0;
    let onTrackVal = 'brak';
    for (let j = marker.row; j < nextMarkerRow; j++) {
      const a = cellStr(rows[j], 0).toLowerCase();
      // Postęp: "Lead X ... post..." lub "Leas X ... post..." (literówka)
      if (a.includes('post') && (a.includes('lead') || a.includes('leas') || a.includes('sub-wig'))) {
        progressVal = leadWeekColIdx !== undefined ? cellNum(rows[j], leadWeekColIdx) : 0;
        console.log(`[parseLead] ${marker.name} Postęp row ${j}: ${progressVal}`);
      }
      if (a.includes('on track') && (a.includes('lead') || a.includes('sub-wig'))) {
        onTrackVal = leadWeekColIdx !== undefined ? (cellStr(rows[j], leadWeekColIdx) || 'brak') : 'brak';
      }
    }

    const doneCount = tasks.filter(t => t.done).length;
    result.leads.push({
      id: `Lead ${marker.num}`,
      name: marker.name,
      progress: progressVal,
      onTrack: onTrackVal,
      tasks,
      done: doneCount,
      total: tasks.length,
    });
    console.log(`[parseLead] ${marker.name} | postęp: ${progressVal} | on_track: ${onTrackVal} | zadań: ${doneCount}/${tasks.length}`);
  }

  return result;
}

function parseMapa(rows) {
  let headerRow = null;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue;
    const rowText = rows[i].slice(0, 5).map(ss).join(' ').toUpperCase();
    if (rowText.includes('#') && rowText.includes('TYP') && rowText.includes('PROCES')) {
      headerRow = i; break;
    }
  }
  if (headerRow === null) return [];
  const processes = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const pid = ss(rows[r]?.[0]);
    if (!pid || !/^\d+$/.test(pid)) break;
    processes.push({ id: parseInt(pid, 10), type: ss(rows[r][1]), name: ss(rows[r][2]),
      owner: ss(rows[r][3]), version: ss(rows[r][4]), status: ss(rows[r][5]) });
  }
  return processes;
}

function countBacklog(rows) {
  let headerRow = null;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue;
    const rowText = rows[i].slice(0, 15).map(ss).join(' ').toUpperCase();
    if (rowText.includes('KATEGORIA') && rowText.includes('STATUS')) { headerRow = i; break; }
  }
  if (headerRow === null) return null;
  let count = 0;
  for (let r = headerRow + 1; r < rows.length; r++) {
    if (rows[r]?.slice(0, 15).some(v => ss(v) !== '')) count++;
  }
  return count;
}

// ─── LOADER ────────────────────────────────────────────────────────────────────

async function loadDashboardData() {
  const results = await Promise.allSettled(
    SHEET_DEFS.map(def => fetchGvizSheet(def.param).then(rows => ({ key: def.key, rows })))
  );

  const sheets = {};
  const fetchErrors = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { key, rows } = r.value;
      const def = SHEET_DEFS.find(d => d.key === key);
      console.log(`[loadDashboardData] ${key} gid=${def?.param ?? '?'}, wierszy: ${rows.length}`);
      sheets[key] = rows;
    } else {
      fetchErrors.push(r.reason?.message || 'unknown');
    }
  }
  // Weryfikacja kluczowych arkuszy
  if (sheets['OS_LEAD']) {
    const firstCells = sheets['OS_LEAD'].slice(0, 8).map((r, i) => `[${i}]="${r?.[0] ?? r?.c?.[0]?.v ?? '∅'}"`).join(' | ');
    console.log('[loadDashboardData] OS_LEAD gid=2102307131, pierwsze kol.A:', firstCells);
  } else {
    console.warn('[loadDashboardData] OS_LEAD brak danych — fetch nie powiódł się');
  }
  if (!Object.keys(sheets).length) {
    throw new Error('Nie udało się pobrać żadnego arkusza. '
      + 'Sprawdź: Plik → Udostępnij → Opublikuj w internecie (Cały dokument). '
      + 'Błędy: ' + fetchErrors.join('; '));
  }

  // Aktualny tydzień z WIGI!E1
  const { wigs: wigDefs, currentWeek } = parseWigs(sheets['WIGI'] || []);

  const wigs = WIG_STATIC.map((stat, i) => {
    const wigDescription = wigDefs[i]?.description || '';
    return {
      key: stat.key, color: stat.color, owner: stat.owner, deadline: stat.deadline,
      name:        wigDefs[i]?.name || stat.key,
      id:          wigDefs[i]?.id   || `WIG#${i + 1}`,
      description: wigDescription,  // fallback uzupełniamy po parsowaniu LAG-ów poniżej
    };
  });

  const wig_data = {};
  for (const { key, lagKey, leadKey } of WIG_PAIRS) {
    const lagRows  = sheets[lagKey];
    const leadRows = sheets[leadKey];
    if (!lagRows) { wig_data[key] = { has_data: false }; continue; }
    const lag      = parseLag(lagRows, currentWeek);
    const lead     = leadRows
      ? parseLead(leadRows, currentWeek)
      : { lead_score: 0, leads: [] };
    const has_data = lag.wig_status > 0 || (lag.lag01?.processes?.length || 0) > 0;
    wig_data[key]  = { has_data, lag, lead };
  }
  // WIG-i bez arkuszy
  for (const ws of WIG_STATIC) {
    if (!wig_data[ws.key]) wig_data[ws.key] = { has_data: false };
  }

  // Fallback opisu WIG-a: jeśli WIGI kol. D zwróciło null → bierz z *_LAG wig_description
  for (let i = 0; i < wigs.length; i++) {
    if (!wigs[i].description) {
      const lagData = wig_data[wigs[i].key]?.lag;
      const fallback = lagData?.wig_description || '';
      if (fallback) {
        console.log(`[loadDashboardData] opis WIG "${wigs[i].key}" z WIGI kol.D = null → fallback z *_LAG: "${fallback}"`);
        wigs[i] = { ...wigs[i], description: fallback };
      }
    }
  }

  return { wigs, wig_data, currentWeek };
}

// ─── UI COMPONENTS ─────────────────────────────────────────────────────────────

const ProgressRing = ({ value, size = 96, stroke = 9, color }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(Math.max(value, 0), 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eaecf3" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform:'rotate(90deg)', transformOrigin:'center',
                 fontSize: size * 0.21, fontWeight: 700, fill: '#1a2030', fontFamily: FONT_SANS }}>
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
};

const ProgressBar = ({ value, color, height = 5 }) => (
  <div style={{ width: '100%', height, borderRadius: height, background: '#eaecf3' }}>
    <div style={{ width: `${Math.min(value * 100, 100)}%`, height: '100%', borderRadius: height,
      background: color, transition: 'width 0.4s ease' }} />
  </div>
);

const Sparkline = ({ values, color, wi }) => {
  const max = Math.max(...values, 0.01);
  const W = 80, H = 24, bw = W / values.length;
  return (
    <svg width={W} height={H} style={{ flexShrink: 0, display: 'block' }}>
      {values.map((v, i) => {
        const barH = Math.max(Math.round((v / max) * (H - 3)), v > 0 ? 2 : 0);
        return (
          <rect key={i} x={i * bw + 1} y={H - barH} width={bw - 2} height={barH}
            rx={2} fill={color} opacity={i === wi ? 1 : 0.3} />
        );
      })}
    </svg>
  );
};

const TbdBadge = () => (
  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12,
    background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>TBD</span>
);


// ─── SCOREBOARD ROW ────────────────────────────────────────────────────────────
// lead i lag to znormalizowane obiekty: { name, values (tablica 9 tyg), tasks/processes, is_tbd, ... }

const ScoreboardRow = ({ lead, lag, wi, wigColor }) => {
  const [open, setOpen] = useState(false);

  const lagProg  = lag  ? (lag.progress ?? 0) : 0;
  const leadProg = lead ? (lead.progress ?? 0) : 0;

  const lagLabel  = lag  ? ss(lag.name).match(/^LAG-\d+/i)?.[0]  || lag.name  : '—';
  const lagDesc   = lag  ? ss(lag.name).split(/—(.+)/)[1]?.trim() || ''        : '';
  const leadLabel = lead ? ss(lead.name).match(/^(Lead|SUB-WIG)\s+\d+/i)?.[0] || lead.name : '—';
  const leadDesc  = lead ? ss(lead.name).split(/[-—](.+)/)[1]?.trim() || ''    : '';

  const leadSparkValues = WEEKS.map(() => lead?.progress || 0);
  const lagSparkValues  = WEEKS.map(() => lag?.progress  || 0);

  return (
    <div style={{ borderBottom: '1px solid #eaecf3', background: open ? '#f8f9fe' : '#fff',
      transition: 'background 0.15s' }}>
      {/* ── MAIN ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        {/* LAG cell — wynik (po lewej) */}
        <div style={{ padding: '13px 20px 13px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 11,
              background: wigColor + '18', color: wigColor, whiteSpace: 'nowrap' }}>{lagLabel}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2030', flex: 1,
              lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lagDesc || lagLabel}
            </span>
            {lag?.is_tbd && <TbdBadge />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ flex: 1 }}>
              {lag?.is_tbd
                ? <div style={{ height: 5, background: '#fef3c7', borderRadius: 5 }} />
                : <ProgressBar value={lagProg} color={wigColor} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: lag?.is_tbd ? '#92400e' : wigColor,
              minWidth: 34, textAlign: 'right' }}>
              {lag?.is_tbd ? 'TBD' : `${Math.round(lagProg * 100)}%`}
            </span>
            {!lag?.is_tbd && <Sparkline values={lagSparkValues} color={wigColor} wi={wi} />}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lagProg > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                On track
              </span>
            )}
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {lag?.isLag01
                ? `${lag.processes?.filter(p => (p.values[WEEKS[wi]] ?? 0) >= 0.99).length ?? 0}/${lag.processes?.length ?? 0} proc.`
                : lag ? `${typeof lag.criteria === 'number' ? lag.criteria : (lag.criteria?.length ?? 0)} kryt.` : '—'}
            </span>
          </div>
        </div>

        {/* Arrow ← LEAD wpływa na LAG */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f1f3f8', borderLeft: '1px solid #eaecf3', borderRight: '1px solid #eaecf3',
          fontSize: 15, color: wigColor, fontWeight: 700 }}>←</div>

        {/* LEAD cell — działania (po prawej) */}
        <div style={{ padding: '13px 20px 13px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 11,
              background: '#eff0ff', color: '#4f46e5', whiteSpace: 'nowrap' }}>{leadLabel}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2030', flex: 1,
              lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {leadDesc || leadLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ flex: 1 }}><ProgressBar value={leadProg} color="#6366f1" /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', minWidth: 34, textAlign: 'right' }}>
              {Math.round(leadProg * 100)}%
            </span>
            <Sparkline values={leadSparkValues} color="#6366f1" wi={wi} />
          </div>
          {lead && (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {lead.tasks.filter(t => t.done).length}/{lead.tasks.length} zadań
            </div>
          )}
        </div>
      </div>

      {/* ── EXPANDED ── */}
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr',
          borderTop: '1px solid #eaecf3', background: '#f3f5fb' }}>
          {/* LAG details — po lewej */}
          <div style={{ padding: '12px 20px 16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9,
              color: wigColor, marginBottom: 10 }}>
              {lag?.isLag01 ? 'Procesy DoD' : 'Kryteria LAG'}
            </div>
            {lag?.isLag01 ? (
              lag.processes?.map((p, i) => {
                const val = p.values[WEEKS[wi]] ?? 0;
                return (
                  <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                      background: val >= 0.99 ? '#22c55e' : '#dde1ea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {val >= 0.99 && <span style={{ color:'#fff', fontSize:8, fontWeight:800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: val >= 0.99 ? '#1a2030' : '#64748b', flex: 1 }}>
                      {p.name}
                    </span>
                  </div>
                );
              })
            ) : lag?.criteria?.length ? lag.criteria.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: '#4b5563', marginBottom: 5,
                paddingLeft: 11, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: wigColor, fontWeight: 700 }}>›</span>
                {c}
              </div>
            )) : (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                {lag?.is_tbd ? 'Kryteria do zdefiniowania' : 'Brak danych'}
              </div>
            )}
          </div>

          <div style={{ background: '#e8eaf2', borderLeft: '1px solid #eaecf3', borderRight: '1px solid #eaecf3' }} />

          {/* LEAD tasks — po prawej */}
          <div style={{ padding: '12px 20px 16px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9,
              color: '#6366f1', marginBottom: 10 }}>Zadania LEAD</div>
            {lead?.tasks?.length ? lead.tasks.map((t, i) => {
              const val  = t.values[WEEKS[wi]] ?? 0;
              const done = t.done || val >= 1;
              const wip  = val >= 0.5 && !done;
              return (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    background: done ? '#22c55e' : wip ? '#f59e0b' : '#dde1ea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {done && <span style={{ color:'#fff', fontSize:9, fontWeight:800 }}>✓</span>}
                    {wip  && <span style={{ color:'#fff', fontSize:9 }}>…</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: done ? '#1a2030' : '#64748b', lineHeight: 1.4 }}>
                      {t.desc}
                    </div>
                    {t.deadline && (
                      <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 1 }}>{t.deadline}</div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Brak zadań</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────

export default function Dashboard4DX() {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeWig,    setActiveWig]    = useState('OS');
  const [selectedWeek, setSelectedWeek] = useState(WEEKS[0]);
  const [lastUpdated,  setLastUpdated]  = useState(null);

  function doLoad() {
    setLoading(true);
    setError(null);
    loadDashboardData()
      .then(d => {
        setData(d);
        setLastUpdated(new Date());
        if (d.currentWeek && WEEKS.includes(d.currentWeek)) setSelectedWeek(d.currentWeek);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { doLoad(); }, []);

  const wi      = WEEKS.indexOf(selectedWeek);
  const wm      = data?.wigs.find(w => w.key === activeWig);
  const wd      = data?.wig_data[activeWig];

  const daysLeft = useMemo(() => {
    if (!wm?.deadline) return null;
    return Math.ceil((new Date(wm.deadline) - new Date()) / 86400000);
  }, [wm]);

  // Normalizuj dane do jednorodnego formatu dla ScoreboardRow
  const { allLags, allLeads, kpi } = useMemo(() => {
    if (!wd?.has_data) return { allLags: [], allLeads: [], kpi: null };
    const { lag, lead } = wd;

    // LAG-01 normalizowany: progress = scalar bieżącego tygodnia, isLag01 = true
    const lag01norm = {
      name:      'LAG-01 — % procesów opisanych wg DoD',
      is_tbd:    false,
      isLag01:   true,
      progress:  lag.lag01?.progress || 0,
      processes: lag.lag01?.processes || [],
      criteria:  [],
    };
    const lags  = [lag01norm, ...lag.additional_lags.map(l => ({ ...l, isLag01: false }))];
    const leads = lead.leads || [];

    const activeLags  = lags.filter(l => !l.is_tbd).length;
    const activeLeads = leads.length;
    const onTrackCnt  = lags.filter(l => {
      if (l.is_tbd) return false;
      return (l.progress ?? 0) > 0;
    }).length;
    const avgLag = lag.wig_status || 0;

    return { allLags: lags, allLeads: leads, kpi: { activeLags, activeLeads, onTrackCnt, avgLag } };
  }, [wd, wi]);

  const pairCount = Math.max(allLags.length, allLeads.length);

  const Fonts = () => (
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  );

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ fontFamily: FONT_SANS, background: '#f4f6fb', minHeight: '100vh' }}>
      <Fonts />
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ background: '#fff', borderBottom: '1px solid #e8edf2', padding: '16px 28px',
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 19, fontWeight: 700, fontFamily: FONT_SERIF, color: '#1a2030' }}>4DX Scoreboard</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Pobieranie danych z Google Sheets…</span>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 12 }}>
        {[80, 56, 56, 56, 56, 56].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 12, background: '#e8edf2',
            animation: `shimmer 1.4s infinite`, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ fontFamily: FONT_SANS, background: '#f4f6fb', minHeight: '100vh' }}>
      <Fonts />
      <div style={{ maxWidth: 620, margin: '60px auto', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #fca5a5',
          padding: '28px 32px', boxShadow: '0 4px 24px #ef44440d' }}>
          <div style={{ fontSize: 21, fontWeight: 400, fontFamily: FONT_SERIF, color: '#dc2626', marginBottom: 10 }}>
            Błąd ładowania danych
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.65 }}>{error}</div>
          <div style={{ fontSize: 12, background: '#fef2f2', borderRadius: 10, padding: '14px 16px',
            color: '#9f1239', marginBottom: 20, lineHeight: 1.7 }}>
            <b>Checklista:</b><br />
            1. Plik → Udostępnij → Opublikuj w internecie → Cały dokument<br />
            2. Sprawdź GID-y arkuszy (OS_LEAD: 2102307131)<br />
            3. ID arkusza: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{SHEET_ID}</code>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={doLoad}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: FONT_SANS }}>
              Spróbuj ponownie
            </button>
            <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
              style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e2e8f0',
                color: '#64748b', fontSize: 13, textDecoration: 'none', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5 }}>
              Otwórz arkusz ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (!data || !wm) return null;

  // ── MAIN ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT_SANS, background: '#f4f6fb', minHeight: '100vh', color: '#1a2030' }}>
      <Fonts />

      {/* HEADER */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8edf2', padding: '13px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px #0000000a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="index.html" style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none',
            fontWeight: 500, letterSpacing: 0.3 }}>← Strona główna</a>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <span style={{ fontSize: 19, fontWeight: 400, fontFamily: FONT_SERIF, color: '#1a2030' }}>
            4DX Scoreboard
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>OvocxMalinovi 2026</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {WEEKS.map(w => (
            <button key={w} onClick={() => setSelectedWeek(w)}
              style={{ padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: FONT_SANS,
                background: w === selectedWeek ? '#6366f1' : '#f1f3f8',
                color:      w === selectedWeek ? '#fff'    : '#64748b',
                transition: 'all 0.12s' }}>
              {w}
            </button>
          ))}
          <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
            style={{ padding: '5px 11px', borderRadius: 20, border: '1px solid #e2e8f0',
              fontSize: 11, fontWeight: 600, color: '#64748b', textDecoration: 'none',
              background: '#fafbfc', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            Google Sheets
          </a>
          <button onClick={doLoad} title="Odśwież dane"
            style={{ padding: '5px 10px', borderRadius: 20, border: '1px solid #e2e8f0',
              background: '#fafbfc', cursor: 'pointer', fontSize: 14, color: '#6366f1' }}>↻</button>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#b0b8c8' }}>
              {lastUpdated.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* WIG TABS */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8edf2' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', overflowX: 'auto' }}>
          {data.wigs.map(wig => {
            const d   = data.wig_data[wig.key];
            const pct = d?.has_data ? Math.round((d.lag?.wig_status || 0) * 100) : null;
            const act = wig.key === activeWig;
            return (
              <button key={wig.key} onClick={() => setActiveWig(wig.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                  border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: FONT_SANS,
                  borderBottom: act ? `3px solid ${wig.color}` : '3px solid transparent',
                  transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                  color: act ? wig.color : '#94a3b8' }}>{wig.id}</span>
                <span style={{ fontSize: 13, fontWeight: act ? 700 : 500,
                  color: act ? '#1a2030' : '#64748b' }}>{wig.name}</span>
                {pct !== null
                  ? <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 12,
                      background: act ? wig.color + '18' : '#f1f3f8',
                      color: act ? wig.color : '#94a3b8' }}>{pct}%</span>
                  : <span style={{ fontSize: 12, color: '#e2e8f0' }}>—</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 16px' }}>

        {/* WIG HERO CARD */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '22px 26px', marginBottom: 16,
          border: '1px solid #e8edf2', boxShadow: `0 0 0 3px ${wm.color}10, 0 4px 24px #00000008` }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <ProgressRing value={wd?.has_data ? (wd.lag.wig_status || 0) : 0}
              color={wm.color} size={96} stroke={9} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                  color: wm.color, background: wm.color + '15', padding: '2px 10px', borderRadius: 20 }}>
                  {wm.id}
                </span>
                <span style={{ fontSize: 21, fontWeight: 400, fontFamily: FONT_SERIF, color: '#1a2030' }}>
                  {wm.name}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Właściciel: <b style={{ color: '#475569' }}>{wm.owner}</b>
                </span>
              </div>
              {wm.description ? (
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px', lineHeight: 1.65 }}>
                  {wm.description}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#b0b8c8', margin: '0 0 10px', fontStyle: 'italic' }}>
                  Opis WIG-a nie jest zdefiniowany w arkuszu (WIGI → kol. D, wiersz z WIG#1).
                </p>
              )}
              {wm.deadline && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Deadline: <b style={{ color: '#1a2030' }}>{wm.deadline}</b>
                  </span>
                  {daysLeft !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
                      background: daysLeft < 30 ? '#fee2e2' : daysLeft < 60 ? '#fef9c3' : '#dcfce7',
                      color:      daysLeft < 30 ? '#dc2626' : daysLeft < 60 ? '#a16207' : '#16a34a' }}>
                      {daysLeft > 0 ? `${daysLeft} dni do końca` : 'TERMIN MINĄŁ'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BRAK DANYCH */}
        {!wd?.has_data && (
          <div style={{ background: '#fff', borderRadius: 18, border: '2px dashed #e2e8f0',
            padding: '52px 24px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 400, fontFamily: FONT_SERIF, color: '#94a3b8', marginBottom: 8 }}>
              Brak danych dla {wm.name}
            </div>
            <div style={{ fontSize: 13, color: '#b0b8c8' }}>
              Uzupełnij arkusz Google Sheets dla tego WIG-a.
            </div>
          </div>
        )}

        {wd?.has_data && kpi && (
          <>
            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))',
              gap: 11, marginBottom: 16 }}>
              {[
                { label: 'LAG-i aktywne',   value: kpi.activeLags,  suffix: `/${allLags.length}`, color: wm.color,   desc: 'z kryteriami' },
                { label: 'Lead-y aktywne',  value: kpi.activeLeads, suffix: '',                   color: '#6366f1',  desc: 'strumieni LEAD' },
                { label: 'On Track',        value: kpi.onTrackCnt,  suffix: `/${allLags.length}`, color: '#22c55e',  desc: 'LAG-ów na kursie' },
                { label: 'Średnia LAG',     value: `${Math.round(kpi.avgLag * 100)}%`, suffix: '', color: wm.color, desc: 'postęp WIG' },
              ].map((k, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '15px 17px',
                  border: '1px solid #e8edf2', boxShadow: '0 1px 4px #00000006' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
                    color: '#94a3b8', marginBottom: 7 }}>{k.label}</div>
                  <div style={{ fontSize: 25, fontWeight: 800, color: k.color, lineHeight: 1 }}>
                    {k.value}
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>{k.suffix}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{k.desc}</div>
                </div>
              ))}
            </div>

            {/* SCOREBOARD TABLE */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e8edf2',
              overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 24px #00000008' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr',
                background: '#f8f9fc', borderBottom: '2px solid #e8edf2' }}>
                <div style={{ padding: '11px 12px 11px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: 1, color: wm.color }}>LAG Measures</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>wyniki pomiaru</span>
                </div>
                <div style={{ background: '#edf0f6', borderLeft: '1px solid #e8edf2', borderRight: '1px solid #e8edf2' }} />
                <div style={{ padding: '11px 20px 11px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: 1, color: '#6366f1' }}>LEAD Measures</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>działania tygodniowe</span>
                </div>
              </div>

              {Array.from({ length: pairCount }, (_, i) => (
                <ScoreboardRow key={i}
                  lead={allLeads[i] || null}
                  lag={allLags[i]   || null}
                  wi={wi} wigColor={wm.color} />
              ))}

              {pairCount === 0 && (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Brak par LEAD/LAG
                </div>
              )}

              {/* Table footer z linkiem */}
              <div style={{ padding: '10px 20px', borderTop: '1px solid #eaecf3', background: '#f8f9fc',
                display: 'flex', justifyContent: 'flex-end' }}>
                <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                  Edytuj dane w Google Sheets ↗
                </a>
              </div>
            </div>
          </>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '18px 0 8px', fontSize: 11, color: '#b0b8c8' }}>
          4DX Scoreboard · OvocxMalinovi 2026 · {selectedWeek} · dane na żywo:{' '}
          <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
            style={{ color: '#6366f1', textDecoration: 'none' }}>Google Sheets ↗</a>
        </div>
      </div>
    </div>
  );
}
