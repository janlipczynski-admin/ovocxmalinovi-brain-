-- Tabela RACI — przypisanie ról do WIG-ów, LAG-ów i LEAD-ów
CREATE TABLE raci_assignments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('wig','lag','lead','lag_item','lead_item')),
  entity_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('R','A','C','I')),
  person text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (entity_type, entity_id, role)
);

-- RLS: anon full access (jak reszta tabel)
ALTER TABLE raci_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON raci_assignments FOR ALL TO anon USING (true) WITH CHECK (true);
