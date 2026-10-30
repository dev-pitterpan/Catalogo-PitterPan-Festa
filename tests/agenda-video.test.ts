import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { jitsiOrigin, jitsiRoom } from "../src/lib/agenda/video.ts";
import { ensureAgenda } from "../src/server/agenda/repository.ts";
import { createAppointmentRoom } from "../src/server/agenda/video/rooms.ts";
test("vídeo aceita somente origem HTTPS configurada e sala aleatória do próprio servidor", () => {
  assert.equal(
    jitsiOrigin("https://video.example.com"),
    "https://video.example.com",
  );
  for (const value of [
    undefined,
    "http://video.example.com",
    "https://user:secret@video.example.com",
    "https://video.example.com/path",
    "https://video.example.com/?x=1",
    "https://127.0.0.1",
    "https://localhost",
    "javascript:alert(1)",
  ])
    assert.equal(jitsiOrigin(value), null);
  const room = `pitter-${"a".repeat(48)}`;
  assert.equal(
    jitsiRoom(`https://video.example.com/${room}`, "https://video.example.com"),
    room,
  );
  for (const url of [
    `https://other.example.com/${room}`,
    "https://video.example.com/test",
    `https://video.example.com/${room}?jwt=secret`,
  ])
    assert.equal(jitsiRoom(url, "https://video.example.com"), null);
});
test("sala é persistida uma vez, preserva compromisso e recusa revisão antiga ou cancelamento", async () => {
  const db = new PGlite();
  try {
    await ensureAgenda(db);
    const id = "11111111-1111-4111-8111-111111111111",
      origin = "https://video.example.com";
    await db.query(
      "INSERT INTO pitterpan_appointments(id,title,starts_at,ends_at,owner) VALUES($1,'Condições comerciais',now(),now()+interval '1 hour','gestor')",
      [id],
    );
    const room = await createAppointmentRoom(db, origin, id, 1, "admin");
    assert.ok(jitsiRoom(room.video_url, origin));
    assert.equal(room.revision, 2);
    await assert.rejects(
      () => createAppointmentRoom(db, origin, id, 1, "admin"),
      /alterado/,
    );
    const repeated = await createAppointmentRoom(db, origin, id, 2, "admin");
    assert.deepEqual(repeated, room);
    const events = await db.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM pitterpan_agenda_events",
    );
    assert.equal(events.rows[0].n, "1");
    const current = await db.query<{ title: string; owner: string }>(
      "SELECT title,owner FROM pitterpan_appointments WHERE id=$1",
      [id],
    );
    assert.equal(current.rows[0].title, "Condições comerciais");
    assert.equal(current.rows[0].owner, "gestor");
    await db.query(
      "UPDATE pitterpan_appointments SET status='cancelled' WHERE id=$1",
      [id],
    );
    await assert.rejects(
      () => createAppointmentRoom(db, origin, id, 2, "admin"),
      /agendado/,
    );
    await db.query(
      "UPDATE pitterpan_appointments SET status='scheduled',video_url='https://meet.google.com/example' WHERE id=$1",
      [id],
    );
    await assert.rejects(
      () => createAppointmentRoom(db, origin, id, 2, "admin"),
      /Já existe/,
    );
    await assert.rejects(
      () =>
        createAppointmentRoom(
          db,
          "https://video.example.com/path",
          id,
          2,
          "admin",
        ),
      /não configurado/,
    );
  } finally {
    await db.close();
  }
});
