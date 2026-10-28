import { z } from "zod";
const money = z.object({
  shopMoney: z.object({
    amount: z.string().regex(/^-?\d{1,16}(\.\d{1,2})?$/),
    currencyCode: z.string().length(3),
  }),
});
const gid = (kind: string) =>
  z.string().regex(new RegExp(`^gid://shopify/${kind}/[0-9]+$`));
export const lineSchema = z.object({
  id: gid("LineItem"),
  title: z.string().max(2000),
  sku: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  currentQuantity: z.number().int().nonnegative(),
  variant: z.object({ id: gid("ProductVariant") }).nullable(),
  product: z.object({ id: gid("Product") }).nullable(),
});
export const orderSchema = z
  .object({
    id: gid("Order"),
    name: z.string().max(100),
    processedAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    cancelledAt: z.iso.datetime({ offset: true }).nullable(),
    test: z.boolean(),
    displayFinancialStatus: z.string().nullable(),
    displayFulfillmentStatus: z.string(),
    totalPriceSet: money,
    totalReceivedSet: money,
    totalRefundedSet: money,
    netPaymentSet: money,
    lineItems: z.object({
      nodes: z.array(lineSchema),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    }),
  })
  .superRefine((order, ctx) => {
    const currencies = [
      order.totalPriceSet,
      order.totalReceivedSet,
      order.totalRefundedSet,
      order.netPaymentSet,
    ].map((m) => m.shopMoney.currencyCode);
    if (new Set(currencies).size !== 1)
      ctx.addIssue({
        code: "custom",
        message: "Moedas inconsistentes no pedido.",
      });
  });
export type SalesOrder = z.infer<typeof orderSchema>;
export type SalesLine = z.infer<typeof lineSchema>;
export const paidStatuses = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"];
export const lineFields = `id title sku quantity currentQuantity variant { id } product { id }`;
export const orderFields = `id name processedAt updatedAt cancelledAt test displayFinancialStatus displayFulfillmentStatus
 totalPriceSet { shopMoney { amount currencyCode } }
 totalReceivedSet { shopMoney { amount currencyCode } }
 totalRefundedSet { shopMoney { amount currencyCode } }
 netPaymentSet { shopMoney { amount currencyCode } }
 lineItems(first:50) { nodes { ${lineFields} } pageInfo { hasNextPage endCursor } }`;
