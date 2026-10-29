import test from "node:test";
import assert from "node:assert/strict";
import { dateRangeSchema, todayDate } from "../src/lib/admin/date-range.ts";
import { analyticsWindow } from "../src/server/sales/analytics.ts";
import { destinationFilterSchema } from "../src/server/sales/destinations.ts";
import { salesFilterSchema } from "../src/server/sales/filters.ts";
test("calendário valida datas reais, par completo, ordem e limite de 366 dias", () => {
  for (const schema of [
    dateRangeSchema,
    destinationFilterSchema,
    salesFilterSchema,
  ]) {
    for (const input of [
      { start: "2026-02-30", end: "2026-03-01" },
      { start: "2026-10-29", end: "2026-10-01" },
      { start: "2026-10-01" },
      { start: "2025-01-01", end: "2026-10-01" },
    ])
      assert.equal(schema.safeParse(input).success, false);
    assert.ok(
      schema.safeParse({ start: "2026-10-01", end: "2026-10-29" }).success,
    );
  }
  assert.equal(
    todayDate("America/Sao_Paulo", new Date("2026-10-29T01:00:00Z")),
    "2026-10-28",
  );
  assert.deepEqual(
    analyticsWindow(30, "America/Sao_Paulo", new Date(), {
      start: "2024-02-28",
      end: "2024-03-01",
    }),
    {
      start: "2024-02-28",
      end: "2024-03-01",
      previousStart: "2024-02-25",
      previousEnd: "2024-02-27",
    },
  );
});
