import { existsSync } from "node:fs";
import { salesClient } from "../../src/server/sales/config.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
// Only this new app's subscriptions are visible; never delete or edit any subscription.
const target = new URL(
  process.argv[2] || "https://catalogopitterpanfesta.vercel.app",
);
if (
  target.protocol !== "https:" ||
  target.username ||
  target.password ||
  target.search ||
  target.hash
)
  throw new Error("Informe somente a origem HTTPS de produção.");
const uri = new URL("/api/webhooks/shopify/sales/", target).href;
const topics = [
  "ORDERS_CREATE",
  "ORDERS_PAID",
  "ORDERS_UPDATED",
  "ORDERS_CANCELLED",
  "REFUNDS_CREATE",
];
try {
  const api = salesClient(),
    existing = new Set<string>();
  let cursor: string | null = null;
  for (;;) {
    const data: {
      webhookSubscriptions: {
        nodes: { topic: string; uri: string }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await api.query(
      `query($after:String){webhookSubscriptions(first:100,after:$after){nodes{topic uri} pageInfo{hasNextPage endCursor}}}`,
      { after: cursor },
    );
    for (const hook of data.webhookSubscriptions.nodes)
      if (hook.uri === uri) existing.add(hook.topic);
    const info = data.webhookSubscriptions.pageInfo;
    if (!info.hasNextPage) break;
    if (!info.endCursor || info.endCursor === cursor)
      throw new Error("Paginação sem progresso.");
    cursor = info.endCursor;
  }
  for (const topic of topics) {
    if (existing.has(topic)) {
      console.log(`${topic}: já configurado.`);
      continue;
    }
    const result = await api.query<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null;
        userErrors: { message: string }[];
      };
    }>(
      `mutation($topic:WebhookSubscriptionTopic!,$input:WebhookSubscriptionInput!){webhookSubscriptionCreate(topic:$topic,webhookSubscription:$input){webhookSubscription{id} userErrors{message}}}`,
      {
        topic,
        input: {
          uri,
          format: "JSON",
          includeFields:
            topic === "REFUNDS_CREATE"
              ? ["id", "order_id", "created_at"]
              : ["id", "updated_at"],
        },
      },
    );
    if (
      result.webhookSubscriptionCreate.userErrors.length ||
      !result.webhookSubscriptionCreate.webhookSubscription
    )
      throw new Error(
        "Inscrição recusada; confira permissões de pedidos/dados protegidos.",
      );
    console.log(`${topic}: configurado.`);
  }
  console.log(
    "Webhooks do novo app prontos. Ative também o agendamento de processamento; receber eventos não executa o worker sozinho.",
  );
} catch {
  console.error(
    "Configuração interrompida. Confira o app de vendas, permissões e URL publicada. Inscrições existentes foram preservadas; repetir não duplica as já encontradas.",
  );
  process.exitCode = 1;
}
