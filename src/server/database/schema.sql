-- Versões completas: só o ponteiro ativo muda depois da validação da importação.
CREATE TABLE IF NOT EXISTS catalog_imports (
  id uuid PRIMARY KEY, status text NOT NULL CHECK(status IN ('loading','ready','active','failed','retired')),
  operation_id text, store_domain text NOT NULL, mapping jsonb NOT NULL DEFAULT '[]',
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  report jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS catalog_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  active_import uuid REFERENCES catalog_imports(id)
);
INSERT INTO catalog_state(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS catalog_raw (
  import_id uuid NOT NULL REFERENCES catalog_imports(id) ON DELETE CASCADE,
  line bigint NOT NULL, data jsonb NOT NULL, PRIMARY KEY(import_id,line)
);
CREATE INDEX IF NOT EXISTS catalog_raw_parent ON catalog_raw(import_id,(data->>'__parentId'));
CREATE INDEX IF NOT EXISTS catalog_raw_id ON catalog_raw(import_id,(data->>'id'));
CREATE TABLE IF NOT EXISTS catalog_items (
  import_id uuid NOT NULL REFERENCES catalog_imports(id) ON DELETE CASCADE,
  id text NOT NULL, variant_id text NOT NULL, product_id text NOT NULL,
  name text NOT NULL, description text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '', image_url text, site_url text NOT NULL,
  collections text[] NOT NULL DEFAULT '{}', tags text[] NOT NULL DEFAULT '{}',
  images jsonb NOT NULL DEFAULT '[]', search_text text NOT NULL,
  updated_at text NOT NULL, inventory_quantity integer,
  price numeric(18,2) NOT NULL CHECK(price>=0), compare_at_price numeric(18,2), currency text NOT NULL,
  PRIMARY KEY(import_id,id), UNIQUE(import_id,variant_id)
);
CREATE INDEX IF NOT EXISTS catalog_items_collections ON catalog_items USING gin(collections);
CREATE INDEX IF NOT EXISTS catalog_items_search ON catalog_items USING gin(to_tsvector('simple',search_text));
CREATE INDEX IF NOT EXISTS catalog_items_order ON catalog_items(import_id,name,id);
CREATE INDEX IF NOT EXISTS catalog_items_category ON catalog_items(import_id,category);

CREATE INDEX IF NOT EXISTS catalog_items_price ON catalog_items(import_id,price,id);
CREATE INDEX IF NOT EXISTS catalog_items_vendor ON catalog_items(import_id,vendor);
