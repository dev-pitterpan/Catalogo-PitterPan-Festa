import { z } from "zod";
const gid = (kind: string) =>
  z.string().regex(new RegExp(`^gid://shopify/${kind}/[0-9]+$`));
const quantity = z.number().int().nonnegative();
const pageInfo = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
const line = z.object({
  id: gid("LineItem"),
  name: z.string().max(3000),
  sku: z.string().nullable(),
  quantity,
  currentQuantity: quantity,
  nonFulfillableQuantity: quantity,
  unfulfilledQuantity: quantity,
});
const shipment = z.object({
  id: gid("Fulfillment"),
  status: z.string(),
  updatedAt: z.string(),
});
const order = z.object({
  id: gid("Order"),
  name: z.string(),
  updatedAt: z.string(),
  cancelledAt: z.string().nullable(),
  displayFulfillmentStatus: z.string(),
  fulfillments: z.array(shipment).max(1000),
});
const fields =
  "id name updatedAt cancelledAt displayFulfillmentStatus fulfillments{id status updatedAt}";
export const preparationOrderQuery = `query PreparationOrder($id:ID!,$after:String){order(id:$id){${fields} lineItems(first:100,after:$after){nodes{id name sku quantity currentQuantity nonFulfillableQuantity unfulfilledQuantity} pageInfo{hasNextPage endCursor}}}}`;
export const preparationShipmentQuery = `query PreparationShipment($id:ID!,$after:String){fulfillment(id:$id){id status updatedAt fulfillmentLineItems(first:100,after:$after){nodes{id quantity lineItem{id}} pageInfo{hasNextPage endCursor}}}}`;
type Client = {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
};
function version(value: z.infer<typeof order>) {
  return JSON.stringify([
    value.updatedAt,
    value.displayFulfillmentStatus,
    value.cancelledAt,
    [...value.fulfillments].sort((a, b) => a.id.localeCompare(b.id)),
  ]);
}
/** Live, read-only item details. No partial or cross-version snapshot is returned. */
export async function readFulfillmentDetails(
  client: Client,
  id: string,
  deadline = Date.now() + 50000,
) {
  gid("Order").parse(id);
  const check = () => {
    if (Date.now() > deadline)
      throw new Error("Consulta excedeu o tempo disponível.");
  };
  const readPage = async (after: string | null) => {
    check();
    const raw: unknown = await client.query<unknown>(preparationOrderQuery, {
      id,
      after,
    });
    const result = z
      .object({
        order: order
          .extend({ lineItems: z.object({ nodes: z.array(line), pageInfo }) })
          .nullable(),
      })
      .parse(raw).order;
    if (!result || result.id !== id) throw new Error("Pedido indisponível.");
    return result;
  };
  const first = await readPage(null),
    items = [...first.lineItems.nodes];
  let info = first.lineItems.pageInfo;
  const seen = new Set<string>();
  while (info.hasNextPage) {
    const cursor = info.endCursor;
    if (!cursor || seen.has(cursor) || seen.size >= 100)
      throw new Error("Paginação de produtos sem progresso.");
    seen.add(cursor);
    const next = await readPage(cursor);
    if (version(next) !== version(first) || !next.lineItems.nodes.length)
      throw new Error("Pedido mudou durante a consulta.");
    items.push(...next.lineItems.nodes);
    info = next.lineItems.pageInfo;
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  if (byId.size !== items.length)
    throw new Error("Produtos repetidos na consulta.");
  if (
    new Set(first.fulfillments.map((f) => f.id)).size !==
    first.fulfillments.length
  )
    throw new Error("Atendimentos repetidos.");
  const fulfilled = new Map<string, number>();
  for (const f of first.fulfillments) {
    if (f.status !== "SUCCESS") continue;
    let after: string | null = null;
    const cursors = new Set<string>(),
      entries = new Set<string>();
    for (;;) {
      check();
      const raw: unknown = await client.query<unknown>(
        preparationShipmentQuery,
        {
          id: f.id,
          after,
        },
      );
      const data = z
        .object({
          fulfillment: shipment
            .extend({
              fulfillmentLineItems: z.object({
                nodes: z.array(
                  z.object({
                    id: gid("FulfillmentLineItem"),
                    quantity: quantity.nullable(),
                    lineItem: z.object({ id: gid("LineItem") }),
                  }),
                ),
                pageInfo,
              }),
            })
            .nullable(),
        })
        .parse(raw).fulfillment;
      if (
        !data ||
        data.id !== f.id ||
        data.status !== f.status ||
        data.updatedAt !== f.updatedAt
      )
        throw new Error("Atendimento mudou durante a consulta.");
      for (const entry of data.fulfillmentLineItems.nodes) {
        if (
          entries.has(entry.id) ||
          entry.quantity === null ||
          !byId.has(entry.lineItem.id)
        )
          throw new Error("Itens de atendimento inconsistentes.");
        entries.add(entry.id);
        fulfilled.set(
          entry.lineItem.id,
          (fulfilled.get(entry.lineItem.id) || 0) + entry.quantity,
        );
      }
      const page: z.infer<typeof pageInfo> = data.fulfillmentLineItems.pageInfo;
      if (!page.hasNextPage) break;
      if (
        !page.endCursor ||
        cursors.has(page.endCursor) ||
        cursors.size >= 100 ||
        !data.fulfillmentLineItems.nodes.length
      )
        throw new Error("Paginação de atendimento sem progresso.");
      cursors.add(page.endCursor);
      after = page.endCursor;
    }
  }
  check();
  const final = z
    .object({ order: order.nullable() })
    .parse(
      await client.query(
        `query PreparationVersion($id:ID!){order(id:$id){${fields}}}`,
        { id },
      ),
    ).order;
  if (!final || final.id !== id || version(final) !== version(first))
    throw new Error(
      "Pedido atualizado durante a conferência. Consulte novamente.",
    );
  const rows = items.map((item) => {
    const done = fulfilled.get(item.id) || 0;
    if (!Number.isSafeInteger(done))
      throw new Error("Quantidade excede o limite de precisão.");
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      ordered: item.quantity,
      current: item.currentQuantity,
      fulfilled: done,
      pending: item.unfulfilledQuantity,
      nonFulfillable: item.nonFulfillableQuantity,
    };
  });
  return {
    id: first.id,
    name: first.name,
    status: first.displayFulfillmentStatus,
    cancelledAt: first.cancelledAt,
    updatedAt: first.updatedAt,
    checkedAt: new Date().toISOString(),
    items: rows,
    totals: rows.reduce(
      (a, r) => ({
        ordered: a.ordered + r.ordered,
        fulfilled: a.fulfilled + r.fulfilled,
        pending: a.pending + r.pending,
      }),
      { ordered: 0, fulfilled: 0, pending: 0 },
    ),
  };
}
