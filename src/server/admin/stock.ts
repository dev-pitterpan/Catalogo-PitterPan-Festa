/** Parameter positions shared by the paginated admin catalog query. */
export const stockSelectionSql = `($6='all' OR ($6='unknown' AND inventory_quantity IS NULL)
 OR ($6='out' AND inventory_quantity<=0) OR ($6='low' AND inventory_quantity>0 AND inventory_quantity<=$7)
 OR ($6='above' AND inventory_quantity>$7) OR ($6='high' AND inventory_quantity>=$8))`;
