'use strict';

const { useState, useEffect, useMemo } = React;

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const SHEET_ID = '1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ';

// Uzupełnij gdy wdrożysz Apps Script obsługujący PEŁNE dane 4DX (wszystkie WIG-i):
//   Arkusz → Rozszerzenia → Apps Script → Wdróż → Aplikacja internetowa
//   Endpoint musi zwrócić { wigs: [...], wig_data: {...}, processes: [...] }
const APPS_SCRIPT_URL_4DX = null;

const SHEET_DEFS = [
  { key: 'WIGI',              param: 'gid=1699564336' },
  { key: 'OS_LAG',            param: 'gid=322339268' },
  { key: 'OS_LEAD',           param: 'gid=1844898951' },
  { key: 'HARVEST_LAG',       param: 'gid=200348167' },
  { key: 'HARVEST_LEAD',      param: 'gid=259840012' },
  { key: 'NOCOMPLAINTS_LAG',  param: 'gid=716489223' },
  { key: 'NOCOMPLAINTS_LEAD', param: 'gid=1872002' },
  { key: 'MAPA',              param: 'sheet=MAPA%20PROCES%C3%93W' },
  { key: 'BACKLOG',           param: 'sheet=BACKLOG' },
];

// Dane statyczne WIG-ów (kolor, właściciel, deadline) — nie przechowywane w Sheets
const WIG_STATIC = [
  { key: 'OS',           color: '#6366f1', owner: 'Jan',     deadline: '2026-04-30' },
  { key: 'HARVEST',      color: '#f59e0b', owner: 'Kacper',  deadline: '' },
  { key: 'NOCOMPLAINTS', color: '#22c55e', owner: 'Olgierd', deadline: '' },
  { key: 'XPRODUCT',     color: '#ef4444', owner: 'Jan',     deadline: '' },
];

// Pary LAG/LEAD per WIG (XPRODUCT nie ma jeszcze arkuszy)
const WIG_PAIRS = [
  { key: 'OS',           lagKey: 'OS_LAG',           leadKey: 'OS_LEAD' },
  { key: 'HARVEST',      lagKey: 'HARVEST_LAG',       leadKey: 'HARVEST_LEAD' },
  { key: 'NOCOMPLAINTS', lagKey: 'NOCOMPLAINTS_LAG',  leadKey: 'NOCOMPLAINTS_LEAD' },
];

const WEEKS = ['T10', 'T11', 'T12', 'T13', 'T14', 'T15'];

// ─── UTILS ────────────────────────────────────────────────────────────────────

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Bezpieczna konwersja na string
function ss(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Bezpieczna konwersja na float. Obsługuje ułamki (0.125) i procenty (12.5%)
function sf(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.endsWith('%')) { const n = parseFloat(str); return isNaN(n) ? 0 : n / 100; }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// Znajdź PIERWSZY wiersz gdzie rows[i][col] zawiera pattern
function findRow(rows, col, pattern, regex = false) {
  for (let i = 0; i < rows.length; i++) {
    const val = ss(rows[i] ? rows[i][col] : null);
    if (regex ? new RegExp(pattern, 'i').test(val) : val.toLowerCase().includes(pattern.toLowerCase())) return i;
  }
  return null;
}

// Znajdź WSZYSTKIE wiersze pasujące do pattern
function findRows(rows, col, pattern, regex = false) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const val = ss(rows[i] ? rows[i][col] : null);
    if (regex ? new RegExp(pattern, 'i').test(val) : val.toLowerCase().includes(pattern.toLowerCase())) out.push(i);
  }
  return out;
}

// Znajdź indeksy kolumn T10–T15 w wierszu nagłówkowym
function findWeekColumns(rows, headerRow) {
  const wc = {};
  if (headerRow === null || !rows[headerRow]) return wc;
  rows[headerRow].forEach((cell, i) => {
    const v = ss(cell);
    if (WEEKS.includes(v)) wc[v] = i;
  });
  return wc;
}

// Pobierz wartości tygodniowe z wiersza (T10–T15), domyślnie 0 gdy brak
function getWeekValues(rows, row, weekCols) {
  if (row === null || !rows[row]) return WEEKS.map(() => 0);
  return WEEKS.map(w => weekCols[w] !== undefined ? sf(rows[row][weekCols[w]]) : 0);
}

// ─── FETCH ────────────────────────────────────────────────────────────────────

// Pobiera arkusz przez gviz API. Zwraca tablicę 2D (wiersze × kolumny).
// Wymaga arkusza opublikowanego w internecie (Plik → Udostępnij → Opublikuj w internecie).
async function fetchGvizSheet(param) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&${param}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Nieprawidłowy format odpowiedzi gviz');
  const table = JSON.parse(match[1]).table;
  return (table.rows || []).map(row =>
    (row.c || []).map(cell => (cell && cell.v !== undefined) ? cell.v : null)
  );
}

// Opcjonalnie: Apps Script JSONP — gdy APPS_SCRIPT_URL_4DX jest ustawiony
function fetchAppsScript4DX() {
  return new Promise((resolve, reject) => {
    const cbName = '_oxm4dxCb' + Date.now();
    const url = APPS_SCRIPT_URL_4DX + '&callback=' + cbName;
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('Apps Script timeout')); }, 10000);
    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[cbName] = data => { cleanup(); resolve(data); };
    script.src = url;
    script.onerror = () => { cleanup(); reject(new Error('Apps Script load error')); };
    document.head.appendChild(script);
  });
}

// ─── PARSERY ──────────────────────────────────────────────────────────────────
// Filozofia: NIGDY nie używaj stałych numerów wierszy.
// Zawsze szukaj markerów tekstowych (WIG#, Proces+Target, LAG-01 Postęp, SUB-WIG, ...).

function parseWigs(rows) {
  return rows
    .filter(row => row && ss(row[2]).startsWith('WIG#'))
    .map(row => ({ id: ss(row[2]), name: ss(row[1]), description: ss(row[3]) }));
}

// Parser arkuszy *_LAG MEASURES — dynamiczne markery tekstowe
function parseLag(rows) {
  // WIG Status — zagregowany wynik WIG-a
  const wigStatusRow = findRow(rows, 0, 'WIG Status');
  const wig_status = wigStatusRow !== null ? sf(rows[wigStatusRow][1]) : 0;

  // Nagłówek procesów — wiersz z 'Proces' w kol 0 I 'target' w kol 1
  let processHeaderRow = null;
  let processWeekCols = {};
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue;
    if (ss(rows[i][0]) === 'Proces' && ss(rows[i][1]).toLowerCase().includes('target')) {
      processHeaderRow = i;
      processWeekCols = findWeekColumns(rows, i);
      break;
    }
  }

  const lag01ProgressRow = findRow(rows, 0, 'LAG-01 Postęp');
  const lag01PlanRow     = findRow(rows, 0, 'LAG-01 Plan');
  const lag01OntrackRow  = findRow(rows, 0, 'LAG-01 On track');

  let lag01 = {
    processes: [],
    progress:  WEEKS.map(() => 0),
    plan:      WEEKS.map(() => 0),
    on_track:  WEEKS.map(() => 0),
  };

  if (processHeaderRow !== null && lag01ProgressRow !== null) {
    const processes = [];
    for (let r = processHeaderRow + 1; r < lag01ProgressRow; r++) {
      const name = ss(rows[r] ? rows[r][0] : null);
      if (!name) continue;
      processes.push({ name, target: ss(rows[r][1]), values: getWeekValues(rows, r, processWeekCols) });
    }
    lag01 = {
      processes,
      progress: getWeekValues(rows, lag01ProgressRow, processWeekCols),
      plan:     lag01PlanRow    !== null ? getWeekValues(rows, lag01PlanRow, processWeekCols)    : WEEKS.map(() => 0),
      on_track: lag01OntrackRow !== null ? getWeekValues(rows, lag01OntrackRow, processWeekCols) : WEEKS.map(() => 0),
    };
  }

  // Dodatkowe LAG-i (LAG-02, LAG-03, ...) — marker regex
  const additionalLagMarkers = findRows(rows, 0, 'LAG-0[2-9]|LAG-[1-9][0-9]', true);
  const additional_lags = additionalLagMarkers.map(markerRow => {
    const lagName = ss(rows[markerRow][0]);
    // Nagłówek LAG-a — następne 2 wiersze z 'measure' lub 'target' w kol 1
    let headerRow = null;
    for (let r = markerRow + 1; r < Math.min(markerRow + 3, rows.length); r++) {
      if (!rows[r]) continue;
      if (ss(rows[r][0]).toLowerCase().includes('measure') || ss(rows[r][1]).toLowerCase().includes('target')) {
        headerRow = r; break;
      }
    }
    if (headerRow === null) return { name: lagName, is_tbd: true, criteria: [] };

    const targetRow = headerRow + 1 < rows.length ? rows[headerRow + 1] : null;
    const target    = targetRow ? ss(targetRow[1]) : '';
    const is_tbd    = !target || target.toUpperCase() === 'TBD';

    const criteria = [];
    for (let r = headerRow + 2; r < Math.min(headerRow + 12, rows.length); r++) {
      const val = ss(rows[r] ? rows[r][0] : null);
      if (!val) break;
      criteria.push(val);
    }

    const lagWc  = findWeekColumns(rows, headerRow);
    const values = (!is_tbd && Object.keys(lagWc).length) ? getWeekValues(rows, headerRow + 1, lagWc) : [];
    return { name: lagName, is_tbd, target, criteria, values };
  });

  return { wig_status, lag01, additional_lags };
}

// Parser arkuszy *_LEAD MEASURES — dynamiczne markery SUB-WIG
function parseLead(rows) {
  // Główny nagłówek — wiersz z 'Deadline' w kol 0 i 'Opis' w kol 1
  let mainHeaderRow = null;
  let weekCols = {};
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue;
    if (ss(rows[i][0]) === 'Deadline' && ss(rows[i][1]) === 'Opis') {
      mainHeaderRow = i;
      weekCols = findWeekColumns(rows, i);
      break;
    }
  }

  const leadScoreRow = mainHeaderRow !== null ? mainHeaderRow + 1 : null;
  const lead_score = {
    target: leadScoreRow !== null && rows[leadScoreRow] ? sf(rows[leadScoreRow][2]) : 1,
    values: leadScoreRow !== null ? getWeekValues(rows, leadScoreRow, weekCols) : WEEKS.map(() => 0),
  };

  // Znajdź markery SUB-WIG-ów (bez 'Postęp' / 'On track' w tym samym wierszu)
  const subWigRows = [];
  for (let i = 0; i < rows.length; i++) {
    const val = ss(rows[i] ? rows[i][0] : null);
    if (/^SUB-WIG\s+\d+/.test(val) && !val.includes('Postęp') && !val.includes('On track')) {
      subWigRows.push([i, val]);
    }
  }

  const sub_wigs = subWigRows.map(([markerRow, markerText], idx) => {
    const sw = { name: markerText, tasks: [], progress: WEEKS.map(() => 0) };

    // Nagłówek SUB-WIG — następne 2 wiersze z 'deadline' w kol 0
    let swHeaderRow = null;
    let taskWeekCols = {};
    for (let r = markerRow + 1; r < Math.min(markerRow + 3, rows.length); r++) {
      if (!rows[r]) continue;
      if (ss(rows[r][0]).toLowerCase() === 'deadline') {
        swHeaderRow = r;
        taskWeekCols = findWeekColumns(rows, r);
        break;
      }
    }
    if (swHeaderRow === null) return sw;

    const nextBoundary = idx + 1 < subWigRows.length ? subWigRows[idx + 1][0] : rows.length;
    let progressRow = null;
    const taskRowIdxs = [];

    for (let r = swHeaderRow + 1; r < nextBoundary; r++) {
      const full = ss(rows[r] ? rows[r][0] : null);
      const desc = ss(rows[r] ? rows[r][1] : null);
      if (full.includes('Postęp'))         { progressRow = r; }
      else if (!full.includes('On track') && /^T\d+/.test(full) && desc) { taskRowIdxs.push(r); }
    }

    sw.progress = progressRow !== null ? getWeekValues(rows, progressRow, taskWeekCols) : WEEKS.map(() => 0);
    sw.tasks = taskRowIdxs.map(r => ({
      deadline:    ss(rows[r][0]),
      description: ss(rows[r][1]),
      target:      sf(rows[r][2]),
      values:      getWeekValues(rows, r, taskWeekCols),
    }));
    return sw;
  });

  return { lead_score, sub_wigs };
}

// Parser MAPA PROCESÓW — szuka nagłówka '#  TYP  PROCES'
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
    const pid = ss(rows[r] ? rows[r][0] : null);
    if (!pid || !/^\d+$/.test(pid)) break;
    processes.push({
      id:      parseInt(pid, 10),
      type:    ss(rows[r][1]),
      name:    ss(rows[r][2]),
      owner:   ss(rows[r][3]),
      version: ss(rows[r][4]),
      status:  ss(rows[r][5]),
    });
  }
  return processes;
}

// Zlicza pozycje w BACKLOG (pomija wiersze nagłówkowe)
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
    if (rows[r] && rows[r].slice(0, 15).some(v => ss(v) !== '')) count++;
  }
  return count;
}

// ─── GŁÓWNY LOADER ────────────────────────────────────────────────────────────

async function loadDashboardData() {
  // Pobierz wszystkie arkusze równolegle
  const results = await Promise.allSettled(
    SHEET_DEFS.map(def => fetchGvizSheet(def.param).then(rows => ({ key: def.key, rows })))
  );

  const sheets = {};
  const errors = [];
  for (const r of results) {
    if (r.status === 'fulfilled') sheets[r.value.key] = r.value.rows;
    else errors.push(r.reason?.message || 'unknown');
  }

  if (!Object.keys(sheets).length) {
    throw new Error('Nie udało się pobrać żadnego arkusza. Sprawdź czy arkusz jest opublikowany (Udostępnij → Opublikuj w internecie). Błędy: ' + errors.join('; '));
  }

  // WIGI — nazwy, ID, opisy
  const wigDefs = parseWigs(sheets['WIGI'] || []);
  const wigs = WIG_STATIC.map((stat, i) => ({
    key:         stat.key,
    color:       stat.color,
    owner:       stat.owner,
    deadline:    stat.deadline,
    name:        wigDefs[i]?.name        || stat.key,
    id:          wigDefs[i]?.id          || `WIG#${i + 1}`,
    description: wigDefs[i]?.description || '',
  }));

  // WIG data — LAG + LEAD per WIG
  const wig_data = {};
  for (const { key, lagKey, leadKey } of WIG_PAIRS) {
    const lagRows  = sheets[lagKey];
    const leadRows = sheets[leadKey];
    if (!lagRows) { wig_data[key] = { has_data: false }; continue; }

    const lag  = parseLag(lagRows);
    const lead = leadRows ? parseLead(leadRows) : { lead_score: { target: 1, values: WEEKS.map(() => 0) }, sub_wigs: [] };
    const has_data = lag.wig_status > 0 || lag.lag01.processes.some(p => p.values.some(v => v > 0));
    wig_data[key] = { has_data, lag, lead };
  }
  wig_data['XPRODUCT'] = { has_data: false };

  const processes    = parseMapa(sheets['MAPA'] || []);
  const backlog_count = countBacklog(sheets['BACKLOG'] || []);

  return { wigs, wig_data, processes, backlog_count };
}

// ─── REACT KOMPONENTY ─────────────────────────────────────────────────────────

const ProgressRing = ({ value, size = 100, stroke = 8, color = '#6366f1' }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(value, 0), 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform:'rotate(90deg)', transformOrigin:'center',
                 fontSize: size * 0.22, fontWeight: 800, fill: '#1e293b', fontFamily: 'DM Sans' }}>
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
};

const ProgressBar = ({ value, max = 1, color = '#6366f1', height = 6 }) => (
  <div style={{ width: '100%', height, borderRadius: height, background: '#e2e8f0' }}>
    <div style={{
      width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', borderRadius: height,
      background: color, transition: 'width 0.5s ease',
    }} />
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    'Not started': { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
    'In progress':  { bg: '#ecfdf5', text: '#059669', dot: '#10b981' },
    'Approved':     { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6' },
    'Blocked':      { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  };
  const s = map[status] || map['Not started'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
      fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
};

const TbdBadge = () => (
  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
    background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>TBD</span>
);

const LeadDot = ({ val }) => {
  const cfg = val === 1
    ? { bg: '#22c55e', label: '✓' }
    : val === 0.5
    ? { bg: '#f59e0b', label: '…' }
    : { bg: '#e2e8f0', label: '' };
  return (
    <span title={val === 1 ? 'Zrobione' : val === 0.5 ? 'W toku' : 'Nie rozpoczęte'}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%', background: cfg.bg,
        fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
};

// Szkielet ładowania
const LoadingCard = ({ height = 120 }) => (
  <div style={{ background: '#f1f5f9', borderRadius: 14, height, animation: 'pulse 1.5s infinite' }} />
);

// ─── GŁÓWNY KOMPONENT ─────────────────────────────────────────────────────────

export default function Dashboard4DX() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [activeWig, setActiveWig] = useState('OS');
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const w = isoWeek(new Date());
    return WEEKS.find(wk => wk === `T${w}`) || WEEKS[0];
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        let loadedData = null;

        // 1. Próba: Apps Script (gdy skonfigurowany — pełne dane 4DX)
        if (APPS_SCRIPT_URL_4DX) {
          try {
            const asData = await fetchAppsScript4DX();
            if (asData && asData.wigs) loadedData = asData;
          } catch (e) {
            console.warn('[4DX] Apps Script failed, fallback na gviz:', e.message);
          }
        }

        // 2. Fallback / domyślne: gviz API (pobiera wszystkie arkusze bezpośrednio)
        if (!loadedData) {
          loadedData = await loadDashboardData();
        }

        if (!cancelled) {
          setData(loadedData);
          setLastUpdated(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const wi = WEEKS.indexOf(selectedWeek);

  const wigMeta = data?.wigs.find(w => w.key === activeWig);
  const wigData = data?.wig_data[activeWig];

  const daysLeft = useMemo(() => {
    if (!wigMeta?.deadline) return null;
    const diff = new Date(wigMeta.deadline) - new Date();
    return Math.ceil(diff / 86400000);
  }, [wigMeta]);

  const kpi = useMemo(() => {
    if (!wigData?.has_data) return null;
    const { lag, lead } = wigData;
    const doneProcs = lag.lag01.processes.filter(p => (p.values[wi] || 0) >= 1).length;
    return {
      doneProcs,
      totalProcs: lag.lag01.processes.length,
      tbdLags:    lag.additional_lags.filter(l => l.is_tbd).length,
      subWigs:    lead.sub_wigs.length,
      leadPct:    lead.lead_score.values[wi] || 0,
    };
  }, [activeWig, wi, wigData]);

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)', padding: '20px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🫐</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'DM Serif Display' }}>4DX Scoreboard</span>
          <span style={{ fontSize: 12, color: '#a5b4fc' }}>Pobieranie danych z Google Sheets…</span>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
        <LoadingCard height={80} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
          {[1,2,3,4].map(i => <LoadingCard key={i} height={100} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18 }}>
          <LoadingCard height={300} />
          <LoadingCard height={300} />
        </div>
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)', padding: '20px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🫐</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'DM Serif Display' }}>4DX Scoreboard</span>
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '48px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 12,
          padding: '24px 28px', color: '#856404' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>⚠ Błąd ładowania danych</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>{error}</div>
          <div style={{ fontSize: 12, color: '#92400e', background: '#fff8e1', borderRadius: 8, padding: '12px 16px' }}>
            <strong>Checklista:</strong><br />
            1. Arkusz musi być opublikowany: Plik → Udostępnij → Opublikuj w internecie<br />
            2. Wszystkie zakładki (OS_LAG MEASURES, WIGI itd.) muszą być opublikowane<br />
            3. Sprawdź czy SPREADSHEET_ID jest poprawne: <code>{SHEET_ID}</code>
          </div>
          <button onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Spróbuj ponownie
          </button>
        </div>
      </div>
    </div>
  );

  if (!data) return null;

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)', padding: '20px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🫐</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'DM Serif Display' }}>
                4DX Scoreboard
              </span>
              <span style={{ fontSize: 12, color: '#a5b4fc', marginLeft: 4 }}>OvocxMalinovi 2026</span>
            </div>
            <div style={{ fontSize: 12, color: '#a5b4fc', marginTop: 3 }}>
              {lastUpdated
                ? `Dane na żywo z Google Sheets · ${lastUpdated.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                : 'Dane z Google Sheets'}
            </div>
          </div>
          {/* Week selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {WEEKS.map(w => (
              <button key={w} onClick={() => setSelectedWeek(w)}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  background: w === selectedWeek ? '#fff' : 'rgba(255,255,255,0.12)',
                  color: w === selectedWeek ? '#4f46e5' : '#e0e7ff', transition: 'all 0.2s' }}>
                {w}
              </button>
            ))}
            {/* Odśwież */}
            <button onClick={() => { setLoading(true); setError(null); loadDashboardData().then(d => { setData(d); setLastUpdated(new Date()); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
              title="Odśwież dane"
              style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 16, background: 'rgba(255,255,255,0.12)', color: '#e0e7ff', transition: 'all 0.2s' }}>
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* ── WIG TABS ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', overflowX: 'auto' }}>
          {data.wigs.map(wig => {
            const d = data.wig_data[wig.key];
            const status = d.has_data ? Math.round((d.lag.wig_status || 0) * 100) : null;
            const isActive = wig.key === activeWig;
            return (
              <button key={wig.key} onClick={() => setActiveWig(wig.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px',
                  border: 'none', cursor: 'pointer', background: 'transparent',
                  borderBottom: isActive ? `3px solid ${wig.color}` : '3px solid transparent',
                  transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? wig.color : '#64748b' }}>
                  {wig.id}
                </span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#1e293b' : '#64748b' }}>
                  {wig.name}
                </span>
                {status !== null ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: status > 0 ? '#ecfdf5' : '#f1f5f9', color: status > 0 ? '#059669' : '#94a3b8' }}>
                    {status}%
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── WIG HERO CARD ─────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', marginBottom: 20,
          border: `1px solid ${wigMeta.color}30`, boxShadow: `0 0 0 1px ${wigMeta.color}15` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <ProgressRing value={wigData?.has_data ? wigData.lag.wig_status : 0}
              size={100} stroke={9} color={wigMeta.color} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                  color: wigMeta.color, background: `${wigMeta.color}15`, padding: '2px 10px', borderRadius: 20 }}>
                  {wigMeta.id}
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', fontFamily: 'DM Serif Display' }}>
                  {wigMeta.name}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Właściciel: <b>{wigMeta.owner}</b></span>
              </div>
              {wigMeta.description ? (
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px', lineHeight: 1.6 }}>
                  {wigMeta.description}
                </p>
              ) : (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 10px', fontStyle: 'italic' }}>
                  Cel WIG-a nie jest jeszcze zdefiniowany.
                </p>
              )}
              {wigMeta.deadline && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Deadline: <b style={{ color: '#1e293b' }}>{wigMeta.deadline}</b>
                  </span>
                  {daysLeft !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700,
                      color: daysLeft < 30 ? '#ef4444' : daysLeft < 60 ? '#f59e0b' : '#22c55e' }}>
                      {daysLeft > 0 ? `${daysLeft} dni do końca` : 'TERMIN MINĄŁ'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BRAK DANYCH ─────────────────────────────────────────────────── */}
        {!wigData?.has_data && (
          <div style={{ background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0',
            padding: '48px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
              Brak danych dla {wigMeta.name}
            </div>
            <div style={{ fontSize: 14, color: '#cbd5e1' }}>
              Uzupełnij arkusz Google Sheets, aby zobaczyć dane dla tego WIG-a.
            </div>
          </div>
        )}

        {wigData?.has_data && (() => {
          const { lag, lead } = wigData;
          return (
            <>
              {/* ── KPI CARDS ────────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 22 }}>

                <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 }}>
                    Procesy wg DoD
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>
                    {kpi.doneProcs}/{kpi.totalProcs}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>ukończonych procesów</div>
                  <ProgressBar value={kpi.doneProcs} max={kpi.totalProcs} color="#6366f1" />
                </div>

                <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 }}>
                    Działania LEAD
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>
                    {Math.round(kpi.leadPct * 100)}%
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>wykonanych w {selectedWeek}</div>
                  <ProgressBar value={kpi.leadPct} color="#22c55e" />
                </div>

                <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 }}>
                    Aktywne SUB-WIG-i
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{kpi.subWigs}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>strumieni pracy</div>
                </div>

                <div style={{ background: kpi.tbdLags > 0 ? '#fffbeb' : '#fff', borderRadius: 14,
                  padding: '16px 18px', border: kpi.tbdLags > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 }}>
                    LAG do ustalenia
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.tbdLags > 0 ? '#92400e' : '#22c55e' }}>
                    {kpi.tbdLags}
                  </div>
                  <div style={{ fontSize: 12, color: kpi.tbdLags > 0 ? '#b45309' : '#94a3b8' }}>
                    {kpi.tbdLags > 0 ? 'LAG-ów wymaga definicji' : 'wszystkie zdefiniowane'}
                  </div>
                </div>
              </div>

              {/* ── LAG + LEAD grid ──────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 18, marginBottom: 22 }}>

                {/* LAG SECTION */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>LAG Measures</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>tydzień {selectedWeek}</div>
                  </div>

                  {/* LAG-01 */}
                  <div style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6366f1',
                      letterSpacing: 1, marginBottom: 12 }}>
                      LAG-01 — Procesy opisane wg DoD
                    </div>
                    {lag.lag01.processes.map((p, i) => {
                      const val = p.values[wi] || 0;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: val >= 1 ? 'none' : '2px solid #e2e8f0',
                            background: val >= 1 ? '#22c55e' : '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {val >= 1 && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 13, color: val >= 1 ? '#1e293b' : '#64748b', flex: 1 }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{p.target}</span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Postęp</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                          {Math.round((lag.lag01.progress[wi] || 0) * 100)}%
                        </span>
                      </div>
                      <ProgressBar value={lag.lag01.progress[wi] || 0} color="#6366f1" height={8} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Plan: {Math.round((lag.lag01.plan[wi] || 0) * 100)}%</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: lag.lag01.on_track[wi] ? '#22c55e' : '#f59e0b' }}>
                          {lag.lag01.on_track[wi] ? 'On track' : 'Monitoring'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LAG-02+ */}
                  {lag.additional_lags.map((l, i) => (
                    <div key={i} style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9',
                      background: l.is_tbd ? '#fffbeb' : '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: l.is_tbd ? '#92400e' : '#1e293b' }}>
                          {l.name.split('—')[0].trim()}
                        </span>
                        {l.is_tbd ? <TbdBadge /> : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>
                            {Math.round((l.values?.[wi] || 0) * 100)}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        {l.name.split('—').slice(1).join('—').trim()}
                      </div>
                      {l.is_tbd ? (
                        <div style={{ fontSize: 11, color: '#b45309' }}>
                          Kryteria do zdefiniowania: {l.criteria.length} pkt
                        </div>
                      ) : (
                        <ProgressBar value={l.values?.[wi] || 0} color="#6366f1" height={4} />
                      )}
                    </div>
                  ))}
                </div>

                {/* LEAD SECTION */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>LEAD Measures</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {WEEKS.map(w => (
                        <span key={w} style={{ fontSize: 10, fontWeight: w === selectedWeek ? 700 : 400,
                          color: w === selectedWeek ? '#6366f1' : '#94a3b8' }}>{w}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>LEAD Score ogólny</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>
                        {Math.round((lead.lead_score.values[wi] || 0) * 100)}%
                      </span>
                    </div>
                    <ProgressBar value={lead.lead_score.values[wi] || 0} color="#22c55e" height={8} />
                  </div>

                  {lead.sub_wigs.map((sw, si) => {
                    const swProgress = sw.progress[wi] || 0;
                    return (
                      <div key={si} style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sw.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>
                            {Math.round(swProgress * 100)}%
                          </span>
                        </div>
                        <ProgressBar value={swProgress} color="#6366f1" height={4} />
                        <div style={{ marginTop: 10 }}>
                          {sw.tasks.map((t, ti) => {
                            const val = t.values[wi] || 0;
                            return (
                              <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <LeadDot val={val} />
                                <span style={{ fontSize: 12, color: val === 1 ? '#1e293b' : '#64748b', flex: 1, lineHeight: 1.4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginRight: 4 }}>{t.deadline}</span>
                                  {t.description}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* ── MAPA PROCESÓW ──────────────────────────────────────────────────── */}
        {data.processes.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Mapa procesów</div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{data.processes.length} procesów</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#','Typ','Proces','Właściciel','Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
                        color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.processes.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{p.id}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
                          background: p.type === 'Główny' ? '#eff6ff' : '#f5f3ff',
                          color: p.type === 'Główny' ? '#2563eb' : '#7c3aed', fontWeight: 600 }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#64748b' }}>{p.owner}</td>
                      <td style={{ padding: '10px 16px' }}><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BACKLOG SUMMARY ────────────────────────────────────────────────── */}
        {data.backlog_count !== null && (
          <div style={{ background: 'linear-gradient(135deg,#fafafe 0%,#f0f9ff 100%)', borderRadius: 16,
            border: '1px solid #e0e7ff', padding: '18px 24px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ fontSize: 32 }}>📋</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>BACKLOG zmian</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {data.backlog_count} pomysłów i usprawnień oczekuje na ocenę
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1' }}>{data.backlog_count}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>pozycji</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0 8px', fontSize: 12, color: '#cbd5e1' }}>
          4DX Scoreboard · OvocxMalinovi 2026 · Tydzień {selectedWeek} · Dane na żywo z Google Sheets
        </div>

      </div>
    </div>
  );
}
