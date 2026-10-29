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

-- Migração aditiva: não reescreve IDs nem registros das versões já publicadas.
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS sku text;
CREATE INDEX IF NOT EXISTS catalog_items_sku ON catalog_items(import_id,sku);
CREATE TABLE IF NOT EXISTS catalog_collections (
  import_id uuid NOT NULL REFERENCES catalog_imports(id) ON DELETE CASCADE,
  id text NOT NULL, handle text NOT NULL, title text NOT NULL,
  PRIMARY KEY(import_id,id), UNIQUE(import_id,handle)
);

-- Contas do painel ficam isoladas dos produtos e de outros projetos.
CREATE TABLE IF NOT EXISTS pitterpan_admin_users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','gerente_compras','gestor','atendimento')),
 password_hash text NOT NULL, disabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pitterpan_admin_login_limits (
 bucket text PRIMARY KEY, window_id bigint NOT NULL, attempts integer NOT NULL
);
CREATE TABLE IF NOT EXISTS pitterpan_admin_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 low_stock integer NOT NULL DEFAULT 5 CHECK(low_stock>=0),
 high_stock integer NOT NULL DEFAULT 100 CHECK(high_stock>low_stock)
);
INSERT INTO pitterpan_admin_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS pitterpan_admin_events (
 id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), details jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS pitterpan_admin_campaigns (
 id uuid PRIMARY KEY, title text NOT NULL, event_date date NOT NULL,
 catalog_slug text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','ready','archived')),
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pitterpan_admin_campaigns_date ON pitterpan_admin_campaigns(event_date);

-- Perfil de compras tem os mesmos acessos administrativos; preserva contas existentes.
ALTER TABLE pitterpan_admin_users
 DROP CONSTRAINT IF EXISTS pitterpan_admin_users_role_check,
 ADD CONSTRAINT pitterpan_admin_users_role_check CHECK(role IN ('admin','gerente_compras','gestor','atendimento'));
