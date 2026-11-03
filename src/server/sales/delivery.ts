/** Store-confirmed rule: every legacy OTHER service is store pickup.
 * Resolve old imports consistently in filters, rows, aggregates and the map.
 */
export const orderDeliverySql = `(CASE
  WHEN COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='OTHER' THEN 'PICKUP'
  ELSE COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')
END)`;
