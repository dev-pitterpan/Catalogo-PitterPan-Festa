import type { SqlClient } from "../database/catalog-repository.ts";
import { orderSchema, paidStatuses, type SalesOrder } from "./model.ts";

/** Caller owns a transaction. Version guard prevents late deliveries from reverting data. */
export async function saveOrder(
  db: SqlClient,
  store: string,
  input: SalesOrder,
  announce = false,
) {
  const order = orderSchema.parse(input);
  if (order.lineItems.pageInfo.hasNextPage)
    throw new Error("Pedido com itens incompletos.");
  if (
    new Set(order.lineItems.nodes.map((l) => l.id)).size !==
    order.lineItems.nodes.length
  )
    throw new Error("Itens duplicados no pedido.");
  const result = await db.query<{ id: string }>(
    `INSERT INTO pitterpan_sales_orders
    (store,id,name,processed_at,updated_at,financial_status,fulfillment_status,cancelled_at,test,currency,total,received,refunded,net)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT(store,id) DO UPDATE SET name=EXCLUDED.name,processed_at=EXCLUDED.processed_at,
    updated_at=EXCLUDED.updated_at,financial_status=EXCLUDED.financial_status,
    fulfillment_status=EXCLUDED.fulfillment_status,cancelled_at=EXCLUDED.cancelled_at,
    test=EXCLUDED.test,currency=EXCLUDED.currency,total=EXCLUDED.total,received=EXCLUDED.received,
    refunded=EXCLUDED.refunded,net=EXCLUDED.net,imported_at=now()
    WHERE pitterpan_sales_orders.updated_at<=EXCLUDED.updated_at RETURNING id`,
    [
      store,
      order.id,
      order.name,
      order.processedAt,
      order.updatedAt,
      order.displayFinancialStatus || "UNKNOWN",
      order.displayFulfillmentStatus,
      order.cancelledAt,
      order.test,
      order.totalPriceSet.shopMoney.currencyCode,
      order.totalPriceSet.shopMoney.amount,
      order.totalReceivedSet.shopMoney.amount,
      order.totalRefundedSet.shopMoney.amount,
      order.netPaymentSet.shopMoney.amount,
    ],
  );
  if (!result.rows.length) return false;
  await db.query(
    "DELETE FROM pitterpan_sales_items WHERE store=$1 AND order_id=$2",
    [store, order.id],
  );
  if (order.lineItems.nodes.length)
    await db.query(
      `INSERT INTO pitterpan_sales_items(store,order_id,id,variant_id,product_id,sku,title,quantity,current_quantity)
    SELECT $1,$2,x.id,x.variant_id,x.product_id,x.sku,x.title,x.quantity,x.current_quantity FROM jsonb_to_recordset($3::jsonb)
    AS x(id text,variant_id text,product_id text,sku text,title text,quantity integer,current_quantity integer)`,
      [
        store,
        order.id,
        JSON.stringify(
          order.lineItems.nodes.map((l) => ({
            id: l.id,
            variant_id: l.variant?.id || null,
            product_id: l.product?.id || null,
            sku: l.sku,
            title: l.title,
            quantity: l.quantity,
            current_quantity: l.currentQuantity,
          })),
        ),
      ],
    );
  // A paid webhook is the trigger, not a stock change or a historical import.
  if (
    announce &&
    !order.test &&
    !order.cancelledAt &&
    order.displayFinancialStatus === "PAID"
  ) {
    await db.query(
      `INSERT INTO pitterpan_sales_confirmations(store,order_id) VALUES($1,$2) ON CONFLICT(store,order_id) DO NOTHING`,
      [store, order.id],
    );
  }
  return true;
}

export async function readSales(
  db: SqlClient,
  store: string,
  days: number,
  after?: string,
) {
  const period = Math.max(1, Math.min(60, Math.floor(days) || 30));
  const totals = await db.query<Record<string, string>>(
    `SELECT currency,count(*)::text AS orders,
    count(*) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL)::text AS paid,
    count(*) FILTER(WHERE financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND cancelled_at IS NULL)::text AS pending,
    count(*) FILTER(WHERE cancelled_at IS NOT NULL)::text AS cancelled,
    COALESCE(sum(received),0)::text AS received,COALESCE(sum(refunded),0)::text AS refunded,COALESCE(sum(net),0)::text AS net,
    COALESCE(avg(total) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL),0)::text AS ticket
    FROM pitterpan_sales_orders WHERE store=$1 AND NOT test AND processed_at>=now()-($2*interval '1 day') GROUP BY currency ORDER BY currency`,
    [store, period],
  );
  const items = await db.query<Record<string, string>>(
    `SELECT COALESCE(i.variant_id,i.product_id,i.id) AS id,min(i.title) AS title,min(i.sku) AS sku,
    sum(i.current_quantity)::text AS units FROM pitterpan_sales_items i JOIN pitterpan_sales_orders o ON o.store=i.store AND o.id=i.order_id
    WHERE o.store=$1 AND NOT o.test AND o.cancelled_at IS NULL AND o.financial_status=ANY($3::text[]) AND o.processed_at>=now()-($2*interval '1 day')
    GROUP BY COALESCE(i.variant_id,i.product_id,i.id) HAVING sum(i.current_quantity)>0 ORDER BY sum(i.current_quantity) DESC,id LIMIT 10`,
    [store, period, paidStatuses],
  );
  const orders = await db.query<Record<string, string>>(
    `SELECT id,name,processed_at::text,financial_status,fulfillment_status,cancelled_at::text,currency,total::text,net::text
    FROM pitterpan_sales_orders WHERE store=$1 AND NOT test AND processed_at>=now()-($2*interval '1 day') ORDER BY processed_at DESC,id LIMIT 30`,
    [store, period],
  );
  const state = await db.query<Record<string, string | null>>(
    "SELECT completed_at::text,until_at::text,last_webhook_at::text FROM pitterpan_sales_sync WHERE store=$1",
    [store],
  );
  const queue = await db.query<{ count: string; failed: string }>(
    "SELECT count(*)::text AS count,count(*) FILTER(WHERE attempts>=10)::text AS failed FROM pitterpan_sales_inbox WHERE store=$1 AND done_at IS NULL",
    [store],
  );
  const cursor = await db.query<{ id: string }>(
    "SELECT COALESCE(max(id),0)::text AS id FROM pitterpan_sales_confirmations WHERE store=$1",
    [store],
  );
  const events = after
    ? await db.query<Record<string, string>>(
        `SELECT c.id::text,o.name,COALESCE((SELECT i.title FROM pitterpan_sales_items i WHERE i.store=o.store AND i.order_id=o.id ORDER BY i.id LIMIT 1),'Produto') AS title
    FROM pitterpan_sales_confirmations c JOIN pitterpan_sales_orders o ON o.store=c.store AND o.id=c.order_id
    WHERE c.store=$1 AND c.id>$2::bigint AND c.created_at>now()-interval '5 minutes' AND o.financial_status='PAID' AND o.cancelled_at IS NULL AND NOT o.test
    ORDER BY c.id LIMIT 5`,
        [store, after],
      )
    : { rows: [] };
  return {
    days: period,
    totals: totals.rows,
    top: items.rows,
    orders: orders.rows,
    state: state.rows[0] || null,
    pending: Number(queue.rows[0].count),
    failed: Number(queue.rows[0].failed),
    cursor: cursor.rows[0].id,
    events: events.rows,
  };
}
