# Weryfikacja kartonów — prośba do Renii

**Od:** Jan
**Do:** Renia
**Dotyczy:** Plan zakupu kartonów 2026 — 4 pozycje do potwierdzenia

---

## Co się dzieje i po co to robisz

Przygotowuję plan zakupów kartonów na 2026 rok. Narzędzie przetwarzające dane z ZP natrafiło na **4 kody paków, których nie ma w mapie kartonów** — nie wiadomo, jaki karton zbiorczy był do nich używany. Zostały automatycznie przypisane do "czarny składany" (K-580X390X90), co może być błędem.

**Twoje zadanie:** dla każdej z 4 pozycji poniżej — sprawdź w ZP 2025 jaki karton zbiorczy (indeks kartonu) był faktycznie używany.

---

## Jak to sprawdzić — krok po kroku

**Otwórz w StreamSoft: Zestawienie proceduralne 2025**
*(lub plik ZP 01.01–26.11.2025, zakładka z dokumentami ZP)*

Dla każdej pozycji z tabeli poniżej:

1. **Filtruj po odbiorcy** — wpisz nazwę klienta z kolumny "Klient"
2. **Znajdź wiersze z danym kodem paka** — kolumna "Kod opakowania" lub "Indeks surowca" — wpisz kod z kolumny "Kod paka w systemie"
3. **Odczytaj kolumnę M — "Surowiec Indeks"** — to jest indeks kartonu zbiorczego, który faktycznie był używany
4. **Wpisz odpowiedź** w kolumnie "Twoja odpowiedź" w tabeli poniżej

---

## Tabela do weryfikacji

| Nr | Klient | Owoc | Kod paka w systemie | Karton który system przypisał (BŁĘDNY / DO WERYFIKACJI) | Kart. 2025 | Twoja odpowiedź — jaki karton był faktycznie? |
|----|--------|------|---------------------|----------------------------------------------------------|------------|----------------------------------------------|
| 1 | Dino | Truskawka | `PROSTE__BRAK__2000X1` | K-580X390X90 | 4 391 | ? |
| 2 | Frutania | Malina | `PROSTE_KLEJONY_DUŻY__200X10` | K-580X390X90 | 340 | ? |
| 3 | Dino | Truskawka | `PEŁNE_SKŁADANY_DUŻY_TOPSEAL_500X10` + `PEŁNE_SKŁADANY_DUŻY__500X10` *(kod złączony — patrz uwaga)* | K-580X390X90 | 221 | ? |
| 4 | Dino | Malina | `PEŁNE_KLEJONY_DUŻY_TOPSEAL_250X10` + `PEŁNE_SKŁADANY_DUŻY__250X10` *(kod złączony — patrz uwaga)* | K-580X390X90 | 58 | ? |

---

## Uwagi do konkretnych pozycji

### Pozycja 1 — `PROSTE__BRAK__2000X1` (Dino / Truskawka)
To kod z "BRAK" w nazwie — prawdopodobnie sprzedaż w opakowaniu 2 kg, 1 sztuka per karton.
**Pytanie dodatkowe:** czy to był worek/siatka? Skrzynka plastikowa? Karton zbiorczy — jaki indeks?
Jeśli w ogóle nie było kartonu zbiorczego — napisz: **"brak kartonu zbiorczego"**.

### Pozycje 3 i 4 — kody złączone z przecinkiem
W systemie pojawił się jeden wiersz z dwoma kodami paka zapisanymi razem (błąd eksportu danych).
Sprawdź oba kody osobno i napisz czy oba używały tego samego kartonu, czy innego.

---

## Dostępne indeksy kartonów (dla ułatwienia)

Poniżej lista kartonów z magazynu — wpisz dokładny indeks:

| Indeks | Nazwa |
|--------|-------|
| K-580X390X90 | Duży czarny (do składania) 600X400X100 |
| K-600X400X100 | Duży czarny (klejony) |
| K-600X400X110LIDL | Duży zielony LIDL (do składania) |
| K-369X285X84 | Mały czarny (do składania) — Apla |
| K-380X300X90 | Mały Biedronka (do składania) |
| K-400X300X90 | Mały zielona deska (do składania) |
| K-600X400X150 DO SERC | Duży czarny klejony DO SERC |
| K-600X400X135 SZARY BIED. | Duży szary (do składania) Biedronka |

---

## Odpowiedź

Gdy znajdziesz odpowiedzi — wyślij mi tabelę z uzupełnioną kolumną "Twoja odpowiedź".
Jeśli któregoś kodu nie możesz znaleźć w ZP — napisz "nie ma w ZP" i podam alternatywne źródło do sprawdzenia.

**Termin:** najlepiej przed końcem tygodnia — plan zakupów czeka na te dane.

---

*Dokument wygenerowany: 2026-03-02*
