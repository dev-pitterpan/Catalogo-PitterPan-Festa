import { classifyDelivery } from "../../lib/admin/delivery.ts";
import { shopifyImageUrl } from "../shopify/media.ts";
import { containsPattern } from "../../lib/admin/filters.ts";
import {
  salesFilterSchema,
  SALES_PAGE_SIZE,
  decodeOrderCursor,
  type SalesFilters,
} from "./filters.ts";
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
  if (order.shippingLines?.pageInfo.hasNextPage)
    throw new Error("Pedido com entregas incompletas.");
  const delivery = classifyDelivery(order.shippingLines?.nodes || []);
  const result = await db.query<{ id: string }>(
    `INSERT INTO pitterpan_sales_orders
    (store,id,name,processed_at,updated_at,financial_status,fulfillment_status,cancelled_at,test,currency,total,received,refunded,net,delivery_kind,delivery_label,destination)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
    ON CONFLICT(store,id) DO UPDATE SET name=EXCLUDED.name,processed_at=EXCLUDED.processed_at,
    updated_at=EXCLUDED.updated_at,financial_status=EXCLUDED.financial_status,
    fulfillment_status=EXCLUDED.fulfillment_status,cancelled_at=EXCLUDED.cancelled_at,
    test=EXCLUDED.test,currency=EXCLUDED.currency,total=EXCLUDED.total,received=EXCLUDED.received,
    refunded=EXCLUDED.refunded,net=EXCLUDED.net,delivery_kind=EXCLUDED.delivery_kind,delivery_label=EXCLUDED.delivery_label,destination=COALESCE(EXCLUDED.destination,pitterpan_sales_orders.destination),imported_at=now()
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
      delivery.kind,
      delivery.label,
      order.destination ? JSON.stringify(order.destination) : null,
    ],
  );
  if (!result.rows.length) return false;
  await db.query(
    "DELETE FROM pitterpan_sales_items WHERE store=$1 AND order_id=$2",
    [store, order.id],
  );
  if (order.lineItems.nodes.length)
    await db.query(
      `INSERT INTO pitterpan_sales_items(store,order_id,id,variant_id,product_id,sku,title,quantity,current_quantity,image_url)
    SELECT $1,$2,x.id,x.variant_id,x.product_id,x.sku,x.title,x.quantity,x.current_quantity,x.image_url FROM jsonb_to_recordset($3::jsonb)
    AS x(id text,variant_id text,product_id text,sku text,title text,quantity integer,current_quantity integer,image_url text)`,
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
            image_url: shopifyImageUrl(l.image?.url),
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

/** Category membership is resolved over the complete published snapshot, never a top-N list. */
function selection(filters: SalesFilters) {
  const endIndex =
    4 + (filters.category ? 1 : 0) + (filters.delivery !== "all" ? 1 : 0);
  const period = filters.start
    ? `o.processed_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND o.processed_at<((($${endIndex}::date+1)::timestamp) AT TIME ZONE 'America/Sao_Paulo')`
    : "o.processed_at>=now()-($2*interval '1 day')";
  const status = `($3='all' OR ($3='CANCELLED' AND o.cancelled_at IS NOT NULL) OR (o.financial_status=$3 AND o.cancelled_at IS NULL))`;
  const delivery =
    filters.delivery === "all"
      ? ""
      : ` AND COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')=$${filters.category ? 5 : 4}`;
  const category = filters.category
    ? ` AND EXISTS (
    SELECT 1 FROM pitterpan_sales_items si JOIN catalog_items ci ON ci.product_id=si.product_id
    JOIN catalog_state cs ON cs.singleton=true AND cs.active_import=ci.import_id
    WHERE si.store=o.store AND si.order_id=o.id AND ci.category ILIKE $4
  )`
    : "";
  return `o.store=$1 AND NOT o.test AND ${period} AND ${status}${category}${delivery}`;
}
function filterValues(store: string, days: number, filters: SalesFilters) {
  return [
    store,
    filters.start || days,
    filters.status,
    ...(filters.category ? [containsPattern(filters.category)] : []),
    ...(filters.delivery !== "all" ? [filters.delivery] : []),
    ...(filters.start ? [filters.end] : []),
  ];
}
export async function readSalesOrders(
  db: SqlClient,
  store: string,
  days: number,
  input: SalesFilters,
  pageCursor?: string,
) {
  const filters = salesFilterSchema.parse(input);
  const values: unknown[] = filterValues(store, days, filters);
  const cursor = decodeOrderCursor(pageCursor);
  let boundary = "";
  if (cursor) {
    values.push(cursor.date, cursor.id);
    boundary = ` AND (o.processed_at,o.id)<($${values.length - 1}::timestamptz,$${values.length}::text)`;
  }
  const { rows } = await db.query<Record<string, string>>(
    `SELECT o.id,o.name,o.processed_at::text,o.financial_status,o.fulfillment_status,o.cancelled_at::text,o.currency,o.total::text,o.net::text,COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN') AS delivery_kind,COALESCE(to_jsonb(o)->>'delivery_label','') AS delivery_label
     FROM pitterpan_sales_orders o WHERE ${selection(filters)}${boundary}
     ORDER BY o.processed_at DESC,o.id DESC LIMIT ${SALES_PAGE_SIZE + 1}`,
    values,
  );
  const orders = rows.slice(0, SALES_PAGE_SIZE);
  const last = orders.at(-1);
  const hasMore = rows.length > SALES_PAGE_SIZE;
  return {
    orders,
    hasMore,
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({ date: last.processed_at, id: last.id }),
          ).toString("base64url")
        : null,
  };
}

export async function readSales(
  db: SqlClient,
  store: string,
  days: number,
  after?: string,
  input: SalesFilters = { status: "all", category: "", delivery: "all" },
) {
  const period = Math.max(1, Math.min(60, Math.floor(days) || 30));
  const filters = salesFilterSchema.parse(input);
  const values = filterValues(store, period, filters);
  const where = selection(filters);
  const totals = await db.query<Record<string, string>>(
    `SELECT currency,count(*)::text AS orders,
    count(*) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL)::text AS paid,
    count(*) FILTER(WHERE financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND cancelled_at IS NULL)::text AS pending,
    count(*) FILTER(WHERE cancelled_at IS NOT NULL)::text AS cancelled,
    COALESCE(sum(received),0)::text AS received,COALESCE(sum(refunded),0)::text AS refunded,COALESCE(sum(net),0)::text AS net,
    COALESCE(avg(total) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL),0)::text AS ticket
    FROM pitterpan_sales_orders o WHERE ${where} GROUP BY currency ORDER BY currency`,
    values,
  );
  const items = await db.query<Record<string, string>>(
    `SELECT COALESCE(i.variant_id,i.product_id,i.id) AS id,min(i.title) AS title,min(i.sku) AS sku,
    sum(i.current_quantity)::text AS units,
    min(to_jsonb(i)->>'image_url') AS image,
    sum(i.current_quantity) FILTER(WHERE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='PICKUP')::text AS pickup_units,
    sum(i.current_quantity) FILTER(WHERE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='MOTOBOY')::text AS motoboy_units,
    sum(i.current_quantity) FILTER(WHERE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='SEDEX')::text AS sedex_units,
    sum(i.current_quantity) FILTER(WHERE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='OTHER')::text AS other_units,
    sum(i.current_quantity) FILTER(WHERE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='MIXED')::text AS mixed_units,
    sum(i.current_quantity) FILTER(WHERE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='UNKNOWN')::text AS unknown_units
    FROM pitterpan_sales_items i JOIN pitterpan_sales_orders o ON o.store=i.store AND o.id=i.order_id
    WHERE ${where} AND o.cancelled_at IS NULL AND o.financial_status=ANY($${values.length + 1}::text[])${filters.category ? ` AND EXISTS (SELECT 1 FROM catalog_items ci JOIN catalog_state cs ON cs.singleton=true AND cs.active_import=ci.import_id WHERE ci.product_id=i.product_id AND ci.category ILIKE $4)` : ""}
    GROUP BY COALESCE(i.variant_id,i.product_id,i.id) HAVING sum(i.current_quantity)>0 ORDER BY sum(i.current_quantity) DESC,id LIMIT 10`,
    [...values, paidStatuses],
  );
  // Existing sales can reuse current catalog photos before the metadata backfill.
  const catalog = await db.query<{ exists: boolean }>(
    "SELECT to_regclass('catalog_items') IS NOT NULL AND to_regclass('catalog_state') IS NOT NULL AS exists",
  );
  if (catalog.rows[0].exists && items.rows.length) {
    const photos = await db.query<{ id: string; image: string }>(
      `SELECT DISTINCT ON (x.id) x.id,ci.image_url AS image FROM unnest($1::text[]) x(id)
      JOIN catalog_items ci ON (x.id='gid://shopify/ProductVariant/'||ci.variant_id OR x.id=ci.product_id)
      JOIN catalog_state cs ON cs.singleton=true AND cs.active_import=ci.import_id
      WHERE ci.image_url IS NOT NULL ORDER BY x.id,ci.variant_id`,
      [items.rows.map((item) => item.id)],
    );
    const byId = new Map(photos.rows.map((photo) => [photo.id, photo.image]));
    for (const item of items.rows)
      item.image = shopifyImageUrl(item.image || byId.get(item.id)) || "";
  }
  const deliveries = await db.query<{ kind: string; orders: string }>(
    `SELECT COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN') AS kind,count(*)::text AS orders FROM pitterpan_sales_orders o WHERE ${where} GROUP BY 1 ORDER BY 1`,
    values,
  );
  const ordersPage = await readSalesOrders(db, store, period, filters);
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
        `SELECT c.id::text,o.name,COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN') AS delivery_kind,COALESCE((SELECT i.title FROM pitterpan_sales_items i WHERE i.store=o.store AND i.order_id=o.id ORDER BY i.id LIMIT 1),'Produto') AS title
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
    ...ordersPage,
    filters,
    deliveries: deliveries.rows,
    state: state.rows[0] || null,
    pending: Number(queue.rows[0].count),
    failed: Number(queue.rows[0].failed),
    cursor: cursor.rows[0].id,
    events: events.rows,
  };
}
