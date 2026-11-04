import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogUrl } from "../packages/shared/src/lib/routes.ts";

test("gestão em outro domínio ou porta compartilha links do catálogo configurado", () => {
  const previous = process.env.NEXT_PUBLIC_CATALOG_URL;
  try {
    process.env.NEXT_PUBLIC_CATALOG_URL = "http://127.0.0.1:3000/";
    assert.equal(
      publicCatalogUrl("natal", "https://catalog.example/", {
        hostname: "127.0.0.1",
        origin: "http://127.0.0.1:3001",
      }),
      "http://127.0.0.1:3000/natal/",
    );
    process.env.NEXT_PUBLIC_CATALOG_URL =
      "https://catalogopitterpanfesta.vercel.app/";
    assert.equal(
      publicCatalogUrl("natal", "https://old.example/", {
        hostname: "gestaopitterpan.vercel.app",
        origin: "https://gestaopitterpan.vercel.app",
      }),
      "https://catalogopitterpanfesta.vercel.app/natal/",
    );
    delete process.env.NEXT_PUBLIC_CATALOG_URL;
    assert.equal(
      publicCatalogUrl("natal", "https://catalog.example/", {
        hostname: "127.0.0.1",
        origin: "http://127.0.0.1:3001",
      }),
      "http://127.0.0.1:3001/natal/",
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_CATALOG_URL;
    else process.env.NEXT_PUBLIC_CATALOG_URL = previous;
  }
});
