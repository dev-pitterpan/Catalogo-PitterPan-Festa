import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { z } from "zod";
import { database } from "../src/server/database/client.ts";
import { stageItems } from "../src/server/database/catalog-repository.ts";
import {
  ShopifyClient,
  BULK_PRODUCTS_QUERY,
  delay,
} from "../src/server/shopify/client.ts";
import { normalizeVariant } from "../src/server/shopify/normalize.ts";
if (existsSync(new URL("../.env", import.meta.url)))
  process.loadEnvFile(new URL("../.env", import.meta.url));
const db = database();
const connection = await db.connect();
const shop = new ShopifyClient();
let run: string | undefined;
try {
  const lock = await connection.query(
    "SELECT pg_try_advisory_lock(7180518) AS locked",
  );
  if (!lock.rows[0].locked)
    throw new Error("Já existe uma importação em execução.");
  const mappingSchema = z.object({
    mappings: z.array(
      z.object({
        catalogSlug: z.string().regex(/^[a-z0-9-]+$/),
        collectionId: z
          .string()
          .regex(/^gid:\/\/shopify\/Collection\/[1-9]\d*$/),
      }),
    ),
  });
  const mappings = mappingSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../config/shopify-collections.json", import.meta.url),
        "utf8",
      ),
    ),
  ).mappings;
  const resumeIndex = process.argv.indexOf("--resume");
  let operation: string;
  if (resumeIndex >= 0) {
    run = z.uuid().parse(process.argv[resumeIndex + 1]);
    const result = await connection.query(
      "SELECT operation_id,store_domain,mapping,status FROM catalog_imports WHERE id=$1",
      [run],
    );
    const row = result.rows[0];
    if (
      !row?.operation_id ||
      row.store_domain !== shop.domain ||
      !["loading", "failed"].includes(row.status)
    )
      throw new Error("Importação não pode ser retomada para esta loja.");
    if (JSON.stringify(row.mapping) !== JSON.stringify(mappings))
      throw new Error("Mapeamento mudou; inicie uma nova importação.");
    operation = row.operation_id;
    await connection.query(
      "UPDATE catalog_imports SET status='loading' WHERE id=$1",
      [run],
    );
  } else {
    run = randomUUID();
    await connection.query(
      "INSERT INTO catalog_imports(id,status,store_domain,mapping) VALUES($1,'loading',$2,$3)",
      [run, shop.domain, JSON.stringify(mappings)],
    );
    console.log(
      `Importação: ${run}. Para retomar: npm run shopify:sync -- --resume ${run}`,
    );
    const result = await shop.query<{
      bulkOperationRunQuery: {
        bulkOperation: { id: string } | null;
        userErrors: unknown[];
      };
    }>(
      `mutation($query:String!){bulkOperationRunQuery(query:$query){bulkOperation{id}userErrors{field message}}}`,
      { query: BULK_PRODUCTS_QUERY },
    );
    if (
      result.bulkOperationRunQuery.userErrors.length ||
      !result.bulkOperationRunQuery.bulkOperation
    )
      throw new Error(
        "Shopify recusou a operação bulk. Confira permissões e campos da API.",
      );
    operation = result.bulkOperationRunQuery.bulkOperation.id;
    await connection.query(
      "UPDATE catalog_imports SET operation_id=$2 WHERE id=$1",
      [run, operation],
    );
  }
  let download: string | undefined;
  for (let attempt = 0; attempt < 720; attempt++) {
    const { node } = await shop.query<{
      node: {
        status: string;
        url: string | null;
        objectCount: string;
        errorCode: string | null;
      } | null;
    }>(
      `query($id:ID!){node(id:$id){... on BulkOperation{status url objectCount errorCode}}}`,
      { id: operation },
    );
    if (!node) throw new Error("Operação bulk não encontrada.");
    if (node.status === "COMPLETED") {
      if (!node.url) throw new Error("Exportação vazia; publicação bloqueada.");
      download = node.url;
      break;
    }
    if (["FAILED", "CANCELED", "EXPIRED"].includes(node.status))
      throw new Error(
        `Exportação encerrada: ${node.status} (${node.errorCode || "sem código"}). Inicie uma nova importação.`,
      );
    if (attempt % 12 === 0)
      console.log(
        `Shopify: ${node.status}; ${node.objectCount} registros exportados.`,
      );
    await delay(5000);
  }
  if (!download)
    throw new Error("Tempo de espera excedido; retome com --resume.");
  if (new URL(download).protocol !== "https:")
    throw new Error("URL de exportação inválida.");
  const response = await fetch(download, {
    signal: AbortSignal.timeout(600000),
  });
  if (!response.ok || !response.body)
    throw new Error("Falha no download; retome com --resume.");
  // A versão ativa permanece intacta. Recomeçar a leitura do JSONL é idempotente.
  await connection.query("DELETE FROM catalog_raw WHERE import_id=$1", [run]);
  await connection.query("DELETE FROM catalog_items WHERE import_id=$1", [run]);
  const lines = createInterface({
    input: Readable.fromWeb(
      response.body as Parameters<typeof Readable.fromWeb>[0],
    ),
    crlfDelay: Infinity,
  });
  let batch: { line: number; data: unknown }[] = [];
  let line = 0;
  const flush = async () => {
    if (!batch.length) return;
    await connection.query(
      "INSERT INTO catalog_raw(import_id,line,data) SELECT $1,x.line,x.data FROM jsonb_to_recordset($2::jsonb) AS x(line bigint,data jsonb)",
      [run, JSON.stringify(batch)],
    );
    batch = [];
  };
  for await (const text of lines) {
    if (!text.trim()) continue;
    line++;
    batch.push({ line, data: JSON.parse(text) });
    if (batch.length === 250) await flush();
  }
  await flush();
  const shopInfo = await shop.query<{ shop: { currencyCode: string } }>(
    "{shop{currencyCode}}",
  );
  if (shopInfo.shop.currencyCode !== "BRL")
    throw new Error(
      "Esta versão usa preços BRL. Configure a moeda/mercado antes de importar outra moeda.",
    );
  const legacyCollections = await connection.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM catalog_raw WHERE import_id=$1
     AND data->>'id' LIKE 'gid://shopify/Collection/%' AND COALESCE(data->>'handle','')=''`,
    [run],
  );
  if (Number(legacyCollections.rows[0].total))
    throw new Error(
      "Exportação antiga sem handles de coleção. Inicie uma nova importação sem --resume.",
    );
  // Coleções e produtos pertencem à mesma versão; a publicação continua atômica.
  await connection.query("DELETE FROM catalog_collections WHERE import_id=$1", [
    run,
  ]);
  await connection.query(
    `INSERT INTO catalog_collections(import_id,id,handle,title)
     SELECT $1,data->>'id',data->>'handle',data->>'title'
     FROM catalog_raw WHERE import_id=$1 AND data->>'id' LIKE 'gid://shopify/Collection/%'
       AND COALESCE(data->>'handle','')<>''
     GROUP BY data->>'id',data->>'handle',data->>'title'`,
    [run],
  );
  const collectionRows = await connection.query<{ id: string; handle: string }>(
    "SELECT id,handle FROM catalog_collections WHERE import_id=$1",
    [run],
  );
  const collectionHandles = new Map(
    collectionRows.rows.map((item) => [item.id, item.handle]),
  );
  let cursor = 0,
    imported = 0,
    missingImages = 0,
    unassigned = 0;
  const categoryCounts: Record<string, number> = {};
  const productIds = new Set<string>();
  while (true) {
    const { rows } = await connection.query(
      `SELECT v.line,v.data AS variant,p.data AS product,
      COALESCE((SELECT jsonb_agg(c.data->>'id') FROM catalog_raw c WHERE c.import_id=v.import_id AND c.data->>'__parentId'=v.data->>'__parentId' AND c.data->>'id' LIKE 'gid://shopify/Collection/%'),'[]') AS collection_ids,
      COALESCE((SELECT jsonb_agg(m.data->'image') FROM catalog_raw m WHERE m.import_id=v.import_id AND m.data->>'__parentId'=v.data->>'__parentId' AND m.data->'image' IS NOT NULL AND m.data->'image'<>'null'::jsonb AND m.data->>'id' LIKE 'gid://shopify/MediaImage/%'),'[]') AS images
      FROM catalog_raw v LEFT JOIN catalog_raw p ON p.import_id=v.import_id AND p.data->>'id'=v.data->>'__parentId' AND NOT(p.data ? '__parentId')
      WHERE v.import_id=$1 AND v.line>$2 AND v.data->>'id' LIKE 'gid://shopify/ProductVariant/%' ORDER BY v.line LIMIT 200`,
      [run, cursor],
    );
    if (!rows.length) break;
    const items = rows
      .map((row) => {
        if (!row.product)
          throw new Error(`Variante sem produto pai na linha ${row.line}.`);
        const catalogSlugs = [
          ...(row.collection_ids as string[]).flatMap((id) =>
            collectionHandles.get(id) ? [collectionHandles.get(id)!] : [],
          ),
          ...mappings
            .filter((mapping) =>
              (row.collection_ids as string[]).includes(mapping.collectionId),
            )
            .map((mapping) => mapping.catalogSlug),
        ];
        return normalizeVariant(
          row.product,
          row.variant,
          catalogSlugs,
          row.images,
        );
      })
      .filter((item) => item !== null);
    for (const item of items) {
      imported++;
      productIds.add(item.product_id);
      if (!item.image_url) missingImages++;
      if (!item.collections.length) unassigned++;
      for (const slug of item.collections)
        categoryCounts[slug] = (categoryCounts[slug] || 0) + 1;
    }
    // Identidade é a variante: SKU vazio/compartilhado não elimina produtos.
    await stageItems(connection, run, items);
    cursor = Number(rows.at(-1).line);
  }
  if (!imported)
    throw new Error("Nenhuma variante ativa/publicada foi importada.");
  const report = {
    products: productIds.size,
    variants: imported,
    missingImages,
    unassigned,
    collections: categoryCounts,
    rawRecords: line,
  };
  await connection.query(
    "UPDATE catalog_imports SET status='ready',completed_at=now(),report=$2 WHERE id=$1",
    [run, JSON.stringify(report)],
  );
  console.log(JSON.stringify(report, null, 2));
  console.log(
    `Validação concluída. Revise e publique: npm run shopify:publish -- ${run}`,
  );
} catch (error) {
  if (run)
    await connection
      .query(
        "UPDATE catalog_imports SET status='failed' WHERE id=$1 AND status='loading'",
        [run],
      )
      .catch(() => {});
  // Nunca imprime o corpo HTTP, tokens ou a URL assinada do download.
  console.error(
    error instanceof z.ZodError
      ? "Dados ou configuração inválidos: confira SKUs, domínio, IDs de coleções e campos obrigatórios."
      : (error as { code?: string })?.code === "23505"
        ? "Variante ou coleção duplicada: revise a origem e reimporte. A versão ativa foi preservada."
        : error instanceof Error
          ? error.message
          : "Importação falhou.",
  );
  process.exitCode = 1;
} finally {
  await connection.query("SELECT pg_advisory_unlock(7180518)").catch(() => {});
  connection.release();
  await db.end();
}
