import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const port = "3187";
const child = spawn(process.execPath, ["scripts/run-next.ts", "start"], {
  env: { ...process.env, PORT: port, NEXT_TELEMETRY_DISABLED: "1" },
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
  assert.equal((await fetch(base + "/colecao-inexistente/")).status, 404);
  assert.equal(
    (await fetch(base + "/gestor/colecao-inexistente/")).status,
    404,
  );
  assert.equal(
    (await fetch(base + "/api/health/", { method: "POST" })).status,
    405,
  );
  const pageResponse = await fetch(base + "/api/catalogs/halloween/?q=8936");
  assert.equal(pageResponse.status, 200);
  const pageData = await pageResponse.json();
  assert.ok(pageData.catalog.products.some((product) => product.id === "8936"));
  assert.ok(pageData.catalog.products.length <= 48);
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
