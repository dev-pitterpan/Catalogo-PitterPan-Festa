import { readOrderCustomer, ensureOrderCustomers } from "./customers.ts";
import { readOrderDestination } from "./destinations.ts";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "../database/client.ts";
import { salesClient } from "./config.ts";
import {
  orderFields,
  lineFields,
  shippingFields,
  orderSchema,
  lineSchema,
  type SalesOrder,
} from "./model.ts";
import { saveOrder } from "./repository.ts";

const pageInfo = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
const orderPage = z.object({
  orders: z.object({ nodes: z.array(orderSchema), pageInfo }),
});
function checkTime(deadline: number) {
  if (Date.now() > deadline)
    throw new Error("Etapa longa; repita para retomar.");
}
async function completeOrder(order: SalesOrder, deadline: number) {
  const client = salesClient();
  let info = order.lineItems.pageInfo;
  const seen = new Set<string>();
  for (let page = 0; info.hasNextPage; page++) {
    checkTime(deadline);
    if (!info.endCursor || seen.has(info.endCursor) || page >= 100)
      throw new Error("Paginação de itens sem progresso.");
    seen.add(info.endCursor);
    const data = await client.query<unknown>(
      `query($id:ID!,$after:String){order(id:$id){updatedAt lineItems(first:100,after:$after){nodes{${lineFields}} pageInfo{hasNextPage endCursor}}}}`,
      { id: order.id, after: info.endCursor },
    );
    const next = z
      .object({
        order: z
          .object({
            updatedAt: z.string(),
            lineItems: z.object({ nodes: z.array(lineSchema), pageInfo }),
          })
          .nullable(),
      })
      .parse(data).order;
    if (!next || next.updatedAt !== order.updatedAt)
      throw new Error("Pedido mudou durante a leitura; repita a atualização.");
    order.lineItems.nodes.push(...next.lineItems.nodes);
    info = next.lineItems.pageInfo;
  }
  let shipping = order.shippingLines;
  const shippingSeen = new Set<string>();
  while (shipping?.pageInfo.hasNextPage) {
    checkTime(deadline);
    const after = shipping.pageInfo.endCursor;
    if (!after || shippingSeen.has(after) || shippingSeen.size >= 100)
      throw new Error("Paginação de entregas sem progresso.");
    shippingSeen.add(after);
    const data = await client.query<unknown>(
      `query($id:ID!,$after:String){order(id:$id){updatedAt shippingLines(first:100,after:$after){nodes{${shippingFields}} pageInfo{hasNextPage endCursor}}}}`,
      { id: order.id, after },
    );
    const next = z
      .object({
        order: z
          .object({
            updatedAt: z.string(),
            shippingLines: orderSchema.shape.shippingLines,
          })
          .nullable(),
      })
      .parse(data).order;
    if (!next?.shippingLines || next.updatedAt !== order.updatedAt)
      throw new Error("Pedido mudou durante a leitura das entregas.");
    shipping.nodes.push(...next.shippingLines.nodes);
    shipping.pageInfo = next.shippingLines.pageInfo;
  }
  checkTime(deadline);
  order.destination = await readOrderDestination(
    client,
    order.id,
    order.updatedAt,
  );
  order.customerInfo = await readOrderCustomer(
    client,
    order.id,
    order.updatedAt,
  );
  order.lineItems.pageInfo = info;
  return order;
}
/** One bounded page per invocation. Checkpoint/lease survives retries and serverless instances. */
export async function syncSalesPage() {
  const api = salesClient(),
    pool = database(),
    store = api.domain,
    lease = randomUUID();
  await ensureOrderCustomers(pool);
  await pool.query(
    "INSERT INTO pitterpan_sales_sync(store) VALUES($1) ON CONFLICT DO NOTHING",
    [store],
  );
  const acquired = await pool.query(
    `UPDATE pitterpan_sales_sync SET lease_id=$2,lease_until=now()+interval '10 minutes' WHERE store=$1 AND (lease_until IS NULL OR lease_until<now()) RETURNING *`,
    [store, lease],
  );
  if (!acquired.rows.length) return { busy: true, more: true, processed: 0 };
  let processed = 0;
  const deadline = Date.now() + 180000;
  try {
    // Canonical API reads avoid depending on delivery ordering or webhook payload shape.
    const events = await pool.query<{
      delivery_id: string;
      order_id: string;
      topic: string;
    }>(
      "SELECT delivery_id,order_id,topic FROM pitterpan_sales_inbox WHERE store=$1 AND done_at IS NULL AND attempts<10 AND retry_at<=now() ORDER BY received_at LIMIT 3",
      [store],
    );
    for (const event of events.rows) {
      checkTime(deadline);
      try {
        const raw = await api.query<{ order: unknown }>(
          `query($id:ID!){order(id:$id){${orderFields}}}`,
          { id: event.order_id },
        );
        if (!raw.order)
          throw new Error(
            "Pedido do evento indisponível; evento preservado para nova tentativa.",
          );
        const order = await completeOrder(
          orderSchema.parse(raw.order),
          deadline,
        );
        const db = await pool.connect();
        try {
          await db.query("BEGIN");
          await saveOrder(db, store, order, event.topic === "orders/paid");
          await db.query(
            "UPDATE pitterpan_sales_inbox SET done_at=now() WHERE store=$1 AND delivery_id=$2",
            [store, event.delivery_id],
          );
          await db.query("COMMIT");
        } catch (error) {
          await db.query("ROLLBACK");
          throw error;
        } finally {
          db.release();
        }
        processed++;
      } catch {
        await pool.query(
          "UPDATE pitterpan_sales_inbox SET attempts=attempts+1,retry_at=now()+(LEAST(3600,power(2,LEAST(attempts,10))*30)*interval '1 second') WHERE store=$1 AND delivery_id=$2",
          [store, event.delivery_id],
        );
      }
    }
    const state = acquired.rows[0];
    if (!state.until_at) {
      await pool.query(
        `UPDATE pitterpan_sales_sync SET since_at=GREATEST(COALESCE(completed_at-interval '5 minutes',now()-interval '60 days'),now()-interval '60 days'),until_at=now(),cursor=NULL WHERE store=$1 AND lease_id=$2`,
        [store, lease],
      );
    }
    const current = (
      await pool.query("SELECT * FROM pitterpan_sales_sync WHERE store=$1", [
        store,
      ])
    ).rows[0];
    const until = new Date(current.until_at).toISOString(),
      since = new Date(current.since_at).toISOString();
    const floor = new Date(
      new Date(until).getTime() - 60 * 86400000,
    ).toISOString();
    const filter = `created_at:>=${floor} updated_at:>=${since} updated_at:<=${until}`;
    const page = orderPage.parse(
      await api.query(
        `query($after:String,$filter:String!){orders(first:5,after:$after,query:$filter,sortKey:UPDATED_AT){nodes{${orderFields}} pageInfo{hasNextPage endCursor}}}`,
        { after: current.cursor, filter },
      ),
    ).orders;
    if (
      page.pageInfo.hasNextPage &&
      (!page.pageInfo.endCursor ||
        page.pageInfo.endCursor === current.cursor ||
        !page.nodes.length)
    )
      throw new Error("Paginação de pedidos sem progresso.");
    for (const partial of page.nodes) {
      checkTime(deadline);
      const order = await completeOrder(partial, deadline),
        db = await pool.connect();
      try {
        await db.query("BEGIN");
        await saveOrder(db, store, order);
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      } finally {
        db.release();
      }
      processed++;
    }
    if (page.pageInfo.hasNextPage)
      await pool.query(
        "UPDATE pitterpan_sales_sync SET cursor=$3 WHERE store=$1 AND lease_id=$2",
        [store, lease, page.pageInfo.endCursor],
      );
    else
      await pool.query(
        "UPDATE pitterpan_sales_sync SET completed_at=until_at,until_at=NULL,since_at=NULL,cursor=NULL WHERE store=$1 AND lease_id=$2",
        [store, lease],
      );
    return {
      busy: false,
      more: page.pageInfo.hasNextPage || events.rows.length === 3,
      processed,
    };
  } finally {
    await pool.query(
      "UPDATE pitterpan_sales_sync SET lease_id=NULL,lease_until=NULL WHERE store=$1 AND lease_id=$2",
      [store, lease],
    );
  }
}
