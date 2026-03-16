---
name: 4dx-dashboard
description: "Budowanie i rozwijanie dashboardu 4DX dla OvocxMalinowi z bazą Supabase. Używaj gdy pracujesz z dashboard-4dx.html lub bazą danych projektu."
version: "3.0"
---

# SKILL: 4DX Dashboard — OvocxMalinowi
**Wersja:** 3.0 (Supabase edition)
**Data:** 2026-03-16

---

## 1. ARCHITEKTURA

```
dashboard-4dx.html  (GitHub Pages)
        ↓ REST API (fetch)
Supabase PostgreSQL
        ↓
Tabele: areas, lags, lag_items, leads, lead_items, lag_weekly, lead_weekly, config
```

**GitHub Pages URL:**
`https://janlipczynski-admin.github.io/ovocxmalinovi-brain-/dashboard-4dx.html`

**Repo:**
`https://github.com/janlipczynski-admin/ovocxmalinovi-brain-`

---

## 2. SUPABASE

**Project URL:** `https://fssfuricylndtetfktex.supabase.co`
**Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc2Z1cmljeWxuZHRldGZrdGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODUzMjgsImV4cCI6MjA4OTI2MTMyOH0.Xs6kne86IQpGb8ShvU9zntQDTkQNGBuXKajxnWHOUYQ`
**Region:** West EU (Ireland)
**Org:** Ovocxmalinovi (FREE)

---

## 3. SCHEMAT BAZY DANYCH

```sql
-- Obszary (WIG owners)
areas (id TEXT PK, name, owner, wig_description, wig_target, wig_deadline)

-- LAG-i i ich procesy
lags (id SERIAL PK, area_id → areas, lag_number, name, deadline_week)
lag_items (id SERIAL PK, lag_id → lags, name, target, sort_order)
lag_weekly (id SERIAL PK, lag_item_id → lag_items, week, value, UNIQUE(lag_item_id,week))

-- LEAD-y i ich zadania
leads (id SERIAL PK, area_id → areas, lead_number, name, deadline_week)
lead_items (id SERIAL PK, lead_id → leads, name, deadline_week, sort_order)
lead_weekly (id SERIAL PK, lead_item_id → lead_items, week, value, UNIQUE(lead_item_id,week))

-- Konfiguracja
config (key TEXT PK, value TEXT)
-- Klucz: 'current_week' → aktualny tydzień (np. '12')
```

---

## 4. DANE W BAZIE (stan na 2026-03-16)

**areas:** `os_malinovi` — OS MALINOVI 1.0, Jan (CEO)

**lags (6 rekordów):**
- LAG-01: 100% procesów opisanych wg DoD, deadline T17, 8 procesów
- LAG-02: Obsługa zamówień (optymalizacja), deadline T18, 3 kryteria
- LAG-03: Rozliczenia tygodniowe, deadline T18, 2 kryteria
- LAG-04: Komunikacja z wspólnikami, deadline T22, 3 kryteria
- LAG-05: Wdrożenie 4DX w 4 obszarach, deadline T22, 3 kryteria
- LAG-06: (jeśli dodany)

**leads (5 rekordów):**
- LEAD-01: Realizacja działań 4DX, deadline T17, 4 zadania
- LEAD-02: Usprawnienie obsługi zamówień, deadline T18, 5 zadań
- LEAD-03: Usprawnienie rozliczeń, deadline T18, 3 zadania
- LEAD-04: Komunikacja i praca zespołu, deadline T22, 7 zadań
- LEAD-05: Wdrożenie systemu 4DX, deadline T22, 4 zadania

**lag_weekly:** dane historyczne T10–T12 z pliku Excel
**current_week:** T12

---

## 5. WZORZEC API (używaj zawsze tego wzorca)

```javascript
const BASE = 'https://fssfuricylndtetfktex.supabase.co';
const KEY  = '[anon key z sekcji 2]';
const H    = { 'Content-Type':'application/json', apikey:KEY, Authorization:'Bearer '+KEY };

// SELECT
const data = await fetch(BASE+'/rest/v1/table?filter=value', { headers:H }).then(r=>r.json());

// INSERT z upsert
await fetch(BASE+'/rest/v1/table', {
  method: 'POST',
  headers: { ...H, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify({ col1: val1, col2: val2 })
});

// UPDATE
await fetch(BASE+'/rest/v1/table?key=eq.value', {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ col: newVal })
});
```

---

## 6. DESIGN SYSTEM (jasny motyw, szwedzki minimalizm)

**Fonty:** Familjen Grotesk (nagłówki/UI) + DM Mono (dane/kody)
**Tło:** `#F7F6F2` (bg), `#FFFFFF` (karty)
**Akcenty:**
- LAG: `#D64E12` (pomarańczowo-czerwony)
- LEAD: `#1A5EA8` (niebieski)
- Dobry: `#217A52` (zielony)
- Zły: `#C0392B` (czerwony)
- Środkowy: `#E8941A` (pomarańczowy)

**Zasady:**
- Czcionka 13-14px dla treści, 11-12px dla metadanych
- Odstępy: 8/12/16/20/24/28/32px
- Karty: border-radius 8px, cień `var(--sh)`
- Progres: linia 2-3px, border-radius 99px
- Brak ciemnego motywu — zawsze jasny

---

## 7. LOGIKA OBLICZANIA POSTĘPU

```javascript
// LAG progress = średnia wartości wszystkich lag_items dla danego tygodnia
lagProgress(lag) = avg(lag_items.map(item => lag_weekly[item.id][currentWeek] || 0))

// LEAD progress = średnia wartości lead_items (0 lub 1)
leadProgress(lead) = avg(lead_items.map(item => lead_weekly[item.id][currentWeek] || 0))

// WIG progress = średnia wszystkich LAG-ów
wigProgress = avg(lags.map(lagProgress))
```

---

## 8. CO JESZCZE DO ZROBIENIA

**Priorytety:**
1. Dodać pozostałe obszary do bazy: HARVEST (Kacper), NO COMPLAINTS (Olgierd), PRODUCT X (Jan)
2. Kreator do dodawania nowych LAG-ów i LEAD-ów z poziomu dashboardu
3. Dashboard główny z 4 WIG-ami (index.html lub osobna strona)
4. Eksport do PDF / zrzut ekranu dla spotkań
5. Historia zmian (kto i kiedy wpisał dane)

**Znane ograniczenia:**
- Anon key widoczny w źródle HTML — OK dla wewnętrznego narzędzia, ale docelowo warto dodać auth
- Brak walidacji zakresu wartości na frontendzie (wartości 0–1 nie są enforced poza step)

---

## 9. DEPLOY

```bash
# Zmiana pliku i push do GitHub Pages
cd ~/ovocxmalinovi-brain-
cp ~/Downloads/dashboard-4dx.html .
git add dashboard-4dx.html
git commit -m "Update dashboard"
git push
# URL live po ~30s: https://janlipczynski-admin.github.io/ovocxmalinovi-brain-/dashboard-4dx.html
```

