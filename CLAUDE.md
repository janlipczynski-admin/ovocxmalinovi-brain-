# CLAUDE.md — Projekt: 4DX Dashboard OvocxMalinowi

## Kim jestem i co robimy

Jestem Jan Lipczynski, CEO OvocxMalinowi — polskiej firmy dystrybucji owoców (maliny, truskawki, jeżyny, wiśnie). Buduję wewnętrzny system zarządzania oparty na metodologii 4DX (4 Disciplines of Execution).

**Główny cel projektu:** Dashboard 4DX pokazujący postępy realizacji WIG-ów (Wildly Important Goals) dla całego zespołu, z danymi live z bazy Supabase.

---

## Aktualny stan projektu (2026-03-26)

### Co działa:
- ✅ Dashboard `dashboard-4dx.html` na GitHub Pages
- ✅ Baza Supabase z pełnym schematem i danymi
- ✅ Wpis tygodniowy (modal) — zapis do Supabase
- ✅ LAG karty z postępem procesów i sparklines
- ✅ LEAD karty z zadaniami i statusem
- ✅ WIG Session (wig-session.html) — zobowiązania, rozliczenia, carry-over
- ✅ **Multi-WIG per area** — tabela `wigs`, strona `wigs.html` do zarządzania
- ✅ index.html — 4 karty (1 per area) z mini-paskami per WIG wewnątrz
- ✅ dashboard-4dx.html — multi-WIG bloki z osobnym % per WIG

### Co nie działa / do zrobienia:
- ❌ LAG-i i LEAD-y dla Harvest 50 i No Complaints (mają WIG-i, nie mają LAG-ów)
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
**Live:** `https://janlipczynski-admin.github.io/ovocxmalinovi-brain-/`

---

## Zespół i obszary 4DX

| Obszar | Owner | WIG-i | LAG-i |
|--------|-------|-------|-------|
| OS MALINOVI 1.0 | Jan (CEO) | 1: 100% procesów opisanych | 5 LAG-ów |
| HARVEST 50 | Kacper (sprzedaż) | 2: sprzedaż + 600k marży | 0 (do dodania) |
| NO COMPLAINTS | Olgierd (reklamacje) | 1: satysfakcja wspólników | 0 (do dodania) |
| PRODUCT X | Jan (CEO) | 2: truskawka + biznesplany | 2 LAG-i |

---

## Struktura bazy (Supabase)

```
areas → wigs (multi-WIG per area, sort_order)
areas → lags → lag_items → lag_weekly (tygodniowe wartości 0-1)
         ↑ wig_id (FK do wigs, nullable)
areas → leads → lead_items → lead_weekly (tygodniowe wartości 0 lub 1)
lag_lead_links (LAG↔LEAD powiązania)
sessions → wig_commitments (WIG Session)
config: current_week = '12' (T10-T22)
```

**Tabela wigs:**
- id (uuid PK), area_id (FK→areas), name, target (etykieta), deadline, sort_order, created_at
- RLS: anon full access

**Obliczanie % WIG:**
- WIG % = Σ(LAG_i% × weight_i) / Σ(weight_i) — filtrowane po wig_id
- LAG % = średnia wartości lag_items w danym tygodniu
- Pole `target` to etykieta — cel zawsze = 100%

---

## Zasady pracy z kodem

1. **Zero zewnętrznych zależności** — tylko vanilla JS + Google Fonts. Bez React, Vue, lodash.
2. **Jeden plik HTML per strona** — łatwiejszy deploy.
3. **Jasny motyw** — Familjen Grotesk + DM Mono, tło #F7F6F2, minimalistyczny.
4. **Supabase REST** — używaj fetch(), nie klienta supabase-js.
5. **Babel off** — brak transpilacji, czysty ES6+ (ale bez optional chaining ?. dla kompatybilności).
6. **Deploy przez git** — push do main = automatyczny update GitHub Pages.

---

## Pliki kluczowe w repo

| Plik | Opis |
|------|------|
| `index.html` | Strona główna — 4 karty (1 per area) z multi-WIG paskami |
| `dashboard-4dx.html` | Dashboard 4DX — multi-WIG bloki, LAG/LEAD karty |
| `wigs.html` | Zarządzanie WIG-ami — CRUD, przypisywanie LAG-ów |
| `wig-session.html` | WIG Session — zobowiązania tygodniowe |
| `lag-detail.html` | Szczegóły LAG-a |
| `lead-detail.html` | Szczegóły LEAD-a |
| `scripts/create-wigs-table.sql` | SQL migracji tabeli wigs |
| `CLAUDE.md` | Ten plik — kontekst projektu |

## Styl komunikacji

- Jan komunikuje się po polsku
- Preferuje konkretne odpowiedzi, bez zbędnego "owijania w bawełnę"
- Chce wiedzieć co dokładnie robimy i dlaczego
