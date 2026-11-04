/** One definition shared by overview counts, operational previews and paginated filters. */
export const awaitingFulfillmentSql = `o.cancelled_at IS NULL AND o.financial_status IN ('PAID','PARTIALLY_REFUNDED')
  AND o.received>o.refunded AND o.fulfillment_status NOT IN ('FULFILLED','FULFILLMENT_NOT_REQUIRED')`;
