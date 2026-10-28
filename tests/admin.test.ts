import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  environmentPasswordHash,
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  credentialVersion,
  safeDestination,
  allowed,
  SESSION_SECONDS,
} from "../src/server/auth/crypto.ts";
import { readAnalytics } from "../src/server/admin/analytics.ts";
import { normalizeVariant } from "../src/server/shopify/normalize.ts";
import {
  stageItems,
  publishSnapshot,
} from "../src/server/database/catalog-repository.ts";
const secret = "test-key-with-more-than-thirty-two-characters";
test("senha usa salt distinto e não aceita texto/hash inválido", async () => {
  const password = "a-test-password-for-fixtures";
  const first = await hashPassword(password),
    second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(
    await verifyPassword(password, environmentPasswordHash(first)),
    true,
  );
  assert.equal(
    credentialVersion(first, secret),
    credentialVersion(environmentPasswordHash(first), secret),
  );
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
  await assert.rejects(() => hashPassword("short"));
});
test("sessão recusa adulteração, expiração, outra chave e versão inválida", () => {
  const user = {
    sub: "bootstrap",
    name: "Teste",
    email: "admin@example.test",
    role: "admin" as const,
    version: credentialVersion("hash", secret),
  };
  const now = 1793200000000;
  const token = signSession(user, secret, now);
  assert.equal(verifySession(token, secret, now)?.email, user.email);
  assert.equal(verifySession(token + "!", secret, now), null);
  assert.equal(verifySession(token, "another-secret", now), null);
  assert.equal(
    verifySession(token, secret, now + SESSION_SECONDS * 1000),
    null,
  );
  assert.equal(verifySession(token, secret, now - 60000), null);
  assert.notEqual(credentialVersion("new-hash", secret), user.version);
  const [payload, signature] = token.split(".");
  const changed = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(payload, "base64url").toString()),
      role: "gestor",
    }),
  ).toString("base64url");
  assert.equal(verifySession(`${changed}.${signature}`, secret, now), null);
});
test("destino do login e permissões recusam desvios", () => {
  for (const destination of [
    "https://evil.test",
    "//evil.test",
    "/gestor/../../api/admin/users",
    "/gestor\\\\evil.test",
    "/login/",
    null,
  ])
    assert.equal(safeDestination(destination), "/gestor/");
  assert.equal(
    safeDestination("/gestor/produtos/?q=8936"),
    "/gestor/produtos/?q=8936",
  );
  assert.equal(allowed("atendimento", ["admin"]), false);
  assert.equal(allowed("gestor", ["admin"]), false);
  assert.equal(allowed("admin", ["admin"]), true);
});
test("dashboard distingue variantes, ofertas, estoque desconhecido e histórico real de snapshots", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const first = "55555555-5555-4555-8555-555555555555",
      second = "66666666-6666-4666-8666-666666666666";
    const parent = {
      id: "gid://shopify/Product/1",
      title: "Máscara",
      description: "",
      productType: "Halloween",
      vendor: "Marca",
      tags: [],
      status: "ACTIVE",
      onlineStoreUrl: "https://www.pitterpan.com.br/products/test",
      updatedAt: "2026-10-28",
    };
    const item = (
      id: number,
      stock: number | null,
      price = "10.00",
      previous: string | null = null,
    ) =>
      normalizeVariant(
        parent,
        {
          id: `gid://shopify/ProductVariant/${id}`,
          sku: "shared",
          title: "Default Title",
          price,
          compareAtPrice: previous,
          inventoryQuantity: stock,
        },
        ["halloween"],
        [],
      )!;
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'ready','test.myshopify.com')",
      [first],
    );
    await stageItems(db, first, [
      item(1, 2),
      item(2, null),
      item(3, 200),
      item(4, 0),
    ]);
    await publishSnapshot(db, first);
    let context = await readAnalytics(db);
    assert.equal(context.summary?.products, 1);
    assert.equal(context.summary?.variants, 4);
    assert.equal(context.summary?.low, 1);
    assert.equal(context.summary?.high, 1);
    assert.equal(context.summary?.unknown, 1);
    assert.equal(context.summary?.out, 1);
    assert.equal(context.changes, null);
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'ready','test.myshopify.com')",
      [second],
    );
    await stageItems(db, second, [
      item(1, 3, "9.00", "10.00"),
      item(2, null),
      item(3, 200),
      item(5, 10),
    ]);
    await publishSnapshot(db, second);
    context = await readAnalytics(db);
    assert.deepEqual(context.changes, { added: 1, removed: 1, changed: 1 });
    assert.equal(context.summary?.offers, 1);
    assert.equal(context.summary?.units, 213);
    assert.equal(context.summary?.unknown, 1);
    assert.equal(context.previous, first);
    await db.query(
      "UPDATE pitterpan_admin_settings SET low_stock=15,high_stock=150",
    );
    context = await readAnalytics(db);
    assert.equal(context.summary?.low, 2);
    assert.equal(context.summary?.high, 1);
  } finally {
    await db.close();
  }
});

test("CSV não executa fórmulas e mantém valores com aspas", async () => {
  const { csvCell } = await import("../src/lib/admin/csv.ts");
  assert.equal(
    csvCell('=HYPERLINK("https://example.test")'),
    '"\'=HYPERLINK(""https://example.test"")"',
  );
  assert.equal(csvCell("  +2"), '"\'  +2"');
  assert.equal(csvCell('Produto "A"'), '"Produto ""A"""');
  assert.equal(csvCell(12), '"12"');
});
test("limite de login é compartilhado no banco e renova a janela", async () => {
  const { consumeLoginBucket } = await import("../src/server/auth/limits.ts");
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    for (let i = 0; i < 8; i++)
      assert.equal(await consumeLoginBucket(db, "opaque-bucket", 123), true);
    assert.equal(await consumeLoginBucket(db, "opaque-bucket", 123), false);
    assert.equal(await consumeLoginBucket(db, "opaque-bucket", 124), true);
  } finally {
    await db.close();
  }
});
