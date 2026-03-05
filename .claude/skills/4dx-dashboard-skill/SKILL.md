---
name: 4dx-dashboard
description: >
  Skill do budowania i aktualizacji dashboardu 4DX Light dla OvocxMalinovi.
  Parsuje dane z Google Sheets (lub pliku .xlsx) i renderuje interaktywny dashboard React/JSX.
  Używaj tego skilla zawsze, gdy użytkownik mówi o: dashboardzie 4DX, scoreboardzie OvocxMalinovi,
  WIG-ach, LAG measures, LEAD measures, mapie procesów, procesach DoD, sub-WIG-ach,
  arkuszu 4DX, aktualizacji postępów tygodniowych, parsowaniu danych z Google Sheets dla 4DX,
  lub prosi o wygenerowanie/zaktualizowanie dashboardu. Triggeruj też gdy użytkownik wspomina
  o procesach OvocxMalinovi, Obsługa zamówień OxM, Rozliczenia tygodniowe, Gospodarka magazynowa,
  BACKLOG zmian, OCENA 4DX, healthcheck procesów.
---

# 4DX Dashboard — OvocxMalinovi

Skill do parsowania arkusza Google Sheets (lub .xlsx) z danymi 4DX Light i generowania
interaktywnego dashboardu React/JSX.

## Kiedy używać

- Użytkownik chce zbudować/zaktualizować dashboard 4DX
- Użytkownik pyta o postępy w WIG-ach, LAG-ach, LEAD-ach
- Użytkownik przesyła plik .xlsx z danymi 4DX
- Użytkownik chce podpiąć dashboard do Google Sheets
- Użytkownik chce wdrożyć dashboard przez Claude Code

## Architektura danych

Źródło prawdy: **Google Sheets** (arkusz `2026_Ovocxmalinovi_dashboard`)
Dashboard: **React/JSX** renderowany jako artifact lub standalone app

```
Google Sheets (źródło prawdy)
    ↓ pobieranie danych
Parser (Python/JS) — ten skill opisuje JAK parsować
    ↓ dane JSON
Dashboard React/JSX — wizualizacja
```

## Struktura arkusza — MAPA PARSOWANIA

Arkusz zawiera **14 arkuszy (sheetów)**. Poniżej dokładna mapa każdego z nich.
Szczegóły parsowania (numery wierszy, kolumn) znajdują się w:

→ **`references/sheet-map.md`** — przeczytaj ZAWSZE przed parsowaniem

### Arkusze i ich rola

| Arkusz | Rola | Parsowanie |
|--------|------|------------|
| `WIGI` | Definicje 4 WIG-ów (nazwy, opisy) | Proste — 5 wierszy, 4 kolumny |
| `OS_LAG MEASURES` | LAG measures dla WIG#1 OS MALINOVI | Złożone — sekcje LAG-01 do LAG-04 |
| `OS_LEAD MEASURES` | LEAD measures dla WIG#1 OS MALINOVI | Złożone — 4 SUB-WIG-i z zadaniami |
| `HARVEST_LAG MEASURES` | LAG measures dla WIG#2 (puste) | Identyczna struktura jak OS_LAG |
| `HARVEST_LEAD MEASURES` | LEAD measures dla WIG#2 (puste) | Identyczna struktura jak OS_LEAD |
| `NOCOMPLAINTS_LAG MEASURES` | LAG measures dla WIG#3 (puste) | Identyczna struktura jak OS_LAG |
| `NOCOMPLAINTS_LEAD MEASURES` | LEAD measures dla WIG#3 (puste) | Identyczna struktura jak OS_LEAD |
| `OCENA 4DX` | Samoocena procesów (skala 1–5) | Sekcje per proces, 5 kryteriów |
| `MAPA PROCESÓW` | 7 procesów — status dokumentacji | Tabela z metadanymi |
| `BACKLOG` | Backlog zmian i pomysłów | Duża tabela, 15 kolumn |
| `Uwagi` | Notatki ze spotkania | Tekst swobodny |
| `Gospodarka magazynowa` | Opis procesu — karta DoD | Sekcje: metryka, cel, kroki |
| `Obsługa zamówień OxM` | Opis procesu — karta DoD | Sekcje: metryka, cel, kroki |
| `_BIBLIOTEKA` | Listy rozwijane (słowniki) | Kategorie, statusy, pilności |

## Kluczowe zasady parsowania

### 1. Kolumny tygodniowe — ZAWSZE T10–T15

Dane tygodniowe są w kolumnach o indeksach (0-based):
- **LAG sheets**: kolumny 2–7 (T10, T11, T12, T13, T14, T15)
- **LEAD sheets**: kolumny 3–8 (T10, T11, T12, T13, T14, T15)

NIGDY nie zakładaj, że kolumna 0 = T10. Sprawdź wiersz nagłówkowy (row 3).

### 2. Wartości LEAD — system 0 / 0.5 / 1

```
0   = nie rozpoczęte
0.5 = w toku
1   = zrobione
```

### 3. LAG-02, LAG-03, LAG-04 — mogą być TBD

Te sekcje mogą mieć status "TBD" — w takim przypadku:
- Kryteria będą puste lub z tekstem "Kryterium X (TBD)"
- Dashboard powinien pokazywać badge "TBD" zamiast progress bara
- Gdy użytkownik uzupełni kryteria, parser automatycznie je podchwyci

### 4. WIG Status — wiersz 0, kolumna 1

Każdy arkusz LAG zaczyna się od `WIG Status` w komórce [0,0] i wartości
liczbowej w [0,1]. To jest zagregowany wynik WIG-a (0.0 – 1.0).

### 5. Identyczna struktura dla każdego WIG-a

Arkusze `OS_`, `HARVEST_`, `NOCOMPLAINTS_` mają IDENTYCZNĄ strukturę.
Parser powinien używać jednej funkcji parametryzowanej prefixem WIG-a.

## Pobieranie danych

### Wariant A: Z pliku .xlsx

```python
import pandas as pd

SHEETS = {
    'WIGI': 'WIGI',
    'OS_LAG': 'OS_LAG MEASURES',
    'OS_LEAD': 'OS_LEAD MEASURES',
    'HARVEST_LAG': 'HARVEST_LAG MEASURES',
    'HARVEST_LEAD': 'HARVEST_LEAD MEASURES',
    'NOCOMPLAINTS_LAG': 'NOCOMPLAINTS_LAG MEASURES',
    'NOCOMPLAINTS_LEAD': 'NOCOMPLAINTS_LEAD MEASURES',
    'OCENA': 'OCENA 4DX',
    'MAPA': 'MAPA PROCESÓW',
    'BACKLOG': 'BACKLOG',
}

def load_xlsx(path):
    data = {}
    for key, sheet_name in SHEETS.items():
        data[key] = pd.read_excel(path, sheet_name=sheet_name, header=None)
    return data
```

### Wariant B: Z Google Sheets API

```python
import gspread
from google.oauth2.service_account import Credentials

SPREADSHEET_ID = '<ID arkusza>'  # użytkownik musi podać

def load_gsheets(creds_path):
    creds = Credentials.from_service_account_file(creds_path,
        scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SPREADSHEET_ID)

    data = {}
    for key, sheet_name in SHEETS.items():
        ws = sh.worksheet(sheet_name)
        data[key] = ws.get_all_values()
    return data
```

### Wariant C: Eksport CSV z Google Sheets (najprostszy)

```
https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
```

## Generowanie dashboardu

Po sparsowaniu danych, wygeneruj plik React/JSX z następującą strukturą.
Szablon kodu dashboardu znajduje się w:

→ **`references/dashboard-template.md`** — przeczytaj przy generowaniu kodu

### Wymagane sekcje dashboardu

1. **Header** — Tytuł "4DX Scoreboard", data, selector tygodnia (T10–T15)
2. **WIG Tabs** — Przełączanie między 4 WIG-ami
3. **WIG Hero Card** — Opis WIG-a, deadline, dni do końca, ring progress
4. **KPI Cards** — Procesy wg DoD, Działania LEAD, Aktywne SUB-WIG, LAG do ustalenia
5. **LAG Measures** — Lista procesów z checkboxami, progress bar, sekcje TBD
6. **LEAD Measures** — SUB-WIG-i z zadaniami per tydzień, progress bary
7. **Mapa procesów** — Tabela 7 procesów ze statusami

### Kolorystyka i styl

- Primary: `#6366f1` (indigo)
- Success: `#22c55e`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Background: `#f8fafc`
- Font: DM Sans + DM Serif Display

## Wdrożenie przez Claude Code

### Krok 1: Przygotowanie

```bash
# Zainstaluj zależności
pip install pandas openpyxl gspread
```

### Krok 2: Parsowanie i generowanie

Claude Code powinien:
1. Przeczytać `references/sheet-map.md` dla dokładnych pozycji danych
2. Sparsować arkusz używając kodu z sekcji "Pobieranie danych"
3. Wygenerować dashboard React/JSX używając `references/dashboard-template.md`
4. Zapisać wynik jako `dashboard_4dx_light.jsx`

### Krok 3: Iteracja

Gdy użytkownik aktualizuje dane w Google Sheets:
1. Pobierz nowe dane (xlsx lub API)
2. Przeparsuj — parser automatycznie obsłuży nowe wartości
3. Wygeneruj zaktualizowany dashboard

## Rozwiązywanie problemów

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Claude Code myli kolumny | Nie czyta sheet-map.md | Zawsze czytaj references/sheet-map.md |
| Puste dane dla WIG#2–4 | Arkusze HARVEST/NOCOMPLAINTS puste | Pokaż "brak danych" w dashboardzie |
| LAG-02/03/04 puste | Status TBD | Pokaż badge TBD, nie progress bar |
| Złe procenty | Podwójne parsowanie headerów | Pomijaj wiersze 0–3 (metadata) |
| Dane nie aktualizują się | Zahardkodowane wartości | Zawsze parsuj z arkusza, nie z kodu |
