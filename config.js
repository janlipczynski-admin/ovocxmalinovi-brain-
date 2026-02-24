// ─── Konfiguracja OvocxMalinovi Brain ─────────────────────────────────────────
// Ten plik NIE jest commitowany do repozytorium (patrz .gitignore).
//
// INSTRUKCJA:
// 1. Wejdź na https://console.anthropic.com → API Keys → Create Key
// 2. Skopiuj klucz (zaczyna się od sk-ant-...)
// 3. Wklej poniżej zamiast pustego stringa
// 4. Udostępnij ten plik pozostałym osobom z zespołu (np. przez WhatsApp/email)
//    — każdy wkłada go do tego samego folderu co index.html
//
// Po tej zmianie nikt w zespole nie musi nic wpisywać — agent działa od razu.
// ──────────────────────────────────────────────────────────────────────────────

window.OXM_CONFIG = {
  apiKey: '__ANTHROPIC_KEY__',  // wartość wstrzykiwana przez GitHub Actions z Secrets
  model:  'claude-sonnet-4-5-20251029'   // sonnet = lepsze odpowiedzi analityczne
};
