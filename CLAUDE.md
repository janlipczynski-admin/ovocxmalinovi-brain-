# CLAUDE.md — Projekt: 4DX Dashboard OvocxMalinowi

## Kim jestem i co robimy

Jestem Jan Lipczynski, CEO OvocxMalinowi — polskiej firmy dystrybucji owoców (maliny, truskawki, jeżyny, wiśnie). Buduję wewnętrzny system zarządzania oparty na metodologii 4DX (4 Disciplines of Execution).

**Główny cel projektu:** Dashboard 4DX pokazujący postępy realizacji WIG-ów (Wildly Important Goals) dla całego zespołu, z danymi live z bazy Supabase.

---

## Aktualny stan projektu (2026-03-16)

### Co działa:
- ✅ Dashboard `dashboard-4dx.html` na GitHub Pages
- ✅ Baza Supabase z pełnym schematem i danymi OS Malinovi (Jan)
- ✅ Wpis tygodniowy (modal) — zapis do Supabase
- ✅ LAG karty z postępem procesów i sparklines
- ✅ LEAD karty z zadaniami i statusem

### Co nie działa / do zrobienia:
- ❌ Dane dla pozostałych 3 obszarów (HARVEST, NO COMPLAINTS, PRODUCT X)
- ❌ Kreator LAG/LEAD z UI
- ❌ Dashboard multi-WIG (wszystkie 4 obszary naraz)
- ❌ Malinoovek chatbox (wymaga osobnej integracji API)

---

## Architektura techniczna

```
GitHub Pages (HTML/CSS/JS, zero frameworków)
    ↓ fetch REST API
Supabase PostgreSQL (West EU Ireland)
    URL: https://fssfuricylndtetfktex.supabase.co
    Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Repo:** `janlipczynski-admin/ovocxmalinovi-brain-`
**Live:** `https://janlipczynski-admin.github.io/ovocxmalinovi-brain-/dashboard-4dx.html`

---

## Zespół i obszary 4DX

| Obszar | Owner | WIG | Status |
|--------|-------|-----|--------|
| OS MALINOVI 1.0 | Jan (CEO) | 100% procesów wg DoD do Q2 2026 | ✅ W bazie |
| HARVEST 50 | Kacper (sprzedaż) | 600k PLN marży netto | ❌ Brak danych |
| NO COMPLAINTS | Olgierd (reklamacje) | Poziom reklamacji <3% | ❌ Brak danych |
| PRODUCT X | Jan (CEO) | Nowy produkt / projekt | ❌ Brak danych |

---

## Zasady pracy z kodem

1. **Zero zewnętrznych zależności** — tylko vanilla JS + Google Fonts. Bez React, Vue, lodash.
2. **Jeden plik HTML** — cały dashboard w jednym pliku. Łatwiejszy deploy.
3. **Jasny motyw** — Familjen Grotesk + DM Mono, tło #F7F6F2, minimalistyczny.
4. **Supabase REST** — używaj fetch(), nie klienta supabase-js.
5. **Babel off** — brak transpilacji, czysty ES6+ (ale bez optional chaining ?. dla kompatybilności).
6. **Deploy przez git** — push do main = automatyczny update GitHub Pages.

---

## Jak dodać nowy obszar (np. HARVEST)

1. Wstaw do Supabase SQL:
```sql
INSERT INTO areas (id, name, owner, wig_description, wig_target, wig_deadline)
VALUES ('harvest', 'HARVEST 50', 'Kacper', '...opis...', '600k PLN marży', 'Q4 2026');
-- Potem dodaj lags, lag_items, leads, lead_items dla harvest
```

2. W dashboard-4dx.html — dashboard pokazuje tylko `os_malinovi`. Żeby pokazać wszystkie obszary, potrzebna nowa strona lub rozbudowa obecnej o zakładki/przełącznik obszaru.

---

## Struktura bazy (skrót)

```
areas → lags → lag_items → lag_weekly (tygodniowe wartości 0-1)
areas → leads → lead_items → lead_weekly (tygodniowe wartości 0 lub 1)
config: current_week = '12' (T12 = aktualny tydzień)
```

Tygodnie: T10 (start) → T22 (koniec okresu). Aktualnie T12.

---

## Styl komunikacji

- Jan komunikuje się po polsku
- Preferuje konkretne odpowiedzi, bez zbędnego "owijania w bawełnę"
- Chce wiedzieć co dokładnie robimy i dlaczego, nie tylko "jak"
- Pracuje w Claude Code przez claude.ai, pliki trzyma na GitHub

---

## Pliki kluczowe w repo

| Plik | Opis |
|------|------|
| `dashboard-4dx.html` | Główny dashboard 4DX |
| `index.html` | Strona główna (Malinoovek brain) |
| `CLAUDE.md` | Ten plik — kontekst projektu |
| `skills/4dx-dashboard/SKILL.md` | Instrukcja techniczna dashboardu |

