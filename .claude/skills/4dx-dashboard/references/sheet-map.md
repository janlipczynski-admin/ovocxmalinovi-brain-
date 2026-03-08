# Mapa arkuszy — DYNAMICZNE parsowanie oparte na markerach

Ten dokument opisuje jak parsować arkusz `2026_Ovocxmalinovi_dashboard`
**bez polegania na stałych numerach wierszy**. Parser szuka markerów
tekstowych i buduje mapę pozycji dynamicznie.

---

## GID-y arkuszy (zweryfikowane 2026-03-08)

| Arkusz | GID |
|--------|-----|
| WIGI | `1699564336` |
| OS_LAG MEASURES | `322339268` |
| OS_LEAD MEASURES | `2102307131` |
| HARVEST_LAG MEASURES | `200348167` |
| HARVEST_LEAD MEASURES | `259840012` |

> **Uwaga:** GID dla OS_LEAD MEASURES to `2102307131` — nie `1844898951` (stary, nieaktualny).
> Zawsze weryfikuj GID-y otwierając arkusz i sprawdzając URL: `...spreadsheets/d/ID/edit#gid=GID`.

Dzięki temu:
- Dodanie nowego procesu, LAG-a, SUB-WIG-a — parser go automatycznie znajdzie
- Przesunięcie wierszy — nie psuje parsowania
- Zmiana nazw — parser szuka wzorców, nie dokładnych tekstów

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

WEEKS = ['T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17', 'T18']

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

**Aktualny tydzień:** `WIGI!E1` = wiersz 0, kolumna E (indeks 4) — liczba tygodnia (np. 10 → T10).
Dashboard odczytuje ten wiersz przy starcie i ustawia `selectedWeek` dynamicznie.

**Marker WIG-ów:** "WIG#" w kolumnie 2.

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

# Aktualny tydzień: df.iloc[0, 4] → int → 'T' + str(int)
current_week = 'T' + str(int(df.iloc[0, 4])) if df.shape[0] > 0 else 'T10'
```

---

## 2. Arkusze LAG MEASURES

**Dotyczy:** każdego arkusza kończącego się na `_LAG MEASURES`.

### Kalibracja

```python
def calibrate_lag(df):
    cal = {}
    cal['wig_status_row'] = find_row(df, 0, 'WIG Status')

    # Header procesów — szukaj wiersza z "Proces" w kol 0
    # WAŻNE: NIE wymagaj "target" w kol 1 — OS_LAG ma inne label niż HARVEST_LAG
    # (np. OS_LAG kol B może mieć "DoD criteria" zamiast "Target (DoD)")
    for i in range(len(df)):
        c0 = ss(df.iloc[i, 0]).lower().strip()
        if c0 == 'proces':
            cal['process_header_row'] = i
            cal['process_week_cols'] = find_week_columns(df, i)
            break
    # Fallback: broader match jeśli exact 'proces' nie znaleziony
    if 'process_header_row' not in cal:
        for i in range(len(df)):
            c0 = ss(df.iloc[i, 0]).lower().strip()
            if 'proces' in c0 and 'lag' not in c0 and 'post' not in c0:
                cal['process_header_row'] = i
                cal['process_week_cols'] = find_week_columns(df, i)
                break

    # Koniec listy procesów
    cal['lag01_progress_row'] = find_row(df, 0, 'LAG-01 Postęp')
    cal['lag01_plan_row'] = find_row(df, 0, 'LAG-01 Plan')
    cal['lag01_ontrack_row'] = find_row(df, 0, 'LAG-01 On track')

    # Wszystkie dodatkowe LAG-i (LAG-02, LAG-03, LAG-04, LAG-05, ...)
    # Każdy LAG ma wiersz "LAG-XX Postęp (średnia %)" — czytaj STAMTĄD, nie z headerRow+1
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

### Dokładna struktura OS_LEAD MEASURES (gid=2102307131)

```
Wiersz 0:  "LEAD Measures"                    ← tytuł
Wiersz 1:  instrukcja
Wiersz 2:  "WIG — OvocxMalinovi 4DX"
Wiersz 3:  ["Deadline (nr Tyg)", "Opis", "Target", 10, 11, 12, 13, 14, 15]  ← GŁÓWNY NAGŁÓWEK
Wiersz 4:  [15, "LEAD score: realizacja...", 1, 0.03125, 0, ...]             ← LEAD score
Wiersz 5:  (pusty)
Wiersz 6:  "Lead 1 - Procesy i role (DoD)"    ← MARKER Lead 1
Wiersz 7:  ["Deadline", "Opis", "Target", 10, 11, ...]                       ← nagłówek Lead 1
Wiersz 8-15: zadania Lead 1
Wiersz 16: "Leas 1 - OS Procesy i role Postęp"   ← POSTĘP (literówka "Leas"!)
Wiersz 17: "Lead 1 - OS Procesy i role On track"  ← ON TRACK
Wiersz 22: "Lead 2 - Obsługa zamówień"            ← MARKER Lead 2
Wiersz 23: nagłówek
Wiersz 24-29: 6 zadań
Wiersz 33: "Lead 2 -  Obsługa zamówień Postęp"   ← POSTĘP (podwójna spacja!)
Wiersz 34: "Lead 2 - Obsługa zamówień On track"
Wiersz 38: "Lead 3 - Rozliczenia tygodniowe"      ← MARKER Lead 3
...
Wiersz 51: "Lead 4 -  Obsługa reklamacji"         ← MARKER Lead 4 (podwójna spacja!)
...
Wiersz 62: "Lead 5 - wdrożenie - 4dex w spółce"  ← MARKER Lead 5 (dwa myślniki w nazwie!)
...
Wiersz 85: "LEAD 5 - Wdrożenie i przeglądy 4dx w spółce Postęp"  ← POSTĘP (wielkie "LEAD"!)
```

### Kolumny tygodniowe

W wierszu nagłówkowym (3, 7, 23, 39, 52, 63):
- col A (0) = Deadline | col B (1) = Opis | col C (2) = Target
- col D (3) = T10 | col E (4) = T11 | col F (5) = T12 | col G (6) = T13 | col H (7) = T14 | col I (8) = T15

Gviz zwraca numery tygodni jako liczby całkowite (v=10, v=11 itd.), nie jako stringi.

### Jak znajdować markery Lead-ów (JS)

```js
// Regex: wymaga myślnika po numerze. \s* = 0 lub więcej spacji (obsługuje podwójną spację)
const leadMatch = a.match(/^Lead\s*(\d+)\s*[-–—]/i);

// Wykluczenia — sprawdź PRZED regex (szybsze):
if (aLow.includes('post') || aLow.includes('on track')) continue;

// NIE sprawdzaj 'leas ' — "Leas 1" zawiera "Leas" nie "Lead", więc i tak nie matchuje regex
```

### Jak znajdować wiersz Postęp

Szukaj w zakresie [marker.row, nextMarker.row):
- col A zawiera "post" (od "Postęp") ORAZ ("lead" LUB "leas" LUB "sub-wig")
- Wartość w kolumnie tygodniowej = ułamek (0.125 = 12.5%)

### Jak znajdować On track

Szukaj w tym samym zakresie:
- col A zawiera "on track" ORAZ ("lead" LUB "sub-wig")
- Wartość = string "TAK" lub "NIE"

### Pułapki

| Problem | Opis | Rozwiązanie |
|---------|------|-------------|
| Literówka "Leas" | Wiersz 16: "Leas 1 - OS..." zamiast "Lead 1 - OS..." | Szukaj "leas" w warunku Postęp |
| Podwójna spacja | "Lead 4 -  Obsługa" | Regex `\s*[-–—]` obsługuje poprawnie |
| Wielkie LEAD | "LEAD 5 - Wdrożenie Postęp" | Sprawdzaj `includes('post')` zanim sprawdzisz regex |
| Dwa myślniki | "Lead 5 - wdrożenie - 4dex" | Regex `/^Lead\s*(\d+)\s*[-–—]/i` matchuje pierwszy myślnik |
| Nagłówek w col B | Jeśli "Deadline" jest w col B a nie col A | Sprawdzaj oba: `a.startsWith('deadline') || b.startsWith('deadline')` |



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

    # Znajdź markery LEAD-ów (format 2026: "Lead X") lub stary "SUB-WIG X"
    # Wiersze Postęp/On track są WYKLUCZONE
    # WAŻNE: regex /^(SUB-WIG|Lead)\s*\d/i — obie formy w jednym, \s* (zero+ spacji)
    # OS_LEAD: "Lead 1 - Procesy i role (DoD)" | HARVEST_LEAD: "SUB-WIG 0"
    sub_wig_rows = []
    for i in range(len(df)):
        val = ss(df.iloc[i, 0]).strip()
        is_marker = bool(re.match(r'^(SUB-WIG|Lead)\s*\d', val, re.IGNORECASE))
        if is_marker and 'Postęp' not in val and 'on track' not in val.lower():
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
| **Aktualny tydzień** | `WIGI!E1` = `rows[0][4]` | wiersz 0, kolumna E arkusza WIGI |
| WIG Status | `WIG Status` | kol 0 arkuszy LAG (= ŚREDNIA LAG-01..LAG-05) |
| Procesy DoD | header `Proces` → koniec `LAG-01 Postęp` | kol 0 |
| LAG-i dodatkowe | regex `LAG-0[2-9]\|LAG-[1-9][0-9]` | kol 0 |
| **Postęp LAG-a** | `LAG-XX Postęp (średnia %)` | kol 0, czytaj dla aktualnego tygodnia |
| **LEAD-y (nowy+stary)** | regex `^(SUB-WIG\|Lead)\s*\d` — obie formy, `\s*`, `^` anchor | kol 0, `.trim()` |
| Zadania LEAD | `T10`–`T18` w kol 0 po headerze LEAD | kol 0 |
| Mapa procesów | header `# + TYP + PROCES` | kol 0–4 |
| OCENA procesy | `Średnia [nazwa]` | kol 0 |
| BACKLOG | header `KATEGORIA + STATUS` | cały wiersz |
| Pary arkuszy | sufiks `_LAG MEASURES` / `_LEAD MEASURES` | nazwy sheetów |

---

## ZASADY DLA CLAUDE CODE

- Nie wymyślaj własnych statusów ani kategorii
- Nie dodawaj elementów których nie ma w arkuszu
- Pokazuj tylko dane z Google Sheets
- Jeśli dane puste = pokaż 0%, nigdy wymyślone etykiety
- GID-y: WIGI=1699564336, OS_LAG=322339268, OS_LEAD=2102307131
- Uwaga na literówkę w arkuszu: "Leas 1" zamiast "Lead 1" w wierszu Postęp
- LAG kolumny: C-H (indeksy 2-7) → fallback lagWeekColsFallback
- **BUG3 LESSON**: Dodatkowe LAG-i (LAG-02+) mogą mieć postęp w kol B (indeks 1) jako scalar,
  nie w kol C+ (tygodniowe). Jeśli getWeekValues → all 0, sprawdź `rows[progressRow][1]` jako fallback.
- LEAD kolumny: D-I (indeksy 3-8) → fallback leadWeekColsFallback (osobny!)
- **BUG1 LESSON**: Header procesów w LAG szukaj tylko po kol A === "Proces". NIE wymagaj "target" w kol B — różne arkusze mają różne nagłówki kol B.
- on_track dla LEAD: wiersz "Lead X - [nazwa] On track", wartość tekstowa "TAK"/"NIE"
- Wartość .v = 1.0 z gviz = 100% ukończone (checkbox zaznaczony)
- Nigdy nie używaj .f (sformatowanej wartości) — zawsze .v (surowa)
