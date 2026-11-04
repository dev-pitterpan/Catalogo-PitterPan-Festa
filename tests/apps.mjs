import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import {
  hashPassword,
  signSession,
  credentialVersion,
} from "../packages/shared/src/server/auth/crypto.ts";

const passwordHash = await hashPassword("fixture-password-for-isolation");
const secret = randomBytes(48).toString("hex");
const user = {
  sub: "bootstrap",
  email: "admin@example.test",
  name: "Teste",
  role: "admin",
  version: credentialVersion(passwordHash, secret),
};
const cookie = `__Host-pitterpan-session=${signSession(user, secret)}`;
for (const [application, port] of [
  ["catalogo-digital", "3188"],
  ["gestao-comercial", "3189"],
]) {
  const child = spawn(
    process.execPath,
    ["scripts/run-app.ts", application, "start"],
    {
      env: {
        ...process.env,
        PORT: port,
        CATALOG_DATA_SOURCE: "json",
        DATABASE_URL: "",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_CATALOG_URL: "http://127.0.0.1:3000",
        ADMIN_EMAIL: user.email,
        ADMIN_NAME: user.name,
        ADMIN_PASSWORD_HASH: passwordHash,
        ADMIN_SESSION_SECRET: secret,
        SHOPIFY_SALES_STORE_DOMAIN: "fixture.myshopify.com",
        SHOPIFY_SALES_CLIENT_ID: "fixture",
        SHOPIFY_SALES_CLIENT_SECRET: "fixture-secret",
        JITSI_BASE_URL: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  child.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Servidor não iniciou: ${logs}`)),
        30_000,
      );
      child.stdout.on("data", (chunk) => {
        if (/ready/i.test(String(chunk))) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Servidor encerrou (${code}): ${logs}`));
      });
    });
    const base = `http://127.0.0.1:${port}`;
    const get = (path, options = {}) =>
      fetch(base + path, { redirect: "manual", ...options });
    assert.equal((await get("/api/health/")).status, 200);
    assert.equal((await get("/api/catalogs/natal/")).status, 200);
    assert.equal(
      (await get("/assets/images/brand/pitter-pan-logo.svg")).status,
      200,
    );
    assert.equal(
      (
        await get("/api/cart/", {
          method: "POST",
          body: JSON.stringify({ ids: [] }),
          headers: { "Content-Type": "application/json" },
        })
      ).status,
      200,
    );
    if (application === "catalogo-digital") {
      assert.equal((await get("/")).status, 200);
      assert.equal((await get("/natal/")).status, 200);
      for (const path of [
        "/api/admin/sales/",
        "/api/auth/login/",
        "/api/cron/sales/",
        "/api/webhooks/shopify/sales/",
      ]) {
        assert.equal(
          (await get(path)).status,
          404,
          `Rota privada presente no catálogo: ${path}`,
        );
      }
      assert.equal((await get("/gestor/vendas/")).status, 404);
    } else {
      const home = await get("/");
      assert.equal(home.status, 307);
      assert.equal(home.headers.get("location"), "/gestor/");
      const guarded = await get("/gestor/vendas/");
      assert.equal(guarded.status, 307);
      assert.match(guarded.headers.get("location"), /^\/login/);
      assert.equal((await get("/api/admin/sales/")).status, 401);
      assert.equal((await get("/login/")).status, 200);
      for (const path of ["/gestor/", "/gestor/vendas/", "/gestor/natal/"]) {
        const response = await get(path, { headers: { cookie } });
        assert.equal(
          response.status,
          200,
          `Prévia protegida indisponível: ${path}`,
        );
        assert.match(response.headers.get("cache-control"), /no-store/);
        assert.match(response.headers.get("x-robots-tag"), /noindex/);
      }
    }
    console.log(
      `${application}: rotas, recursos compartilhados e isolamento HTTP OK.`,
    );
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
  }
}
