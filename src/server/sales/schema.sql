-- Sales-only migration. Does not alter catalog, accounts or other application tables.
CREATE TABLE IF NOT EXISTS pitterpan_sales_orders (
 store text NOT NULL, id text NOT NULL, name text NOT NULL,
 processed_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 financial_status text NOT NULL, fulfillment_status text NOT NULL,
 cancelled_at timestamptz, test boolean NOT NULL, currency text NOT NULL,
 total numeric(18,2) NOT NULL, received numeric(18,2) NOT NULL,
 refunded numeric(18,2) NOT NULL, net numeric(18,2) NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(store,id)
);
CREATE INDEX IF NOT EXISTS pitterpan_sales_order_date ON pitterpan_sales_orders(store,processed_at DESC,id);
CREATE TABLE IF NOT EXISTS pitterpan_sales_items (
 store text NOT NULL, order_id text NOT NULL, id text NOT NULL,
 variant_id text, product_id text, sku text, title text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>=0), current_quantity integer NOT NULL CHECK(current_quantity>=0),
 PRIMARY KEY(store,order_id,id), FOREIGN KEY(store,order_id) REFERENCES pitterpan_sales_orders(store,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pitterpan_sales_inbox (
 store text NOT NULL, delivery_id text NOT NULL, topic text NOT NULL, order_id text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), done_at timestamptz,
 attempts integer NOT NULL DEFAULT 0, retry_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(store,delivery_id)
);
CREATE INDEX IF NOT EXISTS pitterpan_sales_pending ON pitterpan_sales_inbox(store,received_at) WHERE done_at IS NULL;
CREATE TABLE IF NOT EXISTS pitterpan_sales_confirmations (
 id bigserial PRIMARY KEY, store text NOT NULL, order_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store,order_id),
 FOREIGN KEY(store,order_id) REFERENCES pitterpan_sales_orders(store,id)
);
CREATE TABLE IF NOT EXISTS pitterpan_sales_sync (
 store text PRIMARY KEY, since_at timestamptz, until_at timestamptz, cursor text,
 completed_at timestamptz, lease_until timestamptz, lease_id uuid,
 last_webhook_at timestamptz
);
