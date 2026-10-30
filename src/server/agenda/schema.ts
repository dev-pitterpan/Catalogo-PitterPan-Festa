export const agendaSchema = `
CREATE TABLE IF NOT EXISTS pitterpan_calendar_dates (
 id text PRIMARY KEY,title text NOT NULL,event_date date NOT NULL,kind text NOT NULL,notes text NOT NULL DEFAULT '',hidden boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pitterpan_suppliers (
 id uuid PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL, trade_name text NOT NULL DEFAULT '', state text NOT NULL DEFAULT '',
 contact text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', catalog_url text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pitterpan_appointments (
 id uuid PRIMARY KEY, supplier_id uuid REFERENCES pitterpan_suppliers(id), title text NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
 location text NOT NULL DEFAULT '', video_url text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 owner text NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pitterpan_appointments_dates ON pitterpan_appointments(starts_at,ends_at);
CREATE TABLE IF NOT EXISTS pitterpan_supplier_notes (
 id uuid PRIMARY KEY, supplier_id uuid REFERENCES pitterpan_suppliers(id), title text NOT NULL, body text NOT NULL DEFAULT '',
 owner text NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pitterpan_supplier_notes_supplier ON pitterpan_supplier_notes(supplier_id);
CREATE TABLE IF NOT EXISTS pitterpan_agenda_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL, action text NOT NULL, entity_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);`;
