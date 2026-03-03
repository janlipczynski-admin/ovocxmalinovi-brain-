'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OvocxMalinovi — Google Sheets Data Layer
//
// Źródła danych:
//   LAG MEASURES  (gid=1735907035) — postęp SUB-WIG 1/2/3 dla WIG #1 OS MALINOVI
//   LEAD MEASURES (gid=1844898951) — lead measures
//
// Struktura wierszy Postęp:
//   A = "SUB-WIG X Postęp"  |  B = waga(1)  |  C = T10  |  D = T11  |  E = T12 ...
//   Wartości: ułamki dziesiętne (0.125 = 12.5%)
// ─────────────────────────────────────────────────────────────────────────────

const SHEETS_CONFIG = {
  id:              '1LEHtdzY-vVbNw4riaCL3DZ6qa7NQgTix5ra9w_kfvoY',
  lagMeasuresGid:  '1735907035',
  leadMeasuresGid: '1844898951'
};

// ISO week number (1–53)
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// W wierszach Postęp: C = T10 (colIndex 2), D = T11 (colIndex 3), ...
// BASE_WEEK=10 odpowiada kolumnie C (index 2)
const BASE_WEEK = 10;
const BASE_COL  = 2;

function weekColIndex() {
  return BASE_COL + (isoWeek(new Date()) - BASE_WEEK);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

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

// Zwraca % (0-100) z wiersza "SUB-WIG X Postęp" dla bieżącego tygodnia
function extractPostep(rows, label) {
  const col = weekColIndex();
  for (const row of rows) {
    const cells = row.c || [];
    if (String(cells[0]?.v || '').trim() === label) {
      const v = cells[col]?.v;
      if (v == null) return 0;
      const n = Number(v);
      // Arkusz przechowuje ułamki (0.125) — zamień na %
      return Math.round(n <= 1 ? n * 100 : n);
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

// ── WIG #1 — OS MALINOVI (z LAG MEASURES) ─────────────────────────────────────

function renderOS(lagRows) {
  const sub1    = extractPostep(lagRows, 'SUB-WIG 1 Postęp');
  const sub2    = extractPostep(lagRows, 'SUB-WIG 2 Postęp');
  const sub3    = extractPostep(lagRows, 'SUB-WIG 3 Postęp');
  const overall = Math.round((sub1 + sub2 + sub3) / 3);

  // SVG circles
  setAttr('circle-os-stanowiska', 'stroke-dasharray', arcDash(27, sub1));
  setText('text-os-stanowiska', sub1 + '%');

  setAttr('circle-os-procesy', 'stroke-dasharray', arcDash(19, sub2));
  setText('text-os-procesy', sub2 + '%');

  setAttr('circle-os-rytm', 'stroke-dasharray', arcDash(14, sub3));
  setText('text-os-rytm', sub3 + '%');

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

  // Modal
  setText('modal-os-stanowiska', sub1 + '%');
  setText('modal-os-procesy',    sub2 + '%');
  setText('modal-os-rytm',       sub3 + '%');
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
    const lagTable = await fetchGviz(SHEETS_CONFIG.lagMeasuresGid);
    const lagRows  = lagTable?.rows || [];

    renderOS(lagRows);
    renderProcesses({});

    console.log('[Sheets] Dashboard załadowany pomyślnie');
  } catch (err) {
    console.warn('[Sheets] Błąd ładowania danych:', err.message);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDashboard);
}

if (typeof module !== 'undefined') {
  module.exports = { SHEETS_CONFIG, arcDash, clampPct, formatPLN, isoWeek, weekColIndex };
}
