import test from "node:test";
import assert from "node:assert/strict";
import {
  compactQuantity,
  exactQuantity,
} from "../packages/shared/src/lib/admin/quantity.ts";
test("quantidades compactas distinguem mil e milhão e preservam o total exato", () => {
  for (const [input, expected] of [
    [0, "0"],
    [9, "9"],
    [999, "999"],
    [1000, "1k"],
    [1200, "1,2k"],
    [2000, "2k"],
    [999999, "1M"],
    [1000000, "1M"],
    [2500000, "2,5M"],
    [1000000000, "1B"],
  ] as const)
    assert.equal(compactQuantity(input), expected);
  assert.equal(exactQuantity("999999"), "999.999");
  assert.equal(exactQuantity("9007199254740993"), "9.007.199.254.740.993");
});
