'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OvocxMalinovi — Google Sheets Data Layer
//
// Arkusz: 2026_Ovocxmalinovi_dashboard
//   URL: https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/
//   WIGI               (gid=1699564336) https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=1699564336
//   OS_LAG MEASURES    (gid=322339268)  https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=322339268
//   OS_LEAD MEASURES   (gid=1844898951) https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=1844898951
//   DASHBOARD          (gid=2102307131) https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=2102307131
//   HARVEST_LAG        (gid=200348167)  https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=200348167
//   HARVEST_LEAD       (gid=259840012)  https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=259840012
//   NOCOMPLAINTS_LAG   (gid=716489223)  https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=716489223
//   NOCOMPLAINTS_LEAD  (gid=1872002)     https://docs.google.com/spreadsheets/d/1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ/edit?gid=1872002
//
//   Opublikowany HTML: https://docs.google.com/spreadsheets/d/e/2PACX-1vSimi_8QNgrYdyybHFgP1gaoPBET-_4OfNFY1b39NSjRBg_8puY28ZMYoifKh5DaDC8MxSiJdvPJX3d/pubhtml
//
// Struktura wierszy Postęp (LAG MEASURES):
//   A = "LAG-XX Postęp (średnia %)"  |  B = Deadline  |  C = T12  |  D = T13 ...
//   Wartości: ułamki (0.125 = 12.5%) lub procenty (41.43 = 41.43%)
//
// FETCH STRATEGY:
//   1. Jeśli SHEETS_CONFIG.appsScriptUrl jest ustawiony → fetchAppsScript() (preferowany)
//   2. Fallback → fetchGviz() (wymaga "Publikuj w internecie" na arkuszu)
//
//   appsScriptUrl uzupełnij po wdrożeniu js/apps-script.gs w Google Apps Script:
//   Arkusz → Rozszerzenia → Apps Script → Wdróż → Nowe wdrożenie → Aplikacja internetowa
// ─────────────────────────────────────────────────────────────────────────────

const SHEETS_CONFIG = {
  id:              '1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ',
  lagMeasuresGid:  '322339268',
  leadMeasuresGid: '1844898951',
  // Uzupełnij po wdrożeniu Apps Script (js/apps-script.gs):
  appsScriptUrl:   'https://script.google.com/macros/s/AKfycbzy3UK1jGVLGPb11Goks72YE_cQ7wakAiqlqdHCubdGH3URsqYbDRwhbcjiODTR7LHrFg/exec'
};

// ISO week number (1–53)
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Kolumny tygodniowe: BASE_WEEK=12 = kolumna C (index 2) — fallback dla nowego arkusza
// findWeekCol() dynamicznie szuka nagłówka "T10"/"T11"/... w wierszach danych
const BASE_WEEK = 12;
const BASE_COL  = 2;

function weekColIndex() {
  return BASE_COL + (isoWeek(new Date()) - BASE_WEEK);
}

// Dynamicznie szuka indeksu kolumny z bieżącym tygodniem ("T10", "T11", ...)
function findWeekCol(rows) {
  const currentWeek = isoWeek(new Date());
  const weekLabel = 'T' + currentWeek;
  for (let ri = 0; ri < Math.min(rows.length, 8); ri++) {
    const cells = rows[ri].c || [];
    for (let i = 1; i < cells.length; i++) {
      if (String(cells[i]?.v || '').trim() === weekLabel) return i;
    }
  }
  return BASE_COL + (currentWeek - BASE_WEEK);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

// Pobiera z Apps Script Web App → zwraca { lag, lead, updated }
// Używa JSONP żeby ominąć blokadę CORS przy redirect Apps Script
function fetchAppsScript() {
  return new Promise(function(resolve, reject) {
    const cbName = '_oxmCb' + Date.now();
    const url = SHEETS_CONFIG.appsScriptUrl + '?callback=' + cbName;
    const script = document.createElement('script');
    const timer = setTimeout(function() {
      cleanup();
      reject(new Error('Apps Script timeout'));
    }, 10000);
    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[cbName] = function(data) {
      cleanup();
      if (data && data.error) { reject(new Error('Apps Script: ' + data.error)); return; }
      resolve(data);
    };
    script.src = url;
    script.onerror = function() { cleanup(); reject(new Error('Apps Script load error')); };
    document.head.appendChild(script);
  });
}

// Fallback: gviz API (wymaga arkusza opublikowanego w internecie)
async function fetchGviz(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.id}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets HTTP ${res.status}`);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Nieprawidłowy format odpowiedzi Sheets');
  return JSON.parse(match[1]).table;
}

// ── Parsowanie ────────────────────────────────────────────────────────────────

// Zwraca % (0-100) z wiersza Postęp dla bieżącego tygodnia (weekCol)
// Fallback: ostatnia niepusta wartość numeryczna w wierszu
function extractPostep(rows, label, weekCol) {
  for (const row of rows) {
    const cells = row.c || [];
    if (String(cells[0]?.v || '').trim() === label) {
      if (weekCol > 0 && weekCol < cells.length) {
        const v = cells[weekCol]?.v;
        if (v != null && v !== '') {
          const n = Number(v);
          if (!isNaN(n)) return Math.round(n <= 1 ? n * 100 : n);
        }
      }
      // Fallback: ostatnia niepusta wartość numeryczna (arkusz może nie mieć danych bieżącego tygodnia)
      let lastVal = null;
      for (let i = 1; i < cells.length; i++) {
        const v = cells[i]?.v;
        if (v != null && v !== '') {
          const n = Number(v);
          if (!isNaN(n)) lastVal = n;
        }
      }
      if (lastVal !== null) return Math.round(lastVal <= 1 ? lastVal * 100 : lastVal);
      return 0;
    }
  }
  return 0;
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function arcDash(r, pct) {
  const c    = 2 * Math.PI * r;
  const fill = Math.max(0, Math.min(100, pct)) / 100 * c;
  return `${fill.toFixed(1)} ${(c - fill).toFixed(1)}`;
}

function clampPct(v) {
  return Math.round(Math.max(0, Math.min(100, Number(v) || 0)));
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, val);
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = clampPct(pct) + '%';
}

function formatPLN(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000)    return Math.round(num / 1000) + 'k';
  return String(Math.round(num));
}

// ── WIG #1 — OS MALINOVI ───────────────────────────────────────────────────────

function osColor(pct) {
  if (pct >= 70) return 'var(--green)';
  if (pct >= 30) return 'var(--yellow)';
  return 'var(--red)';
}

// Wspólna logika renderowania — używana przez oba źródła danych
function renderOSValues(sub1, sub2, sub3) {
  const overall = Math.round((sub1 + sub2 + sub3) / 3);

  // Gear A
  const cA = osColor(sub1);
  setAttr('gear-os-a', 'fill', cA);
  setAttr('ring-os-a', 'stroke', cA);
  setAttr('ring-os-a', 'stroke-dasharray', arcDash(32, sub1));
  setAttr('hub-os-a', 'fill', cA);
  setText('text-os-stanowiska', sub1 + '%');
  setAttr('text-os-stanowiska', 'fill', cA);

  // Gear B
  const cB = osColor(sub2);
  setAttr('gear-os-b', 'fill', cB);
  setAttr('ring-os-b', 'stroke', cB);
  setAttr('ring-os-b', 'stroke-dasharray', arcDash(32, sub2));
  setAttr('hub-os-b', 'fill', cB);
  setText('text-os-procesy', sub2 + '%');
  setAttr('text-os-procesy', 'fill', cB);

  // Gear C
  const cC = osColor(sub3);
  setAttr('gear-os-c', 'fill', cC);
  setAttr('ring-os-c', 'stroke', cC);
  setAttr('ring-os-c', 'stroke-dasharray', arcDash(32, sub3));
  setAttr('hub-os-c', 'fill', cC);
  setText('text-os-rytm', sub3 + '%');
  setAttr('text-os-rytm', 'fill', cC);

  // Główne koło zębate WIG (nowy element — jedno duże)
  const cMain = osColor(overall);
  setAttr('gear-os-main', 'fill', cMain);
  setAttr('ring-os-main', 'stroke', cMain);
  setAttr('ring-os-main', 'stroke-dasharray', arcDash(52, overall));
  setAttr('hub-os-main', 'fill', cMain);
  setText('text-os-overall', overall + '%');
  setAttr('text-os-overall', 'fill', cMain);

  // Lag bar
  setText('lag-val-os', overall + '%');
  setWidth('lag-bar-os', overall);

  // RAAG badge
  const raag = document.getElementById('raag-os');
  if (raag) {
    if (overall >= 80) {
      raag.className = 'raag green';
      raag.innerHTML = '<div class="raag-dot"></div>On track';
    } else if (overall >= 20) {
      raag.className = 'raag yellow';
      raag.innerHTML = '<div class="raag-dot"></div>W toku';
    } else {
      raag.className = 'raag red';
      raag.innerHTML = '<div class="raag-dot"></div>Wymaga akcji';
    }
  }

  // Modal / detail
  setText('modal-os-stanowiska', sub1 + '%');
  setText('modal-os-procesy',    sub2 + '%');
  setText('modal-os-rytm',       sub3 + '%');

  // LAG bars w widoku szczegółowym
  setWidth('lag-bar-os-01', sub1);
  setWidth('lag-bar-os-02', sub2);
  setWidth('lag-bar-os-03', sub3);
  setText('lag-val-os-01', sub1 + '%');
  setText('lag-val-os-02', sub2 + '%');
  setText('lag-val-os-03', sub3 + '%');
}

// Renderuje WIG #1 z JSON zwróconego przez Apps Script
function renderOSJson(lag) {
  if (!lag || lag.error) { console.warn('[Sheets] lag error:', lag?.error); return; }
  renderOSValues(lag.lag01 || 0, lag.lag02 || 0, lag.lag03 || 0);
}

// Renderuje WIG #1 z wierszy gviz (fallback)
function renderOS(lagRows) {
  const weekCol = findWeekCol(lagRows);
  const sub1    = extractPostep(lagRows, 'LAG-01 Postęp (średnia %)', weekCol);
  const sub2    = extractPostep(lagRows, 'LAG-02 Postęp (średnia %)', weekCol);
  const sub3    = extractPostep(lagRows, 'LAG-03 Postęp (średnia %)', weekCol);
  renderOSValues(sub1, sub2, sub3);
}

// ── PROCESY ───────────────────────────────────────────────────────────────────

function renderProcesses(data) {
  const cls   = { not_started: 'p-ns', in_progress: 'p-ip', done: 'p-done' };
  const label = { not_started: 'Not started', in_progress: 'In progress', done: 'Done ✓' };

  for (let i = 1; i <= 7; i++) {
    const key  = 'proc_0' + i;
    const val  = String(data[key] || 'not_started').trim();
    const pill = document.getElementById('proc-pill-' + i);
    if (pill) {
      pill.className   = 'pill ' + (cls[val] || 'p-ns');
      pill.textContent = label[val] || val;
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function initDashboard() {
  try {
    const data = await fetchAppsScript();
    if (data.lag) renderOSJson(data.lag);
    console.log('[Sheets] Dashboard załadowany z Apps Script');
  } catch (err) {
    console.warn('[Sheets] Błąd ładowania danych:', err.message);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDashboard);
}

if (typeof module !== 'undefined') {
  module.exports = { SHEETS_CONFIG, arcDash, clampPct, formatPLN, isoWeek, weekColIndex, findWeekCol };
}
