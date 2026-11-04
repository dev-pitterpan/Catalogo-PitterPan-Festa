/** Diagnóstico do processo Node que executa o Next.js. Não expõe configuração ou segredos. */
export function GET() {
  return Response.json({ status: "ok" });
}
