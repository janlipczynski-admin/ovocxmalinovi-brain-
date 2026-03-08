# Mapa arkuszy — DYNAMICZNE parsowanie oparte na markerach

---

## ⭐ REFERENCYJNA IMPLEMENTACJA JS — przetestowana na danych gviz (2026-03-08)

> Implementacja poniżej jest **PRZETESTOWANA na prawdziwych danych z gviz API**.
> Używaj jej jako wzorca przy modyfikacjach `dashboard_4dx_light.jsx`.
> Klucz: parsery operują na **surowych wierszach gviz** (`row.c[idx].v`), NIE na spłaszczonych tablicach.

### Zmiana architektury fetch (wymagana)

`fetchGvizSheet` musi zwracać **surowe** `table.rows` (nie transformować do flat arrays):

```javascript
const rows = table.rows || [];  // ← surowe gviz rows, każdy row ma row.c[]
return rows;
```

### parseLag(rows, currentWeek)

```javascript
function parseLag(rows, currentWeek) {
  const result = { wig_status: 0, lag01: null, additional_lags: [], wig_description: '' };

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
    return isNaN(n) ? 0 : (s.includes('%') || n > 1 ? n / 100 : n);
  }

  for (let i = 0; i < rows.length; i++) {
    if (cellStr(rows[i], 0) === 'WIG Status') {
      const raw = cellVal(rows[i], 1);
      if (typeof raw === 'number') { result.wig_status = raw; }
      else if (typeof raw === 'string') {
        const s = raw.replace(',', '.').replace('%', '');
        result.wig_status = parseFloat(s) / (raw.includes('%') ? 100 : 1) || 0;
      }
      break;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    if (a.match(/^20\d\d-\d\d-\d\d/)) {
      result.wig_description = cellStr(rows[i], 1);
      result.wig_deadline = a;
      break;
    }
  }

  let processHeaderRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    if (a === 'Proces' || a === 'Process') { processHeaderRow = i; break; }
  }

  let lag01ProgressRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    if (a.includes('LAG-01') && a.toLowerCase().includes('post')) { lag01ProgressRow = i; break; }
  }

  const weekCols = { T10: 2, T11: 3, T12: 4, T13: 5, T14: 6, T15: 7 };
  const weekKey = currentWeek;
  const weekColIdx = weekCols[weekKey];

  if (processHeaderRow >= 0 && lag01ProgressRow >= 0) {
    const processes = [];
    for (let i = processHeaderRow + 1; i < lag01ProgressRow; i++) {
      const name = cellStr(rows[i], 0);
      if (!name) continue;
      const values = {};
      for (const [wk, ci] of Object.entries(weekCols)) values[wk] = cellNum(rows[i], ci);
      processes.push({ name, values });
    }
    const progress = cellNum(rows[lag01ProgressRow], weekColIdx);
    result.lag01 = {
      processes, progress,
      done: processes.filter(p => p.values[weekKey] >= 0.99).length,
      total: processes.length
    };
  } else {
    result.lag01 = { processes: [], progress: 0, done: 0, total: 0 };
  }

  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    const match = a.match(/^LAG-0?(\d+)\s*[—–-]/);
    if (match && parseInt(match[1]) >= 2) {
      const lagName = a;
      const lagNum = parseInt(match[1]);
      let progressVal = 0;
      for (let j = i + 1; j < Math.min(i + 20, rows.length); j++) {
        const ja = cellStr(rows[j], 0);
        if (ja.includes(`LAG-0${lagNum}`) && ja.toLowerCase().includes('post')) {
          progressVal = cellNum(rows[j], weekColIdx) || cellNum(rows[j], 1);
          break;
        }
        if (ja.match(/^LAG-0?\d+\s*[—–-]/) && !ja.includes(`LAG-0${lagNum}`)) break;
      }
      let criteria = 0, headerRow = -1;
      for (let j = i + 1; j < Math.min(i + 3, rows.length); j++) {
        const ja = cellStr(rows[j], 0).toLowerCase();
        if (ja.includes('measure') || ja.includes('target')) { headerRow = j; break; }
      }
      if (headerRow >= 0) {
        for (let j = headerRow + 1; j < Math.min(headerRow + 10, rows.length); j++) {
          const ja = cellStr(rows[j], 0);
          if (!ja || ja.includes('LAG-') || ja === '') break;
          criteria++;
        }
      }
      const is_tbd = cellStr(rows[headerRow + 1] || rows[i], 1).toUpperCase() === 'TBD';
      result.additional_lags.push({ id: `LAG-0${lagNum}`, name: lagName, progress: progressVal, criteria, is_tbd });
    }
  }

  return result;
}
```

### parseLead(rows, currentWeek)

```javascript
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

  const weekCols = {};
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    if (cellStr(rows[i], 0).toLowerCase().includes('deadline')) {
      for (let c = 3; c < (rows[i].c || []).length; c++) {
        const v = cellVal(rows[i], c);
        if (typeof v === 'number' && v >= 10 && v <= 30) weekCols[`T${Math.round(v)}`] = c;
        else if (typeof v === 'string' && v.match(/^T?\d+$/)) {
          const num = parseInt(v.replace('T', ''));
          if (num >= 10 && num <= 30) weekCols[`T${num}`] = c;
        }
      }
      break;
    }
  }
  if (Object.keys(weekCols).length === 0) {
    for (let w = 10; w <= 15; w++) weekCols[`T${w}`] = w - 7;
  }

  const weekKey = currentWeek;
  const weekColIdx = weekCols[weekKey];

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    if (cellStr(rows[i], 1).toLowerCase().includes('lead score')) {
      result.lead_score = cellNum(rows[i], weekColIdx);
      break;
    }
  }

  const leadMarkers = [];
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i], 0);
    const leadMatch = a.match(/^Lead\s+(\d+)/i);       // permissive — no dash required
    const subWigMatch = a.match(/^SUB-WIG\s*(\d+)/i);  // permissive — no trailing space required
    if ((leadMatch || subWigMatch) &&
        !a.toLowerCase().includes('post') &&
        !a.toLowerCase().includes('on track') &&
        !a.toLowerCase().includes('leas ')) {
      leadMarkers.push({ row: i, name: a, num: leadMatch ? leadMatch[1] : subWigMatch[1] });
    }
  }

  for (let idx = 0; idx < leadMarkers.length; idx++) {
    const marker = leadMarkers[idx];
    const nextMarkerRow = idx + 1 < leadMarkers.length ? leadMarkers[idx + 1].row : rows.length;
    let headerRow = -1;
    for (let j = marker.row + 1; j < Math.min(marker.row + 3, rows.length); j++) {
      if (cellStr(rows[j], 0).toLowerCase().includes('deadline')) { headerRow = j; break; }
    }
    const tasks = [];
    if (headerRow >= 0) {
      for (let j = headerRow + 1; j < nextMarkerRow; j++) {
        const a = cellStr(rows[j], 0), b = cellStr(rows[j], 1);
        if (a.match(/^\d+$/) && b) {
          const values = {};
          for (const [wk, ci] of Object.entries(weekCols)) values[wk] = cellNum(rows[j], ci);
          tasks.push({ deadline: `T${parseInt(a)}`, desc: b, values, done: values[weekKey] >= 0.99 });
        }
      }
    }
    let progressVal = 0, onTrackVal = 'brak';
    for (let j = marker.row; j < nextMarkerRow; j++) {
      const a = cellStr(rows[j], 0).toLowerCase();
      if (a.includes('post') && (a.includes('lead') || a.includes('sub-wig') || a.includes('leas')))
        progressVal = cellNum(rows[j], weekColIdx);
      if (a.includes('on track') && (a.includes('lead') || a.includes('sub-wig')))
        onTrackVal = cellStr(rows[j], weekColIdx) || 'brak';
    }
    result.leads.push({
      id: `Lead ${marker.num}`, name: marker.name, progress: progressVal,
      onTrack: onTrackVal, tasks, done: tasks.filter(t => t.done).length, total: tasks.length,
    });
  }

  return result;
}
```

### parseWigs(rows)

```javascript
function parseWigs(rows) {
  let currentWeek = 'T10', wigs = [];
  if (rows[0]) {
    for (let c = 0; c < (rows[0].c || []).length; c++) {
      const v = rows[0].c[c] ? rows[0].c[c].v : null;
      if (typeof v === 'number' && v >= 10 && v <= 30) { currentWeek = `T${Math.round(v)}`; break; }
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i].c;
    if (!c) continue;
    const colC = c[2] ? String(c[2].v || '') : '';
    if (colC.startsWith('WIG#')) {
      wigs.push({ id: colC, name: c[1] ? String(c[1].v || '') : '', description: c[3] ? String(c[3].v || '') : '' });
    }
  }
  return { currentWeek, wigs };
}
```

### Kształty zwracanych danych

| Parser | Pole | Typ |
|--------|------|-----|
| `parseLag` | `wig_status` | number (0–1) |
| `parseLag` | `lag01.progress` | number (scalar, bieżący tydzień) |
| `parseLag` | `lag01.processes[].values` | `{T10: n, T11: n, ...}` |
| `parseLag` | `additional_lags[].progress` | number (scalar) |
| `parseLag` | `additional_lags[].criteria` | number (count) |
| `parseLead` | `lead_score` | number (scalar) |
| `parseLead` | `leads[].progress` | number (scalar) |
| `parseLead` | `leads[].tasks[].desc` | string (NIE `description`!) |
| `parseLead` | `leads[].tasks[].values` | `{T10: n, T11: n, ...}` |
| `parseLead` | `leads[].tasks[].done` | boolean |

---

Ten dokument opisuje jak parsować arkusz `2026_Ovocxmalinovi_dashboard`
**bez polegania na stałych numerach wierszy**. Parser szuka markerów
tekstowych i buduje mapę pozycji dynamicznie.

Dzięki temu:
- Dodanie nowego procesu, LAG-a, SUB-WIG-a — parser go automatycznie znajdzie
- Przesunięcie wierszy — nie psuje parsowania
- Zmiana nazw — parser szuka wzorców, nie dokładnych tekstów

---

## ⚠️ WAŻNE: Format danych gviz API

> Dotyczy wyłącznie ścieżki gviz (`fetchGvizSheet`). Parsowanie Excel/pandas nie ma tych ograniczeń.

### 1. Czytaj `.v`, nie `.f`

gviz API zwraca komórki jako obiekty `{v: wartość, f: "sformatowany tekst"}`.
**Zawsze czytaj pole `.v` (value).** Pole `.f` (formatted) zawiera tekst lokalny — nie parsuj go.

```js
// ✅ Poprawnie
cell.v  // → 1.0

// ❌ Błąd
cell.f  // → "100,00%" (format polski — nie parsuj!)
```

### 2. Kolumny tygodniowe nie mają labeli — używaj fallbacku

Kolumny tygodniowe w arkuszach LAG (`C`–`H`) mają `label=""` w odpowiedzi gviz.
**Nie szukaj "T10" w nagłówkach kolumn.** Zamiast tego użyj stałego fallbacku:

| Kolumna arkusza | Indeks gviz | Tydzień |
|-----------------|-------------|---------|
| C               | 2           | T10     |
| D               | 3           | T11     |
| E               | 4           | T12     |
| F               | 5           | T13     |
| G               | 6           | T14     |
| H               | 7           | T15     |

```js
// Fallback gdy findWeekColumns() zwróci < 2 kluczy:
const fallback = {};
WEEKS.forEach((w, i) => { fallback[w] = i + 2; }); // C=2 … H=7
```

### 3. Wartości procentowe — zakres 0.0–1.0

Dane tygodniowe to wartości zmiennoprzecinkowe:

| `.v`     | Znaczenie |
|----------|-----------|
| `1.0`    | 100%      |
| `0.0`    | 0%        |
| `0.2857` | 28.57%    |

Nigdy nie parsuj `.f` (np. `"28,57%"`) — użyj `.v` bezpośrednio.

### 4. WIG Status — jedyny wyjątek: string w kolumnie B

Wiersz z `"WIG Status"` w kolumnie A zawiera wartość procentową w kolumnie B jako **STRING** (np. `"28,57%"`). To jedyny przypadek, gdzie trzeba parsować string:

```js
// Wiersz WIG Status: kol A = "WIG Status", kol B = "28,57%" (string)
function parseWigStatus(val) {
  if (typeof val === 'number') return val;           // czasem już number
  if (typeof val === 'string' && val.includes(','))
    return parseFloat(val.replace(',', '.').replace('%', '')) / 100;
  return parseFloat(val) || 0;
}
```

### 5. Układ kolumn w arkuszach LAG

| Kolumna | Indeks | Typ    | Zawartość              |
|---------|--------|--------|------------------------|
| A       | 0      | string | Nazwa / marker sekcji  |
| B       | 1      | string | Target / Opis (DoD)    |
| C–H     | 2–7    | number | Dane tygodniowe T10–T15|
| I       | 8      | string | Dodatkowe info         |

### 6. Lekcje z sesji debugowania — 2026-03-06

> Konkretne ustalenia po analizie gviz response dla arkusza OS MALINOVI_LAG MEASURES.

#### Problem: findWeekColumns() zwracał `{}`

**Przyczyna:** Wiersz `processHeaderRow` (marker z "Proces" + "Target (DoD)") ma w kolumnach C–H wartość `null` (puste komórki) — **nigdy nie zawiera etykiet T10-T15**. Etykiety tygodniowe pojawiają się tylko w wierszach LAG-01 Postęp / SUB-WIG (arkusze LEAD). W arkuszach LAG kolumny danych tygodniowych są po prostu nienazwane.

**Konsekwencja:** findWeekColumns() na headerRow procesów zawsze zwróci `{}`. Fallback jest OBOWIĄZKOWY, nie opcjonalny.

#### Zweryfikowana struktura arkusza (gviz rows[]):

```
rows[7]  = processHeaderRow:
  [0]: "Proces"
  [1]: "Target (DoD)"
  [2]: null   ← brak "T10"!
  [3]: null   ← brak "T11"!
  [4]: null   ← brak "T12"!
  [5]: null   ← brak "T13"!
  [6]: null   ← brak "T14"!
  [7]: null   ← brak "T15"!
  [8]: null

rows[8]  = "Sprzedaż i Handel":
  [0]: "Sprzedaż i Handel"
  [1]: "100%"   ← Target jako string
  [2]: 0        ← T10 (number, NIE string)
  [3]: 0        ← T11
  [4]: 0        ← T12
  [5]: 0        ← T13
  [6]: 0        ← T14
  [7]: 0        ← T15
  [8]: null
```

#### Poprawna logika fallbacku (JS):

```js
// Po znalezieniu processHeaderRow — ZAWSZE sprawdź liczbę kluczy
let processWeekCols = findWeekColumns(rows, processHeaderRow);
if (Object.keys(processWeekCols).length < 2) {
  // Fallback: C=idx2, D=idx3, E=idx4, F=idx5, G=idx6, H=idx7
  const fallback = {};
  WEEKS.forEach((w, i) => { fallback[w] = i + 2; });
  processWeekCols = fallback;
}
```

#### Wartości danych w wierszach procesów:

| Sytuacja | `.v` | Znaczenie |
|----------|------|-----------|
| Proces ukończony | `1.0` (number) | 100% ✅ |
| Proces niezaczęty | `0` (number) | 0% |
| Brak danych | `null` lub `undefined` | traktuj jako 0 |
| Cel (kol B) | `"100%"` (string) | nie używaj do obliczeń |

**Kluczowa zasada:** `cell.v >= 0.99` → proces ukończony w danym tygodniu.

---

## Filozofia parsowania

```
1. KALIBRACJA — skanuj arkusz, znajdź markery sekcji
2. SEGMENTACJA — podziel arkusz na bloki między markerami
3. EKSTRAKCJA — z każdego bloku wyciągnij dane wg wzorca
```

**NIGDY nie używaj stałych numerów wierszy.** Zawsze szukaj markerów.

---

## Funkcje pomocnicze

```python
import pandas as pd
import numpy as np
import re

WEEKS = ['T10', 'T11', 'T12', 'T13', 'T14', 'T15']

def sf(val):
    """Bezpieczna konwersja na float. NaN/None/tekst → 0."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return 0
    try:
        return float(val)
    except:
        if isinstance(val, str) and val.endswith('%'):
            try: return float(val.rstrip('%')) / 100
            except: return 0
        return 0

def ss(val):
    """Bezpieczna konwersja na string. NaN → ''."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return ''
    return str(val).strip()

def find_rows(df, col, pattern, regex=False):
    """Znajdź wszystkie wiersze gdzie kolumna col zawiera pattern."""
    results = []
    for i in range(len(df)):
        val = ss(df.iloc[i, col])
        if regex:
            if re.search(pattern, val, re.IGNORECASE):
                results.append(i)
        else:
            if pattern.lower() in val.lower():
                results.append(i)
    return results

def find_row(df, col, pattern, regex=False):
    """Znajdź PIERWSZY wiersz. Zwraca indeks lub None."""
    rows = find_rows(df, col, pattern, regex)
    return rows[0] if rows else None

def find_week_columns(df, header_row):
    """Znajdź indeksy kolumn T10–T15 w wierszu nagłówkowym."""
    week_cols = {}
    for col in range(df.shape[1]):
        val = ss(df.iloc[header_row, col])
        if val in WEEKS:
            week_cols[val] = col
    return week_cols

def get_week_values(df, row, week_cols):
    """Pobierz wartości tygodniowe z wiersza, w kolejności T10–T15."""
    return [sf(df.iloc[row, week_cols[w]]) for w in WEEKS if w in week_cols]
```

---

## 1. Arkusz: `WIGI`

**Marker:** "WIG#" w kolumnie 2.

```python
def parse_wigs(df):
    wigs = []
    for i in range(len(df)):
        id_val = ss(df.iloc[i, 2])
        if id_val.startswith('WIG#'):
            wigs.append({
                'name': ss(df.iloc[i, 1]),
                'id': id_val,
                'description': ss(df.iloc[i, 3])
            })
    return wigs
```

---

## 2. Arkusze LAG MEASURES

**Dotyczy:** każdego arkusza kończącego się na `_LAG MEASURES`.

### Kalibracja

```python
def calibrate_lag(df):
    cal = {}
    cal['wig_status_row'] = find_row(df, 0, 'WIG Status')

    # Header procesów — szukaj wiersza z "Proces" w kol 0 ORAZ "Target" w kol 1
    # (sam tekst "Proces" może pojawić się w nazwie sekcji LAG-01)
    for i in range(len(df)):
        if ss(df.iloc[i, 0]) == 'Proces' and 'target' in ss(df.iloc[i, 1]).lower():
            cal['process_header_row'] = i
            cal['process_week_cols'] = find_week_columns(df, i)
            break

    # Koniec listy procesów
    cal['lag01_progress_row'] = find_row(df, 0, 'LAG-01 Postęp')
    cal['lag01_plan_row'] = find_row(df, 0, 'LAG-01 Plan')
    cal['lag01_ontrack_row'] = find_row(df, 0, 'LAG-01 On track')

    # Wszystkie dodatkowe LAG-i (LAG-02, LAG-03, ..., LAG-N)
    lag_markers = find_rows(df, 0, r'LAG-0[2-9]|LAG-[1-9][0-9]', regex=True)
    cal['additional_lags'] = []
    for marker_row in lag_markers:
        lag_name = ss(df.iloc[marker_row, 0])
        header_row = None
        for r in range(marker_row + 1, min(marker_row + 3, len(df))):
            if 'measure' in ss(df.iloc[r, 0]).lower() or 'target' in ss(df.iloc[r, 1]).lower():
                header_row = r
                break
        deadline = ''
        if header_row:
            for c in range(df.shape[1]):
                val = ss(df.iloc[header_row, c])
                if 'deadline' in val.lower():
                    deadline = val
                    break
        cal['additional_lags'].append({
            'name': lag_name, 'marker_row': marker_row,
            'header_row': header_row, 'deadline': deadline,
        })
    return cal
```

### Ekstrakcja

```python
def parse_lag(df):
    cal = calibrate_lag(df)
    result = {}
    result['wig_status'] = sf(df.iloc[cal['wig_status_row'], 1]) if cal.get('wig_status_row') is not None else 0

    wc = cal.get('process_week_cols', {})
    if cal.get('process_header_row') is not None and cal.get('lag01_progress_row') is not None:
        processes = []
        for row in range(cal['process_header_row'] + 1, cal['lag01_progress_row']):
            name = ss(df.iloc[row, 0])
            if not name: continue
            processes.append({
                'name': name, 'target': ss(df.iloc[row, 1]),
                'values': get_week_values(df, row, wc) if wc else []
            })
        result['lag01'] = {
            'processes': processes,
            'progress': get_week_values(df, cal['lag01_progress_row'], wc) if wc else [],
            'plan': get_week_values(df, cal['lag01_plan_row'], wc) if cal.get('lag01_plan_row') and wc else [],
            'on_track': get_week_values(df, cal['lag01_ontrack_row'], wc) if cal.get('lag01_ontrack_row') and wc else [],
        }
    else:
        result['lag01'] = {'processes': [], 'progress': [], 'plan': [], 'on_track': []}

    result['additional_lags'] = []
    for lag_info in cal.get('additional_lags', []):
        lag_data = {'name': lag_info['name'], 'deadline': lag_info['deadline']}
        if lag_info.get('header_row') is not None:
            hr = lag_info['header_row']
            target = ss(df.iloc[hr + 1, 1]) if hr + 1 < len(df) else ''
            lag_data['is_tbd'] = target.upper() == 'TBD' or target == ''
            lag_data['target'] = target
            criteria = []
            for r in range(hr + 2, min(hr + 12, len(df))):
                val = ss(df.iloc[r, 0])
                if not val: break
                criteria.append(val)
            lag_data['criteria'] = criteria
            lag_wc = find_week_columns(df, hr)
            if lag_wc and not lag_data['is_tbd']:
                lag_data['values'] = get_week_values(df, hr + 1, lag_wc)
        else:
            lag_data['is_tbd'] = True
            lag_data['criteria'] = []
        result['additional_lags'].append(lag_data)
    return result
```

---

## 3. Arkusze LEAD MEASURES

**Dotyczy:** każdego arkusza kończącego się na `_LEAD MEASURES`.

### Kalibracja

```python
def calibrate_lead(df):
    cal = {}
    for i in range(len(df)):
        if ss(df.iloc[i, 0]) == 'Deadline' and ss(df.iloc[i, 1]) == 'Opis':
            cal['main_header_row'] = i
            cal['week_cols'] = find_week_columns(df, i)
            break

    if 'main_header_row' in cal:
        cal['lead_score_row'] = cal['main_header_row'] + 1

    # Znajdź SUB-WIG-i (bez wierszy Postęp/On track)
    sub_wig_rows = []
    for i in range(len(df)):
        val = ss(df.iloc[i, 0])
        if re.match(r'SUB-WIG\s+\d+\s+', val) and 'Postęp' not in val and 'On track' not in val:
            sub_wig_rows.append((i, val))

    cal['sub_wigs'] = []
    for idx, (marker_row, marker_text) in enumerate(sub_wig_rows):
        sw = {'marker_row': marker_row, 'name': marker_text}
        for r in range(marker_row + 1, min(marker_row + 3, len(df))):
            if 'deadline' in ss(df.iloc[r, 0]).lower():
                sw['header_row'] = r
                sw['task_week_cols'] = find_week_columns(df, r)
                break

        if 'header_row' in sw:
            next_boundary = sub_wig_rows[idx + 1][0] if idx + 1 < len(sub_wig_rows) else len(df)
            tasks = []
            for r in range(sw['header_row'] + 1, next_boundary):
                dl = ss(df.iloc[r, 0])
                desc = ss(df.iloc[r, 1])
                full = ss(df.iloc[r, 0])
                if 'Postęp' in full:
                    sw['progress_row'] = r
                elif 'On track' in full:
                    sw['ontrack_row'] = r
                elif dl.startswith('T') and desc:
                    tasks.append(r)
            sw['task_rows'] = tasks
        cal['sub_wigs'].append(sw)
    return cal
```

### Ekstrakcja

```python
def parse_lead(df):
    cal = calibrate_lead(df)
    wc = cal.get('week_cols', {})
    result = {}

    if cal.get('lead_score_row') is not None and wc:
        result['lead_score'] = {
            'target': sf(df.iloc[cal['lead_score_row'], 2]),
            'values': get_week_values(df, cal['lead_score_row'], wc)
        }
    else:
        result['lead_score'] = {'target': 1, 'values': [0]*6}

    result['sub_wigs'] = []
    for sw_cal in cal.get('sub_wigs', []):
        sw_data = {'name': sw_cal['name'], 'tasks': []}
        twc = sw_cal.get('task_week_cols', wc)
        for row in sw_cal.get('task_rows', []):
            sw_data['tasks'].append({
                'deadline': ss(df.iloc[row, 0]),
                'description': ss(df.iloc[row, 1]),
                'target': sf(df.iloc[row, 2]),
                'values': get_week_values(df, row, twc) if twc else []
            })
        if sw_cal.get('progress_row') is not None and twc:
            sw_data['progress'] = get_week_values(df, sw_cal['progress_row'], twc)
        else:
            sw_data['progress'] = [0]*len(WEEKS)
        result['sub_wigs'].append(sw_data)
    return result
```

---

## 4. Arkusz: `MAPA PROCESÓW`

```python
def parse_mapa(df):
    processes = []
    header_rows = []
    for i in range(len(df)):
        row_text = ' '.join([ss(df.iloc[i, c]) for c in range(min(5, df.shape[1]))])
        if '#' in row_text and 'TYP' in row_text and 'PROCES' in row_text:
            header_rows.append(i)
    for hr in header_rows:
        for r in range(hr + 1, len(df)):
            pid = ss(df.iloc[r, 0])
            if not pid or not pid.isdigit(): break
            processes.append({
                'id': int(pid), 'type': ss(df.iloc[r, 1]),
                'name': ss(df.iloc[r, 2]), 'owner': ss(df.iloc[r, 3]),
                'version': ss(df.iloc[r, 4]), 'status': ss(df.iloc[r, 5]),
            })
    return processes
```

---

## 5. Arkusz: `OCENA 4DX`

```python
def parse_ocena(df):
    target_row = find_row(df, 0, 'Docelowa średnia')
    target_avg = sf(df.iloc[target_row, 1]) if target_row is not None else 0
    header_row = find_row(df, 0, 'Proces')
    if header_row is None: return {'target': target_avg, 'processes': []}
    week_cols = find_week_columns(df, header_row)
    avg_rows = find_rows(df, 0, 'Średnia')
    processes = []
    for avg_row in avg_rows:
        proc_name = ss(df.iloc[avg_row, 0]).replace('Średnia ', '')
        criteria = {}
        for r in range(avg_row - 1, header_row, -1):
            criterion = ss(df.iloc[r, 1])
            if not criterion:
                if ss(df.iloc[r, 0]) and ss(df.iloc[r, 0]) != proc_name: break
                continue
            criteria[criterion] = get_week_values(df, r, week_cols) if week_cols else []
        avg_values = get_week_values(df, avg_row, week_cols) if week_cols else []
        processes.append({'name': proc_name, 'criteria': criteria, 'avg': avg_values})
    return {'target': target_avg, 'processes': processes}
```

---

## 6. Arkusz: `BACKLOG`

```python
def parse_backlog(df):
    header_row = None
    for i in range(len(df)):
        row_text = ' '.join([ss(df.iloc[i, c]) for c in range(min(15, df.shape[1]))])
        if 'KATEGORIA' in row_text and 'STATUS' in row_text:
            header_row = i
            break
    if header_row is None: return []
    col_names = [ss(df.iloc[header_row, c]) for c in range(df.shape[1])]
    items = []
    for row in range(header_row + 1, len(df)):
        has_data = any(ss(df.iloc[row, c]) for c in range(min(15, df.shape[1])))
        if not has_data: continue
        item = {}
        for c, name in enumerate(col_names):
            if name:
                key = re.sub(r'[^\w\s]', '', name).strip().lower().replace(' ', '_')
                if key: item[key] = ss(df.iloc[row, c])
        if item: items.append(item)
    return items
```

---

## 7. GŁÓWNA FUNKCJA

```python
def parse_4dx_dashboard(path):
    xls = pd.ExcelFile(path)
    all_sheets = xls.sheet_names
    result = {'wigs': [], 'wig_data': {}, 'processes': [], 'backlog': [], 'ocena': {}}

    if 'WIGI' in all_sheets:
        result['wigs'] = parse_wigs(pd.read_excel(path, sheet_name='WIGI', header=None))

    # Dynamicznie znajdź pary LAG/LEAD
    for s in all_sheets:
        if s.endswith('_LAG MEASURES'):
            prefix = s.replace('_LAG MEASURES', '')
            lag_df = pd.read_excel(path, sheet_name=s, header=None)
            lag_data = parse_lag(lag_df)
            lead_sheet = f'{prefix}_LEAD MEASURES'
            lead_data = parse_lead(pd.read_excel(path, sheet_name=lead_sheet, header=None)) if lead_sheet in all_sheets else {}
            has_data = lag_data.get('wig_status', 0) > 0 or any(p.get('values', [0])[0] > 0 for p in lag_data.get('lag01', {}).get('processes', []))
            result['wig_data'][prefix] = {'has_data': has_data, 'lag': lag_data, 'lead': lead_data}

    if 'MAPA PROCESÓW' in all_sheets:
        result['processes'] = parse_mapa(pd.read_excel(path, sheet_name='MAPA PROCESÓW', header=None))
    if 'OCENA 4DX' in all_sheets:
        result['ocena'] = parse_ocena(pd.read_excel(path, sheet_name='OCENA 4DX', header=None))
    if 'BACKLOG' in all_sheets:
        result['backlog'] = parse_backlog(pd.read_excel(path, sheet_name='BACKLOG', header=None))

    return result
```

---

## Markery tekstowe — podsumowanie

| Sekcja | Marker | Gdzie szukać |
|--------|--------|-------------|
| WIG-i | `WIG#` | kol 2 arkusza WIGI |
| WIG Status | `WIG Status` | kol 0 arkuszy LAG |
| Procesy DoD | header `Proces` → koniec `LAG-01 Postęp` | kol 0 |
| LAG-i dodatkowe | regex `LAG-0[2-9]\|LAG-[1-9][0-9]` | kol 0 |
| SUB-WIG-i | regex `SUB-WIG\s+\d+` (bez Postęp/On track) | kol 0 |
| Zadania LEAD | `T10`–`T15` w kol 0 po headerze SUB-WIG | kol 0 |
| Mapa procesów | header `# + TYP + PROCES` | kol 0–4 |
| OCENA procesy | `Średnia [nazwa]` | kol 0 |
| BACKLOG | header `KATEGORIA + STATUS` | cały wiersz |
| Pary arkuszy | sufiks `_LAG MEASURES` / `_LEAD MEASURES` | nazwy sheetów |
