import test from "node:test";
import assert from "node:assert/strict";
import { municipalityLocation } from "../src/server/sales/municipality-location.ts";
test("mapa localiza município e UF sem confundir nomes iguais ou inventar destinos", () => {
  const joinville = municipalityLocation("Joinville", "SC", "BR");
  assert.ok(joinville);
  assert.ok(joinville.latitude < -26 && joinville.latitude > -27);
  assert.ok(joinville.longitude < -48 && joinville.longitude > -49);
  assert.deepEqual(
    municipalityLocation("SAO PAULO", "SP", "BR"),
    municipalityLocation("São Paulo", "SP", "BR"),
  );
  assert.equal(municipalityLocation("Joinville", "SP", "BR"), null);
  assert.equal(municipalityLocation("Joinvile", "SC", "BR"), null);
  assert.equal(municipalityLocation("Lisboa", null, "PT"), null);
  assert.equal(municipalityLocation(null, "SC", "BR"), null);
  assert.notDeepEqual(
    municipalityLocation("Bom Jesus", "SC", "BR"),
    municipalityLocation("Bom Jesus", "RS", "BR"),
  );
});
