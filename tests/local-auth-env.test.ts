import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localAuthEnvironment } from "../scripts/local-auth-env.ts";
import nextEnv from "@next/env";
test("hash scrypt permanece literal quando o Next carrega .env", () => {
  const root = mkdtempSync(join(tmpdir(), "pitterpan-auth-env-"));
  const hash = "scrypt$" + "ab".repeat(16) + "$" + "cd".repeat(64);
  try {
    writeFileSync(
      join(root, ".env"),
      `ADMIN_PASSWORD_HASH=${JSON.stringify(hash)}\nADMIN_EMAIL=admin@example.test\n`,
    );
    const prepared = localAuthEnvironment(root, "development", {
      NODE_ENV: "development",
    });
    assert.equal(prepared.ADMIN_PASSWORD_HASH, hash.replaceAll("$", ":"));
    // Exercita o expansor real do Next, com o hash injetado antes da leitura.
    const previous = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = prepared.ADMIN_PASSWORD_HASH;
    try {
      const result = nextEnv.loadEnvConfig(
        root,
        true,
        { info() {}, error() {} },
        true,
      );
      assert.equal(
        result.combinedEnv.ADMIN_PASSWORD_HASH,
        hash.replaceAll("$", ":"),
      );
    } finally {
      if (previous === undefined) delete process.env.ADMIN_PASSWORD_HASH;
      else process.env.ADMIN_PASSWORD_HASH = previous;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("configuração externa e precedência de arquivos são respeitadas sem congelar outras variáveis", () => {
  const root = mkdtempSync(join(tmpdir(), "pitterpan-auth-precedence-"));
  try {
    writeFileSync(
      join(root, ".env"),
      "ADMIN_PASSWORD_HASH=base\nCATALOG_DATA_SOURCE=postgres\n",
    );
    writeFileSync(join(root, ".env.local"), "ADMIN_PASSWORD_HASH=local\n");
    writeFileSync(
      join(root, ".env.development.local"),
      "ADMIN_PASSWORD_HASH=development\n",
    );
    assert.equal(
      localAuthEnvironment(root, "development", { NODE_ENV: "development" })
        .ADMIN_PASSWORD_HASH,
      "development",
    );
    assert.equal(
      localAuthEnvironment(root, "production", { NODE_ENV: "development" })
        .ADMIN_PASSWORD_HASH,
      "local",
    );
    assert.equal(
      localAuthEnvironment(root, "test", { NODE_ENV: "development" })
        .ADMIN_PASSWORD_HASH,
      "base",
    );
    assert.equal(
      localAuthEnvironment(root, "development", {
        NODE_ENV: "development",
        ADMIN_PASSWORD_HASH: "external",
      }).ADMIN_PASSWORD_HASH,
      "external",
    );
    assert.equal(
      localAuthEnvironment(root, "development", { NODE_ENV: "development" })
        .CATALOG_DATA_SOURCE,
      undefined,
    );
    writeFileSync(
      join(root, ".env.development.local"),
      "ADMIN_PASSWORD_HASH=updated\n",
    );
    assert.equal(
      localAuthEnvironment(root, "development", { NODE_ENV: "development" })
        .ADMIN_PASSWORD_HASH,
      "updated",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
