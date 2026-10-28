import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiSession, sameOrigin } from "../../../../server/auth/session";
import {
  campaignSchema,
  readCampaigns,
} from "../../../../server/admin/campaigns";
import { database } from "../../../../server/database/client";
export async function GET() {
  const auth = await apiSession();
  if (auth.error) return auth.error;
  return Response.json(await readCampaigns(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  const parsed = campaignSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Confira o título e a data da campanha." },
      { status: 400 },
    );
  if (!process.env.DATABASE_URL)
    return Response.json(
      { error: "Prepare o banco para salvar campanhas." },
      { status: 503 },
    );
  try {
    await database().query(
      "INSERT INTO pitterpan_admin_campaigns(id,title,event_date,catalog_slug,notes,created_by) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        parsed.data.title,
        parsed.data.event_date,
        parsed.data.catalog_slug,
        parsed.data.notes,
        auth.session.email,
      ],
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Não foi possível salvar a campanha." },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["planned", "ready", "archived"]) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  if (!process.env.DATABASE_URL)
    return Response.json({ error: "Banco não configurado." }, { status: 503 });
  try {
    const { rows } = await database().query(
      "UPDATE pitterpan_admin_campaigns SET status=$2 WHERE id=$1 RETURNING id",
      [parsed.data.id, parsed.data.status],
    );
    if (!rows.length)
      return Response.json(
        { error: "Campanha não encontrada." },
        { status: 404 },
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Não foi possível atualizar a campanha." },
      { status: 503 },
    );
  }
}
