import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { SqlClient } from "../database/catalog-repository.ts";
import type { Supplier, Appointment, Note } from "../../lib/agenda/types.ts";
import { mutationSchema } from "../../lib/agenda/validation.ts";
import { agendaSchema } from "./schema.ts";
export class AgendaError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}
export async function ensureAgenda(db: SqlClient) {
  for (const statement of agendaSchema.split(";").filter((s) => s.trim())) {
    await db.query(statement);
  }
}
export async function readWorkspace(db: SqlClient, start: string, end: string) {
  const [suppliers, appointments, notes] = await Promise.all([
    db.query<Supplier>(
      "SELECT id,code,name,trade_name,state,contact,phone,email,catalog_url,revision,updated_at::text FROM pitterpan_suppliers ORDER BY name,code LIMIT 5000",
    ),
    db.query<Appointment>(
      "SELECT id,supplier_id,title,starts_at::text,ends_at::text,status,location,video_url,description,owner,revision FROM pitterpan_appointments WHERE starts_at < $2::timestamptz AND ends_at > $1::timestamptz ORDER BY starts_at,id LIMIT 2000",
      [start, end],
    ),
    db.query<Note>(
      "SELECT id,supplier_id,title,body,owner,revision,updated_at::text FROM pitterpan_supplier_notes ORDER BY updated_at DESC,id LIMIT 1000",
    ),
  ]);
  return {
    suppliers: suppliers.rows.map((row) => ({
      ...row,
      updated_at: new Date(row.updated_at).toISOString(),
    })),
    appointments: appointments.rows.map((row) => ({
      ...row,
      starts_at: new Date(row.starts_at).toISOString(),
      ends_at: new Date(row.ends_at).toISOString(),
    })),
    notes: notes.rows.map((row) => ({
      ...row,
      updated_at: new Date(row.updated_at).toISOString(),
    })),
  };
}
export async function saveWorkspace(
  db: SqlClient,
  raw: z.infer<typeof mutationSchema>,
  actor: string,
) {
  const input = mutationSchema.parse(raw);
  await db.query("BEGIN");
  try {
    // Serializes writes across instances, including import and overlap checks.
    await db.query("SELECT pg_advisory_xact_lock(81643002)");
    if (input.entity === "import") {
      const existing = await db.query<{ code: string }>(
        "SELECT code FROM pitterpan_suppliers WHERE code=ANY($1::text[])",
        [input.data.map((row) => row.code)],
      );
      const updated = existing.rows.length;
      const added = input.data.length - updated;
      await db.query(
        `INSERT INTO pitterpan_suppliers(id,code,name,trade_name,state)
        SELECT id,code,name,trade_name,state FROM jsonb_to_recordset($1::jsonb)
        AS x(id uuid,code text,name text,trade_name text,state text)
        ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,trade_name=EXCLUDED.trade_name,state=EXCLUDED.state,
        revision=pitterpan_suppliers.revision+1,updated_at=now()`,
        [
          JSON.stringify(
            input.data.map((row) => ({ id: randomUUID(), ...row })),
          ),
        ],
      );
      await db.query(
        "INSERT INTO pitterpan_agenda_events(actor,action,entity_id) VALUES($1,'supplier.imported',$2)",
        [actor, String(input.data.length)],
      );
      await db.query("COMMIT");
      return { added, updated };
    }
    const id = input.id || randomUUID();
    const data = input.data;
    const tables = {
      supplier: "pitterpan_suppliers",
      appointment: "pitterpan_appointments",
      note: "pitterpan_supplier_notes",
    } as const;
    const table = tables[input.entity];
    let existing: { owner?: string; revision: number } | undefined;
    if (input.id) {
      existing = (
        await db.query<{ owner?: string; revision: number }>(
          `SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,
          [id],
        )
      ).rows[0];
      if (!existing) throw new AgendaError("Registro não encontrado.", 404);
      if (input.revision !== existing.revision)
        throw new AgendaError(
          "Este registro foi alterado por outra pessoa. Reabra antes de salvar.",
        );
    }
    if (input.entity === "appointment" && input.data.status === "scheduled") {
      const v = input.data;
      const conflict = await db.query(
        "SELECT id FROM pitterpan_appointments WHERE id<>$1 AND owner=$2 AND status='scheduled' AND starts_at<$4::timestamptz AND ends_at>$3::timestamptz LIMIT 1",
        [id, existing?.owner || actor, v.starts_at, v.ends_at],
      );
      if (conflict.rows.length)
        throw new AgendaError(
          "Já há um compromisso deste responsável nesse horário. Escolha outro horário.",
        );
    }
    const fields = Object.keys(data);
    const values = Object.values(data);
    if (input.id) {
      await db.query(
        `UPDATE ${table} SET ${fields.map((f, i) => `${f}=$${i + 2}`).join(",")},revision=revision+1,updated_at=now() WHERE id=$1`,
        [id, ...values],
      );
    } else {
      const owner = input.entity === "supplier" ? [] : [actor];
      const columns = ["id", ...fields, ...(owner.length ? ["owner"] : [])];
      await db.query(
        `INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map((_, i) => `$${i + 1}`).join(",")})`,
        [id, ...values, ...owner],
      );
    }
    await db.query(
      "INSERT INTO pitterpan_agenda_events(actor,action,entity_id) VALUES($1,$2,$3)",
      [actor, `${input.entity}.${input.id ? "updated" : "created"}`, id],
    );
    await db.query("COMMIT");
    return { id };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
