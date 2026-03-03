'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OvocxMalinovi — Google Sheets Data Layer
//
// Źródło danych: zakładka DASHBOARD w arkuszu WIG Scoreboard
// Format:  kolumna A = klucz  |  kolumna B = wartość
//
// Wymagana konfiguracja arkusza:
//   • Plik → Udostępnij → "Każdy z linkiem może wyświetlać"
//   • Zakładka o nazwie: DASHBOARD
//   • Klucze (kolumna A) — lista poniżej w EXPECTED_KEYS
//
// Połączenie:  gviz JSON (nie wymaga API key)
// ─────────────────────────────────────────────────────────────────────────────

const SHEETS_CONFIG = {
  id:  '1LEHtdzY-vVbNw4riaCL3DZ6qa7NQgTix5ra9w_kfvoY',
  tab: 'DASHBOARD'
};

// Klucze oczekiwane w zakładce DASHBOARD (do walidacji w testach)
const EXPECTED_KEYS = [
  'os_stanowiska_pct',   // WIG#1: % stanowisk (0-100)
  'os_procesy_pct',      // WIG#1: % procesów (0-100)
  'os_rytm',             // WIG#1: rytm wdrożony? 0=NIE, 100=TAK
  'harvest_current_pln', // WIG#2: marża netto bieżąca (PLN)
  'harvest_target_pln',  // WIG#2: cel roczny PLN (domyślnie 600000)
  'complaints_current_pct', // WIG#3: % reklamacji wartości sprzedaży
  'complaints_target_pct',  // WIG#3: cel (domyślnie 3.0)
  'productx_pct',        // WIG#4: postęp Product X (0-100)
  'proc_01', 'proc_02', 'proc_03', 'proc_04',
  'proc_05', 'proc_06', 'proc_07'  // Procesy: not_started | in_progress | done
];

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchSheetData() {
  const { id, tab } = SHEETS_CONFIG;
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}&range=A:B`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets HTTP ${res.status}`);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) throw new Error('Nieprawidłowy format odpowiedzi Sheets');
  const json = JSON.parse(match[1]);
  const data = {};
  (json.table?.rows || []).forEach(row => {
    const k = row.c?.[0]?.v;
    const v = row.c?.[1]?.v;
    if (k != null) data[String(k).trim()] = v;
  });
  return data;
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

// Generuje stroke-dasharray dla kółka postępu (r = promień, pct = 0-100)
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
  if (el) el.style.width = pct + '%';
}

function formatPLN(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000)    return Math.round(num / 1000) + 'k';
  return String(Math.round(num));
}

// ── WIG #1 — OS MALINOVI ──────────────────────────────────────────────────────

function renderOS(data) {
  const stn     = clampPct(data.os_stanowiska_pct);
  const prc     = clampPct(data.os_procesy_pct);
  const ryt     = clampPct(data.os_rytm);
  const overall = Math.round((stn + prc + ryt) / 3);

  // SVG circles
  setAttr('circle-os-stanowiska', 'stroke-dasharray', arcDash(27, stn));
  setText('text-os-stanowiska', stn + '%');

  setAttr('circle-os-procesy', 'stroke-dasharray', arcDash(19, prc));
  setText('text-os-procesy', prc + '%');

  setAttr('circle-os-rytm', 'stroke-dasharray', arcDash(14, ryt));
  setText('text-os-rytm', ryt === 100 ? '✓' : '✗');

  // Lag bar
  setText('lag-val-os', overall + '%');
  setWidth('lag-bar-os', overall);

  // RAAG badge
  const raag = document.getElementById('raag-os');
  if (raag) {
    if (ryt === 100 && stn >= 80 && prc >= 80) {
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
  setText('modal-os-stanowiska', stn + '%');
  setText('modal-os-procesy',    prc + '%');
  setText('modal-os-rytm',       ryt === 100 ? '100%' : '0%');
}

// ── WIG #2 — HARVEST 50 ───────────────────────────────────────────────────────

function renderHarvest(data) {
  const current = Number(data.harvest_current_pln) || 0;
  const target  = Number(data.harvest_target_pln)  || 600000;
  const p = Math.min(100, Math.round(current / target * 100));

  setAttr('circle-harvest-main', 'stroke-dasharray', arcDash(60, p));
  setText('text-harvest-val', p + '%');
  setText('text-harvest-sub', '~' + formatPLN(current) + ' / ' + formatPLN(target) + ' PLN');
  setText('lag-val-harvest', '~' + formatPLN(current) + ' PLN');
  setWidth('lag-bar-harvest', p);
}

// ── WIG #3 — NO COMPLAINTS ────────────────────────────────────────────────────

function renderComplaints(data) {
  const current = Number(data.complaints_current_pct) || 0;
  const target  = Number(data.complaints_target_pct)  || 3;
  const maxPct  = 10;

  // Wskazówka gaugeʼa: -90° = 0%,  +90° = 10%  (180° zakres)
  const angle  = -90 + (Math.min(current, maxPct) / maxPct * 180);
  const needle = document.getElementById('gauge-needle');
  if (needle) needle.style.transform = `rotate(${angle.toFixed(1)}deg)`;

  setText('text-complaints-val', '~' + current.toFixed(1) + '%');
  setText('lag-val-complaints',  '~' + current.toFixed(1) + '%');
  setWidth('lag-bar-complaints', Math.min(100, current / maxPct * 100));

  // RAAG
  const raag = document.getElementById('raag-complaints');
  if (raag) {
    if (current <= target) {
      raag.className = 'raag green';
      raag.innerHTML = '<div class="raag-dot"></div>On track';
    } else {
      raag.className = 'raag yellow';
      raag.innerHTML = '<div class="raag-dot"></div>Wymaga akcji';
    }
  }
}

// ── WIG #4 — PRODUCT X ────────────────────────────────────────────────────────

function renderProductX(data) {
  const p = clampPct(data.productx_pct);
  setAttr('circle-productx-outer', 'stroke-dasharray', arcDash(65, p));
  setText('text-productx-pct', p + '%');
  setWidth('lag-bar-productx', p);
}

// ── PROCESY ───────────────────────────────────────────────────────────────────

function renderProcesses(data) {
  const cls   = { not_started: 'p-ns', in_progress: 'p-ip', done: 'p-done' };
  const label = { not_started: 'Not started', in_progress: 'In progress', done: 'Done ✓' };

  for (let i = 1; i <= 7; i++) {
    const key = 'proc_0' + i;
    const val = String(data[key] || 'not_started').trim();
    const pill = document.getElementById('proc-pill-' + i);
    if (pill) {
      pill.className  = 'pill ' + (cls[val] || 'p-ns');
      pill.textContent = label[val] || val;
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function initDashboard() {
  try {
    const data = await fetchSheetData();
    renderOS(data);
    renderHarvest(data);
    renderComplaints(data);
    renderProductX(data);
    renderProcesses(data);
    console.log('[Sheets] Dashboard załadowany pomyślnie');
  } catch (err) {
    console.warn('[Sheets] Nie udało się pobrać danych z Google Sheets:', err.message);
    // Dashboard pozostaje w stanie neutralnym (0%) — nie crashuje
  }
}

// W przeglądarce: inicjalizuj po załadowaniu DOM
// W Node.js (testy): tylko eksportuj funkcje pomocnicze
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDashboard);
}

if (typeof module !== 'undefined') {
  module.exports = { SHEETS_CONFIG, EXPECTED_KEYS, arcDash, clampPct, formatPLN };
}
