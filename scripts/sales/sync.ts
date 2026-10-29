import { existsSync } from "node:fs";
import { syncSalesPage } from "../../src/server/sales/sync.ts";
import { salesConfig } from "../../src/server/sales/config.ts";
import { database } from "../../src/server/database/client.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
try {
  if (process.argv.includes("--refresh-details")) {
    const store = salesConfig().SHOPIFY_SALES_STORE_DOMAIN;
    await database().query(
      "INSERT INTO pitterpan_sales_sync(store) VALUES($1) ON CONFLICT DO NOTHING",
      [store],
    );
    const refreshed = await database().query(
      `UPDATE pitterpan_sales_sync SET completed_at=NULL,since_at=NULL,until_at=NULL,cursor=NULL WHERE store=$1 AND (lease_until IS NULL OR lease_until<now()) RETURNING store`,
      [store],
    );
    if (!refreshed.rows.length)
      throw new Error("Já existe uma atualização em andamento.");
    console.log(
      "Relendo os últimos 60 dias para completar fotos e modalidades de entrega. Pedidos existentes preservados.",
    );
  }
  let pages = 0;
  for (;;) {
    const result = await syncSalesPage();
    if (result.busy)
      throw new Error("Já existe uma atualização de vendas em andamento.");
    pages++;
    console.log(
      `Página ${pages}: ${result.processed} pedidos/eventos processados.`,
    );
    if (!result.more) break;
  }
  console.log(
    "Vendas atualizadas. Nenhum produto, preço ou pedido foi modificado na Shopify.",
  );
} catch {
  console.error(
    "Sincronização interrompida. Confira as variáveis SHOPIFY_SALES_*, permissões e a migração sales:migrate. Execute novamente para retomar.",
  );
  process.exitCode = 1;
} finally {
  await database().end();
}
