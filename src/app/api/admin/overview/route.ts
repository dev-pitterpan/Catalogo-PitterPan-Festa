import { apiSession } from "../../../../server/auth/session";
import { adminContext } from "../../../../server/admin/repository";
export async function GET() {
  const auth = await apiSession();
  if (auth.error) return auth.error;
  return Response.json(await adminContext(), {
    headers: { "Cache-Control": "no-store" },
  });
}
