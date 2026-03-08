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
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0&${param}`;
  console.log('[4DX fetch]', param);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} dla parametru: ${param}`);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Nieprawidłowy format odpowiedzi gviz');
  const table = JSON.parse(match[1]).table;
  const rows = (table.rows || []).map(row =>
    (row.c || []).map(cell => {
      if (!cell || cell.v === undefined || cell.v === null) return null;
      return cell.v; // zawsze .v — surowa wartość
    })
  );
  console.log(`[4DX] ${param}: ${rows.length} wierszy × ${rows[0]?.length ?? 0} kol. | pierwsze 5:`,
    rows.slice(0, 5).map(r => r?.map(v => v === null ? '∅' : v)));
  return rows;
}

// ─── PARSERY ───────────────────────────────────────────────────────────────────

function parseWigs(rows) {
  // Aktualny tydzień: wiersz 0, kolumna E (indeks 4)
  let currentWeek = null;
  const rawWeek = rows[0]?.[4];
  if (rawWeek !== null && rawWeek !== undefined) {
    const n = parseInt(rawWeek);
    if (!isNaN(n) && WEEKS.includes('T' + n)) currentWeek = 'T' + n;
  }
  console.log('[parseWigs] WIGI!E1 raw:', rawWeek, '→ currentWeek:', currentWeek);
  const wigs = rows
    .filter(row => row && ss(row[2]).startsWith('WIG#'))
    .map(row => ({ id: ss(row[2]), name: ss(row[1]), description: ss(row[3]) }));
  console.log('[parseWigs] wigi:', wigs.map(w => `${w.id} = "${w.name}" (D: "${w.description}")`));
  return { wigs, currentWeek };
}

// Parser arkuszy *_LAG MEASURES
// FIX #1: exact match 'proces' (nie includes) → unika dopasowania nazwy LAG-01
// FIX #2: additionalLagMarkers filtruje wiersze Postęp/Plan/On track
// FIX #3: is_tbd tylko gdy dosłownie "TBD", nie gdy 0 lub pusty
function parseLag(rows) {
  console.group('[parseLag] wierszy:', rows.length);

  const wigStatusRow = findRow(rows, 0, 'WIG Status');
  const wig_status   = wigStatusRow !== null ? sf(rows[wigStatusRow][1]) : 0;
  console.log('wigStatus row:', wigStatusRow, '→', wig_status);

  // FIX: exact '=== proces' (po toLowerCase), nie includes
  let processHeaderRow = null;
  let processWeekCols  = {};
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue;
    const c0 = ss(rows[i][0]).toLowerCase();
    const c1 = ss(rows[i][1]).toLowerCase();
    if (c0 === 'proces' && c1.includes('target')) {
      processHeaderRow = i;
      processWeekCols  = lagWeekColsFallback(findWeekColumns(rows, i));
      break;
    }
  }
  console.log('processHeaderRow:', processHeaderRow, 'weekCols:', processWeekCols);

  const lag01ProgressRow = findRow(rows, 0, 'LAG-01 Post');
  const lag01PlanRow     = findRow(rows, 0, 'LAG-01 Plan');
  const lag01OntrackRow  = findRow(rows, 0, 'LAG-01 On track');
  console.log('lag01 rows — postep:', lag01ProgressRow, 'plan:', lag01PlanRow, 'ontrack:', lag01OntrackRow);

  let lag01 = { processes: [], progress: WEEKS.map(() => 0), plan: WEEKS.map(() => 0), on_track: WEEKS.map(() => 0) };
  if (processHeaderRow !== null && lag01ProgressRow !== null) {
    const processes = [];
    for (let r = processHeaderRow + 1; r < lag01ProgressRow; r++) {
      const name = ss(rows[r]?.[0]);
      if (!name) continue;
      processes.push({ name, target: ss(rows[r][1]), values: getWeekValues(rows, r, processWeekCols) });
    }
    lag01 = {
      processes,
      progress: getWeekValues(rows, lag01ProgressRow, processWeekCols),
      plan:     lag01PlanRow    ? getWeekValues(rows, lag01PlanRow, processWeekCols)    : WEEKS.map(() => 0),
      on_track: lag01OntrackRow ? getWeekValues(rows, lag01OntrackRow, processWeekCols) : WEEKS.map(() => 0),
    };
    console.log(`lag01: ${processes.length} procesów (szukano między wierszem ${processHeaderRow + 1} a ${lag01ProgressRow}):`);
    processes.forEach(p => console.log(`  - "${p.name}" | T10: ${p.values[0]} (1.0=ukończone)`));
    console.log('lag01 postęp T10:', lag01.progress[0], '| on_track T10:', lag01.on_track[0]);
  } else {
    console.warn('lag01: brak processHeaderRow lub lag01ProgressRow');
  }

  // FIX: wyklucz wiersze Postęp / Plan / On track z markerów LAG
  const additionalLagMarkers = findRows(rows, 0, 'LAG-0[2-9]|LAG-[1-9][0-9]', true).filter(i => {
    const v = ss(rows[i]?.[0]);
    return !v.includes('Post') && !v.toLowerCase().includes('plan') && !v.toLowerCase().includes('on track');
  });
  console.log('additionalLagMarkers (filtered):', additionalLagMarkers.map(i => ss(rows[i][0])));

  const additional_lags = additionalLagMarkers.map(markerRow => {
    const lagName = ss(rows[markerRow][0]);

    // Szukaj nagłówka w następnych 4 wierszach
    let headerRow = null;
    for (let r = markerRow + 1; r < Math.min(markerRow + 5, rows.length); r++) {
      if (!rows[r]) continue;
      const c0 = ss(rows[r][0]).toLowerCase();
      const c1 = ss(rows[r][1]).toLowerCase();
      if (c0.includes('measure') || c0 === 'kryterium' || c1.includes('target')) {
        headerRow = r; break;
      }
    }
    if (headerRow === null) {
      console.warn(lagName, '— brak headerRow');
      return { name: lagName, is_tbd: false, criteria: [], values: WEEKS.map(() => 0) };
    }

    // Wyodrębnij kryteria (aż do pustego wiersza lub kolejnego markera)
    const criteria = [];
    for (let r = headerRow + 1; r < Math.min(headerRow + 15, rows.length); r++) {
      const v = ss(rows[r]?.[0]);
      if (!v || v.includes('Post') || v.toLowerCase().includes('plan') || v.toLowerCase().includes('on track')) break;
      criteria.push(v);
    }

    // FIX: is_tbd tylko gdy target jest dosłownie "TBD"
    const firstDataTarget = ss(rows[headerRow + 1]?.[1]);
    const is_tbd = firstDataTarget.toUpperCase() === 'TBD';

    // Postęp z wiersza "LAG-XX Postęp (średnia %)"
    const lagNumMatch = lagName.match(/LAG-(\d+)/i);
    const lagNum      = lagNumMatch ? lagNumMatch[1].padStart(2, '0') : null;
    const progressRow = lagNum ? findRow(rows, 0, `LAG-${lagNum} Post`) : null;
    const lagWc       = lagWeekColsFallback(findWeekColumns(rows, headerRow));
    const values      = progressRow !== null ? getWeekValues(rows, progressRow, lagWc) : WEEKS.map(() => 0);

    console.log(lagName, '→ headerRow:', headerRow, 'progressRow:', progressRow, 'is_tbd:', is_tbd,
      'postęp T10:', values[0]);
    return { name: lagName, is_tbd, criteria, values };
  });

  console.log('[parseLag] PODSUMOWANIE:');
  console.log('  WIG Status:', wig_status, `(${Math.round(wig_status * 100)}%)`);
  additional_lags.forEach(l => console.log(`  ${l.name} | postęp T10: ${l.values[0]} | is_tbd: ${l.is_tbd}`));
  console.groupEnd();
  return { wig_status, lag01, additional_lags };
}

// Parser arkuszy *_LEAD MEASURES
// FIX: headers=0 + exact 'deadline'/'opis' match + szerszy zakres szukania swHeaderRow
// FIX: zadania — przyjmij każdy wiersz z niepustym opisem (nie tylko /^T\d+/)
function parseLead(rows) {
  console.group('[parseLead] wierszy:', rows.length);

  // Główny nagłówek: wiersz z 'Deadline' w kol 0 i 'Opis' w kol 1
  let mainHeaderRow = null;
  let weekCols = {};
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue;
    if (ss(rows[i][0]).toLowerCase() === 'deadline' && ss(rows[i][1]).toLowerCase() === 'opis') {
      mainHeaderRow = i;
      weekCols = leadWeekColsFallback(findWeekColumns(rows, i));
      console.log('mainHeaderRow:', i, 'weekCols:', weekCols);
      break;
    }
  }
  if (mainHeaderRow === null) console.warn('[parseLead] nie znaleziono mainHeaderRow (Deadline|Opis)');

  const leadScoreRow = mainHeaderRow !== null ? mainHeaderRow + 1 : null;
  const lead_score = {
    target: leadScoreRow !== null && rows[leadScoreRow] ? sf(rows[leadScoreRow][2]) : 1,
    values: leadScoreRow !== null ? getWeekValues(rows, leadScoreRow, weekCols) : WEEKS.map(() => 0),
  };

  // Markery Lead-ów: "Lead \d+" lub stary "SUB-WIG \d+" — bez Postęp/On track
  const subWigRows = [];
  for (let i = 0; i < rows.length; i++) {
    const val = ss(rows[i]?.[0]);
    const isMarker = /^Lead\s+\d+/i.test(val) || /^SUB-WIG\s+\d+/i.test(val);
    if (isMarker && !val.includes('Post') && !val.toLowerCase().includes('on track')) {
      subWigRows.push([i, val]);
    }
  }
  console.log('Lead markers:', subWigRows.map(([i, v]) => v));

  const sub_wigs = subWigRows.map(([markerRow, markerText], idx) => {
    const sw = { name: markerText, tasks: [], progress: WEEKS.map(() => 0) };

    // Nagłówek Lead-a: szukaj 'deadline' w kol 0, do 4 wierszy dalej
    let swHeaderRow = null;
    let taskWc = {};
    for (let r = markerRow + 1; r < Math.min(markerRow + 5, rows.length); r++) {
      if (!rows[r]) continue;
      if (ss(rows[r][0]).toLowerCase() === 'deadline') {
        swHeaderRow = r;
        taskWc = leadWeekColsFallback(findWeekColumns(rows, r));
        if (Object.keys(taskWc).length < 2) taskWc = weekCols;
        break;
      }
    }
    // Fallback: użyj głównego weekCols jeśli brak sub-headera
    if (Object.keys(taskWc).length < 2) taskWc = weekCols;

    const nextBoundary = idx + 1 < subWigRows.length ? subWigRows[idx + 1][0] : rows.length;
    const startRow     = swHeaderRow !== null ? swHeaderRow + 1 : markerRow + 1;
    let progressRow    = null;
    let onTrackRow     = null;
    const taskRowIdxs  = [];

    for (let r = startRow; r < nextBoundary; r++) {
      const full     = ss(rows[r]?.[0]);
      const fullLow  = full.toLowerCase();
      const desc     = ss(rows[r]?.[1]);
      // Uwaga: w arkuszu może być literówka "Leas" zamiast "Lead" — includes('Post') łapie obydwa
      if (full.includes('Post') || full.includes('post'))  { progressRow = r; }
      else if (fullLow.includes('on track'))               { onTrackRow = r; }
      else if (desc)                                       { taskRowIdxs.push(r); }
    }

    sw.progress    = progressRow !== null ? getWeekValues(rows, progressRow, taskWc)                                          : WEEKS.map(() => 0);
    // on_track_raw: wartość tekstowa "TAK"/"NIE" z arkusza, osobno dla każdego tygodnia
    sw.on_track_raw = onTrackRow !== null
      ? WEEKS.map(w => taskWc[w] !== undefined ? ss(rows[onTrackRow][taskWc[w]]) : '')
      : WEEKS.map(() => '');
    sw.tasks = taskRowIdxs.map(r => ({
      deadline:    ss(rows[r][0]),
      description: ss(rows[r][1]),
      target:      sf(rows[r][2]),
      values:      getWeekValues(rows, r, taskWc),
    }));
    console.log(markerText, '→ swHeader:', swHeaderRow, 'progressRow:', progressRow,
      'onTrackRow:', onTrackRow, 'tasks:', sw.tasks.length,
      '| postęp T10:', sw.progress[0], '| on_track T10:', sw.on_track_raw[0] || 'brak');
    return sw;
  });

  console.log('[parseLead] PODSUMOWANIE:');
  console.log('  Lead markers znalezione:', subWigRows.map(([i, v]) => v));
  sub_wigs.forEach(sw => console.log(`  ${sw.name} | postęp T10: ${sw.progress[0]} | on_track T10: ${sw.on_track_raw[0] || 'brak'} | zadań: ${sw.tasks.length}`));
  console.groupEnd();
  return { lead_score, sub_wigs };
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
    if (r.status === 'fulfilled') sheets[r.value.key] = r.value.rows;
    else fetchErrors.push(r.reason?.message || 'unknown');
  }
  if (!Object.keys(sheets).length) {
    throw new Error('Nie udało się pobrać żadnego arkusza. '
      + 'Sprawdź: Plik → Udostępnij → Opublikuj w internecie (Cały dokument). '
      + 'Błędy: ' + fetchErrors.join('; '));
  }

  // Aktualny tydzień z WIGI!E1
  const { wigs: wigDefs, currentWeek } = parseWigs(sheets['WIGI'] || []);

  const wigs = WIG_STATIC.map((stat, i) => ({
    key: stat.key, color: stat.color, owner: stat.owner, deadline: stat.deadline,
    name:        wigDefs[i]?.name        || stat.key,
    id:          wigDefs[i]?.id          || `WIG#${i + 1}`,
    description: wigDefs[i]?.description || '',
  }));

  const wig_data = {};
  for (const { key, lagKey, leadKey } of WIG_PAIRS) {
    const lagRows  = sheets[lagKey];
    const leadRows = sheets[leadKey];
    if (!lagRows) { wig_data[key] = { has_data: false }; continue; }
    const lag      = parseLag(lagRows);
    const lead     = leadRows
      ? parseLead(leadRows)
      : { lead_score: { target: 1, values: WEEKS.map(() => 0) }, sub_wigs: [] };
    const has_data = lag.wig_status > 0 || lag.lag01.processes.length > 0;
    wig_data[key]  = { has_data, lag, lead };
  }
  // WIG-i bez arkuszy
  for (const ws of WIG_STATIC) {
    if (!wig_data[ws.key]) wig_data[ws.key] = { has_data: false };
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

const OnTrackBadge = ({ ok }) => (
  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
    background: ok ? '#dcfce7' : '#fef9c3', color: ok ? '#16a34a' : '#a16207',
    border: `1px solid ${ok ? '#bbf7d0' : '#fef08a'}`, whiteSpace: 'nowrap' }}>
    {ok ? 'On track' : 'Monitor'}
  </span>
);

// ─── SCOREBOARD ROW ────────────────────────────────────────────────────────────
// lead i lag to znormalizowane obiekty: { name, values (tablica 9 tyg), tasks/processes, is_tbd, ... }

const ScoreboardRow = ({ lead, lag, wi, wigColor }) => {
  const [open, setOpen] = useState(false);

  const lagProg  = lag  ? (lag.values?.[wi]   ?? 0) : 0;
  const leadProg = lead ? (lead.progress?.[wi] ?? 0) : 0;
  const onTrack  = lag?.isLag01
    ? (lag.on_track?.[wi] ?? 0) >= 1
    : lagProg > 0;

  const lagLabel  = lag  ? ss(lag.name).match(/^LAG-\d+/i)?.[0]  || lag.name  : '—';
  const lagDesc   = lag  ? ss(lag.name).split(/—(.+)/)[1]?.trim() || ''        : '';
  const leadLabel = lead ? ss(lead.name).match(/^(Lead|SUB-WIG)\s+\d+/i)?.[0] || lead.name : '—';
  const leadDesc  = lead ? ss(lead.name).split(/[-—](.+)/)[1]?.trim() || ''    : '';

  const leadSparkValues = lead ? (lead.progress || WEEKS.map(() => 0)) : WEEKS.map(() => 0);
  const lagSparkValues  = lag  ? (lag.values    || WEEKS.map(() => 0)) : WEEKS.map(() => 0);

  return (
    <div style={{ borderBottom: '1px solid #eaecf3', background: open ? '#f8f9fe' : '#fff',
      transition: 'background 0.15s' }}>
      {/* ── MAIN ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        {/* LEAD cell */}
        <div style={{ padding: '13px 12px 13px 20px' }}>
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
              {lead.tasks.filter(t => (t.values[wi] ?? 0) >= 1).length}/{lead.tasks.length} zadań
            </div>
          )}
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f1f3f8', borderLeft: '1px solid #eaecf3', borderRight: '1px solid #eaecf3',
          fontSize: 15, color: wigColor, fontWeight: 700 }}>→</div>

        {/* LAG cell */}
        <div style={{ padding: '13px 20px 13px 12px' }}>
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
            <OnTrackBadge ok={onTrack} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {lag?.isLag01
                ? `${lag.processes?.filter(p => (p.values[wi] ?? 0) >= 1).length ?? 0}/${lag.processes?.length ?? 0} proc.`
                : lag ? `${lag.criteria?.length ?? 0} kryt.` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── EXPANDED ── */}
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr',
          borderTop: '1px solid #eaecf3', background: '#f3f5fb' }}>
          {/* LEAD tasks */}
          <div style={{ padding: '12px 12px 16px 20px', borderRight: '1px solid #eaecf3' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9,
              color: '#6366f1', marginBottom: 10 }}>Zadania LEAD</div>
            {lead?.tasks?.length ? lead.tasks.map((t, i) => {
              const val  = t.values[wi] ?? 0;
              const done = val >= 1;
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
                      {t.description}
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

          <div style={{ background: '#e8eaf2', borderLeft: '1px solid #eaecf3', borderRight: '1px solid #eaecf3' }} />

          {/* LAG details */}
          <div style={{ padding: '12px 20px 16px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9,
              color: wigColor, marginBottom: 10 }}>
              {lag?.isLag01 ? 'Procesy DoD' : 'Kryteria LAG'}
            </div>
            {lag?.isLag01 ? (
              lag.processes?.map((p, i) => {
                const val = p.values[wi] ?? 0;
                return (
                  <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6, alignItems: 'center' }}>
                    <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                      background: val >= 1 ? '#22c55e' : '#dde1ea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {val >= 1 && <span style={{ color:'#fff', fontSize:8, fontWeight:800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: val >= 1 ? '#1a2030' : '#64748b', flex: 1 }}>
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

    // LAG-01 normalizowany: values = progress, on_track = on_track, isLag01 = true
    const lag01norm = {
      name:      'LAG-01 — % procesów opisanych wg DoD',
      is_tbd:    false,
      isLag01:   true,
      values:    lag.lag01.progress,
      on_track:  lag.lag01.on_track,
      plan:      lag.lag01.plan,
      processes: lag.lag01.processes,
      criteria:  [],
    };
    const lags  = [lag01norm, ...lag.additional_lags.map(l => ({ ...l, isLag01: false }))];
    const leads = lead.sub_wigs;

    const activeLags  = lags.filter(l => !l.is_tbd).length;
    const activeLeads = leads.length;
    const onTrackCnt  = lags.filter((l, i) => {
      if (l.is_tbd) return false;
      if (l.isLag01) return (l.on_track?.[wi] ?? 0) >= 1;
      return (l.values?.[wi] ?? 0) > 0;
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
                    letterSpacing: 1, color: '#6366f1' }}>LEAD Measures</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>działania tygodniowe</span>
                </div>
                <div style={{ background: '#edf0f6', borderLeft: '1px solid #e8edf2', borderRight: '1px solid #e8edf2' }} />
                <div style={{ padding: '11px 20px 11px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: 1, color: wm.color }}>LAG Measures</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>wyniki pomiaru</span>
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
