import {
  outstandingSql,
  officialOutstandingSql,
  currentTotalSql,
} from "./financial.ts";
import { shippingCharge } from "./shipping.ts";
import { awaitingFulfillmentSql } from "./fulfillment.ts";
import { orderDeliverySql } from "./delivery.ts";
import { customerColumns, customerJoin } from "./customers.ts";
import { todayDate, shiftDate } from "../../lib/admin/date-range.ts";
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
  const shipping = shippingCharge(order.shippingLines);
  const result = await db.query<{ id: string }>(
    `INSERT INTO pitterpan_sales_orders
    (store,id,name,processed_at,updated_at,financial_status,fulfillment_status,cancelled_at,test,currency,total,received,refunded,net,delivery_kind,delivery_label,destination,customer,outstanding,current_total,shipping_charge,shipping_charge_checked)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20,$21,$22)
    ON CONFLICT(store,id) DO UPDATE SET name=EXCLUDED.name,processed_at=EXCLUDED.processed_at,
    updated_at=EXCLUDED.updated_at,financial_status=EXCLUDED.financial_status,
    fulfillment_status=EXCLUDED.fulfillment_status,cancelled_at=EXCLUDED.cancelled_at,
    test=EXCLUDED.test,currency=EXCLUDED.currency,total=EXCLUDED.total,received=EXCLUDED.received,
    refunded=EXCLUDED.refunded,net=EXCLUDED.net,delivery_kind=EXCLUDED.delivery_kind,delivery_label=EXCLUDED.delivery_label,destination=COALESCE(EXCLUDED.destination,pitterpan_sales_orders.destination),customer=COALESCE(EXCLUDED.customer,pitterpan_sales_orders.customer),outstanding=EXCLUDED.outstanding,current_total=EXCLUDED.current_total,shipping_charge=CASE WHEN EXCLUDED.shipping_charge_checked THEN EXCLUDED.shipping_charge ELSE pitterpan_sales_orders.shipping_charge END,shipping_charge_checked=(EXCLUDED.shipping_charge_checked OR pitterpan_sales_orders.shipping_charge_checked),imported_at=now()
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
      order.customerInfo ? JSON.stringify(order.customerInfo) : null,
      order.totalOutstandingSet?.shopMoney.amount ?? null,
      order.currentTotalPriceSet?.shopMoney.amount ?? null,
      shipping.amount,
      shipping.checked,
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
    4 +
    (filters.category ? 1 : 0) +
    (filters.delivery !== "all" ? 1 : 0) +
    (filters.fulfillment !== "all" ? 1 : 0);
  const period = filters.start
    ? `o.processed_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND o.processed_at<((($${endIndex}::date+1)::timestamp) AT TIME ZONE 'America/Sao_Paulo')`
    : "o.processed_at>=((((now() AT TIME ZONE 'America/Sao_Paulo')::date-($2::int-1))::timestamp) AT TIME ZONE 'America/Sao_Paulo') AND o.processed_at<((((now() AT TIME ZONE 'America/Sao_Paulo')::date+1)::timestamp) AT TIME ZONE 'America/Sao_Paulo')";
  const status = `($3='all' OR ($3='CANCELLED' AND o.cancelled_at IS NOT NULL) OR ($3='REFUNDS' AND o.refunded>0) OR o.financial_status=$3)`;
  const delivery =
    filters.delivery === "all"
      ? ""
      : ` AND ${orderDeliverySql}=$${filters.category ? 5 : 4}`;
  const category = filters.category
    ? ` AND EXISTS (
    SELECT 1 FROM pitterpan_sales_items si JOIN catalog_items ci ON ci.product_id=si.product_id
    JOIN catalog_state cs ON cs.singleton=true AND cs.active_import=ci.import_id
    WHERE si.store=o.store AND si.order_id=o.id AND ci.category ILIKE $4
  )`
    : "";
  const fulfillmentIndex =
    4 + (filters.category ? 1 : 0) + (filters.delivery !== "all" ? 1 : 0);
  const fulfillment =
    filters.fulfillment === "all"
      ? ""
      : ` AND (($${fulfillmentIndex}='AWAITING' AND ${awaitingFulfillmentSql}) OR ($${fulfillmentIndex}<>'AWAITING' AND o.fulfillment_status=$${fulfillmentIndex}))`;
  return `o.store=$1 AND NOT o.test AND ${period} AND ${status}${category}${delivery}${fulfillment}`;
}
function filterValues(store: string, days: number, filters: SalesFilters) {
  return [
    store,
    filters.start || days,
    filters.status,
    ...(filters.category ? [containsPattern(filters.category)] : []),
    ...(filters.delivery !== "all" ? [filters.delivery] : []),
    ...(filters.fulfillment !== "all" ? [filters.fulfillment] : []),
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
    `SELECT o.id,o.name,o.processed_at::text,o.financial_status,o.fulfillment_status,o.cancelled_at::text,o.currency,o.total::text,${currentTotalSql}::text AS current_total,${officialOutstandingSql}::text AS outstanding,o.received::text,o.refunded::text,(o.received-o.refunded)::text AS net,${orderDeliverySql} AS delivery_kind,to_jsonb(o)->>'shipping_charge' AS shipping_charge,COALESCE(to_jsonb(o)->>'shipping_charge_checked','false') AS shipping_charge_checked,COALESCE(to_jsonb(o)->>'delivery_label','') AS delivery_label,${customerColumns}
     FROM pitterpan_sales_orders o ${customerJoin}
     WHERE ${selection(filters)}${boundary}
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

export async function readSoldProducts(
  db: SqlClient,
  store: string,
  days: number,
  input: SalesFilters = { status: "all", category: "", delivery: "all" },
  requestedPage = 1,
  search = "",
) {
  const period = Math.max(1, Math.min(60, Math.floor(days) || 30));
  const filters = salesFilterSchema.parse(input);
  if (
    !Number.isInteger(requestedPage) ||
    requestedPage < 1 ||
    requestedPage > 10000 ||
    search.length > 200
  )
    throw new Error("Filtros inválidos.");
  const values = filterValues(store, period, filters);
  const where = selection(filters);
  const parameters = [
    ...values,
    paidStatuses.filter((status) => status !== "REFUNDED"),
    search.trim() ? containsPattern(search.trim()) : "",
  ];
  const counted = await db.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM (SELECT COALESCE(i.variant_id,i.product_id,i.id) AS id
    FROM pitterpan_sales_items i JOIN pitterpan_sales_orders o ON o.store=i.store AND o.id=i.order_id
    WHERE ${where} AND o.received>0 AND o.cancelled_at IS NULL AND o.financial_status=ANY($${values.length + 1}::text[])${filters.category ? ` AND EXISTS (SELECT 1 FROM catalog_items ci JOIN catalog_state cs ON cs.singleton=true AND cs.active_import=ci.import_id WHERE ci.product_id=i.product_id AND ci.category ILIKE $4)` : ""}
    AND ($${values.length + 2}='' OR i.title ILIKE $${values.length + 2} OR i.sku ILIKE $${values.length + 2})
    GROUP BY COALESCE(i.variant_id,i.product_id,i.id) HAVING sum(i.current_quantity)>0) grouped`,
    parameters,
  );
  const total = Number(counted.rows[0].total);
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(requestedPage, pages);
  const items = await db.query<Record<string, string>>(
    `SELECT COALESCE(i.variant_id,i.product_id,i.id) AS id,min(i.title) AS title,min(i.sku) AS sku,max(o.processed_at) FILTER(WHERE i.current_quantity>0)::text AS last_sold_at,
    sum(i.current_quantity)::text AS units,
    min(to_jsonb(i)->>'image_url') AS image,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='PICKUP')::text AS pickup_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='MOTOBOY')::text AS motoboy_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='SEDEX')::text AS sedex_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='PAC')::text AS pac_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='JADLOG')::text AS jadlog_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='LOCAL')::text AS local_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='OTHER')::text AS other_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='MIXED')::text AS mixed_units,
    sum(i.current_quantity) FILTER(WHERE ${orderDeliverySql}='UNKNOWN')::text AS unknown_units
    FROM pitterpan_sales_items i JOIN pitterpan_sales_orders o ON o.store=i.store AND o.id=i.order_id
    WHERE ${where} AND o.received>0 AND o.cancelled_at IS NULL AND o.financial_status=ANY($${values.length + 1}::text[])${filters.category ? ` AND EXISTS (SELECT 1 FROM catalog_items ci JOIN catalog_state cs ON cs.singleton=true AND cs.active_import=ci.import_id WHERE ci.product_id=i.product_id AND ci.category ILIKE $4)` : ""}
    AND ($${values.length + 2}='' OR i.title ILIKE $${values.length + 2} OR i.sku ILIKE $${values.length + 2})
    GROUP BY COALESCE(i.variant_id,i.product_id,i.id) HAVING sum(i.current_quantity)>0 ORDER BY sum(i.current_quantity) DESC,id LIMIT 10 OFFSET $${values.length + 3}`,
    [...parameters, (page - 1) * 10],
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
  return { items: items.rows, total, pages, page };
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
  const totals = await financialTotals(db, values, where);
  const items = await readSoldProducts(db, store, period, filters);
  const deliveries = await db.query<{ kind: string; orders: string }>(
    `SELECT ${orderDeliverySql} AS kind,count(*)::text AS orders FROM pitterpan_sales_orders o WHERE ${where} GROUP BY 1 ORDER BY 1`,
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
        `SELECT c.id::text,o.name,${orderDeliverySql} AS delivery_kind,COALESCE((SELECT i.title FROM pitterpan_sales_items i WHERE i.store=o.store AND i.order_id=o.id ORDER BY i.id LIMIT 1),'Produto') AS title
    FROM pitterpan_sales_confirmations c JOIN pitterpan_sales_orders o ON o.store=c.store AND o.id=c.order_id
    WHERE c.store=$1 AND c.id>$2::bigint AND c.created_at>now()-interval '5 minutes' AND o.financial_status='PAID' AND o.cancelled_at IS NULL AND NOT o.test
    ORDER BY c.id LIMIT 5`,
        [store, after],
      )
    : { rows: [] };
  return {
    days: period,
    totals: totals.rows,
    top: items.items,
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

async function financialTotals(
  db: SqlClient,
  values: unknown[],
  where: string,
) {
  return db.query<Record<string, string>>(
    `SELECT currency,count(*)::text AS orders,
 count(*) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL)::text AS paid,
 count(*) FILTER(WHERE financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND cancelled_at IS NULL)::text AS pending,
 count(*) FILTER(WHERE cancelled_at IS NOT NULL)::text AS cancelled,
 count(*) FILTER(WHERE financial_status='EXPIRED')::text AS expired,
 count(*) FILTER(WHERE financial_status='VOIDED')::text AS voided,
 count(*) FILTER(WHERE refunded>0)::text AS refunded_orders,
 COALESCE(sum(received),0)::text AS received,COALESCE(sum(refunded),0)::text AS refunded,
 COALESCE(sum(received-refunded),0)::text AS net,
 COALESCE(sum(total) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL),0)::text AS paid_value,
 COALESCE(sum(GREATEST(${outstandingSql},0)) FILTER(WHERE financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND cancelled_at IS NULL),0)::text AS outstanding,
 count(*) FILTER(WHERE financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND cancelled_at IS NULL AND ${officialOutstandingSql} IS NULL)::text AS outstanding_estimated,
 COALESCE(sum(total) FILTER(WHERE financial_status='EXPIRED'),0)::text AS expired_value,
 COALESCE(sum(total) FILTER(WHERE financial_status='VOIDED'),0)::text AS voided_value,
 COALESCE(sum(total) FILTER(WHERE cancelled_at IS NOT NULL),0)::text AS cancelled_value,
 count(*) FILTER(WHERE net<>received-refunded)::text AS inconsistent,
 COALESCE(avg(total) FILTER(WHERE financial_status='PAID' AND cancelled_at IS NULL),0)::text AS ticket
 FROM pitterpan_sales_orders o WHERE ${where} GROUP BY currency ORDER BY currency`,
    values,
  );
}
export async function readSalesFinance(
  db: SqlClient,
  store: string,
  days: number,
  input: SalesFilters = { status: "all", category: "", delivery: "all" },
) {
  const period = Math.max(1, Math.min(60, Math.floor(days) || 30));
  const end = input.end || todayDate(),
    start = input.start || shiftDate(end, 1 - period);
  const filters = salesFilterSchema.parse({ ...input, start, end });
  const values = filterValues(store, period, filters),
    where = selection(filters);
  const totals = await financialTotals(db, values, where);
  const daily = await db.query<Record<string, string>>(
    `SELECT currency,(o.processed_at AT TIME ZONE 'America/Sao_Paulo')::date::text AS day,
 count(*)::text AS orders,COALESCE(sum(received),0)::text AS received,COALESCE(sum(refunded),0)::text AS refunded,COALESCE(sum(received-refunded),0)::text AS net
 FROM pitterpan_sales_orders o WHERE ${where} GROUP BY currency,day ORDER BY day`,
    values,
  );
  const statuses = await db.query<{
    currency: string;
    status: string;
    orders: string;
    order_value: string;
    received: string;
    refunded: string;
    net: string;
  }>(
    `SELECT currency,financial_status AS status,count(*)::text AS orders,sum(total)::text AS order_value,sum(received)::text AS received,sum(refunded)::text AS refunded,sum(received-refunded)::text AS net FROM pitterpan_sales_orders o WHERE ${where} GROUP BY currency,financial_status ORDER BY count(*) DESC,financial_status`,
    values,
  );
  const state = await db.query<Record<string, string | null>>(
    "SELECT completed_at::text,until_at::text FROM pitterpan_sales_sync WHERE store=$1",
    [store],
  );
  return {
    totals: totals.rows,
    daily: daily.rows,
    statuses: statuses.rows,
    state: state.rows[0] || null,
    window: { start, end },
    timezone: "America/Sao_Paulo",
    source: "shopify_orders" as const,
  };
}

/** Operational view of the same filtered snapshot, without counting cancellations as refunds. */
export async function readSalesOperations(
  db: SqlClient,
  store: string,
  days: number,
  input: SalesFilters = { status: "all", category: "", delivery: "all" },
) {
  const period = Math.max(1, Math.min(60, Math.floor(days) || 30));
  const end = input.end || todayDate(),
    start = input.start || shiftDate(end, 1 - period);
  const filters = salesFilterSchema.parse({ ...input, start, end });
  const values = filterValues(store, period, filters),
    where = selection(filters);
  const open = awaitingFulfillmentSql;
  const totals = await financialTotals(db, values, where);
  const fulfillment = await db.query<Record<string, string>>(
    `SELECT o.currency,count(*) FILTER(WHERE ${open})::text AS awaiting,
     count(*) FILTER(WHERE ${open} AND o.fulfillment_status='READY_FOR_PICKUP')::text AS ready
     FROM pitterpan_sales_orders o WHERE ${where} GROUP BY o.currency ORDER BY o.currency`,
    values,
  );
  const awaiting = await db.query<Record<string, string>>(
    `SELECT o.id,o.name,o.processed_at::text,o.currency,o.fulfillment_status,to_jsonb(o)->>'shipping_charge' AS shipping_charge,COALESCE(to_jsonb(o)->>'shipping_charge_checked','false') AS shipping_charge_checked,${orderDeliverySql} AS delivery_kind
     FROM pitterpan_sales_orders o WHERE ${where} AND ${open}
     ORDER BY o.processed_at,o.id LIMIT 10`,
    values,
  );
  const refunds = await db.query<Record<string, string>>(
    `SELECT o.id,o.name,o.processed_at::text,o.financial_status,o.cancelled_at::text,o.currency,
     o.received::text,o.refunded::text,(o.received-o.refunded)::text AS net
     FROM pitterpan_sales_orders o WHERE ${where} AND o.refunded>0
     ORDER BY o.processed_at DESC,o.id DESC LIMIT 10`,
    values,
  );
  const state = await db.query<Record<string, string | null>>(
    "SELECT completed_at::text,until_at::text,last_webhook_at::text FROM pitterpan_sales_sync WHERE store=$1",
    [store],
  );
  const queue = await db.query<{ pending: string; failed: string }>(
    "SELECT count(*)::text AS pending,count(*) FILTER(WHERE attempts>=10)::text AS failed FROM pitterpan_sales_inbox WHERE store=$1 AND done_at IS NULL",
    [store],
  );
  return {
    totals: totals.rows,
    fulfillment: fulfillment.rows,
    awaiting: awaiting.rows,
    refunds: refunds.rows,
    state: state.rows[0] || null,
    pending: Number(queue.rows[0].pending),
    failed: Number(queue.rows[0].failed),
    window: { start, end },
    timezone: "America/Sao_Paulo",
    store,
  };
}
