INSTRUKCJA DLA CLAUDE CODE — WIG #1 MALINOVI OS 1.0 Dashboard

CEL

Zbuduj interaktywny dashboard / scoreboard dla WIG #1 MALINOVI OS 1.0 oparty na frameworku 4 Disciplines of Execution (4DX). Dashboard będzie częścią istniejącego serwisu na GitHub Pages (janlipczynski-admin.github.io/ovocxmalinovi-brain-/). Ma być edytowalny — co tydzień aktualizuję statusy, procenty, lead measures.
⸻
TECH STACK

- React (single-page app, JSX)
- Tailwind CSS (utility classes)
- Dane w pliku JSON (łatwa edycja tygodniowa bez zmiany kodu)
- Deploy: GitHub Pages (statyczny HTML/JS)
- Brak backendu — wszystko client-side
⸻
STRUKTURA DANYCH — data/wig-os.json

Stwórz plik JSON ze stanem WIG, który będę edytować co tydzień:

{
  "wig": {
    "name": "MALINOVI OS 1.0",
    "owner": "Jan (CEO)",
    "formula": "Z chaosu i wiedzy w głowach → firma działa jak system",
    "deadline": "Q2 2026",
    "currentWeek": "T10",
    "overallProgress": 18
  },
  "lagMeasures": {
    "processes": { "current": 2, "target": 7, "label": "Procesy opisane" },
    "toolV1": { "current": "POC", "target": "v1.0", "progress": 30, "label": "Narzędzie mag. v1.0" },
    "toolV2": { "current": "0%", "target": "v2.0", "progress": 0, "label": "Integracja prod. v2.0" },
    "cadence": { "current": 0, "target": 4, "label": "Rytm — ciągłość tygodni" }
  },
  "subWigs": [
    {
      "id": "A",
      "name": "MAPA PROCESÓW",
      "description": "7/7 procesów opisanych w arkuszach z właścicielami, krokami, wejściami/wyjściami",
      "deadline": "28 MAR",
      "color": "blue"
    },
    {
      "id": "B",
      "name": "NARZĘDZIE MAG. v1.0",
      "description": "Działająca wersja webapp do koordynacji zamawiania towarów i budowania zapasów magazynowych przed sezonem",
      "deadline": "31 MAR",
      "color": "purple"
    },
    {
      "id": "C",
      "name": "INTEGRACJA PROD. v2.0",
      "description": "Dashboard integrujący plany produkcyjne producentów z zamówieniami od klientów i dysponowaniem na magazyny. Synergia z WIG #2 HARVEST 50 (Kacper)",
      "deadline": "30 KWI",
      "color": "emerald"
    }
  ],
  "marchPlan": [
    {
      "id": "05",
      "process": "Gospodarka magazynowa",
      "owner": "Dz. Zaopatrzenia",
      "support": "—",
      "status": "done",
      "weeks": { "T10": "done", "T11": "done", "T12": "done", "T13": "done" }
    },
    {
      "id": "02",
      "process": "Obsługa zamówień",
      "owner": "Iza (dokańcza)",
      "support": "Jan",
      "status": "in-progress",
      "weeks": { "T10": "active", "T11": "review", "T12": null, "T13": null }
    },
    {
      "id": "01",
      "process": "Sprzedaż i Handel",
      "owner": "Kacper (Dr. handlowy)",
      "support": "Jan",
      "status": "not-started",
      "weeks": { "T10": "active", "T11": "active", "T12": "review", "T13": null }
    },
    {
      "id": "03",
      "process": "Rozliczenia tygodniowe",
      "owner": "Iza",
      "support": "Adrian",
      "status": "not-started",
      "weeks": { "T10": null, "T11": "active", "T12": "active", "T13": "review" }
    },
    {
      "id": "04",
      "process": "Obsługa reklamacji",
      "owner": "Olgierd (Dr. operacyjny)",
      "support": "Jan",
      "status": "not-started",
      "weeks": { "T10": null, "T11": "active", "T12": "active", "T13": "review" }
    },
    {
      "id": "06",
      "process": "Komunikacja wewnętrzna",
      "owner": "Renia",
      "support": "—",
      "status": "not-started",
      "weeks": { "T10": null, "T11": null, "T12": "active", "T13": "review" }
    },
    {
      "id": "07",
      "process": "Certyfikacja i wymogi",
      "owner": "Renia",
      "support": "—",
      "status": "not-started",
      "weeks": { "T10": null, "T11": null, "T12": "active", "T13": "review" }
    }
  ],
  "leadMeasures": {
    "A": {
      "name": "Zamknięte procesy per tydzień",
      "target": "5 procesów w 4 tygodnie",
      "weeklyTargets": { "T10": 2, "T11": 2, "T12": 2, "T13": "CEO ✓" },
      "weeklyActuals": { "T10": null, "T11": null, "T12": null, "T13": null },
      "owners": "Kacper, Iza, Olgierd, Renia · Jan wspiera"
    },
    "B": {
      "name": "Sprint review co tydzień",
      "target": "Od POC do v1.0 w 4 sprintach",
      "sprints": [
        { "week": "POC", "label": "POC gotowy", "status": "done" },
        { "week": "T10", "label": "Zakres v1.0 ustalony", "status": "active" },
        { "week": "T11", "label": "Core features", "status": "pending" },
        { "week": "T12", "label": "Testy z magazynami", "status": "pending" },
        { "week": "T13", "label": "v1.0 release", "status": "pending" }
      ],
      "owners": "Jan + Claude/AI · Testy: Dz. Zaopatrzenia"
    },
    "C": {
      "name": "Wireframes + prototyp do końca marca",
      "target": "Marzec: wireframes. Kwiecień: budowa v2.0",
      "sprints": [
        { "week": "T10-T11", "label": "Wymagania z Kacprem", "status": "active" },
        { "week": "T12", "label": "Wireframes", "status": "pending" },
        { "week": "T13", "label": "Prototyp opisany", "status": "pending" }
      ],
      "owners": "Jan + Kacper · Synergia WIG #2 HARVEST 50"
    }
  },
  "cadence": [
    {
      "step": 1,
      "when": "DO ŚRODY",
      "name": "Update od właścicieli",
      "description": "Każdy właściciel procesu/filaru raportuje swój postęp asynchronicznie (Slack/mail)",
      "who": "Kacper, Iza, Olgierd, Renia",
      "format": "Async"
    },
    {
      "step": 2,
      "when": "ŚR / CZW. RANO",
      "name": "Scoreboard update",
      "description": "Jan aktualizuje tablicę wyników na podstawie raportów",
      "who": "Jan",
      "format": "10 min"
    },
    {
      "step": 3,
      "when": "CZWARTEK",
      "name": "WIG Huddle",
      "description": "Spotkanie przy tablicy wyników. 3 pytania 4DX: co zrobiłem dla WIG? Co zrobię? Gdzie jestem zablokowany?",
      "who": "Jan + właściciele",
      "format": "15-20 min"
    }
  ],
  "processWigMap": [
    { "id": "01", "process": "Sprzedaż i Handel", "owner": "Kacper", "wigs": ["A"] },
    { "id": "02", "process": "Obsługa zamówień", "owner": "??? (do potw.)", "wigs": ["A", "B", "C"] },
    { "id": "03", "process": "Rozliczenia tygodniowe", "owner": "Iza (Adrian wspiera)", "wigs": ["A"] },
    { "id": "04", "process": "Obsługa reklamacji", "owner": "Olgierd", "wigs": ["A", "WIG3"] },
    { "id": "05", "process": "Gospodarka magazynowa", "owner": "Dz. Zaopatrzenia", "wigs": ["A", "B"] },
    { "id": "06", "process": "Komunikacja wewnętrzna", "owner": "Renia", "wigs": ["A"] },
    { "id": "07", "process": "Certyfikacja i wymogi", "owner": "Renia", "wigs": ["A"] }
  ]
}

⸻
SEKCJE DASHBOARDU (w tej kolejności)

1. HEADER
- Nazwa WIG: MALINOVI OS 1.0
- Tag: "WIG #1 · 4 Disciplines of Execution"
- Formuła: "Z chaosu i wiedzy w głowach → firma działa jak system"
- Owner: Jan (CEO)
- Deadline: Q2 2026
- Aktualny tydzień (z JSON)

2. LAG MEASURES — pasek postępu
4 paski z etykietami i wartościami:
- A: Procesy opisane (2/7) — kolor niebieski
- B: Narzędzie mag. v1.0 (POC → v1.0) — kolor fioletowy
- C: Integracja prod. v2.0 (0%) — kolor szmaragdowy
- Rytm: ciągłość tygodni (0/4) — kolor żółty
- Po prawej: duży % ogólnego wdrożenia OS (wyliczany jako średnia ważona: procesy 40%, narzędzia B 30%, narzędzia C 30% — ale rytm też wpływa)

3. SUB-WIGi — 3 karty
Trzy karty obok siebie:
- Sub-WIG A: Mapa Procesów → 28 MAR
- Sub-WIG B: Narzędzie mag. v1.0 → 31 MAR
- Sub-WIG C: Integracja prod. v2.0 → 30 KWI 
- Każda z opisem, metryką postępu i deadline.

4. PLAN MARZEC — tabela z osią czasu
Tabela procesów z kolumnami: #, Proces, Właściciel warsztatu, Wsparcie, T10, T11, T12, T13, Status.
- Kolumna bieżącego tygodnia podświetlona
- Pasek niebieski = aktywna praca
- Kółko z ✓ = oddanie do review
- Wiersz "Kamień milowy T13: Review CEO" na dole
- Procesy "done" wyszarzone

Kolejność procesów w tabeli:
1. Gospodarka magazynowa (done)
2. Obsługa zamówień (Iza dokańcza — T10-T11)
3. Sprzedaż i Handel (Kacper — T10-T12)
4. Rozliczenia tygodniowe (Iza — T11-T13)
5. Obsługa reklamacji (Olgierd — T11-T13)
6. Komunikacja wewnętrzna (Renia — T12-T13)
7. Certyfikacja i wymogi (Renia — T12-T13)

5. LEAD MEASURES — 3 karty
Trzy karty obok siebie, każda z kolorowym akcentem (A=niebieski, B=fioletowy, C=szmaragdowy):

Karta A — "Zamknięte procesy per tydzień":
- Siatka 4 tygodni z target vs actual (actual edytowalne w JSON)
- T10: cel 2, T11: cel 2, T12: cel 2, T13: CEO review
- Lista właścicieli

Karta B — "Sprint review co tydzień":
- Tracker sprintów (lista z kropkami: done/active/pending)
- POC → T10 → T11 → T12 → T13
- Kto buduje: Jan + Claude/AI

Karta C — "Wireframes + prototyp do końca marca":
- Tracker: wymagania → wireframes → prototyp
- Notatka: kwiecień = sprint review co tydzień → v2.0
- Synergia z WIG #2

6. RYTM ROZLICZALNOŚCI — 3 kroki flow
Trzy karty w rzędzie ze strzałkami między nimi:
1. DO ŚRODY → Update od właścicieli (async)
2. ŚR/CZW RANO → Scoreboard update (Jan, 10 min)
3. CZWARTEK → WIG Huddle (Jan + właściciele, 15-20 min)

7. MAPOWANIE PROCESÓW → WIG
Tabela: #, Proces, Właściciel, Powiązanie WIG (badge'e kolorowe: A, B, C, WIG3)

8. FOOTER
- Nazwa WIG + wersja
- Data generowania + tydzień
⸻
DESIGN

Paleta kolorów (dark mode)
Background:     #08080a
Surface:        #131316
Surface hover:  #1c1c21
Border:         #2a2a32
Text primary:   #ececef
Text secondary: #b0b0b8
Text dim:       #6e6e78
Accent (orange): #ff4d00
Blue (Sub-A):    #5b8def
Purple (Sub-B):  #a78bfa
Emerald (Sub-C): #34d399
Green (done):    #22c55e
Yellow (active): #eab308
Red (not started): #ef4444


Typografia
- Font główny: DM Sans (Google Fonts)
- Font mono (liczby, kody): JetBrains Mono (Google Fonts)
- Duże liczby: JetBrains Mono bold
- Etykiety: uppercase, letter-spacing 2-3px, 10-11px

Styl
- Ciemny, profesjonalny, z wyrazistymi akcentami kolorowymi
- Karty z subtelnymi borderami, nie shadow
- Kolorowe górne paski (3px) na kartach Sub-WIG
- Kolorowe lewe paski (3px) na kartach Lead Measures
- Bieżący tydzień podświetlony pomarańczowym tłem
- Badge'e WIG z kolorowym tłem i borderami
- Progress bary z zaokrąglonymi rogami
⸻
FLOW EDYCJI TYGODNIOWEJ

Co tydzień (piątek/środa) edytuję TYLKO plik data/wig-os.json:

1. Zmieniam currentWeek na nowy tydzień
2. Aktualizuję lagMeasures (nowe wartości i procenty)
3. Aktualizuję overallProgress
4. Zmieniam status procesów w marchPlan (not-started → in-progress → done)
5. Wpisuję weeklyActuals w lead measures A
6. Zmieniam status sprintów w lead measures B i C (pending → active → done)

Dashboard automatycznie się odświeża na podstawie JSON.
⸻
WAŻNE

- Dashboard musi być RESPONSYWNY (mobile-friendly — oglądam też na telefonie)
- Dane wyłącznie z JSON — zero hardcode'ów w komponentach
- Bieżący tydzień (currentWeek) determinuje podświetlenie w tabeli i kartach
- Kolory Sub-WIGów konsekwentne wszędzie (A=blue, B=purple, C=emerald)
- Sekcja "Plan marzec" jest kluczowa — musi być czytelna i od razu widać kto co robi w którym tygodniu
- Styl spójny z istniejącym dashboardem na GitHub Pages (dark mode, pomarańczowe akcenty)
⸻
REFERENCJA

Załączam plik HTML (wig_os_malinovi_v3_final.html) jako wizualną referencję designu. Dashboard React powinien wyglądać jak ten plik, ale być interaktywny i zasilany z JSON.
