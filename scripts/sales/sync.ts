import { existsSync } from "node:fs";
import { syncSalesPage } from "../../src/server/sales/sync.ts";
import { database } from "../../src/server/database/client.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
try {
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
