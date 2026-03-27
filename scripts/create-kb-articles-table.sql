-- Tabela kb_articles — Baza Wiedzy 4DX
-- Uruchom w Supabase SQL Editor

CREATE TABLE kb_articles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section     text NOT NULL,        -- 'slowniczek','wigi','lagi','leady','spotkania','mapa_procesow'
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',  -- HTML content
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON kb_articles FOR ALL USING (true) WITH CHECK (true);

-- Seed: Slowniczek
INSERT INTO kb_articles (section, title, content, sort_order) VALUES
  ('slowniczek', 'WIG — Wildly Important Goal',
   '<p><strong>Najwazniejszy cel</strong>, na ktorym skupia sie zespol. W metodologii 4DX kazdy obszar ma 1-2 WIG-i. To cel, ktorego nierealizacja sprawia, ze wszystkie inne sukcesy traca znaczenie.</p>', 1),

  ('slowniczek', 'LAG — Lag Measure',
   '<p><strong>Miernik opozniony</strong> — mierzy wynik koncowy (np. % procesow opisanych). Zmienia sie po fakcie. Nie mozesz na niego bezposrednio wplywac — to efekt Twoich dzialan.</p>', 2),

  ('slowniczek', 'LEAD — Lead Measure',
   '<p><strong>Miernik wyprzedzajacy</strong> — mierzy dzialania, ktore wplywaja na LAG (np. liczba spotkan tygodniowo). Mozesz na niego bezposrednio wplywac.</p>', 3),

  ('slowniczek', '4DX — 4 Disciplines of Execution',
   '<p>Metodologia realizacji celow:<br>1) <strong>Skup sie na najwazniejszym</strong> (WIG)<br>2) <strong>Dzialaj na miernikach wyprzedzajacych</strong> (LEAD)<br>3) <strong>Prowadz tablice wynikow</strong> (Scoreboard)<br>4) <strong>Rozliczaj sie regularnie</strong> (WIG Session)</p>', 4),

  ('slowniczek', 'WIG Session',
   '<p><strong>Cotygodniowe spotkanie zespolu</strong> (15-20 min), w ktorym kazdy raportuje wykonanie zobowiazan i podejmuje nowe. To rdzen dyscypliny #4.</p>', 5),

  ('slowniczek', 'Scoreboard',
   '<p><strong>Tablica wynikow</strong> — wizualna prezentacja postepow WIG-ow, LAG-ow i LEAD-ow. W naszym systemie to dashboard 4DX.</p>', 6);

-- Seed: WIG-i
INSERT INTO kb_articles (section, title, content, sort_order) VALUES
  ('wigi', 'Czym jest WIG?',
   '<p>WIG (Wildly Important Goal) to cel, ktorego nierealizacja sprawia, ze wszystkie inne sukcesy traca znaczenie. Nie chodzi o cel "wazny" — chodzi o cel <strong>krytyczny</strong>.</p><p>Zasada: max 2 WIG-i na obszar. Im wiecej celow, tym mniej skupienia.</p>', 1),

  ('wigi', 'Jak pracowac z WIG-ami w systemie',
   '<p>Kazdy obszar (OS MALINOVI, HARVEST 50, NO COMPLAINTS, PRODUCT X) ma przypisane WIG-i.</p><p>Zarzadzanie: <a href="wigs.html">Strona zarzadzania WIG</a></p><p>Dashboard: <a href="dashboard-4dx.html">Dashboard 4DX</a> — tu widzisz % realizacji kazdego WIG-a.</p><p>Procent WIG = srednia wazona LAG-ow przypisanych do danego WIG-a.</p>', 2);

-- Seed: LAG-i
INSERT INTO kb_articles (section, title, content, sort_order) VALUES
  ('lagi', 'Czym sa LAG-i?',
   '<p>LAG measures to <strong>mierniki opoznione</strong> — pokazuja wynik koncowy procesu. Np. "% procesow opisanych" to LAG, bo zmienia sie dopiero po wykonaniu pracy.</p><p>Nie mozesz bezposrednio wplywac na LAG — wplywasz na LEAD-y, a te przesuwaja LAG-i.</p>', 1),

  ('lagi', 'Waga LAG-ow i wplyw na % WIG',
   '<p>Kazdy LAG ma <strong>wage (weight)</strong>. Procent WIG obliczany jest jako srednia wazona:</p><p><code>WIG % = Sum(LAG_i% x weight_i) / Sum(weight_i)</code></p><p>LAG % = srednia wartosci lag_items w danym tygodniu (skala 0-1).</p>', 2);

-- Seed: LEAD-y
INSERT INTO kb_articles (section, title, content, sort_order) VALUES
  ('leady', 'Czym sa LEAD-y?',
   '<p>LEAD measures to <strong>mierniki wyprzedzajace</strong> — mierza konkretne dzialania, ktore wplywaja na LAG-i.</p><p>Przyklad: jesli LAG = "% procesow opisanych", to LEAD = "liczba spotkan z ownerami procesow w tygodniu".</p>', 1),

  ('leady', 'Zasady pracy z LEAD-ami',
   '<p>1. LEAD musi byc <strong>mierzalny</strong> — 0 lub 1 (zrobione/niezrobione) w danym tygodniu.<br>2. LEAD musi byc <strong>wplywowy</strong> — jego realizacja musi przesuwac LAG.<br>3. LEAD musi byc <strong>pod Twoja kontrola</strong> — nie moze zalezec od czynnikow zewnetrznych.</p><p>W systemie: LEAD-y raportowane sa tygodniowo przez formularz na <a href="dashboard-4dx.html">dashboardzie</a>.</p>', 2);

-- Seed: Spotkania
INSERT INTO kb_articles (section, title, content, sort_order) VALUES
  ('spotkania', 'Procedura WIG Session',
   '<p><strong>Czas:</strong> 15-20 minut, co tydzien.<br><strong>Uczestnicy:</strong> Jan, Kacper, Olgierd, Iza, Renia</p><p><strong>Przebieg:</strong></p><ol><li><strong>Rozliczenie</strong> — kazdy raportuje status zobowiazan z poprzedniego tygodnia (done / fail / carry-over)</li><li><strong>Przeglad tablicy</strong> — analiza scoreboardu: co sie rusza, co stoi</li><li><strong>Nowe zobowiazania</strong> — kazdy podejmuje 1-3 konkretne zobowiazania na nastepny tydzien</li></ol><p>System: <a href="wig-session.html">WIG Session</a></p>', 1);

-- Seed: Mapa procesow
INSERT INTO kb_articles (section, title, content, sort_order) VALUES
  ('mapa_procesow', 'Mapa procesow — link do arkusza',
   '<p>Aktualna mapa procesow OvocxMalinowi znajduje sie w arkuszu Excel.</p><p><strong>Zawiera:</strong> wszystkie procesy operacyjne, ich ownera, status wdrozenia, powiazanie z LAG-ami.</p><p><em>Link do arkusza zostanie dodany po umieszczeniu go w chmurze.</em></p>', 1);
