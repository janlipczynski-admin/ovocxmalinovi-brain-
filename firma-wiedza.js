// ─── firma-wiedza.js — Wiedza firmowa Malinoovka ──────────────────────────────
// Ten plik jest głównym "mózgiem" Malinoovka.
// Aktualizuj go na bieżąco gdy zmienia się cokolwiek w firmie.
// Plik jest automatycznie wczytywany do każdej rozmowy z agentem.
// ──────────────────────────────────────────────────────────────────────────────

window.FIRMA_WIEDZA = `
## WIEDZA FIRMOWA — OvocxMalinovi sp. z o.o. (aktualna)

### Firma
OvocxMalinovi sp. z o.o. — polska firma handlująca owocami miękkimi: maliny, truskawki tunelowe, jeżyny, porzeczki, agrest. Działalność: zakup od producentów (growerów/rolników), logistyka, sprzedaż krajowa i zagraniczna, rozliczenia z growerami, programy odmianowe BerryWorld Varieties.
Systemy: StreamSoft ERP, Excel RT (rozliczenia tygodniowe), EDI (DINO).

### Zespół

**Jan Lipczynski — Właściciel / Zarządzający**
Strategia, optymalizacja procesów, nadzór nad całością. Prowadzi projekt REORG — budowanie map procesów głównych i wspierających.

**Iza — Specjalista ds. Rozliczeń**
Wystawia FA i KORFA (każda FA poprzedzona sprawdzeniem WZ i CMR). Korekty ilościowe w SS — sekwencja: ZWWZ → MM- → MM+ → RW → KORFA. Faktury DINO przez EDI. Sprawdza WZPROD, obsługuje reklamacje (przekazuje Olgierdowi). Support i szkolenia StreamSoft. Bardzo skrupulatna, głęboka znajomość SS.

**Renia — Zakupy / Rozliczenia Finansowe**
Rejestruje FZ i korekty w SS, faktury transportowe. Zakup materiałów opakowaniowych: wyceny, buforowanie u dostawców, PZ/FPZ. Faktury RR dla rolników (tygodniowo), FWZ na opakowania. Przelewy 2×/tydzień, wyciągi bankowe, kasa gotówkowa. Problem: magazyny często nie wysyłają WZ na czas.

**Kacper — Sprzedaż i Handel**
Główna rola handlowa — zakup i sprzedaż owoców. Zamówienia w SS, forecasting roczny/tygodniowy/dzienny. Kontakt z klientami, koordynacja transportów z TJ.

**Adrian — Analizy Finansowe**
Excel RT (rozliczenia tygodniowe): pobieranie z SS, przeliczenia, wytyczne do przelewów dla Reni. KOWR, FOR, GUS (razem z Renią).

**Olgierd — Menedżer Procesów / Reklamacje**
NOWA OSOBA. Przejmuje obsługę reklamacji od Izy. Profil wysokopoziomowy — potrzebuje wsparcia przy detalach operacyjnych.

**TJ — Logistyka (firma zewnętrzna)**
Obsługa transportu, listy przewozowe, koordynacja z Kacprem.

**Księgowość (zewnętrzna)**
Dokumenty tygodniowo od Reni (kurierem) + wydruki od Izy.

**Magazyny — 4 lokalizacje: Chodzież, Łobżenica, Stróżewo, Wyszynki**
Wystawiają WZ jako potwierdzenie przyjęcia dostawy. Zgłaszają zapotrzebowanie mailowo/WhatsApp. Znany problem: często zapominają wysyłać WZ na czas.

### Kluczowi partnerzy i klienci
- **BerryWorld Varieties** — program odmianowy; royalties tylko z kanału Frutania & Local Market
- **OGL Food** (PL + DE) — największy klient; ~244 tys. kartonów plan 2026
- **Jeronimo Martins (Biedronka)** — ~63 tys. kartonów plan 2026; mały karton Biedronka (125g×6 lub 250g×8)
- **DINO** — klient EDI
- **RUBI JUICE** — klient z osobnym supportem SS
- **Frutania, SanLucar, Lidl** — kluczowe kanały sprzedaży

### Plan 2026 — kluczowe liczby
- Łącznie kartony 2026: **686 434** (wzrost +48% vs 2025: 462 005)
- Łącznie kg plan 2026: **1 539 223 kg** (wzrost +22% vs RT 2025: 1 263 551 kg)
- Główne grupy: OGL 244k kart. / 502 t, Jeronimo 63k kart. / 103 t, Pozostali 379k kart. / 935 t
- Sezon: tydzień 18 (maj) → tydzień 46 (listopad)

### Logika zakupów opakowań — 7 typów kartonów

Typy kartonów (skróty używane w harmonogramie):
- **mb** — Mały Biedronka (PEŁNE + MAŁY + 125gX6 lub 250gX8)
- **mz** — Mały zielony (PEŁNE + MAŁY + 125gX12 lub 150gX12)
- **mc** — Mały czarny/apla (PROSTE + MAŁY — wszystkie rozmiary)
- **dzk** — Duży zielony klejony (PEŁNE + DUŻY + KLEJONY)
- **dzs** — Duży zielony składany (PEŁNE + DUŻY + SKŁADANY)
- **dck** — Duży czarny klejony (PROSTE + DUŻY + KLEJONY)
- **dcs** — Duży czarny składany (PROSTE + DUŻY + SKŁADANY)

Konwersja plan → kartony:
  kg_klienta_na_tydzień × udział_opakowania_[%] / kg_na_karton = liczba_kartonów
  Przykład: 2500 kg × 78.9% / 1.5 kg/kart = 1315 kartonów (OGL, PEŁNE_SKŁADANY_MAŁY_125X12)

kg_na_karton (kgpk) = (waga_g × szt_w_kartonie) / 1000
  Przykład: 125g × 12 szt = 1.5 kg/kart | 200g × 10 szt = 2.0 kg/kart | 500g × 6 szt = 3.0 kg/kart

Harmonogram — miesiące i tygodnie:
  maj (T18–22), cze (T23–26), lip (T27–30), sie (T31–35), wrz (T36–39), paź (T40–43), lis (T44–46)

### Dostawcy kartonów — 8 dostawców
1. **TFP** — Kórnik (zakłady: Kórnik, Babimost, Śrem) | tektura@tfp.com.pl
2. **OPAK SERVICE** — Łódź | zapytanie@opakservice.pl
3. **Kraft-Box** — Kowalew | kontakt@kraft-box.eu
4. **Stora Enso** — Ostrołęka (główny) + Tychy, Mosina, Łódź
5. **Saica Pack** — Bukowiec k. Bydgoszczy (przejął zakład Schumacher w X.2024)
6. **Eurobox** — Ujazd (Dunapack Packaging)
7. **Kenkel** — Grotniki (ekologiczny: 100% OZE, certyfikat FSC)
8. **INNY** — do uzupełnienia

### Mapowanie opakowania → karton (skrócone)
- OGL + MAŁY → K-400X300X90 (fallback) | OGL + DUŻY → K-600X400X110
- Biedronka + MAŁY → K-369X285X84 | Biedronka + DUŻY → K-580X390X90
- DINO + MAŁY → K-369X285X84 | DINO + DUŻY → K-580X390X90
- Pozostali + MAŁY → K-369X285X84 | Pozostali + DUŻY → K-580X390X90
- Specjalne (83 mapowania): np. Biedronka + PEŁNE_SKŁADANY_DUŻY_TOPSEAL_200X10 → K-600X400X135 ZIEL. BIED.

### Stany magazynowe
Baza: 182 rekordy (25.02.2026), 4 magazyny × 5 grup:
- OZ — opakowania zbiorcze (kartony, skrzynki, palety)
- OJ — opakowania jednostkowe (pojemniki, wieczka)
- OT — opakowania transportowe (taśma, klamry, kątowniki)
- OW — wkładki absorpcyjne
- ET — etykiety

### Znane problemy operacyjne
1. Magazyny nie wysyłają WZ na czas → blokuje całe rozliczenia Izy i Reni
2. Korekty ilościowe w SS = 4 dokumenty (ZWWZ→MM-→MM+→RW→KORFA) — bardzo pracochłonne dla Izy
3. Logistyka po odejściu Marty częściowo niepokryta
4. Reklamacje: trzeba w pełni opisać proces przed przekazaniem Olgierdowi
5. Mail complaints@ nie działa zgodnie z założeniami
6. Brak miesięcznej kontroli stanów magazynowych vs SS

### Dane dostępne na bieżąco w systemie
- PLAN_DATA — plan sprzedaży 2026 (tygodnie × klienci × owoce × kg)
- OPAK_DATA — zużycie opakowań RT 2025 (odbiorca, opakowanie, kg, kartony)
- RT_SPRZEDAZ — ceny sprzedaży RT 2025 (odbiorca, owoc, kg, przychód PLN)
- Stany magazynowe (upload XLSX ze StreamSoft)
- Miks konfekcji per klient (edytowalny)
- Harmonogram zakupów 2026 (edytowalny, w localStorage)
`;
