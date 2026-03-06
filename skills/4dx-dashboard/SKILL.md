---
name: 4dx-dashboard
description: >
  Skill do budowania i aktualizacji dashboardu 4DX Light dla OvocxMalinovi.
  Dashboard fetchuje dane NA ŻYWO z Google Sheets przez gviz API (Apps Script + gviz fallback).
  Używaj tego skilla zawsze, gdy użytkownik mówi o: dashboardzie 4DX, scoreboardzie OvocxMalinovi,
  WIG-ach, LAG measures, LEAD measures, mapie procesów, procesach DoD, sub-WIG-ach,
  arkuszu 4DX, aktualizacji postępów tygodniowych, parsowaniu danych z Google Sheets dla 4DX,
  lub prosi o wygenerowanie/zaktualizowanie dashboardu. Triggeruj też gdy użytkownik wspomina
  o procesach OvocxMalinovi, Obsługa zamówień OxM, Rozliczenia tygodniowe, Gospodarka magazynowa,
  BACKLOG zmian, OCENA 4DX, healthcheck procesów.
---

# 4DX Dashboard — OvocxMalinovi

Dashboard 4DX Light czyta dane **NA ŻYWO z Google Sheets** i renderuje interaktywny React/JSX.
Nie potrzebuje pliku .xlsx — sam fetchuje arkusz przez przeglądarkę.

## Plik docelowy

```
dashboard_4dx_light.jsx   ← standalone React/JSX, samodzielny data layer
```

## Architektura — Live Google Sheets

```
Google Sheets (źródło prawdy)
    ↓ gviz API (fetch przez przeglądarkę)  ← PRIMARY
    ↓ Apps Script JSONP                     ← OPTIONAL (gdy wdrożony)
Parser JS — dynamiczne markery tekstowe
    ↓ dane w pamięci React
Dashboard React/JSX — useState + useEffect
```

### Przepływ danych

1. `useEffect` wywołuje `loadDashboardData()` przy montowaniu komponentu
2. `loadDashboardData()` fetchuje wszystkie arkusze **równolegle** przez `Promise.allSettled`
3. Każdy arkusz parsowany przez dedykowaną funkcję (`parseLag`, `parseLead`, `parseMapa`, ...)
4. Dane trafiają do `useState` → rerenderuje dashboard z danymi live

### Mechanizm fetch — taki sam jak js/sheets.js

```js
// PRIMARY: Apps Script JSONP (gdy APPS_SCRIPT_URL_4DX ustawiony)
// FALLBACK: gviz API (działa bez auth, wymaga "Opublikuj w internecie")

async function fetchGvizSheet(param) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&${param}`;
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  const table = JSON.parse(match[1]).table;
  return (table.rows || []).map(row =>
    (row.c || []).map(cell => (cell && cell.v !== undefined) ? cell.v : null)
  );
}
```

## Arkusze i GID-y

| Klucz | Arkusz | GID / param |
|-------|--------|-------------|
| `WIGI` | WIGI | `gid=1699564336` |
| `OS_LAG` | OS_LAG MEASURES | `gid=322339268` |
| `OS_LEAD` | OS_LEAD MEASURES | `gid=1844898951` |
| `HARVEST_LAG` | HARVEST_LAG MEASURES | `gid=200348167` |
| `HARVEST_LEAD` | HARVEST_LEAD MEASURES | `gid=259840012` |
| `NOCOMPLAINTS_LAG` | NOCOMPLAINTS_LAG MEASURES | `gid=716489223` |
| `NOCOMPLAINTS_LEAD` | NOCOMPLAINTS_LEAD MEASURES | `gid=1872002` |
| `MAPA` | MAPA PROCESÓW | `sheet=MAPA%20PROCES%C3%93W` |
| `BACKLOG` | BACKLOG | `sheet=BACKLOG` |

## Parsowanie — DYNAMICZNE MARKERY TEKSTOWE

**NIGDY nie używaj stałych numerów wierszy.** Parser szuka markerów.
Szczegółowa specyfikacja: `references/sheet-map.md`

### Funkcje pomocnicze (JS)

```js
function ss(val)  // bezpieczna konwersja na string
function sf(val)  // bezpieczna konwersja na float (obsługuje % i ułamki)
function findRow(rows, col, pattern, regex=false)   // pierwszy pasujący wiersz
function findRows(rows, col, pattern, regex=false)  // wszystkie pasujące
function findWeekColumns(rows, headerRow)           // { T10: 2, T11: 3, ... }
function getWeekValues(rows, row, weekCols)         // [0.14, 0.14, ...]
```

### Parsery arkuszy

| Parser | Marker | Co zwraca |
|--------|--------|-----------|
| `parseWigs(rows)` | `WIG#` w kol 2 | `[{id, name, description}]` |
| `parseLag(rows)` | `WIG Status`, `Proces`+`Target`, `LAG-01 Postęp`, `LAG-0[2-9]` | `{wig_status, lag01, additional_lags}` |
| `parseLead(rows)` | `Deadline`+`Opis`, `SUB-WIG\s+\d+` | `{lead_score, sub_wigs}` |
| `parseMapa(rows)` | `# + TYP + PROCES` w pierwszych 5 kolumnach | `[{id, type, name, owner, status}]` |
| `countBacklog(rows)` | `KATEGORIA + STATUS` | liczba pozycji |

### Kluczowe zasady

1. **Kolumny tygodniowe** — szukaj `T10`–`T15` w wierszu nagłówkowym, nie zakładaj stałych indeksów
2. **Wartości LEAD** — `0` = nie, `0.5` = w toku, `1` = zrobione
3. **LAG-02/03/04** — mogą mieć `is_tbd: true` → pokaż badge TBD zamiast progress bara
4. **WIG#2/3/4** — mogą mieć zerowe dane → pokaż "Brak danych"
5. **WIG_STATIC** — kolory, właściciele, deadline — statyczne w kodzie (nie w Sheets)

## Dane statyczne (wbudowane w kod)

```js
const WIG_STATIC = [
  { key: 'OS',           color: '#6366f1', owner: 'Jan',     deadline: '2026-04-30' },
  { key: 'HARVEST',      color: '#f59e0b', owner: 'Kacper',  deadline: '' },
  { key: 'NOCOMPLAINTS', color: '#22c55e', owner: 'Olgierd', deadline: '' },
  { key: 'XPRODUCT',     color: '#ef4444', owner: 'Jan',     deadline: '' },
];
```

## Stany komponentu

```js
const [data,    setData]    = useState(null);    // null = loading
const [loading, setLoading] = useState(true);
const [error,   setError]   = useState(null);
const [activeWig, setActiveWig] = useState('OS');
const [selectedWeek, setSelectedWeek] = useState(...);  // domyślnie bieżący tydzień ISO
```

## Wymagane sekcje dashboardu

1. **Loading skeleton** — animacja pulse podczas fetchowania
2. **Error state** — banner z diagnostyką (co sprawdzić) + przycisk retry
3. **Header** — tytuł, czas pobrania danych, selector tygodnia (T10–T15), przycisk odśwież
4. **WIG Tabs** — 4 zakładki z % postępu
5. **WIG Hero Card** — opis, deadline, dni do końca, ring progress SVG
6. **KPI Cards** — Procesy wg DoD, LEAD %, SUB-WIG-i, LAG TBD
7. **LAG + LEAD grid** — LAG measures (checkboxy, TBD badge) + LEAD measures (SUB-WIG-i z zadaniami)
8. **Mapa procesów** — tabela (warunkowo — gdy data.processes.length > 0)
9. **Backlog summary** — licznik (warunkowo — gdy data.backlog_count !== null)

## Kolorystyka

- Primary: `#6366f1` (indigo)
- Success: `#22c55e`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Background: `#f8fafc`
- Font: DM Sans + DM Serif Display (Google Fonts)

## Wymaganie — arkusz musi być opublikowany

Arkusz Google Sheets musi być publiczny przez gviz API:
**Plik → Udostępnij → Opublikuj w internecie → Cały dokument → Strony internetowe**

Inaczej `fetchGvizSheet` otrzyma błąd 403 i dashboard pokaże error state z diagnostyką.

## Opcjonalnie: Apps Script (pełne dane 4DX)

Gdy Jan wdroży Apps Script obsługujący pełne dane 4DX (wszystkie WIG-i):
1. Ustaw `APPS_SCRIPT_URL_4DX` w konfiguracji
2. Dashboard spróbuje Apps Script JSONP najpierw
3. Fallback na gviz jeśli Apps Script zawiedzie

Endpoint Apps Script musi zwrócić strukturę kompatybilną z `loadDashboardData()`.

## Nawigacja i powiązania między stronami

### Zasada: zawsze `<a href="...">`, nigdy `<div>`

Linki nawigacyjne MUSZĄ być elementem `<a>` z `href`. Nigdy `<div>`, `<span>` ani inny element bez href.
Dotyczy klas: `.tool-row`, `.back-btn`, `.sub-nav-item`, `.tool-os`.

### Mapa nawigacji (pełna)

```
index.html  (centralny hub — zawiera WSZYSTKIE narzędzia)
├── dashboard-4dx.html      ← GŁÓWNY: 4DX React scoreboard (wszystkie WIG-i, live Sheets)
├── zakupy-planowanie.html  ← Planeta Zakupów
│   ├── zakupy-stan.html
│   ├── zakupy-plan2026.html
│   ├── zakupy-klienci.html
│   ├── zakupy-harmonogram.html
│   ├── kartony-dostawcy.html
│   └── zuzycie-2025.html
├── opakowania.html
├── planowanie-i-sprzedaz.html
└── rozliczenia-rt.html
```

### Powiązania procesów DoD z narzędziami

| # | Proces | Plik | Uwagi |
|---|--------|------|-------|
| 01 | Sprzedaż i Handel | `planowanie-i-sprzedaz.html` | |
| 02 | Obsługa zamówień OxM | Google Sheets (zewnętrzny) | brak dedykowanej strony HTML |
| 03 | Rozliczenia tygodniowe | `rozliczenia-rt.html` | |
| 04 | Obsługa reklamacji | — | brak strony, na razie bez linku |
| 05 | Gospodarka magazynowa | `zakupy-planowanie.html` | |
| 06 | Komunikacja wewnętrzna | — | brak strony, na razie bez linku |
| 07 | Certyfikacja i wymogi | — | brak strony, na razie bez linku |

Google Sheets ID: `1wbBSadvkRgGISPK7D8Asb0-qrkhPB_Ie9tJUWk6A0OQ`

### Linki nawigacyjne w każdym pliku

| Plik | Back-link | Narzędzia powiązane |
|------|-----------|---------------------|
| `dashboard-4dx.html` | `← Strona główna` → index.html | mini-nav: procesy 01, 02, 03, 05 |
| `index.html` | — (to jest root) | NARZĘDZIA: pełna lista (canonical) |

> **WIG #1 karta** w index.html (onclick + "szczegóły") → `dashboard-4dx.html`
> `os-malinovi.html` usunięty 2026-03-06 — zastąpiony przez `dashboard-4dx.html`

### Gdy dodajesz nową stronę dla procesu

1. Dodaj plik HTML z `back-btn` do odpowiedniego rodzica
2. Dodaj wpis do `tests/navigation.js` → `HTML_FILES` i `REQUIRED_PARENT`
3. Zaktualizuj tabelę powyżej
4. Dodaj link w `dashboard-4dx.html` mini-nav

---

## Rozwiązywanie problemów

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Błąd 403 | Arkusz nie opublikowany | Plik → Opublikuj w internecie |
| Puste dane LAG/LEAD | Arkusze HARVEST/NOCOMPLAINTS puste | Dashboard pokazuje "Brak danych" |
| LAG-02/03/04 TBD | Kryteria niezdefiniowane | Badge TBD widoczny — to oczekiwane |
| Brak wykresu MAPA | Brak nagłówka # TYP PROCES | Sprawdź strukturę arkusza MAPA PROCESÓW |
| Parser nie znajduje tygodni | Brak nagłówków T10–T15 | Sprawdź czy arkusz ma wiersz nagłówkowy z T10, T11... |
| Zahardkodowane kolory/właściciel | Zmienione WIG_STATIC | Edytuj WIG_STATIC w dashboard_4dx_light.jsx |
