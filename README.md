# ovocxmalinovi-brain 🫐

Repozytorium wiedzy firmowej OvocxMalinovi — fundament agenta Malinoovek.

## Struktura

```
ovocxmalinowi-brain/
├── CLAUDE.md                        # Wiedza firmowa dla agenta (tu zaczyna każda sesja)
├── procesy-glowne/
│   ├── sprzedaz-i-handel/
│   ├── obsluga-zamowien/
│   └── rozliczenia-tygodniowe/
├── procesy-wspierajace/
│   ├── gospodarka-magazynowa/       # Priorytet — sezon 2026
│   ├── obsluga-reklamacji/          # Właściciel: Olgierd
│   ├── komunikacja-wewnetrzna/
│   └── certyfikacja-prawna/
├── narzedzia/
│   └── szacowanie-opakowan-2026/    # Dashboard opakowań
└── .github/workflows/
    └── agent-commit.yml             # Auto-commit outputów agenta
```

## Jak używać z Claude Code

1. Sklonuj repo: `git clone https://github.com/TWOJA-NAZWA/ovocxmalinovi-brain`
2. Wejdź do folderu: `cd ovocxmalinowi-brain`
3. Uruchom Claude Code: `claude`
4. Agent automatycznie wczyta `CLAUDE.md` i zna firmę

## Zasada uczenia Malinoovka

> Opisujesz proces → plik trafia do repo → agent go zna → cały zespół korzysta

Każdy nowy dokument w repo to nowa wiedza dla agenta.
