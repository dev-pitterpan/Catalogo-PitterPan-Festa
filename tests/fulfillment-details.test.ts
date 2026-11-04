import test from "node:test";
import assert from "node:assert/strict";
import { readFulfillmentDetails } from "../packages/shared/src/server/sales/fulfillment-details.ts";
const info = (more = false, cursor: string | null = null) => ({
  hasNextPage: more,
  endCursor: cursor,
});
const line = (id: number, q = 3, pending = 1) => ({
  id: `gid://shopify/LineItem/${id}`,
  name: `Produto ${id}`,
  sku: `SKU${id}`,
  quantity: q,
  currentQuantity: q,
  nonFulfillableQuantity: 0,
  unfulfilledQuantity: pending,
});
const shipment = (id: number, status = "SUCCESS") => ({
  id: `gid://shopify/Fulfillment/${id}`,
  status,
  updatedAt: "2026-11-03T10:00:00Z",
});
const header = () => ({
  id: "gid://shopify/Order/1",
  name: "#1",
  updatedAt: "2026-11-03T10:00:00Z",
  cancelledAt: null,
  displayFulfillmentStatus: "PARTIALLY_FULFILLED",
  fulfillments: [shipment(1), shipment(2, "CANCELLED"), shipment(3, "FAILURE")],
});
const entry = (id: number, lineId: number, q: number | null) => ({
  id: `gid://shopify/FulfillmentLineItem/${id}`,
  quantity: q,
  lineItem: { id: `gid://shopify/LineItem/${lineId}` },
});
test("detalhes paginam produtos e atendimentos, somam sucessos por item e não tratam removidos como pendentes", async () => {
  const calls: { query: string; vars?: Record<string, unknown> }[] = [];
  const h = header();
  let final = false;
  const client = {
    async query<T>(query: string, vars?: Record<string, unknown>) {
      calls.push({ query, vars });
      if (query.includes("PreparationVersion")) {
        final = true;
        return { order: h } as T;
      }
      if (query.includes("PreparationOrder"))
        return {
          order: {
            ...h,
            lineItems: vars?.after
              ? {
                  nodes: [
                    {
                      ...line(2, 1, 0),
                      currentQuantity: 0,
                      nonFulfillableQuantity: 1,
                    },
                  ],
                  pageInfo: info(),
                }
              : {
                  nodes: [line(1, 3, 1)],
                  pageInfo: info(true, "next-product"),
                },
          },
        } as T;
      assert.equal(vars?.id, "gid://shopify/Fulfillment/1");
      return {
        fulfillment: {
          ...shipment(1),
          fulfillmentLineItems: vars?.after
            ? { nodes: [entry(2, 1, 1)], pageInfo: info() }
            : {
                nodes: [entry(1, 1, 1)],
                pageInfo: info(true, "next-shipment"),
              },
        },
      } as T;
    },
  };
  const result = await readFulfillmentDetails(client, h.id);
  assert.equal(final, true);
  assert.equal(result.items[0].name, "Produto 1");
  assert.equal(result.items[0].fulfilled, 2);
  assert.equal(result.items[0].pending, 1);
  assert.equal(result.items[1].fulfilled, 0);
  assert.equal(result.items[1].pending, 0);
  assert.equal(result.items[1].nonFulfillable, 1);
  assert.deepEqual(result.totals, { ordered: 4, fulfilled: 2, pending: 1 });
  assert.equal(calls.length, 5);
  assert.ok(
    calls.every(
      (c) =>
        !c.query.includes("mutation") &&
        !/customer|address|phone|email/.test(c.query),
    ),
  );
});
test("detalhes recusam paginação repetida, quantidades não informadas e mudanças de versão sem retornar um retrato parcial", async () => {
  const h = header();
  await assert.rejects(
    () =>
      readFulfillmentDetails(
        {
          async query<T>() {
            return {
              order: {
                ...h,
                lineItems: { nodes: [line(1)], pageInfo: info(true, "same") },
              },
            } as T;
          },
        },
        h.id,
      ),
    /repetidos|progresso/,
  );
  await assert.rejects(
    () =>
      readFulfillmentDetails(
        {
          async query<T>(q: string) {
            if (q.includes("PreparationOrder"))
              return {
                order: {
                  ...h,
                  lineItems: { nodes: [line(1)], pageInfo: info() },
                },
              } as T;
            return {
              fulfillment: {
                ...shipment(1),
                fulfillmentLineItems: {
                  nodes: [entry(1, 1, null)],
                  pageInfo: info(),
                },
              },
            } as T;
          },
        },
        h.id,
      ),
    /inconsistentes/,
  );
  await assert.rejects(
    () =>
      readFulfillmentDetails(
        {
          async query<T>(q: string) {
            if (q.includes("PreparationOrder"))
              return {
                order: {
                  ...h,
                  fulfillments: [],
                  lineItems: { nodes: [line(1)], pageInfo: info() },
                },
              } as T;
            return {
              order: { ...h, fulfillments: [], updatedAt: "new-version" },
            } as T;
          },
        },
        h.id,
      ),
    /atualizado/,
  );
  await assert.rejects(
    () =>
      readFulfillmentDetails(
        {
          async query<T>(q: string) {
            if (q.includes("PreparationOrder"))
              return {
                order: {
                  ...h,
                  lineItems: { nodes: [line(1)], pageInfo: info() },
                },
              } as T;
            return {
              fulfillment: {
                ...shipment(1, "CANCELLED"),
                fulfillmentLineItems: { nodes: [], pageInfo: info() },
              },
            } as T;
          },
        },
        h.id,
      ),
    /mudou/,
  );
});
test("detalhes sem atendimento não estimam quantidades atendidas e respeitam indisponibilidade e prazo", async () => {
  const h = {
    ...header(),
    displayFulfillmentStatus: "UNFULFILLED",
    fulfillments: [],
  };
  const result = await readFulfillmentDetails(
    {
      async query<T>(q: string) {
        return {
          order: q.includes("PreparationOrder")
            ? { ...h, lineItems: { nodes: [line(1, 3, 3)], pageInfo: info() } }
            : h,
        } as T;
      },
    },
    h.id,
  );
  assert.deepEqual(result.totals, { ordered: 3, fulfilled: 0, pending: 3 });
  await assert.rejects(
    () =>
      readFulfillmentDetails(
        {
          async query<T>() {
            return { order: null } as T;
          },
        },
        h.id,
      ),
    /indisponível/,
  );
  await assert.rejects(
    () =>
      readFulfillmentDetails(
        {
          async query<T>() {
            throw new Error("must not call");
          },
        },
        h.id,
        0,
      ),
    /tempo/,
  );
});
