-- Krok 1: Tabela wigs
CREATE TABLE wigs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id text NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  target text,
  deadline text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon full access" ON wigs FOR ALL USING (true) WITH CHECK (true);

-- Krok 2: Kolumna wig_id w lags
ALTER TABLE lags ADD COLUMN wig_id uuid REFERENCES wigs(id) ON DELETE SET NULL;
