import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  ensureAgenda,
  readWorkspace,
  saveWorkspace,
  AgendaError,
} from "../src/server/agenda/repository.ts";
import {
  supplierSchema,
  appointmentSchema,
  whatsappLink,
  importSchema,
} from "../src/lib/agenda/validation.ts";
import {
  monthDays,
  monthShift,
  localDay,
  localTime,
} from "../src/lib/agenda/calendar.ts";
const supplier = {
  code: "123",
  name: "Fornecedor exemplo",
  trade_name: "Marca",
  state: "SC",
};
test("agenda: importação idempotente preserva contatos e edições têm controle de versão", async () => {
  const db = new PGlite();
  try {
    await ensureAgenda(db);
    const first = await saveWorkspace(
      db,
      { entity: "import", data: [supplier] },
      "gestor@exemplo.com",
    );
    assert.deepEqual(first, { added: 1, updated: 0 });
    let data = await readWorkspace(
      db,
      "2026-10-01T00:00:00-03:00",
      "2026-11-01T00:00:00-03:00",
    );
    const original = data.suppliers[0];
    assert.equal(data.suppliers.length, 1);
    assert.equal(original.phone, "");
    await saveWorkspace(
      db,
      {
        entity: "supplier",
        id: original.id,
        revision: original.revision,
        data: supplierSchema.parse({
          ...supplier,
          phone: "(47) 99999-1234",
          contact: "Pessoa",
          catalog_url: "https://example.com/catalogo",
        }),
      },
      "gestor@exemplo.com",
    );
    await assert.rejects(
      saveWorkspace(
        db,
        {
          entity: "supplier",
          id: original.id,
          revision: original.revision,
          data: supplierSchema.parse(supplier),
        },
        "outro@exemplo.com",
      ),
      AgendaError,
    );
    const repeat = await saveWorkspace(
      db,
      { entity: "import", data: [{ ...supplier, name: "Nome atualizado" }] },
      "gestor@exemplo.com",
    );
    assert.deepEqual(repeat, { added: 0, updated: 1 });
    data = await readWorkspace(
      db,
      "2026-10-01T00:00:00-03:00",
      "2026-11-01T00:00:00-03:00",
    );
    assert.equal(data.suppliers.length, 1);
    assert.equal(data.suppliers[0].phone, "(47) 99999-1234");
    assert.equal(data.suppliers[0].contact, "Pessoa");
    assert.equal(data.suppliers[0].catalog_url, "https://example.com/catalogo");
    assert.equal(
      (await db.query("SELECT * FROM pitterpan_agenda_events")).rows.length,
      3,
    );
  } finally {
    await db.close();
  }
});
test("agenda: compromissos, sobreposição, cancelamento, datas e notas persistem", async () => {
  const db = new PGlite();
  try {
    await ensureAgenda(db);
    const meeting = appointmentSchema.parse({
      supplier_id: null,
      title: "Reunião de compras",
      starts_at: "2026-10-30T09:00:00-03:00",
      ends_at: "2026-10-30T10:00:00-03:00",
    });
    const result = await saveWorkspace(
      db,
      { entity: "appointment", data: meeting },
      "gestor@exemplo.com",
    );
    assert.ok("id" in result);
    await assert.rejects(
      saveWorkspace(
        db,
        {
          entity: "appointment",
          data: { ...meeting, starts_at: "2026-10-30T09:30:00-03:00" },
        },
        "gestor@exemplo.com",
      ),
      /horário/,
    );
    await saveWorkspace(
      db,
      {
        entity: "appointment",
        data: {
          ...meeting,
          starts_at: "2026-10-30T10:00:00-03:00",
          ends_at: "2026-10-30T11:00:00-03:00",
        },
      },
      "gestor@exemplo.com",
    );
    let data = await readWorkspace(
      db,
      "2026-10-30T00:00:00-03:00",
      "2026-10-31T00:00:00-03:00",
    );
    assert.equal(data.appointments.length, 2);
    const item = data.appointments[0];
    await saveWorkspace(
      db,
      {
        entity: "appointment",
        id: item.id,
        revision: item.revision,
        data: { ...meeting, status: "cancelled" },
      },
      "outro@exemplo.com",
    );
    await saveWorkspace(
      db,
      { entity: "appointment", data: meeting },
      "gestor@exemplo.com",
    );
    await saveWorkspace(
      db,
      {
        entity: "note",
        data: {
          supplier_id: null,
          title: "Pauta",
          body: "# Reunião\n- [ ] Pedir catálogo",
        },
      },
      "gestor@exemplo.com",
    );
    data = await readWorkspace(
      db,
      "2026-10-30T00:00:00-03:00",
      "2026-10-31T00:00:00-03:00",
    );
    assert.equal(data.appointments.length, 3);
    assert.equal(data.notes[0].body, "# Reunião\n- [ ] Pedir catálogo");
    assert.equal(
      (
        await readWorkspace(
          db,
          "2026-11-01T00:00:00-03:00",
          "2026-12-01T00:00:00-03:00",
        )
      ).appointments.length,
      0,
    );
    const note = data.notes[0];
    await saveWorkspace(
      db,
      {
        entity: "note",
        id: note.id,
        revision: note.revision,
        data: {
          supplier_id: null,
          title: note.title,
          body: "- [x] Pedir catálogo",
        },
      },
      "gestor@exemplo.com",
    );
    await assert.rejects(
      saveWorkspace(
        db,
        {
          entity: "note",
          id: note.id,
          revision: note.revision,
          data: { supplier_id: null, title: "Pauta", body: "antigo" },
        },
        "gestor@exemplo.com",
      ),
      /alterado/,
    );
  } finally {
    await db.close();
  }
});
test("agenda: validação de links, telefone brasileiro e calendário", () => {
  assert.ok(
    whatsappLink("(47) 99999-1234", "Olá & catálogo")?.startsWith(
      "https://wa.me/5547999991234?text=",
    ),
  );
  assert.equal(whatsappLink("", "teste"), null);
  assert.equal(whatsappLink("123", "teste"), null);
  assert.equal(
    supplierSchema.safeParse({
      ...supplier,
      catalog_url: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    supplierSchema.safeParse({
      ...supplier,
      catalog_url: "https://user:pass@example.com",
    }).success,
    false,
  );
  assert.equal(importSchema.safeParse([supplier, supplier]).success, false);
  assert.equal(
    appointmentSchema.safeParse({
      supplier_id: null,
      title: "Reunião",
      starts_at: "2026-10-30T10:00:00-03:00",
      ends_at: "2026-10-30T09:00:00-03:00",
    }).success,
    false,
  );
  assert.equal(monthDays("2026-10").length, 42);
  assert.equal(monthDays("2026-10")[0], "2026-09-27");
  assert.equal(monthShift("2026-12", 1), "2027-01");
  assert.equal(localDay("2026-10-30T02:00:00Z"), "2026-10-29");
  assert.equal(localTime("2026-10-30T12:00:00Z"), "09:00");
});

test("agenda: datas anuais corretas, planejamento editável e referência preservada", async () => {
  const { referenceOccasions, calendarOccasions } =
    await import("../src/lib/agenda/occasions.ts");
  const references = referenceOccasions(2026);
  assert.equal(
    references.find((row) => row.id.endsWith("-easter"))?.event_date,
    "2026-04-05",
  );
  assert.equal(
    references.find((row) => row.id.endsWith("-mothers"))?.event_date,
    "2026-05-10",
  );
  assert.equal(
    references.find((row) => row.id.endsWith("-fathers"))?.event_date,
    "2026-08-09",
  );
  assert.equal(
    references.find((row) => row.id.endsWith("-black-friday"))?.event_date,
    "2026-11-27",
  );
  assert.equal(
    references.find((row) => row.id.endsWith("-carnival"))?.kind,
    "optional",
  );
  const halloween = references.find((row) => row.id === "ref-2026-10-31")!;
  const db = new PGlite();
  try {
    await ensureAgenda(db);
    const data = {
      id: halloween.id,
      title: "Ação Halloween Pitter",
      event_date: "2026-10-30",
      kind: "commercial" as const,
      notes: "Revisar fantasias com os fornecedores",
      hidden: false,
    };
    await saveWorkspace(
      db,
      { entity: "date", revision: 0, data },
      "gestor@exemplo.com",
    );
    let workspace = await readWorkspace(
      db,
      "2026-10-01T00:00:00-03:00",
      "2026-11-01T00:00:00-03:00",
    );
    const saved = workspace.dates.find((row) => row.id === halloween.id)!;
    assert.equal(saved.title, "Ação Halloween Pitter");
    assert.equal(saved.reference_title, "Halloween");
    assert.equal(saved.reference_date, "2026-10-31");
    assert.equal(saved.event_date, "2026-10-30");
    assert.equal(saved.revision, 1);
    await assert.rejects(
      saveWorkspace(
        db,
        { entity: "date", revision: 0, data },
        "outro@exemplo.com",
      ),
      /alterada/,
    );
    await saveWorkspace(
      db,
      { entity: "date", revision: 1, data: { ...data, hidden: true } },
      "gestor@exemplo.com",
    );
    workspace = await readWorkspace(
      db,
      "2026-10-01T00:00:00-03:00",
      "2026-11-01T00:00:00-03:00",
    );
    assert.equal(
      workspace.dates.find((row) => row.id === halloween.id)?.hidden,
      true,
    );
    assert.equal(
      calendarOccasions("2026-10-01", "2026-10-31", []).find(
        (row) => row.id === halloween.id,
      )?.event_date,
      "2026-10-31",
    );
    await saveWorkspace(
      db,
      {
        entity: "date",
        data: {
          title: "Aniversário da loja",
          event_date: "2026-11-05",
          kind: "observance",
          notes: "Preparar balões",
          hidden: false,
        },
      },
      "gestor@exemplo.com",
    );
    workspace = await readWorkspace(
      db,
      "2026-11-01T00:00:00-03:00",
      "2026-12-01T00:00:00-03:00",
    );
    assert.ok(
      workspace.dates.some((row) => row.title === "Aniversário da loja"),
    );
  } finally {
    await db.close();
  }
});
