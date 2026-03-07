# Logika biznesowa OS Malinovi — 4DX

Ten plik opisuje logikę biznesową systemu 4DX w OvocxMalinovi.
Claude Code MUSI przeczytać ten plik przed jakimikolwiek zmianami w dashboardzie.

---

## 1. Hierarchia: WIG → LAG → LEAD

```
LEAD-y (działania tygodniowe) → przesuwają → LAG-i (wyniki)
LAG-i (wyniki) → przesuwają → WIG (cel główny)
```

### WIG OS Malinovi
- Cel: wdrożyć OS Malinovi 1.0
- Deadline: 2026-05-30
- **WIG = ŚREDNIA aktualnych postępów WSZYSTKICH LAG-ów** (nie MIN, nie suma)

### Aktualny tydzień
- Źródło prawdy: **`WIGI!E1`** (komórka E1 w arkuszu WIGI)
- Obecnie: 10 (= tydzień T10)
- Dashboard MUSI czytać tę wartość i pokazywać dane dla tego tygodnia

---

## 2. LAG Measures (arkusz OS_LAG MEASURES)

### Struktura każdego LAG-a

Każdy LAG ma blok wierszy:
```
LAG-XX — [nazwa]                    ← marker sekcji
[header: Measure/Proces | Target | T10 | T11 | ... | T18]
[wiersz danych 1]
[wiersz danych 2]
...
[pusty wiersz]
LAG-XX Postęp (średnia %)           ← KLUCZOWY wiersz — aktualny postęp
```

### Jak czytać postęp LAG-a

1. Znajdź wiersz "LAG-XX Postęp (średnia %)"
2. Pobierz wartość z kolumny odpowiadającej aktualnemu tygodniowi (z WIGI!E1)
3. To jest aktualny postęp tego LAG-a

### Jak liczyć WIG OS

```
WIG OS = ŚREDNIA(LAG-01 Postęp, LAG-02 Postęp, ..., LAG-05 Postęp)
```

Dla bieżącego tygodnia (WIGI!E1).

### Aktualne LAG-i (stan na 7.03.2026)

| LAG | Nazwa | Procesy/Kryteria |
|-----|-------|-----------------|
| LAG-01 | % procesów opisanych wg DoD | 8 procesów (0 lub 1 per tydzień) |
| LAG-02 | Obsługa zamówień (optymalizacja) | 6 kryteriów (TBD w nazwie ale mają target=0) |
| LAG-03 | Rozliczenia tygodniowe | 6 kryteriów (TBD) |
| LAG-04 | Reklamacje | 6 kryteriów (TBD) |
| LAG-05 | Wdrożyć 4DX w 4 obszarach | 5 elementów (OS/Harvest/NoComplaints/XProject + spotkania) |

### LAG-01 — specjalna logika

LAG-01 liczy procesy opisane wg DoD:
- Wartość 1 (=100%) = proces opisany
- Wartość 0 = nie opisany
- Postęp = średnia ze wszystkich procesów
- **8 procesów** (nie 7 jak wcześniej — dodano "Rozrachunki i płatności")

### LAG-02/03/04 — kryteria mogą być TBD

- Kryteria mają nazwy "Kryterium X (TBD)" ale MAJĄ wartości liczbowe (nie są puste)
- Target = 0 (nie "TBD" jak wcześniej)
- Postęp liczy się normalnie jako średnia

### LAG-05 — wdrożenie 4DX

- 5 elementów: 4 obszary (OS/Harvest/NoComplaints/XProject) + spotkania cotygodniowe
- Wartość 1 = wdrożony, 0 = nie
- Aktualnie: OS = 1, reszta = 0, spotkania = 0 → Postęp = 0.2 (20%)

---

## 3. LEAD Measures (arkusz OS_LEAD MEASURES)

### Dwa typy LEAD-ów

#### Typ A: Setupowe (Lead 1–4)
Jednorazowe zadania do wykonania:
- Wartość: 0 (nie zrobione) lub 1 (zrobione)
- Postęp = liczba zadań z wartością >0 / liczba wszystkich zadań
- Każdy Lead ma wiersz "Lead X - [nazwa] Postęp" i "On track"

#### Typ B: Wdrożeniowy/Rytmiczny (Lead 5)
Mix setupowy + rytmiczny:
- Zadania setupowe: ustalić WIG/LAG/LEAD/SCOREBOARD dla każdego obszaru
- Zadanie rytmiczne: "Tygodniowy przegląd OS Malinovi" (powtarza się)
- **Osobna logika** — nie kopiować 1:1 z Lead 1–4

### Struktura każdego LEAD-a

```
Lead X - [nazwa]                    ← marker sekcji
[header: Deadline | Opis | Target | T10 | T11 | ... | T18]
[zadanie 1]
[zadanie 2]
...
[puste wiersze]
Lead X - [nazwa] Postęp             ← wiersz postępu
Lead X - [nazwa] On track           ← TAK/NIE per tydzień
```

### Aktualne LEAD-y

| Lead | Nazwa | Typ | Zadań |
|------|-------|-----|-------|
| Lead 1 | Procesy i role (DoD) | Setupowy | 6 |
| Lead 2 | Obsługa zamówień | Setupowy | 6 |
| Lead 3 | Rozliczenia tygodniowe | Setupowy | 4 |
| Lead 4 | Obsługa reklamacji | Setupowy | 4 |
| Lead 5 | Wdrożenie 4DX w spółce | Setup+Rytm | 17 |

### WAŻNE: Kolumny tygodniowe w LEAD

LEAD-y mają kolumny **T10–T18** (9 tygodni, nie 6 jak w LAG).
Kolumny: indeks 3=T10, 4=T11, ..., 11=T18.

### WAŻNE: Nazewnictwo markerów

Markery LEAD-ów to "Lead X" (nie "SUB-WIG X" jak wcześniej).
Parser musi szukać wzorca `Lead \d+` w kolumnie A.
Wiersz Postęp: `Lead X - [nazwa] Postęp`
Wiersz On track: `Lead X - [nazwa] On track` lub `on track`

---

## 4. Jak pobierać dane

### Aktualny tydzień
```
WIGI arkusz → wiersz 0, kolumna E (indeks 4) → wartość liczbowa (np. 10)
```

### Kolumna dla aktualnego tygodnia
W arkuszach LAG i LEAD, header zawiera numery tygodni (10, 11, 12...).
Znajdź kolumnę gdzie header = wartość z WIGI!E1.

### WIG Status
```
OS_LAG MEASURES → wiersz "WIG Status" → kolumna B → wartość liczbowa
```

### Postęp LAG-ów
```
Dla każdego LAG-a:
  Znajdź wiersz "LAG-XX Postęp (średnia %)"
  Pobierz wartość z kolumny aktualnego tygodnia
```

### Postęp LEAD-ów
```
Dla każdego Lead-a:
  Znajdź wiersz "Lead X - [nazwa] Postęp"
  Pobierz wartość z kolumny aktualnego tygodnia
```

---

## 5. Czego NIE robić

- NIE zamieniaj średniej WIG na MIN
- NIE zgaduj wag — wszystkie LAG-i mają równą wagę
- NIE zakładaj stałej liczby LAG-ów ani LEAD-ów (może się zmienić)
- NIE traktuj Lead 5 identycznie jak Lead 1–4
- NIE hardkoduj numeru tygodnia — czytaj z WIGI!E1
- NIE zmieniaj formuł w arkuszu — dashboard tylko CZYTA dane
