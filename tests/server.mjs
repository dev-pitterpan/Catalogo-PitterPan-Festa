import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  hashPassword,
  signSession,
  credentialVersion,
} from "../src/server/auth/crypto.ts";
const testSecret = randomBytes(48).toString("hex");
const testPassword = "test-only-password-2026";
const testHash = await hashPassword(testPassword);
const testUser = {
  sub: "bootstrap",
  email: "admin@example.test",
  name: "Equipe de teste",
  role: "admin",
  version: credentialVersion(testHash, testSecret),
};
const testCookie = `__Host-pitterpan-session=${signSession(testUser, testSecret)}`;
const rawFetch = globalThis.fetch;
const fetch = (input, options = {}) =>
  rawFetch(input, {
    ...options,
    headers: { cookie: testCookie, ...options.headers },
  });
const port = "3187";
const child = spawn(process.execPath, ["scripts/run-next.ts", "start"], {
  env: {
    ...process.env,
    PORT: port,
    NEXT_TELEMETRY_DISABLED: "1",
    CATALOG_DATA_SOURCE: "json",
    DATABASE_URL: "",
    SHOPIFY_SALES_STORE_DOMAIN: "fixture.myshopify.com",
    SHOPIFY_SALES_CLIENT_ID: "fixture",
    SHOPIFY_SALES_CLIENT_SECRET: "test-webhook-secret",
    SHOPIFY_SALES_WEBHOOK_SECRET: "",
    CRON_SECRET: "fixture-cron-secret-with-at-least-32-characters",
    ADMIN_EMAIL: testUser.email,
    ADMIN_NAME: testUser.name,
    ADMIN_PASSWORD_HASH: testHash,
    ADMIN_SESSION_SECRET: testSecret,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stderr.on("data", (chunk) => {
  logs += chunk.toString();
});
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Servidor não iniciou: " + logs)),
      30_000,
    );
    child.stdout.on("data", (chunk) => {
      if (/ready/i.test(chunk.toString())) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error("Servidor encerrou: " + code + " " + logs));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const hostEntry = (host) =>
    new Promise((resolve, reject) => {
      const request = httpRequest(
        base + "/",
        { headers: { Host: host } },
        (response) => {
          response.resume();
          response.on("end", () =>
            resolve({
              status: response.statusCode,
              location: response.headers.location,
            }),
          );
        },
      );
      request.on("error", reject);
      request.end();
    });
  const managerEntry = await hostEntry("gestaopitterpan.vercel.app");
  assert.equal(managerEntry.status, 307);
  assert.equal(new URL(managerEntry.location, base).pathname, "/gestor/");
  const publicEntry = await hostEntry("catalogopitterpanfesta.vercel.app");
  assert.equal(publicEntry.status, 200);
  assert.equal(publicEntry.location, undefined);
  console.log(
    "Domínios OK: entrada de gestão redireciona; catálogo público permanece acessível.",
  );
  for (const route of [
    "/gestor/",
    "/gestor/produtos/",
    "/gestor/vendas/",
    "/gestor/mapa/",
    "/gestor/analises/",
    "/gestor/halloween/",
    "/gestor/agenda/",
  ]) {
    const denied = await rawFetch(base + route, { redirect: "manual" });
    const html = await denied.text();
    assert.ok([200, 307].includes(denied.status));
    assert.ok(
      denied.headers.get("location")?.includes("/login") ||
        html.includes("/login/"),
    );
    assert.ok(!html.includes('class="admin-stats"'));
  }
  const managerCatalogHtml = await (
    await fetch(base + "/gestor/halloween/")
  ).text();
  assert.ok(managerCatalogHtml.includes("Copiar link do cliente"));
  assert.ok(
    managerCatalogHtml.includes(
      'href="https://catalogopitterpanfesta.vercel.app/halloween/"',
    ),
  );
  const publicCatalogHtml = await (await rawFetch(base + "/halloween/")).text();
  assert.ok(!publicCatalogHtml.includes("Copiar link do cliente"));
  for (const route of [
    "/api/admin/sync/",
    "/api/admin/sales/",
    "/api/admin/destinations/",
    "/api/admin/analytics/",
    "/api/admin/overview/",
    "/api/admin/products/",
    "/api/admin/users/",
    "/api/admin/agenda/",
  ])
    assert.equal((await rawFetch(base + route)).status, 401);
  assert.equal(
    (await rawFetch(base + "/api/admin/agenda/", { method: "POST" })).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/agenda/", {
        method: "POST",
        headers: { origin: "https://invalid.example" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(base + "/api/admin/agenda/?start=invalid&end=2026-10-30"))
      .status,
    400,
  );
  assert.equal(
    (await rawFetch(base + "/api/admin/sales/customers/", { method: "POST" }))
      .status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/sales/customers/", {
        method: "POST",
        headers: { origin: "https://invalid.example" },
        body: "{}",
      })
    ).status,
    403,
  );
  for (const suffix of [
    "?report=unknown",
    "?report=sales-time&start=2026-02-30&end=2026-03-01",
  ]) {
    assert.equal(
      (await fetch(base + "/api/admin/analytics/" + suffix)).status,
      400,
    );
  }
  assert.equal(
    (await rawFetch(base + "/api/admin/sync/", { method: "POST" })).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/sync/", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/sync/", {
        method: "POST",
        headers: { origin: base },
      })
    ).status,
    503,
  );
  assert.equal(
    (await rawFetch(base + "/api/admin/sales/?view=finance&days=1")).status,
    401,
  );
  const filteredSales = await fetch(
    base +
      "/gestor/vendas/?days=7&status=REFUNDED&start=2026-10-01&end=2026-10-02",
  );
  assert.equal(filteredSales.status, 200);
  assert.ok((await filteredSales.text()).includes("Reembolsado"));
  const analyticsPage = await fetch(base + "/gestor/analises/");
  const analyticsHtml = await analyticsPage.text();
  assert.equal(analyticsPage.status, 200);
  assert.ok(analyticsHtml.includes("Como está a sua loja?"));
  assert.ok(analyticsHtml.includes("Comportamento"));
  assert.ok(!analyticsHtml.includes('class="shopify-report-list"'));
  assert.equal(
    (await rawFetch(base + "/api/admin/settings/", { method: "POST" })).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/settings/", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await rawFetch(base + "/api/auth/login/", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: testUser.email, password: testPassword }),
      })
    ).status,
    403,
  );
  const login = await rawFetch(base + "/api/auth/login/", {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({
      email: testUser.email,
      password: testPassword,
      next: "https://evil.example",
    }),
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie") || "";
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Max-Age=28800/i);
  const sessionOnly = await rawFetch(base + "/api/auth/login/", {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({
      email: testUser.email,
      password: testPassword,
      remember: false,
    }),
  });
  assert.equal(sessionOnly.status, 200);
  assert.ok(!/Max-Age=/i.test(sessionOnly.headers.get("set-cookie") || ""));
  const invalidRemember = await rawFetch(base + "/api/auth/login/", {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({
      email: testUser.email,
      password: testPassword,
      remember: "yes",
    }),
  });
  assert.equal(invalidRemember.status, 400);
  const loginView = await rawFetch(base + "/login/");
  const loginHtml = await loginView.text();
  assert.match(loginHtml, /A festa começa/);
  assert.match(loginHtml, /Manter conectado/);
  const art = await rawFetch(base + "/assets/images/admin/login-party.webp");
  assert.equal(art.status, 200);
  assert.match(art.headers.get("content-type") || "", /image\/webp/);

  assert.equal((await login.json()).next, "/gestor/");
  const wrong = await rawFetch(base + "/api/auth/login/", {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({ email: testUser.email, password: "wrong-password" }),
  });
  assert.equal(wrong.status, 401);
  assert.equal(
    (
      await rawFetch(base + "/api/admin/overview/", {
        headers: { cookie: testCookie + "tampered" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await rawFetch(base + "/api/admin/sales/", { method: "POST" })).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/sales/", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal((await fetch(base + "/api/admin/sales/")).status, 503);
  assert.equal((await rawFetch(base + "/api/cron/sales/")).status, 401);
  assert.equal(
    (
      await rawFetch(base + "/api/webhooks/shopify/sales/", {
        method: "POST",
        headers: {
          "x-shopify-shop-domain": "fixture.myshopify.com",
          "x-shopify-topic": "orders/paid",
          "x-shopify-webhook-id": "fixture-delivery-id",
          "x-shopify-hmac-sha256": "invalid",
        },
        body: '{"id":123}',
      })
    ).status,
    401,
  );
  const salesPage = await fetch(base + "/gestor/vendas/");
  assert.equal(salesPage.status, 200);
  assert.ok((await salesPage.text()).includes("Cada venda"));
  const overview = await fetch(base + "/api/admin/overview/");
  assert.equal(overview.status, 200);
  assert.equal((await overview.json()).source, "json");
  for (const route of [
    "produtos",
    "estoque",
    "ofertas",
    "catalogos",
    "alteracoes",
    "sincronizacoes",
    "usuarios",
    "configuracoes",
    "calendario",
    "relatorios",
  ]) {
    const page = await fetch(base + `/gestor/${route}/`);
    assert.equal(page.status, 200, route);
    const html = await page.text();
    assert.match(html, /admin-sidebar/);
    assert.ok(!html.includes(testSecret));
    assert.ok(!html.includes(testHash));
  }
  const publicHome = await rawFetch(base + "/");
  const publicHtml = await publicHome.text();
  assert.ok(publicHtml.includes('href="/halloween/"'));
  assert.ok(!publicHtml.includes('href="/gestor/halloween/"'));
  const publicCatalog = await rawFetch(base + "/halloween/");
  assert.equal(publicCatalog.status, 200);
  assert.match(await publicCatalog.text(), /product-card/);
  const logout = await fetch(base + "/api/auth/logout/", {
    method: "POST",
    headers: { origin: base },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/i);
  if (process.env.ADMIN_CAPTURE_DIR) {
    await mkdir(process.env.ADMIN_CAPTURE_DIR, { recursive: true });
    const capture = await fetch(base + "/gestor/");
    await writeFile(
      process.env.ADMIN_CAPTURE_DIR + "/overview.html",
      await capture.text(),
    );
    const loginCapture = await rawFetch(base + "/login/");
    await writeFile(
      process.env.ADMIN_CAPTURE_DIR + "/login.html",
      await loginCapture.text(),
    );
  }
  console.log(
    "Admin HTTP OK: rotas protegidas, login, cookies, CSRF, logout, dashboard e catálogos públicos.",
  );
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/data/catalogs/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const routes = [
    "/",
    "/gestor/",
    ...manifest.catalogs.flatMap((item) => [
      `/${item.slug}/`,
      `/gestor/${item.slug}/`,
    ]),
  ];
  for (const route of routes) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.match(html, /Pitter Pan/);
    const slug = route.split("/").filter(Boolean).at(-1);
    if (slug && slug !== "gestor") {
      const data = JSON.parse(
        await readFile(
          new URL(`../public/data/catalogs/${slug}.json`, import.meta.url),
          "utf8",
        ),
      );
      assert.equal(
        (html.match(/class="product-card[ "]/g) || []).length,
        data.products.length,
        route,
      );
      assert.ok(html.includes(data.products[0].name), route);
    }
    console.log("Next SSR OK:", route);
  }
  assert.equal((await fetch(base + "/api/health/")).status, 200);
  assert.equal(
    (await fetch(base + "/data/catalogs/halloween.json")).status,
    200,
  );
  assert.equal(
    (await fetch(base + "/assets/images/catalogs/halloween/banner.webp"))
      .status,
    200,
  );
  assert.equal((await fetch(base + "/assets/inexistente.webp")).status, 404);
  // Next pode ter iniciado streaming antes de notFound(); confira também o documento.
  for (const path of [
    "/colecao-inexistente/",
    "/gestor/colecao-inexistente/",
  ]) {
    const missing = await fetch(base + path);
    assert.ok([200, 404].includes(missing.status));
    const html = await missing.text();
    assert.match(html, /Este catálogo não está disponível/);
    assert.match(html, /name="robots" content="noindex"/);
  }
  assert.equal(
    (await fetch(base + "/api/health/", { method: "POST" })).status,
    405,
  );
  const pageResponse = await fetch(base + "/api/catalogs/halloween/?q=8936");
  assert.equal(pageResponse.status, 200);
  assert.match(
    pageResponse.headers.get("server-timing") || "",
    /^catalog;dur=\d/,
  );
  const pageData = await pageResponse.json();
  assert.ok(pageData.catalog.products.some((product) => product.id === "8936"));
  assert.ok(pageData.catalog.products.length <= 20);
  assert.equal(
    (await fetch(base + "/api/catalogs/halloween/?page=-1")).status,
    400,
  );
  assert.equal(
    (await fetch(base + "/api/categories/halloween/?q=mascara")).status,
    200,
  );
  const cart = await fetch(base + "/api/cart/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: ["8936"] }),
  });
  assert.equal(cart.status, 200);
  assert.equal((await cart.json()).products[0].id, "8936");
  assert.equal(
    (
      await fetch(
        base +
          "/_next/image/?url=%2Fassets%2Fimages%2Fcatalogs%2Fhalloween%2F8936.webp&w=640&q=75",
      )
    ).status,
    200,
  );
  const checkout = (items) =>
    fetch(base + "/api/checkout/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  const purchase = await checkout([{ id: "8936", quantity: 3 }]);
  assert.equal(purchase.status, 200);
  assert.equal(
    (await purchase.json()).checkoutUrl,
    "https://www.pitterpan.com.br/cart/45465265963062:3",
  );
  const partial = await checkout([
    { id: "8936", quantity: 1 },
    { id: "HAL-001", quantity: 2 },
  ]);
  assert.equal(partial.status, 422);
  assert.match((await partial.json()).error, /HAL-001/);
  assert.equal((await checkout([{ id: "8936", quantity: 0 }])).status, 400);
  const malformed = await fetch(base + "/api/checkout/", {
    method: "POST",
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await fetch(base + "/api/checkout/")).status, 405);
  console.log(
    "Checkout OK: quantidades, seleção parcial, entrada inválida e método.",
  );
  console.log("HTTP OK: SSR de 12 rotas, diagnóstico, assets, 404 e 405.");
} finally {
  child.kill("SIGTERM");
}
