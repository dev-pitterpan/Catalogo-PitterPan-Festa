import { apiSession } from "@shared/server/auth/session";
import { adminContext } from "@shared/server/admin/repository";
export async function GET() {
  const auth = await apiSession();
  if (auth.error) return auth.error;
  return Response.json(await adminContext(), {
    headers: { "Cache-Control": "no-store" },
  });
}
