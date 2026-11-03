import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../src/server/http/body.ts";

test("JSON reader bounds bytes, rejects malformed JSON and preserves valid input", async () => {
  const valid = await readJsonBody(
    new Request("https://example.test", {
      method: "POST",
      body: '{"title":"Ação 🎈"}',
    }),
  );
  assert.deepEqual(valid.value, { title: "Ação 🎈" });
  const invalid = await readJsonBody(
    new Request("https://example.test", { method: "POST", body: "{" }),
  );
  assert.equal(invalid.response?.status, 400);
  const oversized = await readJsonBody(
    new Request("https://example.test", { method: "POST", body: '"🎈"' }),
    5,
  );
  assert.equal(oversized.response?.status, 413);
  assert.equal(oversized.response?.headers.get("cache-control"), "no-store");
});

test("chunked input is cancelled at limit without trusting Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("https://example.test", {
    method: "POST",
    body: stream,
    duplex: "half",
    headers: { "content-length": "1" },
  } as RequestInit);
  const result = await readJsonBody(request, 10);
  assert.equal(result.response?.status, 413);
  assert.equal(cancelled, true);
  const declared = await readJsonBody(
    new Request("https://example.test", {
      method: "POST",
      body: "{}",
      headers: { "content-length": "999" },
    }),
    10,
  );
  assert.equal(declared.response?.status, 413);
});
