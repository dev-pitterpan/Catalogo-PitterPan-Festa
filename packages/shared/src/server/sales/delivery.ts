/** Recover previous misclassifications from the original Shopify service title.
 * No order rewrite is needed: filter, totals, list and map share this expression.
 */
export const orderDeliverySql = `(CASE
  WHEN COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='MIXED' THEN 'MIXED'
  WHEN lower(COALESCE(to_jsonb(o)->>'delivery_label','')) ~ '(^|[^a-z])pac([^a-z]|$)' THEN 'PAC'
  WHEN lower(COALESCE(to_jsonb(o)->>'delivery_label','')) ~ '(^|[^a-z])jadlog([^a-z]|$)' THEN 'JADLOG'
  WHEN lower(regexp_replace(COALESCE(to_jsonb(o)->>'delivery_label',''),'[[:space:]_-]','','g'))='localdelivery'
    OR lower(COALESCE(to_jsonb(o)->>'delivery_label',''))='entrega local' THEN 'LOCAL'
  WHEN lower(trim(COALESCE(to_jsonb(o)->>'delivery_label','')))='matriz - pitter pan festas' THEN 'PICKUP'
  ELSE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')
END)`;
